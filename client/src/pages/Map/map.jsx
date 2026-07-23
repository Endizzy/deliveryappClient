import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { createAdminSocket } from "../../ws.js";
import { jwtDecode } from "jwt-decode";
import useUserStore from "../../store/userStore.js";
import { Info, Navigation2, Package } from "lucide-react";
import styles from "./map.module.css";
import Header from "../../components/Header/Header.jsx";
import { useTranslation } from "react-i18next";

const defaultCenter = [56.94937, 24.10525]; // Riga
const ORDER_FOCUS_ZOOM = 16;
const COURIER_FOCUS_ZOOM = 16;

const ORDER_ICON_W = 50;
const ORDER_ICON_H = 50;

// Палитра цветов курьеров — каждому свой устойчивый цвет по unit_id
const COURIER_PALETTE = [
  "#2F8CFF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];
function courierColor(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return "#94A3B8";
  return COURIER_PALETTE[Math.abs(Math.trunc(n)) % COURIER_PALETTE.length];
}

// Размеры пина заказа
const PIN_W = 30;
const PIN_H = 40;

export default function DeliveryMap() {
  const { t } = useTranslation();
  const API = import.meta.env.VITE_API_URL;

  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );
  const authHeaders = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  // companyId нужен сокету, иначе серверные рассылки (фильтр по компании) не дойдут.
  // Источник — общий store; фолбэк на JWT, если store ещё не гидратирован.
  const companyIdFromStore = useUserStore((s) => s.user?.companyId);
  const companyId = useMemo(() => {
    if (Number.isFinite(Number(companyIdFromStore))) return Number(companyIdFromStore);
    try {
      if (!token) return null;
      const p = jwtDecode(token);
      const cid = Number(p?.companyId ?? p?.company_id);
      return Number.isFinite(cid) ? cid : null;
    } catch {
      return null;
    }
  }, [companyIdFromStore, token]);

  const mapRef = useRef(null);

  // couriers
  const courierMarkersRef = useRef(new Map()); // courierId -> marker
  const animRef = useRef(new Map()); // courierId -> { rafId, start, duration, from, to }

  // orders
  const orderMarkersRef = useRef(new Map()); // orderId -> marker
  const orderDataRef = useRef(new Map()); // orderId -> последние данные заказа (для перерисовки)

  // ETA: orderId -> { courierId, totalSec, distanceM, etaAt }
  const etaRef = useRef(new Map());

  // цвета курьеров (задаются админом), id -> hex
  const courierColorsRef = useRef(new Map());

  const [couriers, setCouriers] = useState(new Map());
  const [orders, setOrders] = useState(new Map());

  useEffect(() => {
    if (!token) return;

    const map = L.map("map", { zoomControl: true }).setView(defaultCenter, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.zoomControl.setPosition("bottomright");
    mapRef.current = map;

    // анимация пульса для маркеров «в пути» (один раз, глобально)
    if (!document.getElementById("map-pulse-style")) {
      const st = document.createElement("style");
      st.id = "map-pulse-style";
      st.textContent =
        "@keyframes mapPulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:.5}100%{transform:translate(-50%,-50%) scale(1.7);opacity:0}}";
      document.head.appendChild(st);
    }

    (async () => {
      try {
        // сначала подтягиваем цвета курьеров (заданные админом)
        try {
          const cr = await fetch(`${API}/order-support/couriers`, { headers: authHeaders });
          const cd = await cr.json();
          if (cd?.ok && Array.isArray(cd.items)) {
            cd.items.forEach((c) => {
              if (c.color) courierColorsRef.current.set(String(c.id), c.color);
            });
          }
        } catch (e) { }

        const res = await fetch(`${API}/current-orders/map`, { headers: authHeaders });
        if (res.status === 401) return;
        const data = await res.json();
        if (data?.ok && Array.isArray(data.items)) {
          data.items.forEach((o) => upsertOrderMarker(o));
        }
      } catch (e) {
        console.warn("Failed to load orders for map", e);
      }
    })();

    const ws = createAdminSocket((msg) => {
      try {
        if (!msg) return;

        // couriers
        if (msg.type === "snapshot" && Array.isArray(msg.items)) {
          for (const it of msg.items) upsertCourierMarker(it);
        }
        if (msg.type === "location") upsertCourierMarker(msg);
        if (msg.type === "remove") removeCourierMarker(msg.courierId);

        // orders
        if (msg.type === "order_created" || msg.type === "order_updated") {
          const o = msg.order;
          if (o) {
            const st = String(o.status || "").toLowerCase();
            if (st === "completed" || st === "cancelled") {
              // заказ завершён/отменён → убираем маркер с карты
              removeOrderMarker(o.id);
            } else {
              upsertOrderMarker({
                orderId: o.id,
                status: o.status,
                orderType: o.orderType,
                customer: o.customer,
                phone: o.phone,
                addressLat: o.addressLat,
                addressLng: o.addressLng,
                address: o.address,
                addressStreet: o.addressStreet ?? null,
                addressHouse: o.addressHouse ?? null,
                addressBuilding: o.addressBuilding ?? null,
                addressApartment: o.addressApartment ?? null,
                addressFloor: o.addressFloor ?? null,
                addressCode: o.addressCode ?? null,
                courierId: o.courierId,
                courierName: o.courierName ?? null,
                pickupId: o.pickupId,
              });
            }
          }
        }

        if (msg.type === "order_deleted" && msg.orderId != null) {
          removeOrderMarker(msg.orderId);
        }

        // ETA курьера до адреса заказа (считает сервер через osrm-eta-service)
        if (msg.type === "eta" && msg.orderId != null) {
          const key = String(msg.orderId);
          etaRef.current.set(key, {
            courierId: msg.courierId != null ? String(msg.courierId) : null,
            totalSec: Number(msg.totalSec),
            distanceM: Number(msg.distanceM),
            etaAt: msg.etaAt || null,
          });
          const o = orderDataRef.current.get(key);
          if (o) upsertOrderMarker(o); // перерисовать пин с бейджем ETA
        }
        if (msg.type === "eta_clear" && msg.orderId != null) {
          const key = String(msg.orderId);
          etaRef.current.delete(key);
          const o = orderDataRef.current.get(key);
          if (o) upsertOrderMarker(o);
        }
      } catch (e) {
        console.warn("WS message handler error", e);
      }
    }, { companyId });

    return () => {
      try {
        ws.close();
      } catch (e) { }

      for (const { rafId } of animRef.current.values()) {
        if (rafId) cancelAnimationFrame(rafId);
      }
      animRef.current.clear();

      try {
        map.remove();
      } catch (e) { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------- COURIERS --------------------
  function focusCourier(courierId) {
    const map = mapRef.current;
    if (!map) return;

    const marker = courierMarkersRef.current.get(String(courierId));
    if (!marker) return;

    map.setView(marker.getLatLng(), COURIER_FOCUS_ZOOM, { animate: true });
  }

  function formatSpeed(speedKmh) {
    if (typeof speedKmh !== "number") return t("map.speedUnknown");
    return t("map.speedValue", { value: speedKmh.toFixed(0) });
  }

  // Цвет курьера: заданный админом, иначе детерминированный из палитры
  function colorForCourier(id) {
    if (id == null) return "#94A3B8";
    return courierColorsRef.current.get(String(id)) || courierColor(id);
  }

  function createCourierIconHTML(key, speedKmh, nickname, color) {
    const speedText =
      typeof speedKmh === "number"
        ? t("map.speedValue", { value: speedKmh.toFixed(0) })
        : t("map.speedDash");

    const title = nickname
      ? t("map.markerTitleWithNickname", { nickname, id: key })
      : t("map.markerTitle", { id: key });

    return `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="
            width:46px;height:46px;border-radius:50%;
            background:${color}26;border:2px solid ${color};
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 8px rgba(0,0,0,.28);
        ">
          <img src="/car.png" style="width:32px;height:32px;"/>
        </div>
        <div style="
            margin-top:3px;
            background: rgba(15, 23, 42, 0.66);
            border-bottom:3px solid ${color};
            padding:2px 6px;
            border-radius:4px;
            font-size:12px;
            color:#fff;
            text-align:center;
            white-space:nowrap;
        ">
            ${title} | ${speedText}
        </div>
      </div>
    `;
  }

  function haversineKm([lat1, lon1], [lat2, lon2]) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function animateCourierMarker(key, marker, from, to, speedKmh) {
    const prev = animRef.current.get(key);
    if (prev?.rafId) cancelAnimationFrame(prev.rafId);

    const distanceKm = haversineKm([from.lat, from.lng], [to.lat, to.lng]);
    let duration = 1000;

    if (typeof speedKmh === "number" && speedKmh > 0 && distanceKm > 0) {
      duration = (distanceKm / speedKmh) * 3600 * 1000;
    }
    duration = Math.max(200, Math.min(duration, 6000));

    const start = performance.now();

    function step(now) {
      const tt = Math.min(1, (now - start) / duration);
      const ease = tt < 0.5 ? 2 * tt * tt : -1 + (4 - 2 * tt) * tt;

      marker.setLatLng([
        from.lat + (to.lat - from.lat) * ease,
        from.lng + (to.lng - from.lng) * ease,
      ]);

      if (tt < 1) {
        const rafId = requestAnimationFrame(step);
        animRef.current.set(key, { rafId, start, duration, from, to });
      } else {
        animRef.current.delete(key);
      }
    }

    const rafId = requestAnimationFrame(step);
    animRef.current.set(key, { rafId, start, duration, from, to });
  }

  function removeCourierMarker(courierId) {
    try {
      const key = String(courierId);
      const marker = courierMarkersRef.current.get(key);
      const mapLocal = mapRef.current;
      if (marker && mapLocal) {
        try {
          mapLocal.removeLayer(marker);
        } catch (e) { }
      }
      courierMarkersRef.current.delete(key);
      animRef.current.delete(key);

      setCouriers((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    } catch (e) { }
  }

  function upsertCourierMarker({ courierId, lat, lng, speedKmh, status, courierNickname }) {
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const key = String(courierId);
    const map = mapRef.current;
    if (!map) return;

    const color = colorForCourier(key);
    const html = createCourierIconHTML(key, speedKmh, courierNickname, color);

    let marker = courierMarkersRef.current.get(key);
    if (!marker) {
      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [46, 74],
        iconAnchor: [23, 46],
      });
      marker = L.marker([lat, lng], { icon }).addTo(map);
      courierMarkersRef.current.set(key, marker);
    } else {
      marker.setIcon(
        L.divIcon({
          html,
          className: "",
          iconSize: [46, 74],
          iconAnchor: [23, 46],
        })
      );

      const from = marker.getLatLng();
      const to = L.latLng(lat, lng);

      if (map.distance(from, to) < 1) {
        marker.setLatLng(to);
      } else {
        animateCourierMarker(
          key,
          marker,
          { lat: from.lat, lng: from.lng },
          { lat: to.lat, lng: to.lng },
          speedKmh
        );
      }
    }

    setCouriers((prev) => {
      const next = new Map(prev);
      next.set(key, {
        courierId: key,
        lat,
        lng,
        speedKmh: speedKmh ?? null,
        status: status ?? "unknown",
        courierNickname: courierNickname ?? null,
      });
      return next;
    });
  }

  // -------------------- ORDERS --------------------
  function focusOrder(orderId) {
    const map = mapRef.current;
    if (!map) return;

    const marker = orderMarkersRef.current.get(String(orderId));
    if (!marker) return;

    // строго по центру, без смещений
    map.setView(marker.getLatLng(), ORDER_FOCUS_ZOOM, { animate: true });

    try {
      marker.openPopup();
    } catch (e) { }
  }

  // «≈ 12 мин · 15:42»
  function formatEta(eta) {
    if (!eta || !Number.isFinite(eta.totalSec)) return null;
    const min = Math.max(1, Math.round(eta.totalSec / 60));
    let at = "";
    if (eta.etaAt) {
      try {
        at = new Date(eta.etaAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (e) { }
    }
    return t("map.eta", { defaultValue: "≈ {{min}} мин", min }) + (at ? ` · ${at}` : "");
  }

  function createOrderPinHTML(color, status, etaText) {
    const s = String(status || "").toLowerCase();
    const enroute = s === "enroute";

    const etaBadge = etaText
      ? `<div style="
            position:absolute;left:50%;top:${PIN_H + 2}px;transform:translateX(-50%);
            background:rgba(15,23,42,.75);border-bottom:3px solid ${color};
            padding:1px 6px;border-radius:4px;font-size:11px;font-weight:600;
            color:#fff;white-space:nowrap;pointer-events:none;
        ">${etaText}</div>`
      : "";

    const pulse = enroute
      ? `<span style="position:absolute;left:50%;top:14px;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;background:${color};opacity:.45;animation:mapPulse 1.5s ease-out infinite;"></span>`
      : "";

    // enroute → закрашенная точка внутри (везёт); иначе просто белый центр
    const inner = enroute ? `<circle cx="14" cy="14" r="4" fill="${color}"/>` : "";

    return `
      <div style="position:relative;width:${PIN_W}px;height:${PIN_H}px;">
        ${pulse}
        <svg width="${PIN_W}" height="${PIN_H}" viewBox="0 0 28 38"
             style="position:relative;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">
          <path d="M14 0C6.3 0 0 6.3 0 14c0 9.5 14 24 14 24s14-14.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}"/>
          <circle cx="14" cy="14" r="7" fill="#ffffff"/>
          ${inner}
        </svg>
        ${etaBadge}
      </div>
    `;
  }

  function upsertOrderMarker(order) {
    const lat = Number(order.addressLat);
    const lng = Number(order.addressLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const map = mapRef.current;
    if (!map) return;

    const key = String(order.orderId);
    orderDataRef.current.set(key, order); // для перерисовки при eta/eta_clear

    const addrLine =
      order.address ||
      [
        order.addressStreet,
        order.addressHouse,
        order.addressBuilding ? `k.${order.addressBuilding}` : null,
        order.addressApartment ? `kv.${order.addressApartment}` : null,
        order.addressFloor ? `et.${order.addressFloor}` : null,
        order.addressCode ? `kod ${order.addressCode}` : null,
      ]
        .filter(Boolean)
        .join(", ");

    const statusLc = String(order.status || "").toLowerCase();
    const color = colorForCourier(order.courierId);

    // ETA показываем только пока заказ назначен курьеру и не завершён
    const eta = order.courierId != null ? etaRef.current.get(key) : null;
    const etaText = formatEta(eta);

    const statusText =
      statusLc === "enroute"
        ? t("map.orderStatus.enroute", { defaultValue: "В пути" })
        : order.courierId != null
          ? t("map.orderStatus.taken", { defaultValue: "Взят" })
          : t("map.orderStatus.free", { defaultValue: "Свободен" });

    const courierLine = order.courierName ? `  ·  ${order.courierName}` : "";

    const etaLine = etaText
      ? `<span style="font-weight:600;">⏱ ${etaText}</span>` +
        (eta && Number.isFinite(eta.distanceM)
          ? ` · ${(eta.distanceM / 1000).toFixed(1)} км`
          : "") +
        `<br/>`
      : "";

    const popupHtml =
      `<b>Заказ #${key}</b><br/>` +
      `<span style="color:${color};font-weight:600;">${statusText}</span>${courierLine}<br/>` +
      etaLine +
      `${addrLine || ""}<br/>${order.customer || ""} ${order.phone || ""}`;

    const icon = L.divIcon({
      html: createOrderPinHTML(color, order.status, etaText),
      className: "",
      iconSize: [PIN_W, PIN_H],
      iconAnchor: [Math.round(PIN_W / 2), PIN_H],
      popupAnchor: [0, -PIN_H],
    });

    let marker = orderMarkersRef.current.get(key);

    if (!marker) {
      marker = L.marker([lat, lng], { icon }).addTo(map);

      marker.bindPopup(popupHtml, {
        autoPan: false,
        closeButton: true,
        keepInView: false,
      });

      marker.on("click", () => focusOrder(key));
      orderMarkersRef.current.set(key, marker);
    } else {
      marker.setIcon(icon);
      marker.setLatLng([lat, lng]);
      try { marker.setPopupContent(popupHtml); } catch (e) { }
    }

    setOrders((prev) => {
      const next = new Map(prev);
      next.set(key, order);
      return next;
    });
  }

  function removeOrderMarker(orderId) {
    const key = String(orderId);
    const map = mapRef.current;
    const marker = orderMarkersRef.current.get(key);
    if (marker && map) {
      try {
        map.removeLayer(marker);
      } catch (e) { }
    }
    orderMarkersRef.current.delete(key);
    orderDataRef.current.delete(key);
    etaRef.current.delete(key);
    setOrders((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  const couriersList = Array.from(couriers.values());
  const ordersList = Array.from(orders.values());

  const statusLabel = (status) =>
    t(`map.status.${String(status || "unknown").toLowerCase()}`, {
      defaultValue: status || "unknown",
    });

  return (
    <div className={styles.container}>
      <Header />

      <div className={styles.courierPanel}>
        <div className={styles.courierPanelHeader}>
          <div className={styles.courierPanelTitle}>
            <Navigation2 className={styles.titleIcon} />
            <span>{t("map.activeCouriers")}</span>
          </div>
          <span className={styles.courierBadge}>{couriersList.length}</span>
        </div>

        {couriersList.length === 0 && (
          <div className={styles.emptyText}>{t("map.noActiveCouriers")}</div>
        )}

        <div className={styles.courierList}>
          {couriersList.map((c) => (
            <div
              key={c.courierId}
              className={styles.courierItem}
              role="button"
              tabIndex={0}
              onClick={() => focusCourier(c.courierId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  focusCourier(c.courierId);
                }
              }}
            >
              <div className={styles.courierMain}>
                <span className={styles.courierId}>
                  {c.courierNickname ?? `#${c.courierId}`}
                </span>
                <span className={styles.courierMeta}>
                  {statusLabel(c.status)} · {formatSpeed(c.speedKmh)}
                </span>
              </div>

              <div className={styles.courierActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={t("map.actions.focus")}
                  onClick={(e) => {
                    e.stopPropagation();
                    focusCourier(c.courierId);
                  }}
                >
                  <Navigation2 className={styles.icon} />
                </button>

                <button
                  type="button"
                  className={styles.iconButton}
                  title={t("map.actions.info")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className={styles.icon} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Список заказов */}
        <div
          style={{
            marginTop: 10,
            borderTop: "1px solid rgba(148,163,184,0.2)",
            paddingTop: 8,
          }}
        >
          <div className={styles.courierPanelHeader}>
            <div className={styles.courierPanelTitle}>
              <Package className={styles.titleIcon} />
              <span>Заказы</span>
            </div>
            <span className={styles.courierBadge}>{ordersList.length}</span>
          </div>

          {ordersList.length === 0 && (
            <div className={styles.emptyText}>Нет заказов с координатами</div>
          )}

          <div className={styles.courierList}>
            {ordersList.slice(0, 30).map((o) => (
              <div
                key={String(o.orderId)}
                className={styles.courierItem}
                role="button"
                tabIndex={0}
                onClick={() => focusOrder(o.orderId)}
              >
                <div className={styles.courierMain}>
                  <span className={styles.courierId}>
                    #{o.orderId} {o.customer ? `· ${o.customer}` : ""}
                  </span>
                  <span className={styles.courierMeta}>{o.status || "-"}</span>
                </div>
              </div>
            ))}
          </div>

          {ordersList.length > 30 && (
            <div className={styles.emptyText} style={{ marginTop: 6 }}>
              Показаны первые 30 заказов
            </div>
          )}
        </div>
      </div>

      <div id="map" className={styles.map} />
    </div>
  );
}