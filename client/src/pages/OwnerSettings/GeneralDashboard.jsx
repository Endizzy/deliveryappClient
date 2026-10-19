import React, { useState } from "react";
import {
  TrendingUp, ClipboardList, Receipt, Percent, RefreshCw, Building2, AlertTriangle,
} from "lucide-react";
import "./generalDashboard.css";
import useDashboardSummary from "../../hooks/useDashboardSummary.js";
import { formatCents, toCents } from "../../utils/money.js";

const eur = (n) => `€${formatCents(toCents(Number(n) || 0))}`;

const PERIODS = ["today", "7", "30"];
const PAY_COLORS = {
  cash: "#334155",
  card: "#0e7490",
  wire: "#d97706",
  paid: "#7c8aa0",
  other: "#cbd5e1",
};
const AVATAR_COLORS = ["#334155", "#0e7490", "#b45309", "#4d7c0f", "#9f1239"];

const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();

/** «▲ 12%» / «▼ 5%»; при отсутствии базы сравнения (null) — ничего. */
function Delta({ value }) {
  if (value == null) return null;
  if (value === 0) return <span className="gd-flat">0%</span>;
  return value > 0
    ? <span className="gd-up">▲ {value}%</span>
    : <span className="gd-down">▼ {Math.abs(value)}%</span>;
}

function Empty({ t }) {
  return <div className="gd-empty">{t("ownerSettings.dashboard.noData")}</div>;
}

export default function GeneralDashboard({ API, authHeaders, t, settingsOpen, onToggleSettings }) {
  const [period, setPeriod] = useState("today");
  const { summary, loyalty, loading, error, reload } =
    useDashboardSummary({ API, authHeaders, period });

  const T = (k, o) => t(`ownerSettings.dashboard.${k}`, o);
  // метка периода в ответе — та, что реально посчитал сервер
  const key = summary?.period?.key || period;
  const kpi = summary?.kpi || null;
  const chart = summary?.chart || null;
  const payments = summary?.payments || null;
  const couriers = summary?.couriers || null;
  const top = summary?.topCustomers || null;

  const cmp = key === "today" ? T("cmpToday") : T("cmpPeriod", { n: key });

  const days = chart?.days || [];
  const maxDay = Math.max(1, ...days.map((d) => d.sum));
  const step = days.length > 14 ? 5 : 2;
  const maxCourier = Math.max(1, ...(couriers || []).map((c) => c.orders));
  const payTotal = (payments || []).reduce((s, p) => s + p.sum, 0);

  const updated = summary?.generatedAt
    ? new Date(summary.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="gd">
      {/* Заголовок + период */}
      <div className="gd-head">
        <div>
          <div className="gd-title">{t("ownerSettings.sections.general")}</div>
          <div className="gd-subtitle">
            {updated ? T("updated", { time: updated }) : T("loading")}
          </div>
        </div>
        <div className="gd-head-actions">
          <div className="gd-seg" role="group" aria-label={T("period")}>
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                className={period === p ? "on" : ""}
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {T(`period_${p}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="gd-refresh"
            onClick={reload}
            disabled={loading}
            title={T("refresh")}
            aria-label={T("refresh")}
          >
            <RefreshCw size={16} className={loading ? "gd-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="gd-alert" role="alert">
          <AlertTriangle size={16} />
          <span>{summary ? T("staleError") : T("loadError")}</span>
          <button type="button" onClick={reload}>{T("retry")}</button>
        </div>
      )}

      {/* KPI */}
      <div className="gd-kpis">
        <div className="gd-card">
          <div className="gd-row"><span className="gd-k">{T("revenue")} · {T(`periodShort_${key}`)}</span><TrendingUp size={18} className="gd-ico" /></div>
          <div className="gd-v">{kpi ? eur(kpi.revenue) : "—"}</div>
          <div className="gd-sub">{kpi && kpi.revenueDelta != null ? <><Delta value={kpi.revenueDelta} /> {cmp}</> : " "}</div>
        </div>
        <div className="gd-card">
          <div className="gd-row"><span className="gd-k">{T("orders")} · {T(`periodShort_${key}`)}</span><ClipboardList size={18} className="gd-ico" /></div>
          <div className="gd-v">{kpi ? kpi.orders : "—"}</div>
          <div className="gd-sub">
            {kpi
              ? <>{T("inWork")}: {kpi.inWork} · {T("preorders")}: {kpi.preorders} · {T("cancelled")}: {kpi.cancelled}</>
              : " "}
          </div>
        </div>
        <div className="gd-card">
          <div className="gd-row"><span className="gd-k">{T("avgCheck")}</span><Receipt size={18} className="gd-ico" /></div>
          <div className="gd-v">{kpi ? eur(kpi.avgCheck) : "—"}</div>
          <div className="gd-sub">{kpi && kpi.avgCheckDelta != null ? <><Delta value={kpi.avgCheckDelta} /> {cmp}</> : " "}</div>
        </div>
        <div className="gd-card">
          <div className="gd-row"><span className="gd-k">{T("discounts")} · {T(`periodShort_${key}`)}</span><Percent size={18} className="gd-ico" /></div>
          <div className="gd-v">{kpi ? `−${eur(kpi.discountSum)}` : "—"}</div>
          <div className="gd-sub">
            {kpi ? <>{T("discountOrders")}: {kpi.discountOrders} · {T("manual")}: {kpi.manualOrders}</> : " "}
          </div>
        </div>
      </div>

      {/* График + оплата */}
      <div className="gd-grid gd-grid-chart">
        <div className="gd-card">
          <div className="gd-row">
            <h3 className="gd-h3">{T("chartTitle", { n: days.length || summary?.period?.chartDays || 14 })}</h3>
            {chart && <span className="gd-mut gd-right">{T("total", { sum: eur(chart.total) })}</span>}
          </div>
          {chart ? (
            <div className="gd-chart" role="img" aria-label={T("chartAria")}>
              <div className="gd-chart-grid" aria-hidden="true">
                <span><em>{eur(maxDay)}</em></span>
                <span><em>{eur(maxDay / 2)}</em></span>
                <span><em>0</em></span>
              </div>
              <div className="gd-bars">
                {days.map((d, i) => {
                  const last = i === days.length - 1;
                  const [, m, dd] = d.day.split("-");
                  return (
                    <div className="gd-bar-col" key={d.day} title={`${dd}.${m} — ${eur(d.sum)}`}>
                      <div className="gd-bar-wrap">
                        <div
                          className={`gd-bar ${last ? "now" : ""}`}
                          style={{ height: `${Math.max(d.sum > 0 ? 2 : 0, (d.sum / maxDay) * 100)}%` }}
                        />
                      </div>
                      <div className="gd-bar-label">
                        {(days.length - 1 - i) % step === 0 ? `${Number(dd)}.${m}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <Empty t={t} />}
        </div>

        <div className="gd-card">
          <h3 className="gd-h3">{T("payments")} · {T(`periodShort_${key}`)}</h3>
          {payments ? (
            <>
              <div className="gd-stack" aria-hidden="true">
                {payTotal > 0 && payments.filter((p) => p.sum > 0).map((p) => (
                  <i key={p.method} style={{ width: `${(p.sum / payTotal) * 100}%`, background: PAY_COLORS[p.method] }} />
                ))}
              </div>
              {payments.map((p) => (
                <div className="gd-li" key={p.method}>
                  <span className="gd-dot" style={{ background: PAY_COLORS[p.method] }} />
                  {T(`pay_${p.method}`)}
                  <span className="gd-num">{p.share}% · {eur(p.sum)}</span>
                </div>
              ))}
            </>
          ) : <Empty t={t} />}
        </div>
      </div>

      {/* Курьеры / клиенты / лояльность */}
      <div className="gd-grid gd-grid-3">
        <div className="gd-card">
          <h3 className="gd-h3">{T("couriers")} · {T(`periodShort_${key}`)}</h3>
          {couriers && couriers.length ? couriers.map((c, i) => {
            const name = c.id == null ? T("unassigned") : (c.name || T("courierN", { id: c.id }));
            return (
              <div className="gd-li" key={c.id ?? "none"}>
                <span className="gd-av" style={{ background: c.id == null ? "#7c8aa0" : AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {c.id == null ? "—" : (initials(c.name) || "#")}
                </span>
                <div className="gd-grow">
                  <div className="gd-ellipsis">{name}</div>
                  <div className="gd-meter"><i style={{ width: `${(c.orders / maxCourier) * 100}%` }} /></div>
                </div>
                <span className="gd-num">{c.orders} · {eur(c.sum)}</span>
              </div>
            );
          }) : <Empty t={t} />}
        </div>

        <div className="gd-card">
          <h3 className="gd-h3">{T("topCustomers")}</h3>
          {top && top.length ? top.map((c, i) => (
            <div className="gd-li" key={i}>
              <span className="gd-mut gd-rank">{i + 1}</span>
              <span className="gd-ellipsis gd-grow">{c.name || T("noName")}</span>
              {c.discount && (
                <span className="gd-chip">
                  {c.discount.type === "percent" ? `−${c.discount.value}%` : `−${eur(c.discount.value)}`}
                </span>
              )}
              <span className="gd-num">{eur(c.sum)}</span>
            </div>
          )) : <Empty t={t} />}
        </div>

        <div className="gd-card">
          <h3 className="gd-h3">{T("loyalty")}</h3>
          {loyalty ? (
            <>
              <div className="gd-loy">
                <span className={`gd-pill ${loyalty.enabled ? "on" : ""}`}>
                  {loyalty.enabled ? T("loyaltyOn") : T("loyaltyOff")}
                </span>
                {loyalty.enabled && (
                  <span>
                    {T("loyaltyRule", { n: loyalty.ordersBefore })}{" "}
                    <b>{loyalty.type === "percent" ? `−${loyalty.value}%` : `−${eur(loyalty.value)}`}</b>
                  </span>
                )}
              </div>
              <div className="gd-stats">
                {loyalty.enabled && (
                  <>
                    <div><div className="gd-big">{loyalty.summary?.ready ?? 0}</div><div className="gd-sub">{T("loyaltyReady")}</div></div>
                    <div><div className="gd-big">{loyalty.summary?.soon ?? 0}</div><div className="gd-sub">{T("loyaltySoon")}</div></div>
                  </>
                )}
                <div><div className="gd-big">{summary?.personalDiscounts ?? "—"}</div><div className="gd-sub">{T("personal")}</div></div>
                {loyalty.enabled && Number(loyalty.minOrderAmount) > 0 && (
                  <div><div className="gd-big">{T("fromSum", { sum: eur(loyalty.minOrderAmount) })}</div><div className="gd-sub">{T("minOrder")}</div></div>
                )}
              </div>
            </>
          ) : <Empty t={t} />}
        </div>
      </div>

      {/* Основные настройки ресторана (форма-заглушка остаётся ниже) */}
      <div className="gd-card gd-settings-bar">
        <Building2 size={20} className="gd-ico" />
        <div className="gd-grow">
          <b>{T("settingsTitle")}</b>
          <div className="gd-mut gd-small">{T("settingsHint")}</div>
        </div>
        <button type="button" className="gd-edit" onClick={onToggleSettings} aria-expanded={settingsOpen}>
          {settingsOpen ? T("hide") : T("edit")}
        </button>
      </div>
    </div>
  );
}
