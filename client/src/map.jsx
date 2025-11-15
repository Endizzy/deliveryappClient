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

    // Список активных курьеров для отображения в UI
    const [couriers, setCouriers] = useState(new Map()); // courierId -> {courierId, lat, lng, speedKmh, status}
    const [info, setInfo] = useState({ count: 0, last: null });

    const navigate = useNavigate();

    useEffect(() => {
        const map = L.map("map", { zoomControl: true }).setView(defaultCenter, 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        map.zoomControl.setPosition('bottomright');
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

    async function upsertMarker({ courierId, lat, lng, speedKmh, status }) {
        const key = String(courierId);
        const map = mapRef.current;
        if (!map) return;

        // Маркер курьера
        const speedText =
            typeof speedKmh === "number" ? `${speedKmh.toFixed(0)} км/ч` : "—";
        const html = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <img src="/car.png" style="width:41px;height:41px;" />
        <div style="
            background: rgba(15, 23, 42, 0.56);
            padding:2px 4px;
            border-radius:3px;
            font-size:12px;
            text-align:center;
        ">
            #${key} | ${speedText}
        </div>
      </div>
    `;

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
            marker.setLatLng([lat, lng]);
        }

        // Обновляем React-стейт курьеров
        setCouriers((prev) => {
            const next = new Map(prev);
            next.set(key, {
                courierId: key,
                lat,
                lng,
                speedKmh: typeof speedKmh === "number" ? speedKmh : null,
                status: status ?? "unknown",
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
                                <span className={styles.courierId}>#{c.courierId}</span>
                                <span className={styles.courierMeta}>
                  {c.status || "unknown"} ·{" "}
                                    {typeof c.speedKmh === "number"
                                        ? `${c.speedKmh.toFixed(0)} км/ч`
                                        : "скорость —"}
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
                                {/*<button*/}
                                {/*    type="button"*/}
                                {/*    className={styles.iconButton}*/}
                                {/*    title="Чат с курьером"*/}
                                {/*>*/}
                                {/*    <MessageCircle className={styles.icon} />*/}
                                {/*</button>*/}
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
