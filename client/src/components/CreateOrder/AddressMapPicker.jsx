import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const RIGA = [56.94937, 24.10525];
const FOCUS_ZOOM = 16;

const ICON_W = 46;
const ICON_H = 46;

export default function AddressMapPicker({ position, onChange, zones, height = 280 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const zonesLayerRef = useRef(null);

  // onChange держим в ref, чтобы обработчик dragend не «застывал» на старой версии
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // ── Инициализация карты один раз ───────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      RIGA,
      12
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.zoomControl.setPosition("bottomright");
    mapRef.current = map;

    // карта инициализируется внутри формы — иногда нужен пересчёт размера
    const t1 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 250);

    return () => {
      clearTimeout(t1);
      try {
        map.remove();
      } catch (e) {}
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // ── Обновление маркера при смене координат ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const lat = Number(position?.lat);
    const lng = Number(position?.lng);
    const valid = Number.isFinite(lat) && Number.isFinite(lng);

    if (!valid) {
      if (markerRef.current) {
        try {
          map.removeLayer(markerRef.current);
        } catch (e) {}
        markerRef.current = null;
      }
      return;
    }

    const icon = L.divIcon({
      html: `<img src="/order_marker.png" style="width:${ICON_W}px;height:${ICON_H}px;display:block;" alt="" />`,
      className: "",
      iconSize: [ICON_W, ICON_H],
      iconAnchor: [Math.round(ICON_W / 2), ICON_H],
    });

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(
        map
      );
      markerRef.current.on("dragend", () => {
        try {
          const ll = markerRef.current.getLatLng();
          onChangeRef.current?.({ lat: ll.lat, lng: ll.lng });
        } catch (e) {}
      });
    } else {
      markerRef.current.setIcon(icon);
      markerRef.current.setLatLng([lat, lng]);
    }

    map.setView([lat, lng], FOCUS_ZOOM, { animate: true });
  }, [position?.lat, position?.lng]);

  // ── Зоны доставки (только показ, не мешают перетаскиванию маркера) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (zonesLayerRef.current) {
      try {
        map.removeLayer(zonesLayerRef.current);
      } catch (e) {}
      zonesLayerRef.current = null;
    }

    if (!Array.isArray(zones) || zones.length === 0) return;

    const group = L.featureGroup();
    zones.forEach((z) => {
      const g = z?.geometry;
      if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return;
      const color = z.color || "#3B82F6";
      try {
        const layer = L.geoJSON(
          { type: "Feature", geometry: g, properties: {} },
          {
            style: {
              color,
              weight: 2,
              fillColor: color,
              fillOpacity: 0.12,
              interactive: false,
            },
          }
        );
        if (z.name) layer.bindTooltip(String(z.name), { sticky: true });
        layer.addTo(group);
      } catch (e) {}
    });
    group.addTo(map);
    zonesLayerRef.current = group;
  }, [zones]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(148,163,184,0.25)",
      }}
    />
  );
}
