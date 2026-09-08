export function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100);
}

export function formatCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n) / 100).toFixed(2);
}

export function discountedUnitCents(price, discountPercent = 0) {
  const priceCents = toCents(price);
  const d = Number(discountPercent) || 0;
  if (d <= 0) return priceCents;
  if (d >= 100) return 0;
  return Math.round((priceCents * (100 - d)) / 100);
}

export function lineTotalCents(price, discountPercent, quantity) {
  const q = Number(quantity) || 0;
  if (q <= 0) return 0;
  return discountedUnitCents(price, discountPercent) * q;
}

/**
 * База для процентной скидки клиента — только позиции БЕЗ скидки в меню.
 *
 * Иначе скидка удваивается: у акционной пиццы уже −20%, и персональные −10%
 * ложились сверху. Позиции со своей скидкой в базу не входят вовсе.
 */
export function percentDiscountBaseCents(items) {
  return (Array.isArray(items) ? items : []).reduce((sum, it) => {
    if (Number(it?.discount) > 0) return sum;
    return sum + lineTotalCents(it?.price, 0, it?.quantity);
  }, 0);
}

/** Варианты разовой скидки на заказ (день рождения, извинение за задержку) */
export const MANUAL_DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30];

/**
 * Итоговая скидка на заказ в центах.
 *
 * discount — постоянная скидка клиента ({ type, value }) или null.
 * manualPercent — разовая скидка на этот заказ, 0 если её нет.
 *
 * Правила:
 *  • percent считается от позиций БЕЗ скидки в меню (percentDiscountBaseCents);
 *  • fixed вычитается из всей суммы позиций и не может её превысить — это не
 *    процент, удвоения скидки тут не возникает;
 *  • если есть и постоянная, и разовая — применяется БОЛЬШАЯ из двух, они не
 *    складываются. Иначе карта −10% и разовая −20% дали бы −30%.
 *
 * Та же формула повторена на сервере в normalizeItemsAndAmounts — сервер
 * пересчитывает суммы сам и является источником правды. Меняя правило здесь,
 * поменяйте и там, иначе итог в форме разойдётся с сохранённым.
 */
export function customerDiscountCents(items, discount, manualPercent = 0) {
  const list = Array.isArray(items) ? items : [];
  const itemsTotal = list.reduce(
    (sum, it) => sum + lineTotalCents(it?.price, it?.discount, it?.quantity),
    0
  );
  const percentBase = percentDiscountBaseCents(list);

  // Постоянная скидка клиента
  let personalCents = 0;
  const value = Number(discount?.value);
  if (discount && value > 0) {
    personalCents =
      discount.type === "fixed"
        ? Math.min(toCents(value), itemsTotal)
        : Math.round((percentBase * Math.min(value, 100)) / 100);
  }

  // Разовая скидка на заказ
  const manual = Number(manualPercent);
  const manualCents =
    Number.isFinite(manual) && manual > 0
      ? Math.round((percentBase * Math.min(manual, 100)) / 100)
      : 0;

  // Не складываем: клиент получает лучшее из двух условий
  return Math.max(personalCents, manualCents);
}

