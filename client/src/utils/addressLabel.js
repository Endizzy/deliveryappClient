// Подписи и сравнение адресов клиента для чипов на странице создания заказа.

const norm = (v) => String(v ?? "").trim().toLowerCase();

/** «Brīvības 45-12», с корпусом: «Brīvības 45 k-2-12». */
export function formatAddressLabel(a) {
  if (!a) return "";
  const street = String(a.street ?? "").trim();
  const house = String(a.house ?? "").trim();
  const building = String(a.building ?? "").trim();
  const apart = String(a.apart ?? "").trim();
  let label = [street, house].filter(Boolean).join(" ");
  if (building) label += ` k-${building}`;
  if (apart) label += `-${apart}`;
  return label;
}

/** Совпадает ли адрес из истории с тем, что сейчас в полях формы. */
export function isSameAddress(a, form) {
  if (!a || !form) return false;
  return (
    norm(a.street) === norm(form.street) &&
    norm(a.house) === norm(form.house) &&
    norm(a.building) === norm(form.building) &&
    norm(a.apart) === norm(form.apart)
  );
}
