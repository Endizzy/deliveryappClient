import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createAdminSocket } from './ws';

const defaultCenter = [56.94937, 24.10525]; // Riga

export default function Map() {
    const mapRef = useRef(null);
    const markersRef = useRef(new window.Map()); // courierId -> marker
    const [info, setInfo] = useState({ count: 0, last: null });

    useEffect(() => {
        // map
        const map = L.map('map', { zoomControl: true }).setView(defaultCenter, 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        mapRef.current = map;

        // WS 
        const ws = createAdminSocket((msg) => {
            if (msg.type === 'snapshot') {
                msg.items.forEach((it) => upsertMarker(it));
                setInfo((p) => ({ ...p, count: msg.items.length }));
            }
            if (msg.type === 'location') {
                upsertMarker(msg);
                setInfo((p) => ({ ...p, last: msg }));
            }
        });

        return () => {
            ws.close();
            map.remove();
        };
    }, []);

    function upsertMarker({ courierId, lat, lng, speedKmh, status, orderId }) {
        const key = String(courierId);
        const map = mapRef.current;
        if (!map) return;

        const speedText = typeof speedKmh === 'number' ? `${speedKmh.toFixed(0)} км/ч` : '—';
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
            const icon = L.divIcon({ html, className: '', iconSize: [41, 60], iconAnchor: [20, 41] });
            marker = L.marker([lat, lng], { icon });
            marker.addTo(map);
            markersRef.current.set(key, marker);
        } else {
            marker.setIcon(L.divIcon({ html, className: '', iconSize: [41, 60], iconAnchor: [20, 41] }));

            const from = marker.getLatLng();
            const to = L.latLng(lat, lng);
            animateMarker(marker, from, to, 800);
        }
    }

    function animateMarker(marker, from, to, durationMs) {
        const start = performance.now();
        function frame(now) {
            const t = Math.min(1, (now - start) / durationMs);
            const lat = from.lat + (to.lat - from.lat) * t;
            const lng = from.lng + (to.lng - from.lng) * t;
            marker.setLatLng([lat, lng]);
            if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', minWidth: '1600px' }}>
            <header style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                <strong>Delivery Admin Map</strong>
                <span style={{ marginLeft: 12, opacity: 0.7 }}>Курьеров: {info.count}</span>
                {info.last && (
                    <span style={{ marginLeft: 12, opacity: 0.7 }}>
                        Последний апдейт: #{info.last.courierId} ({info.last.lat.toFixed(5)}, {info.last.lng.toFixed(5)})
                    </span>
                )}
            </header>
            <div id="map" style={{ flex: 1, width: '100%', height: '100%' }} />
        </div>
    );
}
