// Определение зоны доставки для точки (point-in-polygon через turf).
import { point, booleanPointInPolygon } from "@turf/turf";

// Возвращает первую зону, в которую попадает точка, либо null.
export function findZoneForPoint(lat, lng, zones) {
  if (!Array.isArray(zones) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const pt = point([lng, lat]);
  for (const z of zones) {
    const g = z?.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    try {
      if (booleanPointInPolygon(pt, g)) return z;
    } catch {
      // некорректная геометрия — пропускаем
    }
  }
  return null;
}
