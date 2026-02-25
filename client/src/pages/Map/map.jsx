import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { createAdminSocket } from "../../ws.js";
import { Info, Navigation2, Package } from "lucide-react";
import styles from "./map.module.css";
import Header from "../../components/Header/Header.jsx";
import { useTranslation } from "react-i18next";

const defaultCenter = [56.94937, 24.10525]; // Riga
const ORDER_FOCUS_ZOOM = 16;
const COURIER_FOCUS_ZOOM = 16;

const ORDER_ICON_W = 50;
const ORDER_ICON_H = 50;

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

  const mapRef = useRef(null);

  // couriers
  const courierMarkersRef = useRef(new Map()); // courierId -> marker
  const animRef = useRef(new Map()); // courierId -> { rafId, start, duration, from, to }

  // orders
  const orderMarkersRef = useRef(new Map()); // orderId -> marker

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

    (async () => {
      try {
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
              pickupId: o.pickupId,
            });
          }
        }

        if (msg.type === "order_deleted" && msg.orderId != null) {
          removeOrderMarker(msg.orderId);
        }
      } catch (e) {
        console.warn("WS message handler error", e);
      }
    });

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

  function createCourierIconHTML(key, speedKmh, nickname) {
    const speedText =
      typeof speedKmh === "number"
        ? t("map.speedValue", { value: speedKmh.toFixed(0) })
        : t("map.speedDash");

    const title = nickname
      ? t("map.markerTitleWithNickname", { nickname, id: key })
      : t("map.markerTitle", { id: key });

    return `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <img src="/car.png" style="width:41px;height:41px;transform:translateY(-2px)"/>
        <div style="
            background: rgba(15, 23, 42, 0.56);
            padding:2px 6px;
            border-radius:4px;
            font-size:12px;
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

    const html = createCourierIconHTML(key, speedKmh, courierNickname);

    let marker = courierMarkersRef.current.get(key);
    if (!marker) {
      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [41, 60],
        iconAnchor: [20, 41],
      });
      marker = L.marker([lat, lng], { icon }).addTo(map);
      courierMarkersRef.current.set(key, marker);
    } else {
      marker.setIcon(
        L.divIcon({
          html,
          className: "",
          iconSize: [41, 60],
          iconAnchor: [20, 41],
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

  function createOrderIconHTML() {
    return `
      <div style="display:flex;align-items:center;justify-content:center;">
        <img
          src="/order_marker.png"
          style="width:${ORDER_ICON_W}px;height:${ORDER_ICON_H}px;display:block;image-rendering:auto;"
          alt=""
        />
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

    const icon = L.divIcon({
      html: createOrderIconHTML(),
      className: "",
      iconSize: [ORDER_ICON_W, ORDER_ICON_H],
      iconAnchor: [Math.round(ORDER_ICON_W / 2), ORDER_ICON_H],
      popupAnchor: [0, -ORDER_ICON_H],
    });

    let marker = orderMarkersRef.current.get(key);

    if (!marker) {
      marker = L.marker([lat, lng], { icon }).addTo(map);

      marker.bindPopup(
        `<b>Заказ #${key}</b><br/>${addrLine || ""}<br/>${order.customer || ""} ${order.phone || ""}`,
        {
          autoPan: false,        
          closeButton: true,
          keepInView: false,
        }
      );

      marker.on("click", () => focusOrder(key));
      orderMarkersRef.current.set(key, marker);
    } else {
      marker.setIcon(icon);
      marker.setLatLng([lat, lng]);
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