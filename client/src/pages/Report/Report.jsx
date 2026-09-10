import React, { useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Header from "../../components/Header/Header.jsx";
import { useTranslation } from "react-i18next";
import styles from "./Report.module.css";

const API = import.meta.env.VITE_API_URL;

/** Локальная дата в виде YYYY-MM-DD.
 *  Через toISOString() ночью получался предыдущий день: для положительных
 *  часовых поясов местная полночь — это ещё вчерашние сутки по UTC. */
function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDayKey(d);
}

/** Быстрые периоды: за вчерашний день раньше приходилось вручную
 *  выставлять обе даты. */
const PERIODS = [
  { key: "today", labelKey: "report.periods.today", range: () => [toDayKey(new Date()), toDayKey(new Date())] },
  { key: "yesterday", labelKey: "report.periods.yesterday", range: () => [shiftDays(-1), shiftDays(-1)] },
  { key: "week", labelKey: "report.periods.week", range: () => [shiftDays(-6), toDayKey(new Date())] },
  { key: "month", labelKey: "report.periods.month", range: () => [shiftDays(-29), toDayKey(new Date())] },
];

const num = (v) => Number(v || 0);
const money = (v) => num(v).toFixed(2);

/** Инициалы для метки рядом с именем: «Игорь Кравцов» → «ИК» */
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default function Report() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState(toDayKey(new Date()));
  const [endDate, setEndDate] = useState(toDayKey(new Date()));
  const [activePeriod, setActivePeriod] = useState("today");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Период, за который реально загружены данные: подпись в шапке карточки не
  // должна меняться, пока диспетчер только крутит даты, но ещё не нажал кнопку.
  const [loadedRange, setLoadedRange] = useState(null);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;

  const applyPeriod = (period) => {
    const [from, to] = period.range();
    setStartDate(from);
    setEndDate(to);
    setActivePeriod(period.key);
  };

  // Ручная правка даты сбрасывает подсветку кнопки: период перестал быть «Сегодня»
  const onDateChange = (setter) => (e) => {
    setter(e.target.value);
    setActivePeriod(null);
  };

  async function loadReport() {
    if (!startDate || !endDate) {
      setError(t("report.errorMissingDates"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/report?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setLoadedRange({ from: startDate, to: endDate });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Сортировка: сначала курьеры по убыванию выручки, «Без курьера» всегда внизу.
  // Сервер порядок не задаёт, а прыгающие строки мешают сверять отчёт.
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aNobody = a.unit_id == null;
      const bNobody = b.unit_id == null;
      if (aNobody !== bNobody) return aNobody ? 1 : -1;
      return num(b.total_sum) - num(a.total_sum);
    });
  }, [rows]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          orders: acc.orders + num(r.total_orders),
          items: acc.items + num(r.total_items),
          sum: acc.sum + num(r.total_sum),
          cash: acc.cash + num(r.total_cash_sum),
          card: acc.card + num(r.total_card_sum),
          wire: acc.wire + num(r.total_wire_sum),
          paid: acc.paid + num(r.total_paid_sum),
        }),
        { orders: 0, items: 0, sum: 0, cash: 0, card: 0, wire: 0, paid: 0 }
      ),
    [rows]
  );

  // Считаем только людей: строка «Без курьера» — не сотрудник
  const workedCount = useMemo(
    () => rows.filter((r) => r.unit_id != null).length,
    [rows]
  );

  const periodLabel = useMemo(() => {
    if (!loadedRange) return "";
    const fmt = (key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(i18n.language, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    };
    return loadedRange.from === loadedRange.to
      ? fmt(loadedRange.from)
      : `${fmt(loadedRange.from)} — ${fmt(loadedRange.to)}`;
  }, [loadedRange, i18n.language]);

  // Ноль приглушается, чтобы взгляд цеплялся за реальные суммы
  const cell = (value) => {
    const v = num(value);
    return (
      <td className={v === 0 ? styles.cell_zero : undefined}>{money(v)}</td>
    );
  };

  return (
    <div className={styles.report_page}>
      <Header />

      <div className={styles.report_content}>
        <div className={styles.report_controls}>
          <button className={styles.report_back_btn} onClick={() => navigate(-1)}>
            ← {t("report.back")}
          </button>

          <div className={styles.period_switch}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`${styles.period_btn} ${
                  activePeriod === p.key ? styles.period_btn_active : ""
                }`}
                onClick={() => applyPeriod(p)}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>

          <div className={styles.date_range}>
            <input
              type="date"
              value={startDate}
              onChange={onDateChange(setStartDate)}
              className={styles.report_date_input}
            />
            <span className={styles.date_dash}>—</span>
            <input
              type="date"
              value={endDate}
              onChange={onDateChange(setEndDate)}
              className={styles.report_date_input}
            />
          </div>

          <button
            className={styles.report_load_btn}
            onClick={loadReport}
            disabled={loading}
          >
            {loading ? t("report.loading") : t("report.loadButton")}
          </button>
        </div>

        {error && <div className={styles.report_error}>{error}</div>}

        {rows.length > 0 && (
          <div className={styles.report_card}>
            <div className={styles.card_top}>
              <div>
                <h2 className={styles.card_title}>{t("report.title")}</h2>
                <p className={styles.card_period}>
                  {periodLabel}
                  {workedCount > 0 && (
                    <>
                      {" · "}
                      {t("report.workedCount", {
                        defaultValue: "работали {{count}}",
                        count: workedCount,
                      })}
                    </>
                  )}
                </p>
              </div>

              <div className={styles.inline_stats}>
                <div>
                  <div className={styles.stat_value}>{totals.orders}</div>
                  <div className={styles.stat_label}>{t("report.columns.totalOrders")}</div>
                </div>
                {/* <div>
                  <div className={styles.stat_value}>{totals.items}</div>
                  <div className={styles.stat_label}>{t("report.columns.totalItems")}</div>
                </div> */}
                <div>
                  <div className={styles.stat_value}>{money(totals.sum)} €</div>
                  <div className={styles.stat_label}>{t("report.revenue", { defaultValue: "Выручка" })}</div>
                </div>
              </div>
            </div>

            <div className={styles.card_body}>
              <div className={styles.table_scroll}>
                <table className={styles.report_table}>
                  <thead>
                    <tr>
                      <th>{t("report.columns.courier")}</th>
                      <th>{t("report.columns.totalOrders")}</th>
                      {/* <th>{t("report.columns.totalItems")}</th> */}
                      <th>{t("report.columns.cash")}</th>
                      <th>{t("report.columns.card")}</th>
                      <th>{t("report.columns.wire")}</th>
                      <th>{t("report.columns.paid")}</th>
                      <th>{t("report.columns.totalSum")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedRows.map((row) => {
                      const isNobody = row.unit_id == null;
                      return (
                        <tr
                          key={row.unit_id ?? "unassigned"}
                          className={isNobody ? styles.row_unassigned : undefined}
                        >
                          <td>
                            <span className={styles.person}>
                              <span className={styles.person_mark}>
                                {isNobody ? "—" : initials(row.unit_nickname)}
                              </span>
                              {isNobody ? t("report.nonCouriers") : row.unit_nickname}
                            </span>
                          </td>
                          <td>{num(row.total_orders)}</td>
                          {/* <td>{num(row.total_items)}</td> */}
                          {cell(row.total_cash_sum)}
                          {cell(row.total_card_sum)}
                          {cell(row.total_wire_sum)}
                          {cell(row.total_paid_sum)}
                          <td className={styles.cell_total}>{money(row.total_sum)}</td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Строка «Итого»: раньше общую выручку приходилось
                      складывать в уме */}
                  <tfoot>
                    <tr>
                      <td>{t("report.total", { defaultValue: "Итого" })}</td>
                      <td>{totals.orders}</td>
                      {/* <td>{totals.items}</td> */}
                      <td>{money(totals.cash)}</td>
                      <td>{money(totals.card)}</td>
                      <td>{money(totals.wire)}</td>
                      <td>{money(totals.paid)}</td>
                      <td>{money(totals.sum)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && rows.length === 0 && !error && (
          <div className={styles.report_empty}>{t("report.empty")}</div>
        )}
      </div>
    </div>
  );
}
