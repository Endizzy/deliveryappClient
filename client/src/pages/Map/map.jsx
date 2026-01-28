import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { createAdminSocket } from "../../ws.js";
import { Info, Navigation2 } from "lucide-react";
import styles from "./map.module.css";
import Header from "../../components/Header/Header.jsx";

const defaultCenter = [56.94937, 24.10525]; // Riga

export default function DeliveryMap() {
  const mapRef = useRef(null);
  const markersRef = useRef(new Map()); // courierId -> marker
  const animRef = useRef(new Map()); // courierId -> { rafId, start, duration, from, to }

  const [couriers, setCouriers] = useState(new Map());
  const [info, setInfo] = useState({ count: 0, last: null });

  useEffect(() => {
    const map = L.map("map", { zoomControl: true }).setView(defaultCenter, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.zoomControl.setPosition("bottomright");
    mapRef.current = map;

    const ws = createAdminSocket(async (msg) => {
      try {
        if (!msg) return;

        if (msg.type === "snapshot") {
          if (Array.isArray(msg.items)) {
            for (const it of msg.items) await upsertMarker(it);
          }
          setInfo((p) => ({ ...p, count: msg.items?.length ?? 0 }));
        }

        if (msg.type === "location") {
          await upsertMarker(msg);
          setInfo((p) => ({ ...p, last: msg }));
        }
      } catch (e) {
        console.warn("WS message handler error", e);
      }
    });

    return () => {
      try {
        ws.close();
      } catch (e) {}

      // Отменяем анимации
      for (const { rafId } of animRef.current.values()) {
        if (rafId) cancelAnimationFrame(rafId);
      }
      animRef.current.clear();

      try {
        map.remove();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusCourier(courierId) {
    const map = mapRef.current;
    if (!map) return;

    const marker = markersRef.current.get(String(courierId));
    if (!marker) return;

    map.setView(marker.getLatLng(), 16, { animate: true });
  }

  function createIconHTML(key, speedKmh, nickname) {
    const speedText = typeof speedKmh === "number" ? `${speedKmh.toFixed(0)} км/ч` : "—";
    const title = nickname ? `${nickname} (ID ${key})` : `#${key}`;
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
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function animateMarker(key, marker, from, to, speedKmh) {
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
      const t = Math.min(1, (now - start) / duration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      marker.setLatLng([
        from.lat + (to.lat - from.lat) * ease,
        from.lng + (to.lng - from.lng) * ease,
      ]);

      if (t < 1) {
        const rafId = requestAnimationFrame(step);
        animRef.current.set(key, { rafId, start, duration, from, to });
      } else {
        animRef.current.delete(key);
      }
    }

    const rafId = requestAnimationFrame(step);
    animRef.current.set(key, { rafId, start, duration, from, to });
  }

  async function upsertMarker({ courierId, lat, lng, speedKmh, status, courierNickname }) {
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const key = String(courierId);
    const map = mapRef.current;
    if (!map) return;

    const html = createIconHTML(key, speedKmh, courierNickname);

    let marker = markersRef.current.get(key);
    if (!marker) {
      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [41, 60],
        iconAnchor: [20, 41],
      });
      marker = L.marker([lat, lng], { icon }).addTo(map);
      markersRef.current.set(key, marker);
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
        animateMarker(
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

  const couriersList = Array.from(couriers.values());

  return (
    <div className={styles.container}>
      <Header />

      <div className={styles.courierPanel}>
        <div className={styles.courierPanelHeader}>
          <div className={styles.courierPanelTitle}>
            <Navigation2 className={styles.titleIcon} />
            <span>Активные курьеры</span>
          </div>
          <span className={styles.courierBadge}>{couriersList.length}</span>
        </div>

        {couriersList.length === 0 && <div className={styles.emptyText}>Нет активных курьеров</div>}

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
                <span className={styles.courierId}>{c.courierNickname ?? `#${c.courierId}`}</span>
                <span className={styles.courierMeta}>
                  {c.status ?? "unknown"} ·{" "}
                  {typeof c.speedKmh === "number" ? `${c.speedKmh.toFixed(0)} км/ч` : "скорость —"}
                </span>
              </div>

              <div className={styles.courierActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Навести карту на курьера"
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
                  title="Информация"
                  onClick={(e) => {
                    e.stopPropagation();
                    // сюда можно добавить модалку/детали
                    // console.log("Info", c);
                  }}
                >
                  <Info className={styles.icon} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="map" className={styles.map} />
    </div>
  );
}
