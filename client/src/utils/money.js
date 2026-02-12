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

