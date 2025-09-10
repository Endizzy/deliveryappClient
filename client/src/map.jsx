import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { createAdminSocket } from "./ws";
import './map.css'
import {useNavigate} from "react-router-dom";

const defaultCenter = [56.94937, 24.10525]; // Riga
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIyMzc2M2E2YjZmZDRmMjFiMTg1ZWJkN2Y1MzZhNmE2IiwiaCI6Im11cm11cjY0In0=";

export default function DeliveryMap() {
    const mapRef = useRef(null);
    const markersRef = useRef(new Map()); // courierId -> marker
    const routesRef = useRef(new Map());  // courierId -> polyline
    const ordersRef = useRef(new Map());  // courierId -> order marker
    const [info, setInfo] = useState({count: 0, last: null});
    const navigate = useNavigate();

    useEffect(() => {
        const map = L.map("map", {zoomControl: true}).setView(defaultCenter, 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        mapRef.current = map;

        // WS соединение
        const ws = createAdminSocket(async (msg) => {
            if (msg.type === "snapshot") {
                for (const it of msg.items) await upsertMarker(it);
                setInfo((p) => ({...p, count: msg.items.length}));
            }
            if (msg.type === "location") {
                await upsertMarker(msg);
                setInfo((p) => ({...p, last: msg}));
            }
        });

        // Тестовый заказ для реального курьера #1060
        setTimeout(async () => {
            const courierMarker = markersRef.current.get("37536");
            if (courierMarker) {
                await upsertMarker({
                    courierId: 37536,
                    lat: courierMarker.getLatLng().lat,
                    lng: courierMarker.getLatLng().lng,
                    status: "assigned",
                    order: {lat: 56.955, lng: 24.115}, // тестовая точка заказа
                });
            }
        }, 2000);

        return () => {
            ws.close();
            map.remove();
        };
    }, []);

    async function fetchRoute(from, to) {
        try {
            const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}`;
            const body = {coordinates: [[from.lng, from.lat], [to.lng, to.lat]]};
            const res = await fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                return data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            }
            return [];
        } catch (e) {
            console.error("Route fetch error", e);
            return [];
        }
    }

    async function upsertMarker({courierId, lat, lng, speedKmh, status, order}) {
        const key = String(courierId);
        const map = mapRef.current;
        if (!map) return;

        // Маркер курьера
        const speedText = typeof speedKmh === "number" ? `${speedKmh.toFixed(0)} км/ч` : "—";
        const html = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <img src="/car.png" style="width:41px;height:41px;" />
        <div style="
            background:rgba(0,0,0,0.6);
            color:white;
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
            const icon = L.divIcon({html, className: "", iconSize: [41, 60], iconAnchor: [20, 41]});
            marker = L.marker([lat, lng], {icon}).addTo(map);
            markersRef.current.set(key, marker);
        } else {
            marker.setIcon(L.divIcon({html, className: "", iconSize: [41, 60], iconAnchor: [20, 41]}));
            marker.setLatLng([lat, lng]);
        }

        // Маркер заказа
        if (order && order.lat && order.lng) {
            let orderMarker = ordersRef.current.get(key);
            if (!orderMarker) {
                orderMarker = L.marker([order.lat, order.lng], {
                    icon: L.divIcon({
                        html: `<div style="background:red;color:white;padding:2px 4px;border-radius:3px;font-size:12px;">Заказ</div>`,
                        className: "",
                        iconSize: [50, 30],
                        iconAnchor: [25, 15]
                    })
                }).addTo(map);
                ordersRef.current.set(key, orderMarker);
            } else {
                orderMarker.setLatLng([order.lat, order.lng]);
            }

            // Для теста
            const routeCoords = [
                [lat, lng],
                [(lat + order.lat) / 2, (lng + order.lng) / 2],
                [order.lat, order.lng]
            ];

            const oldLine = routesRef.current.get(key);
            if (oldLine) map.removeLayer(oldLine);

            const polyline = L.polyline(routeCoords, {color: "blue", weight: 3, dashArray: "5,5"}).addTo(map);
            routesRef.current.set(key, polyline);
        } else {
            const oldLine = routesRef.current.get(key);
            if (oldLine) {
                map.removeLayer(oldLine);
                routesRef.current.delete(key);
            }
            const oldOrder = ordersRef.current.get(key);
            if (oldOrder) {
                map.removeLayer(oldOrder);
                ordersRef.current.delete(key);
            }
        }
    }

    return (
        <div
            style={{
                height: "100vh",
                width: "100vw",
                display: "flex",
                flexDirection: "column",
                margin: 0,
                padding: 0,
                boxSizing: "border-box"
            }}
        >
            <header
                style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #eee",
                    width: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#black",
                    zIndex: 1000
                }}
            >
                <strong>Delivery Admin Map</strong>
                <span style={{ marginLeft: 12, opacity: 0.7 }}>Курьеров: {info.count}</span>
                {info.last && (
                    <span style={{ marginLeft: 12, opacity: 0.7 }}>
          Последний апдейт: #{info.last.courierId} ({info.last.lat.toFixed(5)}, {info.last.lng.toFixed(5)})
        </span>
                )}
                <button  onClick={() => navigate('/orderPanel')}> Панель заказов </button>
            </header>

            <div
                id="map"
                style={{
                    flexGrow: 1,
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box"
                }}
            />
        </div>
    );
}
