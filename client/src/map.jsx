import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { createAdminSocket } from "./ws";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Info, Navigation2 } from "lucide-react";
import styles from "./map.module.css";

const defaultCenter = [56.94937, 24.10525]; // Riga

export default function DeliveryMap() {
    const mapRef = useRef(null);
    const markersRef = useRef(new Map()); // courierId -> marker
    // animation handles per marker
    const animRef = useRef(new Map()); // courierId -> { rafId, start, duration, from, to }

    // Список активных курьеров для отображения в UI
    const [couriers, setCouriers] = useState(new Map()); // courierId -> {courierId, lat, lng, speedKmh, status}
    const [info, setInfo] = useState({ count: 0, last: null });

    const navigate = useNavigate();

    useEffect(() => {
        const map = L.map("map", { zoomControl: true }).setView(defaultCenter, 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        map.zoomControl.setPosition("bottomright");
        mapRef.current = map;

        // WS соединение
        const ws = createAdminSocket(async (msg) => {
            if (msg.type === "snapshot") {
                for (const it of msg.items) await upsertMarker(it);
                setInfo((p) => ({ ...p }));
            }
            if (msg.type === "location") {
                await upsertMarker(msg);
                setInfo((p) => ({ ...p, last: msg }));
            }
        });

        return () => {
            ws.close();
            // cancel any running animations
            for (const { rafId } of animRef.current.values()) {
                if (rafId) cancelAnimationFrame(rafId);
            }
            map.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Фокус на конкретном курьере
    function focusCourier(courierId) {
        const map = mapRef.current;
        if (!map) return;

        const marker = markersRef.current.get(String(courierId));
        if (!marker) return;

        const latLng = marker.getLatLng();
        map.setView(latLng, 16, { animate: true });
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

    // Простая функция гаверсина для расстояния (км)
    function haversineKm([lat1, lon1], [lat2, lon2]) {
        const toRad = (d) => (d * Math.PI) / 180;
        const R = 6371; // km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Анимация маркера от from -> to за duration миллисекунд
    function animateMarker(key, marker, from, to, speedKmh) {
        // отменяем предыдущую анимацию
        const prev = animRef.current.get(key);
        if (prev && prev.rafId) cancelAnimationFrame(prev.rafId);

        // duration: попытка вычислить по реальной скорости, иначе дефолт
        let distanceKm = haversineKm([from.lat, from.lng], [to.lat, to.lng]);
        let duration = 1000; // ms default
        if (typeof speedKmh === "number" && speedKmh > 0 && distanceKm > 0) {
            duration = (distanceKm / speedKmh) * 3600 * 1000; // hours -> ms
        }
        // clamp duration чтобы не было слишком медленно или мгновенно
        duration = Math.max(200, Math.min(duration, 6000));

        const start = performance.now();

        function step(now) {
            const t = Math.min(1, (now - start) / duration);
            // easeInOutQuad for nicer motion
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

            const lat = from.lat + (to.lat - from.lat) * ease;
            const lng = from.lng + (to.lng - from.lng) * ease;
            marker.setLatLng([lat, lng]);

            if (t < 1) {
                const rafId = requestAnimationFrame(step);
                animRef.current.set(key, { rafId, start, duration, from, to });
            } else {
                // finished
                animRef.current.delete(key);
            }
        }

        const rafId = requestAnimationFrame(step);
        animRef.current.set(key, { rafId, start, duration, from, to });
    }

    async function upsertMarker({ courierId, lat, lng, speedKmh, status, courierNickname }) {
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
            // обновляем иконку (чтобы текст/скорость/ник обновились)
            marker.setIcon(
                L.divIcon({
                    html,
                    className: "",
                    iconSize: [41, 60],
                    iconAnchor: [20, 41],
                })
            );

            // плавная анимация как было...
            const from = marker.getLatLng();
            const to = L.latLng(lat, lng);
            const distanceMeters = map.distance(from, to);
            if (distanceMeters < 1) {
                marker.setLatLng(to);
            } else {
                animateMarker(key, marker, { lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }, speedKmh);
            }
        }

        // Обновляем React-стейт курьеров (с nickname)
        setCouriers((prev) => {
            const next = new Map(prev);
            next.set(key, {
                courierId: key,
                lat,
                lng,
                speedKmh: typeof speedKmh === "number" ? speedKmh : null,
                status: status ?? "unknown",
                courierNickname: courierNickname ?? null,
            });
            return next;
        });
    }

    // Преобразуем Map в массив для рендера
    const couriersList = Array.from(couriers.values());

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.brand}>Delivery Admin Map</span>
                    <span className={styles.counter}>
            Курьеров: <strong>{couriers.size}</strong>
          </span>
                    {info.last && (
                        <span className={styles.lastUpdate}>
              Последний апдейт: #{info.last.courierId} (
                            {info.last.lat.toFixed(5)}, {info.last.lng.toFixed(5)})
            </span>
                    )}
                </div>
                <button
                    className={styles.ordersButton}
                    onClick={() => navigate("/orderPanel")}
                >
                    Панель заказов
                </button>
            </header>

            {/* Панель с курьерами в левом верхнем углу */}
            <div className={styles.courierPanel}>
                <div className={styles.courierPanelHeader}>
                    <div className={styles.courierPanelTitle}>
                        <Navigation2 className={styles.titleIcon} />
                        <span>Активные курьеры</span>
                    </div>
                    <span className={styles.courierBadge}>{couriersList.length}</span>
                </div>

                {couriersList.length === 0 && (
                    <div className={styles.emptyText}>Нет активных курьеров</div>
                )}

                <div className={styles.courierList}>
                    {couriersList.map((c) => (
                        <button
                            key={c.courierId}
                            className={styles.courierItem}
                            onClick={() => focusCourier(c.courierId)}
                        >
                            <div className={styles.courierMain}>
                                <span className={styles.courierId}>{c.courierNickname ? c.courierNickname : `#${c.courierId}`}</span>
                                <span className={styles.courierMeta}>
                  {c.status || "unknown"} · {typeof c.speedKmh === "number" ? `${c.speedKmh.toFixed(0)} км/ч` : "скорость —"}
                </span>
                            </div>
                            <div className={styles.courierActions}>
                                <button
                                    type="button"
                                    className={styles.iconButton}
                                    title="Навести карту на курьера"
                                >
                                    <Navigation2 className={styles.icon} />
                                </button>
                                <button
                                    type="button"
                                    className={styles.iconButton}
                                    title="Информация"
                                >
                                    <Info className={styles.icon} />
                                </button>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div id="map" className={styles.map} />
        </div>
    );
}