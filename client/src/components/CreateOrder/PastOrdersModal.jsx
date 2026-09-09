import React, { useEffect, useMemo, useState } from "react";
import { X, RotateCcw, History, ChevronDown, ChevronUp } from "lucide-react";
import { formatCents, toCents, discountedUnitCents } from "../../utils/money.js";
import "./pastOrders.css";

/**
 * Прошлые заказы клиента с кнопкой «Повторить».
 *
 * Клиент часто просит «то же, что в прошлый раз», и диспетчеру приходилось
 * искать заказ во вкладке «Клиенты» и набирать позиции заново.
 *
 * Важно: повтор берёт из прошлого заказа только состав и количества, а цены
 * и скидки — из АКТУАЛЬНОГО меню. Иначе заказ ушёл бы по прошлогодним ценам.
 * Позиции, которых в меню больше нет, пропускаются и перечисляются диспетчеру.
 */
export default function PastOrdersModal({
  open,
  onClose,
  orders,
  loading,
  error,
  onRepeat,
  menuById,
  t,
  locale = "ru",
}) {
  const [expanded, setExpanded] = useState(null);

  // Закрытие по Escape — как в остальных модалках приложения
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // При закрытии сбрасываем раскрытую карточку, чтобы окно открывалось «чистым»
  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(String(iso).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  };

  // Заранее считаем, что из заказа реально можно повторить: так кнопка не
  // обещает того, чего нет, а диспетчер видит проблему до нажатия.
  const availability = useMemo(() => {
    const map = new Map();
    for (const order of orders || []) {
      const missing = [];
      let ok = 0;
      for (const it of order.items || []) {
        if (menuById.has(String(it.id))) ok += 1;
        else missing.push(it.name || `#${it.id}`);
      }
      map.set(order.id, { ok, missing });
    }
    return map;
  }, [orders, menuById]);

  if (!open) return null;

  return (
    <div className="po-overlay" onMouseDown={onClose}>
      <div
        className="po-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="po-head">
          <h3>
            <History size={18} />
            {t("createOrder.pastOrders.title", { defaultValue: "Прошлые заказы клиента" })}
          </h3>
          <button type="button" className="po-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="po-body">
          {loading && (
            <div className="po-empty">
              {t("createOrder.pastOrders.loading", { defaultValue: "Загружаем…" })}
            </div>
          )}

          {!loading && error && <div className="po-error">{error}</div>}

          {!loading && !error && (orders || []).length === 0 && (
            <div className="po-empty">
              {t("createOrder.pastOrders.empty", {
                defaultValue: "У этого клиента ещё нет заказов",
              })}
            </div>
          )}

          {!loading &&
            !error &&
            (orders || []).map((order) => {
              const info = availability.get(order.id) || { ok: 0, missing: [] };
              const isOpen = expanded === order.id;
              const canRepeat = info.ok > 0;

              return (
                <div key={order.id} className="po-order">
                  <div className="po-order-head">
                    <div className="po-order-meta">
                      <span className="po-order-no">
                        {order.orderSeq ? `№${order.orderSeq}` : order.orderNo}
                      </span>
                      <span className="po-order-date">{fmtDate(order.createdAt)}</span>
                    </div>
                    <div className="po-order-right">
                      <span className="po-order-sum">
                        {formatCents(toCents(order.amountTotal))} €
                      </span>
                      <button
                        type="button"
                        className="po-repeat"
                        onClick={() => onRepeat(order)}
                        disabled={!canRepeat}
                        title={
                          canRepeat
                            ? undefined
                            : t("createOrder.pastOrders.nothingToRepeat", {
                                defaultValue: "Ни одной позиции этого заказа нет в меню",
                              })
                        }
                      >
                        <RotateCcw size={14} />
                        {t("createOrder.pastOrders.repeat", { defaultValue: "Повторить" })}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="po-toggle"
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                  >
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {t("createOrder.pastOrders.itemsCount", {
                      defaultValue: "Позиций: {{count}}",
                      count: (order.items || []).length,
                    })}
                  </button>

                  {isOpen && (
                    <div className="po-items">
                      {(order.items || []).map((it, idx) => {
                        const fresh = menuById.get(String(it.id));
                        return (
                          <div
                            key={`${order.id}-${it.id}-${idx}`}
                            className={`po-item ${fresh ? "" : "is-gone"}`}
                          >
                            <span className="po-item-name">
                              {it.name}
                              {!fresh && (
                                <span className="po-item-gone">
                                  {t("createOrder.pastOrders.itemGone", {
                                    defaultValue: "нет в меню",
                                  })}
                                </span>
                              )}
                            </span>
                            <span className="po-item-qty">×{it.quantity}</span>
                            <span className="po-item-sum">
                              {/* Цена из актуального меню: именно по ней заказ
                                  и повторится, старая цена только запутает */}
                              {fresh
                                ? `${formatCents(
                                    discountedUnitCents(fresh.price, fresh.discount) *
                                      (Number(it.quantity) || 0)
                                  )} €`
                                : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {info.missing.length > 0 && (
                    <div className="po-warn">
                      {t("createOrder.pastOrders.someMissing", {
                        defaultValue:
                          "Не перенесутся (нет в меню): {{names}}",
                        names: info.missing.join(", "),
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <div className="po-foot">
          <span className="po-hint">
            {t("createOrder.pastOrders.priceHint", {
              defaultValue: "Цены берутся из актуального меню, а не из прошлого заказа",
            })}
          </span>
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("createOrder.buttons.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
