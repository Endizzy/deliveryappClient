import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Users, Gift, Search, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { formatLoyaltyValue } from "../../utils/money.js";

const PAGE_SIZE = 30;

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const initialOf = (name, phone) => {
  const s = String(name || "").trim();
  if (s) return s[0].toUpperCase();
  return String(phone || "").replace(/\D/g, "").slice(-2) || "?";
};

// Список клиентов, которые копят заказы до скидки (вкладка «Лояльность»).
// Показывается только при активной программе. Только чтение:
// GET /api/loyalty/customers. Ошибка загрузки списка не влияет на настройки.
export default function LoyaltyCustomers({ API, authHeaders, t, enabled = false, refreshKey = 0 }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [filter, setFilter] = useState("all"); // all | ready | soon
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // t и заголовки держим в ref: загрузка зависит только от API и refreshKey.
  // Иначе смена идентичности t при рендере запускала бы повторные запросы.
  const tRef = useRef(t);
  const headersRef = useRef(authHeaders);
  tRef.current = t;
  headersRef.current = authHeaders;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await fetch(`${API}/loyalty/customers`, { headers: headersRef.current });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "load failed");
      setState({ loading: false, error: "", data });
    } catch (e) {
      setState((s) => ({
        loading: false,
        data: s.data,
        error: tRef.current("loyalty.clients.loadError", {
          defaultValue: "Не удалось загрузить список клиентов",
        }),
      }));
    }
  }, [API]);

  // Запрос только при активной программе; при выключенной список очищаем
  useEffect(() => {
    if (enabled) {
      load();
    } else {
      setState({ loading: false, error: "", data: null });
    }
  }, [enabled, load, refreshKey]);

  // При смене фильтра/поиска возвращаемся к первой странице
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filter, query]);

  const data = state.data;
  const items = data?.items ?? [];
  const summary = data?.summary ?? { ready: 0, soon: 0, total: 0 };
  const ordersBefore = data?.ordersBefore ?? 0;
  const valueLabel = data ? formatLoyaltyValue(data.type, data.value) : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return items.filter((c) => {
      if (filter === "ready" && !c.ready) return false;
      if (filter === "soon" && !c.soon) return false;
      if (!q) return true;
      if (String(c.name || "").toLowerCase().includes(q)) return true;
      return qDigits ? String(c.phone || "").replace(/\D/g, "").includes(qDigits) : false;
    });
  }, [items, filter, query]);

  const shown = filtered.slice(0, visible);

  const tabs = [
    { key: "all", label: t("loyalty.clients.filters.all", { defaultValue: "Все" }), count: summary.total },
    { key: "ready", label: t("loyalty.clients.filters.ready", { defaultValue: "Скидка положена" }), count: summary.ready },
    { key: "soon", label: t("loyalty.clients.filters.soon", { defaultValue: "Скоро" }), count: summary.soon },
  ];

  const header = (
    <div className="lo-cl-head">
      <div className="lo-head-title">
        <span className="lo-head-ico"><Users size={20} /></span>
        <div>
          <h3>{t("loyalty.clients.title", { defaultValue: "Клиенты в программе" })}</h3>
          <p>
            {t("loyalty.clients.subtitle", {
              defaultValue: "Копят заказы до скидки — у кого она уже подходит, показаны первыми",
            })}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="owner-secondary-btn lo-cl-refresh"
        onClick={load}
        disabled={state.loading || !enabled}
        title={t("loyalty.clients.refresh", { defaultValue: "Обновить" })}
      >
        <RefreshCw size={15} className={state.loading ? "lo-spin" : ""} />
        {t("loyalty.clients.refresh", { defaultValue: "Обновить" })}
      </button>
    </div>
  );

  // Программа выключена: блок остаётся на странице, но список пуст
  if (!enabled) {
    return (
      <section className="owner-card lo-card lo-cl lo-cl-off">
        {header}
        <div className="lo-cl-disabled">
          <Gift size={18} />
          <span>
            {t("loyalty.clients.disabled", {
              defaultValue: "Бонусная программа отключена — список пуст",
            })}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="owner-card lo-card lo-cl">
      {header}

      {/* Сводка-фильтры */}
      <div className="lo-cl-tools">
        <div className="lo-cl-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              className={`lo-cl-tab ${filter === tab.key ? "active" : ""} ${tab.key}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.key === "ready" && <Gift size={14} />}
              {tab.key === "soon" && <Clock size={14} />}
              <span>{tab.label}</span>
              <b>{tab.count}</b>
            </button>
          ))}
        </div>

        <label className="lo-cl-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("loyalty.clients.search", { defaultValue: "Имя или телефон" })}
          />
        </label>
      </div>

      {state.error && (
        <div className="lo-banner lo-banner-warn">
          <AlertTriangle size={16} />
          <span>{state.error}</span>
          <button type="button" className="lo-cl-retry" onClick={load}>
            {t("loyalty.clients.retry", { defaultValue: "Повторить" })}
          </button>
        </div>
      )}

      {/* Список */}
      {state.loading && !data ? (
        <div className="lo-cl-empty">{t("loyalty.loading", { defaultValue: "Загрузка…" })}</div>
      ) : items.length === 0 ? (
        !state.error && (
          <div className="lo-cl-empty">
            {t("loyalty.clients.empty", {
              defaultValue:
                "Пока никто не копит заказы. Клиенты появятся здесь после первых заказов при включённой программе.",
            })}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="lo-cl-empty">
          {t("loyalty.clients.emptyFiltered", { defaultValue: "Никого не найдено" })}
        </div>
      ) : (
        <ul className="lo-cl-list">
          {shown.map((c) => {
            const pct = ordersBefore > 0 ? Math.min(100, Math.round((c.ordersCount / ordersBefore) * 100)) : 0;
            return (
              <li key={c.phone} className={`lo-cl-row ${c.ready ? "is-ready" : c.soon ? "is-soon" : ""}`}>
                <span className="lo-cl-avatar">{initialOf(c.name, c.phone)}</span>

                <div className="lo-cl-who">
                  <strong>{c.name || t("loyalty.clients.noName", { defaultValue: "Без имени" })}</strong>
                  <span>{c.phone}</span>
                </div>

                <div className="lo-cl-progress">
                  <div className="lo-cl-bar" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="lo-cl-count">
                    {t("loyalty.clients.ordersOf", {
                      defaultValue: "{{n}} из {{total}}",
                      n: c.ordersCount,
                      total: ordersBefore,
                    })}
                  </span>
                </div>

                <div className="lo-cl-status">
                  {c.ready ? (
                    <span className="lo-chip ready" title={t("loyalty.clients.readyHint", {
                      defaultValue: "Следующий заказ — со скидкой {{v}}", v: valueLabel,
                    })}>
                      <Gift size={13} />
                      {t("loyalty.clients.ready", { defaultValue: "Скидка положена" })}
                      <em>{valueLabel}</em>
                    </span>
                  ) : (
                    <span className={`lo-chip ${c.soon ? "soon" : "wait"}`}>
                      {t("loyalty.clients.remaining", {
                        defaultValue: "Осталось: {{n}}", n: c.remaining,
                      })}
                    </span>
                  )}
                </div>

                <div className="lo-cl-last">
                  <span>{t("loyalty.clients.lastOrder", { defaultValue: "Последний заказ" })}</span>
                  {fmtDate(c.lastOrderAt)}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > shown.length && (
        <button
          type="button"
          className="owner-secondary-btn lo-cl-more"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          {t("loyalty.clients.more", { defaultValue: "Показать ещё" })} ({filtered.length - shown.length})
        </button>
      )}

      {data?.truncated && (
        <div className="lo-cl-note">
          {t("loyalty.clients.truncated", {
            defaultValue: "Показаны первые 500 клиентов с наибольшим числом заказов",
          })}
        </div>
      )}
    </section>
  );
}
