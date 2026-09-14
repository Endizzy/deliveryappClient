import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, RefreshCw } from "lucide-react";
import "./analyticsTab.css";
import { formatCents, toCents } from "../../utils/money.js";

const RIGA = [56.94937, 24.10525];
const toEUR = (n) => `€${formatCents(toCents(Number(n) || 0))}`;

const PERIODS = [
  { key: "30", label: "30 дней" },
  { key: "90", label: "90 дней" },
  { key: "365", label: "Год" },
  { key: "all", label: "Всё время" },
];

/** Ниже этого числа заказов карта показывает предупреждение: на малой
 *  выборке «пятно» может оказаться случайностью, а не закономерностью.
 *  Подпись исчезнет сама, когда данных наберётся достаточно. */
const LOW_DATA_THRESHOLD = 1000;

/**
 * Размер ячейки группировки в градусах широты для текущего зума.
 * Чем ближе зум — тем мельче ячейка, и крупное скопление распадается
 * на несколько мелких. Значения подобраны так, чтобы круги на экране
 * не наезжали друг на друга при типичной плотности города.
 */
export function cellSizeForZoom(zoom) {
  if (zoom <= 10) return 0.06;
  if (zoom === 11) return 0.03;
  if (zoom === 12) return 0.016;
  if (zoom === 13) return 0.008;
  if (zoom === 14) return 0.004;
  return 0.002;
}

/**
 * Группировка точек в скопления по сетке.
 *
 * Долгота делится на больший шаг: на широте Риги градус долготы примерно
 * вдвое короче градуса широты, и без поправки ячейки были бы вытянутыми,
 * а круги ложились бы вертикальными полосами.
 */
export function clusterPoints(points, step) {
  const cells = new Map();
  for (const p of Array.isArray(points) ? points : []) {
    const n = Number(p?.n) || 0;
    if (!n) continue;
    // Пустые значения проверяем до Number(): и Number(null), и Number("")
    // дают 0, а ноль — конечное число. Без этой проверки точка с пустой
    // широтой прошла бы дальше и уехала в Гвинейский залив, растянув
    // масштаб карты на пол-планеты. Настоящий ноль при этом остаётся
    // валидной координатой — просто у нас такой не бывает.
    if (p.lat == null || p.lng == null || p.lat === "" || p.lng === "") continue;
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const key = `${Math.round(lat / step)}:${Math.round(lng / (step * 1.8))}`;
    let c = cells.get(key);
    if (!c) {
      c = { latSum: 0, lngSum: 0, n: 0, sum: 0 };
      cells.set(key, c);
    }
    // Центр скопления взвешиваем по числу заказов: адрес с тридцатью
    // заказами должен тянуть круг к себе сильнее, чем случайный одиночный
    c.latSum += lat * n;
    c.lngSum += lng * n;
    c.n += n;
    c.sum += Number(p.sum) || 0;
  }

  return [...cells.values()].map((c) => ({
    lat: c.latSum / c.n,
    lng: c.lngSum / c.n,
    n: c.n,
    sum: c.sum,
  }));
}

/**
 * Диаметр круга в пикселях.
 *
 * По корню от доли, а не линейно: глаз считывает площадь круга, и при
 * линейном диаметре скопление вдвое большее выглядело бы вчетверо
 * крупнее — карта врала бы в разы.
 */
export function blobSize(value, max) {
  const t = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return Math.round(26 + Math.sqrt(t) * 42);
}

/** Один тон с разной насыщенностью. Радуга «зелёный–жёлтый–красный»
 *  добавила бы смысл, которого в данных нет. */
export function blobShade(value, max) {
  const t = max > 0 ? value / max : 0;
  if (t > 0.75) return "#1e3a8a";
  if (t > 0.5) return "#2563eb";
  if (t > 0.25) return "#60a5fa";
  return "#93c5fd";
}

export default function AnalyticsTab({ API, authHeaders }) {
  const [period, setPeriod] = useState("365");
  const [metric, setMetric] = useState("count");
  const [showZones, setShowZones] = useState(true);

  const [data, setData] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const blobLayerRef = useRef(null);
  const zoneLayerRef = useRef(null);
  // Данные в ref, чтобы перерисовка по зуму не требовала пересоздания
  // обработчика на каждый рендер React
  const stateRef = useRef({ points: [], metric: "count" });

  // ── Загрузка ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/analytics/orders-map?period=${period}`, {
          headers: authHeaders,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Ошибка загрузки");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [API, period]);

  // Зоны — фон для ориентира. Их отсутствие карту не ломает.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/delivery-zones`, { headers: authHeaders });
        const json = await res.json();
        if (!cancelled && json?.ok) setZones(json.zones || []);
      } catch {
        /* фоновый слой необязателен — молча обходимся без него */
      }
    })();
    return () => { cancelled = true; };
  }, [API]);

  // ── Создание карты (один раз) ─────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(RIGA, 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    zoneLayerRef.current = L.layerGroup().addTo(map);
    blobLayerRef.current = L.layerGroup().addTo(map);

    map.on("zoomend", () => drawBlobs());
    mapRef.current = map;

    // Вкладка монтируется скрытой долю секунды, и Leaflet успевает
    // замерить контейнер нулевой высоты — карта остаётся серой.
    // invalidateSize после вставки заставляет пересчитать размеры.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      blobLayerRef.current = null;
      zoneLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Отрисовка кругов ──────────────────────────────────────────────────────
  const drawBlobs = () => {
    const map = mapRef.current;
    const layer = blobLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const { points, metric: m } = stateRef.current;
    if (!points.length) return;

    const clusters = clusterPoints(points, cellSizeForZoom(map.getZoom()));
    const valueOf = (c) => (m === "count" ? c.n : c.sum);
    const max = Math.max(...clusters.map(valueOf), 0);

    for (const c of clusters) {
      const v = valueOf(c);
      const size = blobSize(v, max);
      const label = m === "count" ? String(c.n) : `${Math.round(c.sum)}€`;
      const fontSize = label.length > 4 ? 11 : 13;

      L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          className: "",
          html:
            `<div class="an-blob" style="width:${size}px;height:${size}px;` +
            `background:${blobShade(v, max)};font-size:${fontSize}px">${label}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
      })
        .addTo(layer)
        .bindPopup(
          `<div class="an-pop"><table>
            <tr><td>Заказов</td><td>${c.n}</td></tr>
            <tr><td>Выручка</td><td>${c.sum.toFixed(2)} €</td></tr>
            <tr><td>Средний чек</td><td>${(c.sum / c.n).toFixed(2)} €</td></tr>
          </table></div>`
        );
    }
  };

  useEffect(() => {
    stateRef.current = { points: data?.points || [], metric };
    drawBlobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, metric]);

  // ── Контуры зон ───────────────────────────────────────────────────────────
  useEffect(() => {
    const layer = zoneLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    if (!showZones) return;

    for (const z of zones) {
      if (!z?.geometry) continue;
      try {
        L.geoJSON(z.geometry, {
          style: {
            color: z.color || "#64748b",
            weight: 1,
            opacity: 0.55,
            fillOpacity: 0.03,
            dashArray: "5,5",
          },
          // Зоны — фон: клик должен доставаться кругам под ними
          interactive: false,
        }).addTo(layer);
      } catch {
        /* кривая геометрия одной зоны не должна ронять карту */
      }
    }
  }, [zones, showZones]);

  const lowData = (data?.mapped ?? 0) > 0 && (data?.mapped ?? 0) < LOW_DATA_THRESHOLD;

  const summary = useMemo(() => {
    if (!data) return null;
    return {
      total: data.total ?? 0,
      mapped: data.mapped ?? 0,
      skipped: data.skipped ?? 0,
      revenue: data.revenue ?? 0,
    };
  }, [data]);

  return (
    <div className="an-wrap">
      {lowData && (
        <div className="an-warn">
          <AlertTriangle size={15} />
          <div>
            На карте <b>{summary.mapped}</b> заказов — выборка небольшая, картина
            ориентировочная. Отдельное скопление может оказаться случайностью,
            а не закономерностью. Подпись исчезнет сама, когда заказов станет больше.
          </div>
        </div>
      )}

      <div className="an-card">
        <div className="an-bar">
          <div className="an-grp">
            <span>Период</span>
            <div className="an-seg">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={period === p.key ? "on" : ""}
                  onClick={() => setPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="an-grp">
            <span>Показывать</span>
            {/* Две разные карты: спальный район даёт много мелких заказов,
                тихая улица — мало, но дорогих. Тумблер показывает оба ответа. */}
            <div className="an-seg">
              <button
                type="button"
                className={metric === "count" ? "on" : ""}
                onClick={() => setMetric("count")}
              >
                По количеству
              </button>
              <button
                type="button"
                className={metric === "revenue" ? "on" : ""}
                onClick={() => setMetric("revenue")}
              >
                По выручке
              </button>
            </div>
          </div>

          <label className="an-chk">
            <input
              type="checkbox"
              checked={showZones}
              onChange={(e) => setShowZones(e.target.checked)}
            />
            Показывать зоны доставки
          </label>
        </div>

        <div className="an-map-holder">
          <div ref={containerRef} className="an-map" />
          {loading && (
            <div className="an-overlay">
              <RefreshCw size={16} className="an-spin" /> Загружаем заказы…
            </div>
          )}
          {!loading && !error && summary?.mapped === 0 && (
            <div className="an-overlay">За этот период заказов с адресом нет</div>
          )}
        </div>

        <div className="an-foot">
          {error ? (
            <span className="an-err">{error}</span>
          ) : summary ? (
            <>
              <span>
                На карте <b>{summary.mapped}</b> из <b>{summary.total}</b> заказов
                {" · "}
                <b>{toEUR(summary.revenue)}</b>
              </span>
              {/* Расхождение не прячем: если заказы на карту не попали,
                  об этом лучше знать до того, как принимать решения */}
              {summary.skipped > 0 && (
                <span className="an-skip">
                  без координат: {summary.skipped}
                </span>
              )}
            </>
          ) : (
            <span>&nbsp;</span>
          )}

          <span className="an-legend">
            <span className="an-legend-lbl">меньше</span>
            <i style={{ background: "#93c5fd" }} />
            <i style={{ background: "#60a5fa" }} />
            <i style={{ background: "#2563eb" }} />
            <i style={{ background: "#1e3a8a" }} />
            <span className="an-legend-lbl">больше</span>
          </span>
        </div>
      </div>
    </div>
  );
}
