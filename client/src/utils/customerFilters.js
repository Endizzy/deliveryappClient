// ── Фильтрация и сортировка списка клиентов ─────────────────────────────────
//
// Вынесено из CustomersTab.jsx отдельным модулем без React намеренно: логика
// отбора — то место, где ошибка тихо искажает выборку, по которой владелец
// потом шлёт рассылку живым людям. Чистые функции можно прогнать тестами
// напрямую, а не пересказывать их поведение в тесте заново.
//
// Все функции ничего не мутируют: на вход идёт массив из состояния React.

/** Локальная дата в виде YYYY-MM-DD.
 *  Через toISOString() ночью получался предыдущий день: для положительных
 *  часовых поясов местная полночь — это ещё вчерашние сутки по UTC.
 *  Тот же приём, что в Report.jsx. */
export function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Дата заказа (строка MySQL "2026-09-14 09:52:36" или ISO) → "YYYY-MM-DD".
 *  null для пустых и нераспознанных значений: у клиента может не быть
 *  последнего заказа, и это не повод падать. */
export function orderDayKey(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return toDayKey(d);
}

/** Число или null. Пустая строка — это «границу не задали», а не ноль:
 *  иначе пустое поле «от» отсекало бы клиентов с нулевой суммой. */
export function toNum(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Границы диапазона по возрастанию.
 *  Если пользователь ввёл «от 500 до 100», он почти наверняка имел в виду
 *  100–500, а не пустой результат. Молча меняем местами. */
export function normalizeRange(from, to) {
  const a = toNum(from);
  const b = toNum(to);
  if (a !== null && b !== null && a > b) return [b, a];
  return [a, b];
}

/** Границы диапазона дат — то же самое, но сравнение строковое:
 *  ключи YYYY-MM-DD сравниваются лексикографически корректно. */
export function normalizeDateRange(from, to) {
  const a = from || null;
  const b = to || null;
  if (a && b && a > b) return [b, a];
  return [a, b];
}

function inRange(value, min, max) {
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

export const EMPTY_FILTERS = {
  query: "",
  dateFrom: "",
  dateTo: "",
  ordersFrom: "",
  ordersTo: "",
  spentFrom: "",
  spentTo: "",
  discountMode: "any", // 'any' | 'has' | 'none'
  discountType: "any", // 'any' | 'percent' | 'fixed'
  discountValues: [], // конкретные значения скидки; пусто — любые
  sortBy: null, // 'date' | 'orders' | 'spent' | null
  sortDir: "desc", // 'asc' | 'desc'
};

/**
 * Отбор клиентов. Порядок проверок — от самых дешёвых к дорогим,
 * чтобы на большом списке отсечь лишнее пораньше.
 */
export function filterCustomers(items, filters = {}) {
  const f = { ...EMPTY_FILTERS, ...filters };
  const list = Array.isArray(items) ? items : [];

  const q = String(f.query || "").trim().toLowerCase();
  const [ordersMin, ordersMax] = normalizeRange(f.ordersFrom, f.ordersTo);
  const [spentMin, spentMax] = normalizeRange(f.spentFrom, f.spentTo);
  const [dateMin, dateMax] = normalizeDateRange(f.dateFrom, f.dateTo);
  const wantValues =
    Array.isArray(f.discountValues) && f.discountValues.length > 0
      ? new Set(f.discountValues.map(Number))
      : null;

  return list.filter((c) => {
    if (q) {
      const name = String(c.name || "").toLowerCase();
      const phone = String(c.phone || "").toLowerCase();
      if (!name.includes(q) && !phone.includes(q)) return false;
    }

    if (!inRange(Number(c.paidOrdersCount) || 0, ordersMin, ordersMax)) return false;
    if (!inRange(Number(c.totalSpent) || 0, spentMin, spentMax)) return false;

    if (dateMin || dateMax) {
      const day = orderDayKey(c.lastOrderAt);
      // Клиент без последнего заказа не попадает ни в какой период:
      // утверждать, что он заказывал в выбранные даты, мы не можем.
      if (!day) return false;
      if (dateMin && day < dateMin) return false;
      if (dateMax && day > dateMax) return false;
    }

    const disc = c.discount && Number(c.discount.value) > 0 ? c.discount : null;

    if (f.discountMode === "none") return !disc;
    if (f.discountMode === "has" && !disc) return false;

    // Уточнение по типу или конкретному значению само по себе означает
    // «нужна скидка»: выбрав «10%», владелец не ждёт увидеть клиентов вовсе
    // без скидки. В интерфейсе эти поля и показываются только при «есть
    // скидка», но функция не должна зависеть от того, что её правильно вызвали.
    const narrowsByDiscount = f.discountType !== "any" || wantValues !== null;
    if (narrowsByDiscount) {
      if (!disc) return false;
      if (f.discountType !== "any" && disc.type !== f.discountType) return false;
      if (wantValues && !wantValues.has(Number(disc.value))) return false;
    }

    return true;
  });
}

/** Значение, по которому сортируем. null — «данных нет». */
function sortValue(c, sortBy) {
  if (sortBy === "orders") return Number(c.paidOrdersCount) || 0;
  if (sortBy === "spent") return Number(c.totalSpent) || 0;
  if (sortBy === "date") {
    const day = orderDayKey(c.lastOrderAt);
    return day === null ? null : day;
  }
  return null;
}

/**
 * Сортировка одним ключом. Одновременно активной может быть только одна —
 * это правило держит стор, здесь просто нет места для второй.
 *
 * Клиенты без значения (нет последнего заказа) всегда уходят вниз, в обоих
 * направлениях: иначе при сортировке «по возрастанию даты» список начинался
 * бы с пустых строк.
 */
export function sortCustomers(items, sortBy, sortDir = "desc") {
  const list = Array.isArray(items) ? items : [];
  if (!sortBy) return list;

  const dir = sortDir === "asc" ? 1 : -1;

  // Копия: sort мутирует массив, а на вход приходит состояние React —
  // изменив его на месте, мы бы ломали сравнение при следующем рендере.
  return [...list].sort((a, b) => {
    const va = sortValue(a, sortBy);
    const vb = sortValue(b, sortBy);

    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;

    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

/** Уникальные значения скидок, реально встречающиеся в списке.
 *  Строим выпадашку из данных, а не из хардкода: иначе владелец выбирал бы
 *  проценты, которых нет ни у одного клиента, и получал пустую таблицу. */
export function collectDiscountOptions(items) {
  const byType = { percent: new Set(), fixed: new Set() };
  for (const c of Array.isArray(items) ? items : []) {
    const d = c?.discount;
    const v = Number(d?.value);
    if (!d || !Number.isFinite(v) || v <= 0) continue;
    if (d.type === "fixed") byType.fixed.add(v);
    else byType.percent.add(v);
  }
  return {
    percent: [...byType.percent].sort((a, b) => a - b),
    fixed: [...byType.fixed].sort((a, b) => a - b),
  };
}

/** Сколько фильтров реально что-то ограничивают — для бейджа на кнопке.
 *  Сортировка сюда не входит: она не сужает выборку. */
export function countActiveFilters(filters = {}) {
  const f = { ...EMPTY_FILTERS, ...filters };
  let n = 0;
  if (String(f.query || "").trim()) n += 1;
  if (f.dateFrom || f.dateTo) n += 1;
  if (toNum(f.ordersFrom) !== null || toNum(f.ordersTo) !== null) n += 1;
  if (toNum(f.spentFrom) !== null || toNum(f.spentTo) !== null) n += 1;
  if (f.discountMode !== "any") n += 1;
  if (f.discountType !== "any") n += 1;
  if (Array.isArray(f.discountValues) && f.discountValues.length > 0) n += 1;
  return n;
}

/** Итоги по видимой выборке — строка «Показано N · заказов K · сумма Z». */
export function summarize(items) {
  const list = Array.isArray(items) ? items : [];
  return list.reduce(
    (acc, c) => {
      acc.customers += 1;
      acc.orders += Number(c.paidOrdersCount) || 0;
      acc.revenue += Number(c.totalSpent) || 0;
      return acc;
    },
    { customers: 0, orders: 0, revenue: 0 }
  );
}
