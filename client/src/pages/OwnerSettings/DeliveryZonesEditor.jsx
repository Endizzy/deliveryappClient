import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { Save, Upload, Trash2, Plus } from "lucide-react";
import { kmlToZones } from "../../utils/kml.js";

const RIGA = [56.94937, 24.10525];
const PALETTE = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

const styleFor = (color) => ({
  color,
  weight: 2,
  fillColor: color,
  fillOpacity: 0.18,
});

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
        setStatus(tr("ownerSettings.zones.importEmpty", "В файле не найдено полигонов"));
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
          { key, name: z.name || `Зона ${prev.length + 1}`, color, fee: "" },
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
      setStatus(tr("ownerSettings.zones.imported", "Импортировано зон: ") + parsed.length);
    } catch (err) {
      setStatus(tr("ownerSettings.zones.importError", "Не удалось прочитать KML"));
    }
  };

  // ── Сохранение в БД ──
  const onSave = async () => {
    setSaving(true);
    setStatus("");
    try {
      const zones = items
        .map((it) => {
          const layer = layersRef.current.get(it.key);
          const geometry = layer?.toGeoJSON?.()?.geometry;
          if (!geometry || geometry.type !== "Polygon") return null;
          return {
            name: it.name,
            color: it.color,
            fee: it.fee === "" ? null : Number(String(it.fee).replace(",", ".")),
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
      setStatus(tr("ownerSettings.zones.saved", "Зоны сохранены"));
    } catch (e) {
      setStatus(tr("ownerSettings.zones.saveError", "Ошибка сохранения зон"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="owner-card">
      <div className="owner-card-header">
        <div className="owner-card-title">
          <Plus size={18} /> {tr("ownerSettings.zones.title", "Зоны доставки")}
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

      <p className="hint muted" style={{ marginTop: 0 }}>
        {tr(
          "ownerSettings.zones.help",
          "Нарисуйте зоны на карте инструментами слева (полигон или прямоугольник). Зоны можно перетаскивать, редактировать вершины и удалять. Не забудьте сохранить."
        )}
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div
          ref={containerRef}
          style={{
            flex: "1 1 480px",
            minWidth: 320,
            height: 460,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.3)",
          }}
        />

        <div style={{ flex: "1 1 280px", minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {tr("ownerSettings.zones.listTitle", "Список зон")} ({items.length})
          </div>

          {loading && <div className="owner-empty">{tr("ownerSettings.loading", "Загрузка…")}</div>}

          {!loading && items.length === 0 && (
            <div className="owner-empty">
              {tr("ownerSettings.zones.empty", "Зон пока нет — нарисуйте на карте или импортируйте KML.")}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((it) => (
              <div
                key={it.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.3)",
                }}
              >
                <input
                  type="color"
                  value={it.color}
                  onChange={(e) => updateItem(it.key, { color: e.target.value })}
                  title={tr("ownerSettings.zones.color", "Цвет зоны")}
                  style={{
                    width: 30,
                    height: 30,
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                />

                <input
                  type="text"
                  value={it.name}
                  onChange={(e) => updateItem(it.key, { name: e.target.value })}
                  placeholder={tr("ownerSettings.zones.namePlaceholder", "Название зоны")}
                  style={{ flex: 1, minWidth: 0 }}
                />

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={it.fee}
                  onChange={(e) => updateItem(it.key, { fee: e.target.value })}
                  placeholder="€"
                  title={tr("ownerSettings.zones.fee", "Стоимость доставки (€)")}
                  style={{ width: 72 }}
                />

                <button
                  type="button"
                  className="owner-icon small danger"
                  onClick={() => removeZone(it.key)}
                  title={tr("ownerSettings.actions.delete", "Удалить")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {status && (
            <div className="hint muted" style={{ marginTop: 10 }}>
              {status}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
