import React from "react";
import { X, RotateCcw } from "lucide-react";
import "./customersFilters.css";

/**
 * Боковая панель фильтров вкладки «Клиенты».
 *
 * Состояние держит useCustomersFilterStore и передаёт сюда готовым: компонент
 * только рисует и дёргает экшены. Правило «активна одна сортировка» живёт в
 * сторе, здесь для второй просто нет места — один <select>.
 *
 * На широком экране панель стоит колонкой рядом с таблицей, на узком (≤1080px)
 * превращается в выезжающую справа шторку с затемнением: иначе таблица,
 * которой и так тесно, осталась бы шириной в ладонь.
 */

// value для <select> — "поле:направление". Плоский список вместо пары
// контролов: так невозможно выбрать направление, не выбрав поле.
const SORT_OPTIONS = [
  { value: "", label: "Без сортировки" },
  { value: "spent:desc", label: "Сумма — по убыванию" },
  { value: "spent:asc", label: "Сумма — по возрастанию" },
  { value: "orders:desc", label: "Заказов — по убыванию" },
  { value: "orders:asc", label: "Заказов — по возрастанию" },
  { value: "date:desc", label: "Последний заказ — сначала новые" },
  { value: "date:asc", label: "Последний заказ — сначала старые" },
];

export default function CustomersFilters({
  filters,
  setField,
  setSortExact,
  setDiscountMode,
  toggleDiscountValue,
  reset,
  activeCount,
  onClose,
  discountOptions,
  datePresets,
}) {
  const f = filters;
  const sortValue = f.sortBy ? `${f.sortBy}:${f.sortDir}` : "";

  const onSortChange = (e) => {
    const [by, dir] = e.target.value.split(":");
    setSortExact(by || null, dir || "desc");
  };

  // Какой пресет периода сейчас выбран — чтобы подсветить активный
  const activePreset = datePresets.find(
    (p) => p.from === f.dateFrom && p.to === f.dateTo
  );

  const discValues =
    f.discountType === "fixed"
      ? discountOptions.fixed
      : f.discountType === "percent"
      ? discountOptions.percent
      : [...discountOptions.percent, ...discountOptions.fixed];

  return (
    <aside className="cfd-panel" aria-label="Фильтры клиентов">
      <div className="cfd-head">
        <span className="cfd-title">
          Фильтры
          {activeCount > 0 && <span className="cfd-badge">{activeCount}</span>}
        </span>
        <button type="button" className="cfd-x" onClick={onClose} title="Скрыть панель">
          <X size={16} />
        </button>
      </div>

      <div className="cfd-body">
        {/* ── Последний заказ ── */}
        <section className="cfd-group">
          <h4>Последний заказ</h4>
          <div className="cfd-dates">
            <label>
              <span>с</span>
              <input
                type="date"
                value={f.dateFrom}
                onChange={(e) => setField("dateFrom", e.target.value)}
              />
            </label>
            <label>
              <span>по</span>
              <input
                type="date"
                value={f.dateTo}
                onChange={(e) => setField("dateTo", e.target.value)}
              />
            </label>
          </div>
          <div className="cfd-presets">
            {datePresets.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`cfd-preset ${activePreset?.key === p.key ? "on" : ""}`}
                onClick={() => {
                  setField("dateFrom", p.from);
                  setField("dateTo", p.to);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Количество заказов ── */}
        <section className="cfd-group">
          <h4>Количество заказов</h4>
          <div className="cfd-range">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="от"
              value={f.ordersFrom}
              onChange={(e) => setField("ordersFrom", e.target.value)}
              aria-label="Заказов от"
            />
            <span className="cfd-dash">—</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="до"
              value={f.ordersTo}
              onChange={(e) => setField("ordersTo", e.target.value)}
              aria-label="Заказов до"
            />
          </div>
        </section>

        {/* ── Сумма заказов ── */}
        <section className="cfd-group">
          <h4>Сумма заказов, €</h4>
          <div className="cfd-range">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="от"
              value={f.spentFrom}
              onChange={(e) => setField("spentFrom", e.target.value)}
              aria-label="Сумма от"
            />
            <span className="cfd-dash">—</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="до"
              value={f.spentTo}
              onChange={(e) => setField("spentTo", e.target.value)}
              aria-label="Сумма до"
            />
          </div>
        </section>

        {/* ── Скидка ── */}
        <section className="cfd-group">
          <h4>Скидка</h4>
          <div className="cfd-seg">
            {[
              ["any", "Все"],
              ["has", "Есть"],
              ["none", "Нет"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={f.discountMode === val ? "on" : ""}
                onClick={() => setDiscountMode(val)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Уточнения имеют смысл только при «Есть» — на других режимах
              стор их сам обнуляет, так что скрытого условия не остаётся */}
          {f.discountMode === "has" && (
            <div className="cfd-sub">
              <div className="cfd-seg cfd-seg-sm">
                {[
                  ["any", "Любая"],
                  ["percent", "%"],
                  ["fixed", "€"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={f.discountType === val ? "on" : ""}
                    onClick={() => setField("discountType", val)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {discValues.length === 0 ? (
                <p className="cfd-note">Скидок такого типа ни у кого нет</p>
              ) : (
                <div className="cfd-chips">
                  {discValues.map((v) => (
                    <button
                      key={`${f.discountType}-${v}`}
                      type="button"
                      className={f.discountValues.includes(v) ? "on" : ""}
                      onClick={() => toggleDiscountValue(v)}
                    >
                      {f.discountType === "fixed" ? `${v} €` : `${v}%`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Сортировка ── */}
        <section className="cfd-group">
          <h4>Сортировка</h4>
          <select className="cfd-select" value={sortValue} onChange={onSortChange}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </section>
      </div>

      <div className="cfd-foot">
        <button
          type="button"
          className="cfd-reset"
          onClick={reset}
          disabled={activeCount === 0 && !f.sortBy}
        >
          <RotateCcw size={14} /> Сбросить всё
        </button>
      </div>
    </aside>
  );
}
