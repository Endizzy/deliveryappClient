import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  History, Download, Search, Cog, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Info,
} from "lucide-react";
import "./orderAuditTab.css";
import { formatCents, toCents } from "../../utils/money.js";
import useOrderAudit from "../../hooks/useOrderAudit.js";
import {
  periodRange, initials, pageNumbers, parseSchedule, parseCreated, toCsv, localDateTime,
} from "../../utils/orderAuditView.js";

const PAGE_SIZE = 50;
const EVENT_TYPES = [
  "created", "status", "courier", "pickup", "address", "point", "items",
  "amount", "discount", "loyalty", "delivery_fee", "payment", "schedule",
  "customer", "people", "notes",
];
const SOURCES = ["web", "courier_app", "system"];

const toEUR = (n) => `€${formatCents(toCents(Number(n) || 0))}`;
const signedEUR = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${toEUR(Math.abs(n))}`;

// Цветовая группа типа события
const TYPE_TONE = {
  created: "gray", status: "blue", courier: "amber", pickup: "teal", address: "purple", point: "purple",
  items: "teal", amount: "green", discount: "green", loyalty: "green", delivery_fee: "green",
  payment: "green", schedule: "gray", customer: "gray", people: "gray", notes: "gray",
};

/**
 * Вкладка «Журнал» (только владелец): все изменения заказов компании.
 * Только чтение: на работу смены не влияет. Сервер отдаёт данные строго по
 * company_id пользователя.
 */
export default function OrderAuditTab({ API, authHeaders, t }) {
  const L = (key, defaultValue, opts) =>
    t(`ownerSettings.audit.${key}`, { defaultValue, ...(opts || {}) });

  const [periodKey, setPeriodKey] = useState("7");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actor, setActor] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [important, setImportant] = useState(false);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Поиск с задержкой: не дёргаем сервер на каждую букву
  const qRef = useRef("");
  useEffect(() => {
    const id = setTimeout(() => {
      const next = qInput.trim();
      if (next === qRef.current) return;
      qRef.current = next;
      setQ(next);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [qInput]);

  // Границы пересчитываются только при смене периода — запрос не «прыгает»
  const range = useMemo(
    () => periodRange({ key: periodKey, from: dateFrom, to: dateTo }),
    [periodKey, dateFrom, dateTo]
  );
  const params = useMemo(
    () => ({ range, actor, type, source, important, q }),
    [range, actor, type, source, important, q]
  );

  const { data, loading, error, reload, fetchAll } = useOrderAudit({
    API, authHeaders, params, page, pageSize: PAGE_SIZE,
  });

  const filt = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  const items = data?.items || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stats = data?.stats || { total: 0, amount: 0, courier: 0, afterDelivery: 0 };
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, page * PAGE_SIZE);

  const typeLabel = (k) => L(`types.${k}`, k);
  const sourceLabel = (k) => L(`sources.${k}`, k);
  const roleLabel = (k) => (k ? L(`roles.${k}`, k) : "");
  const unassigned = () => L("unassigned", "не назначен");

  // Значения «было → стало» в виде текста (для таблицы и CSV)
  const describe = (it) => {
    const o = it.oldValue;
    const n = it.newValue;
    switch (it.type) {
      case "amount":
      case "delivery_fee":
        return { o: o != null ? toEUR(o) : null, n: n != null ? toEUR(n) : null };
      case "status":
        return { o: o ? L(`status.${o}`, o) : null, n: n ? L(`status.${n}`, n) : null };
      case "payment":
        return { o: o ? L(`payment.${o}`, o) : null, n: n ? L(`payment.${n}`, n) : null };
      case "courier":
      case "pickup":
        return { o: o || unassigned(), n: n || unassigned(), muteOld: !o, muteNew: !n };
      case "schedule": {
        const fmt = (v) => {
          if (!v) return null;
          const s = parseSchedule(v);
          const base = L(`orderTypes.${s.type}`, s.type);
          if (!s.at) return base;
          const dt = localDateTime(s.at.toISOString());
          return `${base} · ${dt.date} ${dt.time}`;
        };
        return { o: fmt(o), n: fmt(n) };
      }
      case "loyalty":
        return { o: null, n: n === "1" ? L("loyaltyOn", "Скидка лояльности выдана") : L("loyaltyOff", "Скидка лояльности снята"), single: true };
      case "created": {
        const c = parseCreated(n);
        const parts = [
          L(`orderTypes.${c.type}`, c.type),
          c.payment ? L(`payment.${c.payment}`, c.payment) : "",
          L("itemsCount", `позиций: ${c.n}`, { n: c.n }),
        ].filter(Boolean);
        return { o: null, n: parts.join(" · "), single: true };
      }
      case "discount":
        return { o: o || null, n: n || null };
      default:
        return { o: o || null, n: n || null };
    }
  };

  const orderLabel = (it) => `№${it.orderSeq ?? it.orderNo ?? it.orderId}`;

  const actorLabel = (it) => (it.actorId == null && it.source === "system" ? L("systemActor", "Система") : it.actorName || (it.actorId != null ? `#${it.actorId}` : L("systemActor", "Система")));

  const downloadCsv = async () => {
    setExporting(true);
    setExportError("");
    try {
      const all = await fetchAll();
      const head = [
        L("cols.time", "Время"), L("cols.order", "Заказ"), L("csvCustomer", "Клиент"),
        L("csvPhone", "Телефон"), L("cols.what", "Что изменилось"),
        L("csvOld", "Было"), L("csvNew", "Стало"), L("csvDelta", "Разница, €"),
        L("csvImportant", "Важное"), L("cols.who", "Кто"), L("csvRole", "Роль"), L("cols.source", "Источник"),
      ];
      const rows = all.map((it) => {
        const d = describe(it);
        const dt = localDateTime(it.createdAt);
        return [
          `${dt.date} ${dt.time}`, orderLabel(it), it.customerName || "", it.customerPhone || "",
          typeLabel(it.type), d.o ?? "", d.n ?? "",
          it.amountDelta != null ? String(it.amountDelta).replace(".", ",") : "",
          it.important ? (it.flag ? L(`flags.${it.flag}`, it.flag) : "1") : "",
          actorLabel(it), roleLabel(it.actorRole), sourceLabel(it.source),
        ];
      });
      const blob = new Blob([toCsv([head, ...rows])], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-journal-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      setExportError(String(e?.message || e));
    } finally {
      setExporting(false);
    }
  };

  const notReady = data && data.ready === false;

  return (
    <div className="oa-wrap">
      <div className="oa-head">
        <History size={20} aria-hidden="true" />
        <h3>{L("title", "Журнал изменений заказов")}</h3>
        <button type="button" className="oa-btn" onClick={downloadCsv} disabled={exporting || notReady || !total}>
          <Download size={14} aria-hidden="true" />
          {exporting ? L("exporting", "Готовлю файл…") : L("export", "Скачать CSV")}
        </button>
      </div>

      {exportError && (
        <div className="oa-msg oa-msg-err" role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          {L("exportError", "Не удалось скачать файл")}: {exportError}
        </div>
      )}

      {notReady ? (
        <div className="oa-msg oa-msg-info" role="status">
          <Info size={15} aria-hidden="true" />
          {L("notReady", "Журнал ещё не включён: нужно выполнить SQL-миграцию order_audit_log.sql. После этого он начнёт заполняться сам.")}
        </div>
      ) : (
        <>
          <div className="oa-kpis">
            <div><b>{data ? stats.total : "…"}</b><span>{L("kpi.events", "событий за период")}</span></div>
            <div><b>{data ? stats.amount : "…"}</b><span>{L("kpi.amount", "изменений суммы")}</span></div>
            <div><b>{data ? stats.courier : "…"}</b><span>{L("kpi.courier", "смен курьера")}</span></div>
            <div className="oa-kpi-warn"><b>{data ? stats.afterDelivery : "…"}</b><span>{L("kpi.afterDelivery", "правок после доставки")}</span></div>
          </div>

          <div className="oa-filters">
            <label className="oa-sel">
              <span className="oa-vh">{L("filters.period", "Период")}</span>
              <select value={periodKey} onChange={(e) => filt(setPeriodKey)(e.target.value)}>
                <option value="today">{L("filters.today", "Сегодня")}</option>
                <option value="7">{L("filters.d7", "7 дней")}</option>
                <option value="30">{L("filters.d30", "30 дней")}</option>
                <option value="custom">{L("filters.custom", "Свой период")}</option>
              </select>
            </label>
            {periodKey === "custom" && (
              <>
                <input
                  type="date" className="oa-sel oa-date" value={dateFrom}
                  aria-label={L("filters.from", "С даты")}
                  onChange={(e) => filt(setDateFrom)(e.target.value)}
                />
                <input
                  type="date" className="oa-sel oa-date" value={dateTo}
                  aria-label={L("filters.to", "По дату")}
                  onChange={(e) => filt(setDateTo)(e.target.value)}
                />
              </>
            )}
            <label className="oa-sel">
              <span className="oa-vh">{L("cols.who", "Кто")}</span>
              <select value={actor} onChange={(e) => filt(setActor)(e.target.value)}>
                <option value="">{L("filters.allStaff", "Все сотрудники")}</option>
                {(data?.actors || []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="oa-sel">
              <span className="oa-vh">{L("cols.what", "Что изменилось")}</span>
              <select value={type} onChange={(e) => filt(setType)(e.target.value)}>
                <option value="">{L("filters.allTypes", "Все типы")}</option>
                {EVENT_TYPES.map((k) => (
                  <option key={k} value={k}>{typeLabel(k)}</option>
                ))}
              </select>
            </label>
            <label className="oa-sel">
              <span className="oa-vh">{L("cols.source", "Источник")}</span>
              <select value={source} onChange={(e) => filt(setSource)(e.target.value)}>
                <option value="">{L("filters.allSources", "Все источники")}</option>
                {SOURCES.map((k) => (
                  <option key={k} value={k}>{sourceLabel(k)}</option>
                ))}
              </select>
            </label>
            <label className="oa-search">
              <Search size={14} aria-hidden="true" />
              <input
                type="search" value={qInput} maxLength={64}
                placeholder={L("filters.search", "№ заказа, телефон, клиент")}
                aria-label={L("filters.search", "№ заказа, телефон, клиент")}
                onChange={(e) => setQInput(e.target.value)}
              />
            </label>
            <label className="oa-switch">
              <input type="checkbox" checked={important} onChange={(e) => filt(setImportant)(e.target.checked)} />
              <i aria-hidden="true" />
              {L("filters.important", "Только важные")}
            </label>
          </div>

          {error && (
            <div className="oa-msg oa-msg-err" role="alert">
              <AlertTriangle size={15} aria-hidden="true" />
              {L("loadError", "Не удалось загрузить журнал")}: {error}
              <button type="button" className="oa-link" onClick={reload}>
                <RefreshCw size={13} aria-hidden="true" />{L("retry", "Повторить")}
              </button>
            </div>
          )}

          <div className={`oa-card${loading ? " is-loading" : ""}`}>
            <div className="oa-scroll">
              <table className="oa-table">
                <thead>
                  <tr>
                    <th>{L("cols.time", "Время")}</th>
                    <th>{L("cols.order", "Заказ")}</th>
                    <th>{L("cols.what", "Что изменилось")}</th>
                    <th>{L("cols.change", "Было → Стало")}</th>
                    <th>{L("cols.who", "Кто")}</th>
                    <th>{L("cols.source", "Источник")}</th>
                  </tr>
                </thead>
                <tbody>
                  {!items.length && (
                    <tr>
                      <td colSpan={6} className="oa-empty">
                        {loading && !data ? L("loading", "Загрузка…") : L("empty", "За выбранный период изменений нет")}
                      </td>
                    </tr>
                  )}
                  {items.map((it) => {
                    const d = describe(it);
                    const dt = localDateTime(it.createdAt);
                    const isSystem = it.actorId == null;
                    return (
                      <tr key={it.id} className={it.important ? "oa-row-warn" : ""}>
                        <td className="oa-time">{dt.time}<small>{dt.date}</small></td>
                        <td className="oa-order" title={it.orderDay ? `${L("orderDay", "День заказа")}: ${it.orderDay}` : undefined}>
                          <b>{orderLabel(it)}</b>
                          {it.customerName && <small>{it.customerName}</small>}
                        </td>
                        <td>
                          <span className={`oa-type oa-tone-${TYPE_TONE[it.type] || "gray"}`}>{typeLabel(it.type)}</span>
                          {it.flag && <span className="oa-flag">{L(`flags.${it.flag}`, it.flag)}</span>}
                        </td>
                        <td className="oa-change">
                          {!d.single && (
                            <>
                              <span className={`oa-old${d.muteOld ? " is-mute" : ""}${d.o == null ? " is-empty" : ""}`}>{d.o ?? "—"}</span>
                              <span className="oa-arrow" aria-hidden="true">→</span>
                            </>
                          )}
                          <span className={`oa-new${d.muteNew ? " is-mute" : ""}`}>{d.n ?? "—"}</span>
                          {it.amountDelta != null && it.amountDelta !== 0 && (
                            <span className={`oa-delta ${it.amountDelta > 0 ? "up" : "down"}`}>{signedEUR(it.amountDelta)}</span>
                          )}
                        </td>
                        <td>
                          <span className="oa-who">
                            <span className={`oa-av${isSystem ? " sys" : ""}`}>
                              {isSystem ? <Cog size={12} aria-hidden="true" /> : initials(it.actorName)}
                            </span>
                            <span className="oa-who-text">
                              {actorLabel(it)}
                              {it.actorRole && <small>{roleLabel(it.actorRole)}</small>}
                            </span>
                          </span>
                        </td>
                        <td className="oa-src">{sourceLabel(it.source)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="oa-pager">
              <button type="button" className="oa-pb" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label={L("prev", "Назад")}>
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              {pageNumbers(page, pages).map((n, i) =>
                n === "…" ? (
                  <span key={`g${i}`} className="oa-gap">…</span>
                ) : (
                  <button key={n} type="button" className={`oa-pb${n === page ? " is-active" : ""}`} onClick={() => setPage(n)} aria-current={n === page ? "page" : undefined}>
                    {n}
                  </button>
                )
              )}
              <button type="button" className="oa-pb" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} aria-label={L("next", "Вперёд")}>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
              <span className="oa-count">
                {L("rowsInfo", `Строки ${from}–${to} из ${total}`, { from, to, total })}
              </span>
            </div>
          </div>

          <div className="oa-note">
            <Info size={14} aria-hidden="true" />
            {L("coverage", "В журнал попадают изменения с момента его включения: в веб-панели, в приложении курьера и автоматическая активация предзаказов.")}
          </div>
        </>
      )}
    </div>
  );
}
