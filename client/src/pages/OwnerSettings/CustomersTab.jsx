import React, { useEffect, useMemo, useState } from "react";
import {
  Users, Search, Percent, Euro, Megaphone, X, ShoppingBag,
  Calendar, Tag, Send, Trash2, ReceiptText, Phone as PhoneIcon,
  ChevronDown, ChevronRight, CreditCard, Banknote,
} from "lucide-react";
import "./customersTab.css";
import { formatCents, toCents } from "../../utils/money.js";

const toEUR = (n) => `€${formatCents(toCents(Number(n) || 0))}`;

function fmtDate(v, withTime = false) {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  if (isNaN(d.getTime())) return "—";
  const opts = withTime
    ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" };
  return d.toLocaleString("ru-RU", opts);
}

const STATUS_LABEL = {
  new: "Новый", active: "Активный", enroute: "В пути",
  ready: "Готов", completed: "Выполнен", cancelled: "Отменён",
};

const PAYMENT_LABEL = { cash: "Наличные", card: "Карта" };

export default function CustomersTab({ API, authHeaders, t }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ customers: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  // выбранные для рассылки
  const [selected, setSelected] = useState(() => new Set());

  // модалки
  const [discountModal, setDiscountModal] = useState(null); // { phone, name, type, value }
  const [ordersModal, setOrdersModal] = useState(null);      // { phone, name, loading, items }
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [broadcastModal, setBroadcastModal] = useState(null); // { message, scope, sending, result }

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/customers`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка загрузки");
      setItems(data.items || []);
      setSummary(data.summary || { customers: 0, orders: 0, revenue: 0 });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [API]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const toggleSelect = (phone) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.phone));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((c) => next.delete(c.phone));
      else filtered.forEach((c) => next.add(c.phone));
      return next;
    });
  };

  // ── скидка ────────────────────────────────────────────────────────────────
  const openDiscount = (c) => {
    setDiscountModal({
      phone: c.phone,
      name: c.name,
      type: c.discount?.type || "percent",
      value: c.discount ? String(c.discount.value) : "",
    });
  };

  const saveDiscount = async () => {
    const m = discountModal;
    if (!m) return;
    try {
      const res = await fetch(`${API}/customers/${encodeURIComponent(m.phone)}/discount`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ type: m.type, value: Number(m.value) || 0 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка");
      setDiscountModal(null);
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeDiscount = async () => {
    const m = discountModal;
    if (!m) return;
    try {
      await fetch(`${API}/customers/${encodeURIComponent(m.phone)}/discount`, {
        method: "DELETE",
        headers: authHeaders,
      });
      setDiscountModal(null);
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  // ── заказы клиента ──────────────────────────────────────────────────────────
  const openOrders = async (c) => {
    setExpandedOrderId(null);
    setOrdersModal({ phone: c.phone, name: c.name, loading: true, items: [] });
    try {
      const res = await fetch(`${API}/customers/${encodeURIComponent(c.phone)}/orders`, {
        headers: authHeaders,
      });
      const data = await res.json();
      setOrdersModal({
        phone: c.phone, name: c.name, loading: false,
        items: (data.ok && data.items) || [],
      });
    } catch (e) {
      setOrdersModal({ phone: c.phone, name: c.name, loading: false, items: [] });
    }
  };

  // ── рассылка ────────────────────────────────────────────────────────────────
  const openBroadcast = () => {
    setBroadcastModal({
      message: "",
      scope: selected.size > 0 ? "selected" : "all",
      sending: false,
      result: null,
    });
  };

  const sendBroadcast = async () => {
    const m = broadcastModal;
    if (!m || !m.message.trim()) return;
    setBroadcastModal((s) => ({ ...s, sending: true, result: null }));
    try {
      const phones = m.scope === "selected" ? Array.from(selected) : [];
      const res = await fetch(`${API}/customers/broadcast`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ message: m.message.trim(), phones }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка");
      setBroadcastModal((s) => ({ ...s, sending: false, result: data }));
    } catch (e) {
      setBroadcastModal((s) => ({ ...s, sending: false, result: { error: e.message } }));
    }
  };

  const discountLabel = (d) =>
    !d ? null : d.type === "fixed" ? `−${toEUR(d.value)}` : `−${d.value}%`;

  return (
    <div className="cust-wrap">
      {/* Сводка */}
      <div className="cust-stats">
        <div className="cust-stat">
          <div className="cust-stat-ic"><Users size={18} /></div>
          <div>
            <div className="cust-stat-val">{summary.customers}</div>
            <div className="cust-stat-lbl">Клиентов</div>
          </div>
        </div>
        <div className="cust-stat">
          <div className="cust-stat-ic"><ShoppingBag size={18} /></div>
          <div>
            <div className="cust-stat-val">{summary.orders}</div>
            <div className="cust-stat-lbl">Заказов (без отменённых)</div>
          </div>
        </div>
        <div className="cust-stat">
          <div className="cust-stat-ic"><Euro size={18} /></div>
          <div>
            <div className="cust-stat-val">{toEUR(summary.revenue)}</div>
            <div className="cust-stat-lbl">Выручка</div>
          </div>
        </div>
      </div>

      {/* Тулбар */}
      <div className="cust-toolbar">
        <div className="cust-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или телефону…"
          />
        </div>
        <div className="cust-toolbar-right">
          {selected.size > 0 && (
            <span className="cust-selected-count">Выбрано: {selected.size}</span>
          )}
          <button className="owner-primary-btn" onClick={openBroadcast}>
            <Megaphone size={16} /> Рассылка
          </button>
        </div>
      </div>

      {error && <div className="cust-error">{error}</div>}

      {/* Таблица клиентов */}
      <div className="cust-table-card">
        <table className="cust-table">
          <thead>
            <tr>
              <th className="cust-col-check">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
              </th>
              <th>Клиент</th>
              <th>Телефон</th>
              <th className="cust-num">Заказов</th>
              <th className="cust-num">Сумма</th>
              <th>Последний заказ</th>
              <th>Скидка</th>
              <th className="cust-col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="cust-empty">Загрузка…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="cust-empty">Клиенты не найдены</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.phone}>
                  <td className="cust-col-check">
                    <input
                      type="checkbox"
                      checked={selected.has(c.phone)}
                      onChange={() => toggleSelect(c.phone)}
                    />
                  </td>
                  <td className="cust-name">{c.name || "—"}</td>
                  <td className="cust-phone">{c.phone}</td>
                  <td className="cust-num">{c.paidOrdersCount}</td>
                  <td className="cust-num cust-strong">{toEUR(c.totalSpent)}</td>
                  <td>{fmtDate(c.lastOrderAt)}</td>
                  <td>
                    {c.discount ? (
                      <span className="cust-badge cust-badge-disc">{discountLabel(c.discount)}</span>
                    ) : (
                      <span className="cust-badge cust-badge-muted">нет</span>
                    )}
                  </td>
                  <td className="cust-col-actions">
                    <button className="cust-icon-btn" title="Заказы" onClick={() => openOrders(c)}>
                      <ReceiptText size={16} />
                    </button>
                    <button className="cust-icon-btn" title="Скидка" onClick={() => openDiscount(c)}>
                      <Percent size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Модалка скидки ── */}
      {discountModal && (
        <div className="owner-modal" onMouseDown={() => setDiscountModal(null)}>
          <div className="owner-modal-card cust-modal-sm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h3><Tag size={18} /> Скидка клиента</h3>
              <button className="owner-icon" onClick={() => setDiscountModal(null)}><X size={18} /></button>
            </div>
            <div className="owner-modal-body">
              <div className="cust-modal-sub">
                {discountModal.name || "—"} · {discountModal.phone}
              </div>
              <div className="owner-field">
                <label>Тип скидки</label>
                <select
                  value={discountModal.type}
                  onChange={(e) => setDiscountModal((m) => ({ ...m, type: e.target.value }))}
                >
                  <option value="percent">Процент (%)</option>
                  <option value="fixed">Фиксированная (€)</option>
                </select>
              </div>
              <div className="owner-field">
                <label>{discountModal.type === "fixed" ? "Сумма скидки, €" : "Размер скидки, %"}</label>
                <input
                  type="number" min="0" step={discountModal.type === "fixed" ? "0.5" : "1"}
                  max={discountModal.type === "percent" ? "100" : undefined}
                  value={discountModal.value}
                  onChange={(e) => setDiscountModal((m) => ({ ...m, value: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <p className="cust-hint">
                Скидка автоматически подставляется при создании нового заказа для этого клиента.
              </p>
            </div>
            <div className="owner-modal-footer">
              <button className="cust-ghost-btn cust-danger" onClick={removeDiscount}>
                <Trash2 size={15} /> Убрать
              </button>
              <button className="owner-primary-btn" onClick={saveDiscount}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модалка заказов клиента ── */}
      {ordersModal && (
        <div className="owner-modal" onMouseDown={() => setOrdersModal(null)}>
          <div className="owner-modal-card cust-modal-md" onMouseDown={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h3><Calendar size={18} /> Заказы · {ordersModal.name || ordersModal.phone}</h3>
              <button className="owner-icon" onClick={() => setOrdersModal(null)}><X size={18} /></button>
            </div>
            <div className="owner-modal-body">
              {ordersModal.loading ? (
                <div className="cust-empty">Загрузка…</div>
              ) : ordersModal.items.length === 0 ? (
                <div className="cust-empty">Заказов нет</div>
              ) : (
                <table className="cust-table cust-orders-table">
                  <thead>
                    <tr>
                      <th className="cust-col-exp"></th>
                      <th>№</th><th>Дата</th><th>Статус</th>
                      <th className="cust-num">Скидка</th><th className="cust-num">Итого</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersModal.items.map((o) => {
                      const open = expandedOrderId === o.id;
                      return (
                        <React.Fragment key={o.id}>
                          <tr
                            className={`cust-order-row ${open ? "open" : ""}`}
                            onClick={() => setExpandedOrderId(open ? null : o.id)}
                          >
                            <td className="cust-col-exp">
                              {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </td>
                            <td>{o.orderNo || `#${o.id}`}</td>
                            <td>{fmtDate(o.createdAt, true)}</td>
                            <td>
                              <span className={`cust-status cust-status-${o.status}`}>
                                {STATUS_LABEL[o.status] || o.status}
                              </span>
                            </td>
                            <td className="cust-num">{o.amountDiscount > 0 ? `−${toEUR(o.amountDiscount)}` : "—"}</td>
                            <td className="cust-num cust-strong">{toEUR(o.amountTotal)}</td>
                          </tr>
                          {open && (
                            <tr className="cust-order-detail-row">
                              <td colSpan={6}>
                                <div className="cust-order-detail">
                                  {(o.items || []).length === 0 ? (
                                    <div className="cust-empty">Позиции не сохранены</div>
                                  ) : (
                                    <table className="cust-items-table">
                                      <thead>
                                        <tr>
                                          <th>Позиция</th>
                                          <th className="cust-num">Цена</th>
                                          <th className="cust-num">Скидка</th>
                                          <th className="cust-num">Кол-во</th>
                                          <th className="cust-num">Сумма</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {o.items.map((it, idx) => (
                                          <tr key={idx}>
                                            <td>{it.name}</td>
                                            <td className="cust-num">{toEUR(it.price)}</td>
                                            <td className="cust-num">{it.discount > 0 ? `${it.discount}%` : "—"}</td>
                                            <td className="cust-num">×{it.quantity}</td>
                                            <td className="cust-num cust-strong">{toEUR(it.lineTotal)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}

                                  <div className="cust-pay-summary">
                                    <div className="cust-pay-method">
                                      {o.paymentMethod === "card"
                                        ? <CreditCard size={15} />
                                        : <Banknote size={15} />}
                                      Оплата: {PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod || "—"}
                                    </div>
                                    <div className="cust-pay-rows">
                                      <div><span>Позиции</span><span>{toEUR(o.amountSubtotal)}</span></div>
                                      {o.amountDiscount > 0 && (
                                        <div className="cust-pay-disc">
                                          <span>Скидка</span><span>−{toEUR(o.amountDiscount)}</span>
                                        </div>
                                      )}
                                      {o.deliveryFee > 0 && (
                                        <div><span>Доставка</span><span>{toEUR(o.deliveryFee)}</span></div>
                                      )}
                                      <div className="cust-pay-total">
                                        <span>Итого оплачено</span><span>{toEUR(o.amountTotal)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Модалка рассылки ── */}
      {broadcastModal && (
        <div className="owner-modal" onMouseDown={() => setBroadcastModal(null)}>
          <div className="owner-modal-card cust-modal-md" onMouseDown={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h3><Megaphone size={18} /> Рекламная рассылка</h3>
              <button className="owner-icon" onClick={() => setBroadcastModal(null)}><X size={18} /></button>
            </div>
            <div className="owner-modal-body">
              <div className="cust-sms-note">
                <PhoneIcon size={14} /> Канал: SMS. Провайдер пока не подключён — сообщение
                будет подготовлено, но не отправлено (тестовый режим).
              </div>

              <div className="owner-field">
                <label>Получатели</label>
                <select
                  value={broadcastModal.scope}
                  onChange={(e) => setBroadcastModal((m) => ({ ...m, scope: e.target.value }))}
                >
                  <option value="all">Все клиенты ({summary.customers})</option>
                  <option value="selected" disabled={selected.size === 0}>
                    Только выбранные ({selected.size})
                  </option>
                </select>
              </div>

              <div className="owner-field">
                <label>Сообщение</label>
                <textarea
                  rows={4}
                  value={broadcastModal.message}
                  onChange={(e) => setBroadcastModal((m) => ({ ...m, message: e.target.value }))}
                  placeholder="Напр.: Скидка 20% на все роллы в эти выходные! 🍣"
                />
                <div className="cust-char-count">{broadcastModal.message.length} симв.</div>
              </div>

              {broadcastModal.result && (
                broadcastModal.result.error ? (
                  <div className="cust-error">{broadcastModal.result.error}</div>
                ) : (
                  <div className="cust-success">
                    Подготовлено для {broadcastModal.result.recipients} получателей.
                    {broadcastModal.result.note ? ` ${broadcastModal.result.note}` : ""}
                  </div>
                )
              )}
            </div>
            <div className="owner-modal-footer">
              <button className="cust-ghost-btn" onClick={() => setBroadcastModal(null)}>Закрыть</button>
              <button
                className="owner-primary-btn"
                onClick={sendBroadcast}
                disabled={broadcastModal.sending || !broadcastModal.message.trim()}
              >
                <Send size={15} /> {broadcastModal.sending ? "Отправка…" : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
