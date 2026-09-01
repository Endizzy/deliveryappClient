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

/**
 * Правила доставки для зоны при данной сумме заказа.
 *
 * База расчёта — сумма товаров со скидкой, без стоимости доставки: сама
 * доставка не должна влиять на то, бесплатна ли она.
 *
 * @param {object|null} zone           зона (может быть null — адрес вне зон)
 * @param {number} itemsTotal          сумма товаров со скидкой, в евро
 * @returns {{
 *   fee: number,            // сколько брать за доставку
 *   isFree: boolean,        // доставка бесплатна из-за достигнутого порога
 *   freeFrom: number|null,  // порог бесплатной доставки, если задан
 *   minOrder: number|null,  // минимальная сумма заказа, если задана
 *   belowMin: boolean,      // сумма ниже минимума зоны
 *   missingToMin: number,   // сколько не хватает до минимума
 *   missingToFree: number,  // сколько не хватает до бесплатной доставки
 * }}
 */
export function getZoneDeliveryRules(zone, itemsTotal) {
  // Осторожно с Number(): Number(null) === 0 и проходит isFinite, из-за чего
  // незаданное правило превращалось бы в «бесплатно от 0 €».
  const numOrNull = (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const total = numOrNull(itemsTotal) ?? 0;
  const baseFee = numOrNull(zone?.fee) ?? 0;   // не задана → доставка бесплатная
  const freeFrom = numOrNull(zone?.freeFrom);  // null → порога нет
  const minOrder = numOrNull(zone?.minOrder);  // null → минимума нет

  // Порог считаем достигнутым при равенстве: «бесплатно от 40 €» — значит и ровно 40 € бесплатно
  const isFree = freeFrom != null && total >= freeFrom;

  return {
    fee: isFree ? 0 : baseFee,
    isFree,
    freeFrom,
    minOrder,
    belowMin: minOrder != null && total < minOrder,
    missingToMin: minOrder != null ? Math.max(0, minOrder - total) : 0,
    missingToFree: freeFrom != null ? Math.max(0, freeFrom - total) : 0,
  };
}
