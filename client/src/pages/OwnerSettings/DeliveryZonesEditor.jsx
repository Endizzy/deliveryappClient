import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { Save, Upload, Trash2, MapPin, Check, AlertCircle } from "lucide-react";
import { kmlToZones } from "../../utils/kml.js";
import "./deliveryZones.css";

const RIGA = [56.94937, 24.10525];
const PALETTE = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

const styleFor = (color) => ({
  color,
  weight: 2,
  fillColor: color,
  fillOpacity: 0.18,
});

/**
 * Правила зоны в виде чипов — владелец видит результат сразу, а не собирает
 * его в уме из трёх полей. kind задаёт цвет: бесплатная доставка зелёная,
 * минимальный заказ оранжевый.
 */
function describeZoneRules(zone, tr) {
  const num = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const fee = num(zone.fee);
  const min = num(zone.minOrder);
  const free = num(zone.freeFrom);

  const chips = [];

  if (fee == null || fee === 0) {
    chips.push({ kind: "free", text: tr("ownerSettings.zones.ruleFreeAlways", "доставка бесплатная") });
  } else {
    chips.push({ text: `${tr("ownerSettings.zones.ruleFee", "доставка")} ${fee.toFixed(2)} €` });
    if (free != null) {
      chips.push({
        kind: "free",
        text: `${tr("ownerSettings.zones.ruleFreeFrom", "бесплатно от")} ${free.toFixed(2)} €`,
      });
    }
  }

  if (min != null) {
    chips.push({
      kind: "min",
      text: `${tr("ownerSettings.zones.ruleMin", "минимальный заказ")} ${min.toFixed(2)} €`,
    });
  }

  return chips;
}

function newKey() {
  return `z_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Редактор зон доставки: рисование/правка полигонов (leaflet-geoman),
// список зон (имя / цвет / стоимость доставки), сохранение в БД, импорт KML.
export default function DeliveryZonesEditor({ API, authHeaders, t }) {
  const tr = (key, def) => (t ? t(key, { defaultValue: def }) : def);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(new Map()); // key -> Leaflet polygon layer
  const fileRef = useRef(null);

  const [items, setItems] = useState([]); // [{ key, name, color, fee }]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  // Ошибку показываем красным, успех — зелёным
  const [statusIsError, setStatusIsError] = useState(false);
  // Зона, выбранная в списке: подсвечена в списке и показана на карте
  const [activeKey, setActiveKey] = useState(null);

  /**
   * Зоны по возрастанию стоимости доставки: одинаковые по цене оказываются
   * рядом, и видно, где доставка дешевеет. Незаданная стоимость = бесплатно,
   * поэтому такие зоны идут первыми. При равной цене — по названию, чтобы
   * порядок не прыгал между рендерами.
   */
  const sortedItems = useMemo(() => {
    const num = (v) => {
      if (v === "" || v == null) return 0;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };
    return [...items].sort((a, b) => {
      const diff = num(a.fee) - num(b.fee);
      if (diff !== 0) return diff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [items]);

  // Клик по карточке зоны — подводим карту к её границам. При десятке зон
  // искать нужную на карте вручную неудобно.
  const focusZone = (key) => {
    setActiveKey(key);
    const map = mapRef.current;
    const layer = layersRef.current.get(key);
    if (!map || !layer?.getBounds) return;
    try {
      map.fitBounds(layer.getBounds(), { padding: [28, 28], maxZoom: 15, animate: true });
    } catch { /* пустая или битая геометрия */ }
  };

  // Добавить слой-полигон на карту из геометрии GeoJSON
  const addLayerFromGeometry = (geometry, color) => {
    const map = mapRef.current;
    if (!map || !geometry || geometry.type !== "Polygon") return null;
    const latlngs = geometry.coordinates.map((ring) =>
      ring.map(([lng, lat]) => [lat, lng])
    );
    const layer = L.polygon(latlngs, styleFor(color)).addTo(map);
    return layer;
  };

  const removeZone = (key) => {
    const map = mapRef.current;
    const layer = layersRef.current.get(key);
    if (layer && map) {
      try {
        map.removeLayer(layer);
      } catch {}
    }
    layersRef.current.delete(key);
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const updateItem = (key, patch) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
    if (patch.color) {
      const layer = layersRef.current.get(key);
      if (layer) {
        try {
          layer.setStyle(styleFor(patch.color));
        } catch {}
      }
    }
  };

  // Полная перерисовка слоёв из массива зон (из БД/после сохранения)
  const rebuildFromZones = (zones) => {
    const map = mapRef.current;
    if (!map) return;
    for (const layer of layersRef.current.values()) {
      try {
        map.removeLayer(layer);
      } catch {}
    }
    layersRef.current.clear();

    const nextItems = [];
    (zones || []).forEach((z, i) => {
      const color = z.color || PALETTE[i % PALETTE.length];
      const layer = addLayerFromGeometry(z.geometry, color);
      if (!layer) return;
      const key = newKey();
      layersRef.current.set(key, layer);
      nextItems.push({
        key,
        name: z.name || `Зона ${i + 1}`,
        color,
        fee: z.fee != null ? String(z.fee) : "",
        // правила по сумме заказа; пусто = правило не задано
        minOrder: z.minOrder != null ? String(z.minOrder) : "",
        freeFrom: z.freeFrom != null ? String(z.freeFrom) : "",
      });
    });
    setItems(nextItems);

    // подогнать вид под все зоны
    if (layersRef.current.size) {
      const group = L.featureGroup(Array.from(layersRef.current.values()));
      try {
        map.fitBounds(group.getBounds().pad(0.2));
      } catch {}
    }
  };

  // ── Инициализация карты + geoman ──
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current).setView(RIGA, 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;

    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawCircle: false,
      drawText: false,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      rotateMode: false,
      removalMode: true,
    });

    // Новый нарисованный полигон
    map.on("pm:create", (e) => {
      const layer = e.layer;
      const key = newKey();
      try {
        layer.setStyle(styleFor(PALETTE[0]));
      } catch {}
      layersRef.current.set(key, layer);
      setItems((prev) => [
        ...prev,
        {
          key,
          name: `Зона ${prev.length + 1}`,
          color: PALETTE[prev.length % PALETTE.length],
          fee: "",
          minOrder: "",
          freeFrom: "",
        },
      ]);
      // применим цвет по индексу
      setItems((prev) => {
        const idx = prev.findIndex((it) => it.key === key);
        const color = PALETTE[(idx < 0 ? prev.length : idx) % PALETTE.length];
        try {
          layer.setStyle(styleFor(color));
        } catch {}
        return prev.map((it) => (it.key === key ? { ...it, color } : it));
      });
    });

    // Удаление через инструмент geoman
    map.on("pm:remove", (e) => {
      const layer = e.layer;
      for (const [k, l] of layersRef.current) {
        if (l === layer) {
          layersRef.current.delete(k);
          setItems((prev) => prev.filter((it) => it.key !== k));
          break;
        }
      }
    });

    const t1 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 250);

    // загрузка зон
    (async () => {
      try {
        const res = await fetch(`${API}/delivery-zones`, { headers: authHeaders });
        const data = await res.json();
        if (res.ok && data.ok) rebuildFromZones(data.zones);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      clearTimeout(t1);
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
      layersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Импорт KML ──
  const onImportKml = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = kmlToZones(text);
      if (!parsed.length) {
        setStatusIsError(true); setStatus(tr("ownerSettings.zones.importEmpty", "В файле не найдено полигонов"));
        return;
      }
      parsed.forEach((z, i) => {
        const color = z.color || PALETTE[(items.length + i) % PALETTE.length];
        const layer = addLayerFromGeometry(z.geometry, color);
        if (!layer) return;
        const key = newKey();
        layersRef.current.set(key, layer);
        setItems((prev) => [
          ...prev,
          { key, name: z.name || `Зона ${prev.length + 1}`, color, fee: "", minOrder: "", freeFrom: "" },
        ]);
      });
      // подогнать вид
      const map = mapRef.current;
      if (map && layersRef.current.size) {
        const group = L.featureGroup(Array.from(layersRef.current.values()));
        try {
          map.fitBounds(group.getBounds().pad(0.2));
        } catch {}
      }
      setStatusIsError(false); setStatus(tr("ownerSettings.zones.imported", "Импортировано зон: ") + parsed.length);
    } catch (err) {
      setStatusIsError(true); setStatus(tr("ownerSettings.zones.importError", "Не удалось прочитать KML"));
    }
  };

  // ── Сохранение в БД ──
  const onSave = async () => {
    setSaving(true);
    setStatus("");
    try {
      // Сохраняем в том же порядке, в каком зоны показаны (по цене):
      // sort_order на сервере совпадёт со списком, и после перезагрузки
      // порядок не изменится.
      const zones = sortedItems
        .map((it) => {
          const layer = layersRef.current.get(it.key);
          const geometry = layer?.toGeoJSON?.()?.geometry;
          if (!geometry || geometry.type !== "Polygon") return null;
          const num = (v) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
          return {
            name: it.name,
            color: it.color,
            fee: num(it.fee),
            minOrder: num(it.minOrder),
            freeFrom: num(it.freeFrom),
            geometry,
          };
        })
        .filter(Boolean);

      const res = await fetch(`${API}/delivery-zones`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ zones }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "save failed");
      rebuildFromZones(data.zones);
      setStatusIsError(false); setStatus(tr("ownerSettings.zones.saved", "Зоны сохранены"));
    } catch (e) {
      // Показываем причину с сервера: без неё «Ошибка сохранения зон» ничего
      // не объясняет, а там может быть, например, не применённая миграция.
      const reason = e?.message && e.message !== "save failed" ? `: ${e.message}` : "";
      setStatusIsError(true);
      setStatus(tr("ownerSettings.zones.saveError", "Ошибка сохранения зон") + reason);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="owner-card">
      <div className="owner-card-header">
        <div className="owner-card-title">
          <MapPin size={18} /> {tr("ownerSettings.zones.title", "Зоны доставки")}
        </div>

        <div className="owner-card-actions">
          <button
            type="button"
            className="owner-secondary-btn"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} /> {tr("ownerSettings.zones.importKml", "Импорт из Google MyMaps (KML)")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".kml,application/vnd.google-earth.kml+xml,application/xml,text/xml"
            onChange={onImportKml}
            hidden
          />

          <button type="button" className="owner-primary-btn" onClick={onSave} disabled={saving}>
            <Save size={16} />{" "}
            {saving
              ? tr("ownerSettings.zones.saving", "Сохраняем…")
              : tr("ownerSettings.actions.save", "Сохранить")}
          </button>
        </div>
      </div>

      <div className="dz-layout">
        <div className="dz-map-wrap">
          <div ref={containerRef} className="dz-map" />
          <div className="dz-map-hint">
            {tr(
              "ownerSettings.zones.help",
              "Нарисуйте зоны на карте инструментами слева (полигон или прямоугольник). Зоны можно перетаскивать, редактировать вершины и удалять. Не забудьте сохранить."
            )}
          </div>
        </div>

        <div className="dz-side">
          <div className="dz-side-head">
            <div className="dz-side-title">
              {tr("ownerSettings.zones.listTitle", "Список зон")}
              <span className="dz-count">{items.length}</span>
            </div>
          </div>

          {loading && <div className="owner-empty">{tr("ownerSettings.loading", "Загрузка…")}</div>}

          {!loading && items.length === 0 && (
            <div className="dz-empty">
              <div className="dz-empty-icon">
                <MapPin size={22} />
              </div>
              <div className="dz-empty-title">
                {tr("ownerSettings.zones.emptyTitle", "Зон пока нет")}
              </div>
              <div className="dz-empty-text">
                {tr(
                  "ownerSettings.zones.empty",
                  "Зон пока нет — нарисуйте на карте или импортируйте KML."
                )}
              </div>
            </div>
          )}

          <div className="dz-list">
            {sortedItems.map((it) => (
              <div
                key={it.key}
                className={`dz-zone ${activeKey === it.key ? "is-active" : ""}`}
                style={{ "--dz-color": it.color }}
                onClick={() => focusZone(it.key)}
              >
                <div className="dz-zone-head">
                  {/* Цвет зоны: круглый свотч, ввод спрятан внутрь */}
                  <label
                    className="dz-swatch"
                    style={{ background: it.color }}
                    title={tr("ownerSettings.zones.color", "Цвет зоны")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="color"
                      value={it.color}
                      onChange={(e) => updateItem(it.key, { color: e.target.value })}
                    />
                  </label>

                  <input
                    type="text"
                    className="dz-zone-name"
                    value={it.name}
                    onChange={(e) => updateItem(it.key, { name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={tr("ownerSettings.zones.namePlaceholder", "Название зоны")}
                  />

                  <button
                    type="button"
                    className="dz-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeZone(it.key);
                    }}
                    title={tr("ownerSettings.actions.delete", "Удалить")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Правила доставки для этой зоны */}
                <div className="dz-rules" onClick={(e) => e.stopPropagation()}>
                  <label className="dz-field">
                    <span>{tr("ownerSettings.zones.feeShort", "Доставка, €")}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.fee}
                      onChange={(e) => updateItem(it.key, { fee: e.target.value })}
                      placeholder="—"
                    />
                  </label>

                  <label className="dz-field">
                    <span>{tr("ownerSettings.zones.minOrderShort", "Минимум, €")}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.minOrder}
                      onChange={(e) => updateItem(it.key, { minOrder: e.target.value })}
                      placeholder="—"
                    />
                  </label>

                  <label className="dz-field">
                    <span>{tr("ownerSettings.zones.freeFromShort", "Бесплатно от, €")}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.freeFrom}
                      onChange={(e) => updateItem(it.key, { freeFrom: e.target.value })}
                      placeholder="—"
                    />
                  </label>
                </div>

                {/* Итог правил — чипами, чтобы читалось с одного взгляда */}
                <div className="dz-summary">
                  {describeZoneRules(it, tr).map((chip, i) => (
                    <span key={i} className={`dz-chip ${chip.kind ? `is-${chip.kind}` : ""}`}>
                      {chip.text}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {status && (
            <div className={`dz-status ${statusIsError ? "is-error" : ""}`}>
              {statusIsError ? <AlertCircle size={15} /> : <Check size={15} />}
              {status}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
