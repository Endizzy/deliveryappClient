// Минимальный парсер KML (экспорт Google MyMaps): достаёт полигоны как зоны.
// MultiGeometry разбивается на отдельные полигоны (по одному слою на полигон).

function parseCoordString(text) {
  // KML: "lng,lat,alt lng,lat,alt ..." (через пробелы/переводы строк)
  return (text || "")
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [lng, lat] = tok.split(",").map(Number);
      return [lng, lat];
    })
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

// KML-цвет в формате aabbggrr → #rrggbb (без альфы)
function kmlColorToHex(kmlColor) {
  const c = (kmlColor || "").trim();
  if (!/^[0-9a-fA-F]{8}$/.test(c)) return null;
  const bb = c.slice(2, 4);
  const gg = c.slice(4, 6);
  const rr = c.slice(6, 8);
  return `#${rr}${gg}${bb}`.toLowerCase();
}

export function kmlToZones(kmlString) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(kmlString, "application/xml");
  } catch {
    return [];
  }
  if (doc.getElementsByTagName("parsererror").length) return [];

  const placemarks = Array.from(doc.getElementsByTagName("Placemark"));
  const zones = [];

  for (const pm of placemarks) {
    const name =
      pm.getElementsByTagName("name")[0]?.textContent?.trim() || "Зона";

    // цвет: ищем PolyStyle > color внутри placemark (inline-стиль)
    let color = null;
    const polyColor = pm.querySelector?.("PolyStyle > color");
    if (polyColor) color = kmlColorToHex(polyColor.textContent);

    const polygons = Array.from(pm.getElementsByTagName("Polygon"));
    polygons.forEach((poly, idx) => {
      // берём внешнюю границу (outerBoundaryIs)
      const outer =
        poly.querySelector?.("outerBoundaryIs LinearRing coordinates") ||
        poly.getElementsByTagName("coordinates")[0];
      if (!outer) return;
      const ring = parseCoordString(outer.textContent);
      if (ring.length < 4) return;

      // замыкаем кольцо, если не замкнуто
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);

      zones.push({
        name: polygons.length > 1 ? `${name} ${idx + 1}` : name,
        color: color || undefined,
        geometry: { type: "Polygon", coordinates: [ring] },
      });
    });
  }

  return zones;
}
