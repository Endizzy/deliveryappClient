import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Gift, Save, Minus, Plus, Euro, Percent, Info, AlertTriangle, RotateCcw, ShoppingBag, ShieldAlert, X,
} from "lucide-react";
import "./loyaltyTab.css";
import LoyaltyCustomers from "./LoyaltyCustomers.jsx";
import { formatCents, toCents } from "../../utils/money.js";

// Пример заказа для предпросмотра, €
const EXAMPLE_ORDER_EUR = 40;

const FIXED_PRESETS = [2, 3, 5, 10];
const PERCENT_PRESETS = [5, 10, 15, 20];

const MAX_ORDERS_BEFORE = 100;
const MAX_FIXED = 1000;

// Фраза, которую нужно ввести, чтобы подтвердить отключение программы
const CONFIRM_PHRASE = "cancel loyalty";

const parseNum = (v) => {
  const n = Number(String(v ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

// Вкладка «Лояльность» в OwnerSettings: скидка на (N+1)-й заказ клиента.
// Форма слева, живой предпросмотр справа. Настройки на сервере:
// GET/PUT /api/loyalty/settings.
export default function LoyaltyTab({ API, authHeaders, t, ui }) {
  const notify = (opts) => (ui ? ui.alert(opts) : window.alert(opts.message));

  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(true); // выполнена ли SQL-миграция
  const [saving, setSaving] = useState(false);

  // Значения формы. Числа держим строками, чтобы поле можно было очистить.
  const [enabled, setEnabled] = useState(false);
  const [ordersBefore, setOrdersBefore] = useState("10");
  const [type, setType] = useState("fixed");
  const [value, setValue] = useState("5");

  // Что сохранено на сервере — чтобы показывать «есть несохранённые изменения»
  const [saved, setSaved] = useState(null);
  // Растёт после каждого успешного сохранения — список клиентов перезагружается
  const [listVersion, setListVersion] = useState(0);

  // Подтверждение отключения: окно с вводом фразы (как удаление репозитория на GitHub)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const confirmInputRef = useRef(null);
  const confirmMatches = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  const applyServer = (s) => {
    const next = {
      enabled: !!s.enabled,
      ordersBefore: String(s.ordersBefore ?? 10),
      type: s.type === "percent" ? "percent" : "fixed",
      // value 0 = ещё не настраивали → подставляем разумное значение
      value: s.value > 0 ? String(s.value) : (s.type === "percent" ? "10" : "5"),
    };
    setEnabled(next.enabled);
    setOrdersBefore(next.ordersBefore);
    setType(next.type);
    setValue(next.value);
    setSaved(next);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/loyalty/settings`, { headers: authHeaders });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.ok) {
          setReady(data.ready !== false);
          applyServer(data.settings || {});
        }
      } catch {
        // остаёмся на значениях по умолчанию
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [API, authHeaders]);

  const nOrders = Math.trunc(parseNum(ordersBefore));
  const nValue = parseNum(value);

  // Ошибки валидации (те же границы, что и на сервере)
  const errors = useMemo(() => {
    const e = {};
    if (!Number.isFinite(nOrders) || nOrders < 1 || nOrders > MAX_ORDERS_BEFORE) {
      e.ordersBefore = t("loyalty.errors.ordersBefore", {
        defaultValue: "От 1 до {{max}}", max: MAX_ORDERS_BEFORE,
      });
    }
    if (!Number.isFinite(nValue) || nValue <= 0) {
      e.value = t("loyalty.errors.valuePositive", { defaultValue: "Больше нуля" });
    } else if (type === "percent" && nValue > 100) {
      e.value = t("loyalty.errors.percentMax", { defaultValue: "Не больше 100%" });
    } else if (type === "fixed" && nValue > MAX_FIXED) {
      e.value = t("loyalty.errors.fixedMax", { defaultValue: "Не больше {{max}} €", max: MAX_FIXED });
    }
    return e;
  }, [nOrders, nValue, type, t]);
  const hasErrors = Object.keys(errors).length > 0;

  // Настройки можно менять только при включённой программе (и готовой миграции).
  // Сам переключатель «Включена» остаётся доступным — иначе программу не включить.
  const locked = !ready || !enabled;

  const dirty =
    !!saved &&
    (saved.enabled !== enabled ||
      saved.ordersBefore !== ordersBefore ||
      saved.type !== type ||
      saved.value !== value);

  const stepOrders = (delta) => {
    const cur = Number.isFinite(nOrders) ? nOrders : 10;
    setOrdersBefore(String(Math.min(MAX_ORDERS_BEFORE, Math.max(1, cur + delta))));
  };

  const switchType = (next) => {
    if (next === type) return;
    setType(next);
    // Значение из другой единицы измерения не подходит: 10 € ≠ 10%
    setValue(next === "percent" ? "10" : "5");
  };

  // Нажатие «Сохранить»: если программа сейчас включена на сервере, а в форме её
  // выключили — сначала просим подтверждение, и только после него сохраняем.
  const handleSave = () => {
    if (hasErrors || saving) return;
    if (saved?.enabled && !enabled) {
      setConfirmText("");
      setConfirmOpen(true);
      return;
    }
    doSave();
  };

  const closeConfirm = () => {
    if (saving) return;
    setConfirmOpen(false);
    setConfirmText("");
  };

  const confirmDisable = async () => {
    if (!confirmMatches || saving) return;
    await doSave();
    setConfirmOpen(false);
    setConfirmText("");
  };

  useEffect(() => {
    if (!confirmOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !saving) closeConfirm(); };
    window.addEventListener("keydown", onKey);
    const tid = setTimeout(() => confirmInputRef.current?.focus(), 30);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(tid); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmOpen, saving]);

  const doSave = async () => {
    if (hasErrors) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/loyalty/settings`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ enabled, ordersBefore: nOrders, type, value: nValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || t("loyalty.errors.saveFailed", { defaultValue: "Не удалось сохранить настройки" })
        );
      }
      applyServer(data.settings);
      setListVersion((v) => v + 1);
      notify({ message: t("loyalty.saved", { defaultValue: "Настройки лояльности сохранены" }) });
    } catch (e) {
      notify({ message: e.message, tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  // ── Предпросмотр ──────────────────────────────────────────────────────────
  const goodN = Number.isFinite(nOrders) && nOrders >= 1 ? Math.min(nOrders, MAX_ORDERS_BEFORE) : 10;
  const giftNo = goodN + 1;

  const exampleCents = toCents(EXAMPLE_ORDER_EUR);
  const exampleDiscountCents = (() => {
    if (!Number.isFinite(nValue) || nValue <= 0) return 0;
    if (type === "percent") return Math.round((exampleCents * Math.min(nValue, 100)) / 100);
    return Math.min(toCents(nValue), exampleCents);
  })();
  const exampleTotalCents = exampleCents - exampleDiscountCents;

  // Кружки заказов: если их много — сворачиваем середину
  const dots = useMemo(() => {
    const total = giftNo;
    if (total <= 12) return Array.from({ length: total }, (_, i) => i + 1);
    return [1, 2, 3, 4, 5, "gap", total];
  }, [giftNo]);

  const valueLabel =
    type === "percent" ? `${Number.isFinite(nValue) ? nValue : 0}%` : `${formatCents(toCents(Number.isFinite(nValue) ? nValue : 0))} €`;

  if (!loaded) {
    return (
      <section className="owner-card lo-loading">
        {t("loyalty.loading", { defaultValue: "Загрузка…" })}
      </section>
    );
  }

  return (
    <>
    <div className="lo-layout">
      {/* ───────── Форма ───────── */}
      <section className="owner-card lo-card">
        <div className="lo-head">
          <div className="lo-head-title">
            <span className="lo-head-ico"><Gift size={20} /></span>
            <div>
              <h3>{t("loyalty.title", { defaultValue: "Программа лояльности" })}</h3>
              <p>
                {t("loyalty.subtitle", {
                  defaultValue: "Скидка клиенту на заказ, который наступает по счёту",
                })}
              </p>
            </div>
          </div>

          <label className={`lo-switch ${enabled ? "on" : ""}`}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!ready}
            />
            <span className="lo-switch-track"><span className="lo-switch-thumb" /></span>
            <span className="lo-switch-label">
              {enabled
                ? t("loyalty.on", { defaultValue: "Включена" })
                : t("loyalty.off", { defaultValue: "Выключена" })}
            </span>
          </label>
        </div>

        {!ready && (
          <div className="lo-banner lo-banner-warn">
            <AlertTriangle size={16} />
            <span>
              {t("loyalty.notReady", {
                defaultValue:
                  "Не выполнена SQL-миграция loyalty.sql — программа недоступна, пока таблицы не созданы.",
              })}
            </span>
          </div>
        )}

        {ready && !enabled && (
          <div className="lo-banner lo-banner-info">
            <Info size={16} />
            <span>
              {t("loyalty.lockedHint", {
                defaultValue: "Программа выключена — включите её, чтобы изменить настройки",
              })}
            </span>
          </div>
        )}

        <div className={`lo-body ${!enabled ? "is-off" : ""}`} aria-disabled={locked}>
          {/* 1. Когда */}
          <div className="lo-group">
            <div className="lo-group-head">
              <span className="lo-step">1</span>
              <div>
                <h4>{t("loyalty.when.title", { defaultValue: "Когда даём скидку" })}</h4>
                <p>
                  {t("loyalty.when.hint", {
                    defaultValue: "Сколько заказов клиент делает без скидки",
                  })}
                </p>
              </div>
            </div>

            <div className="lo-stepper-row">
              <div className={`lo-stepper ${errors.ordersBefore ? "has-error" : ""}`}>
                <button
                  type="button"
                  onClick={() => stepOrders(-1)}
                  disabled={locked || nOrders <= 1}
                  aria-label="−"
                >
                  <Minus size={16} />
                </button>
                <input
                  inputMode="numeric"
                  value={ordersBefore}
                  disabled={locked}
                  onChange={(e) => setOrdersBefore(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                  aria-label={t("loyalty.when.label", { defaultValue: "Заказов до скидки" })}
                />
                <button
                  type="button"
                  onClick={() => stepOrders(1)}
                  disabled={locked || nOrders >= MAX_ORDERS_BEFORE}
                  aria-label="+"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="lo-stepper-text">
                <strong>
                  {t("loyalty.when.result", {
                    defaultValue: "Скидка на {{n}}-й заказ", n: giftNo,
                  })}
                </strong>
                <span>
                  {t("loyalty.when.after", {
                    defaultValue: "После этого счёт начинается заново",
                  })}
                </span>
              </div>
            </div>
            {errors.ordersBefore && <div className="lo-error">{errors.ordersBefore}</div>}
          </div>

          {/* 2. Какая */}
          <div className="lo-group">
            <div className="lo-group-head">
              <span className="lo-step">2</span>
              <div>
                <h4>{t("loyalty.what.title", { defaultValue: "Какая скидка" })}</h4>
                <p>
                  {t("loyalty.what.hint", {
                    defaultValue: "Фиксированная сумма или процент от заказа",
                  })}
                </p>
              </div>
            </div>

            <div className="lo-segment" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={type === "fixed"}
                className={type === "fixed" ? "active" : ""}
                disabled={locked}
                onClick={() => switchType("fixed")}
              >
                <Euro size={15} /> {t("loyalty.what.fixed", { defaultValue: "Сумма" })}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={type === "percent"}
                className={type === "percent" ? "active" : ""}
                disabled={locked}
                onClick={() => switchType("percent")}
              >
                <Percent size={15} /> {t("loyalty.what.percent", { defaultValue: "Процент" })}
              </button>
            </div>

            <div className="lo-value-row">
              <div className={`lo-value ${errors.value ? "has-error" : ""}`}>
                <input
                  inputMode="decimal"
                  value={value}
                  disabled={locked}
                  onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, "").slice(0, 7))}
                  aria-label={t("loyalty.what.value", { defaultValue: "Размер скидки" })}
                />
                <span className="lo-value-suffix">{type === "percent" ? "%" : "€"}</span>
              </div>

              <div className="lo-chips">
                {(type === "percent" ? PERCENT_PRESETS : FIXED_PRESETS).map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={locked}
                    className={nValue === p ? "active" : ""}
                    onClick={() => setValue(String(p))}
                  >
                    {p}{type === "percent" ? "%" : " €"}
                  </button>
                ))}
              </div>
            </div>
            {errors.value && <div className="lo-error">{errors.value}</div>}
          </div>
        </div>

        <div className="lo-footer">
          <div className="lo-footer-note">
            {dirty ? (
              <span className="lo-dirty">
                <RotateCcw size={14} />
                {t("loyalty.unsaved", { defaultValue: "Есть несохранённые изменения" })}
              </span>
            ) : (
              <span className="lo-clean">
                {t("loyalty.upToDate", { defaultValue: "Настройки сохранены" })}
              </span>
            )}
          </div>
          <button
            type="button"
            className="owner-primary-btn"
            onClick={handleSave}
            disabled={saving || hasErrors || !dirty || !ready}
          >
            <Save size={16} />
            {saving
              ? t("loyalty.saving", { defaultValue: "Сохранение…" })
              : t("loyalty.save", { defaultValue: "Сохранить" })}
          </button>
        </div>
      </section>

      {/* ───────── Предпросмотр ───────── */}
      <aside className={`owner-card lo-card lo-preview ${!enabled ? "is-off" : ""}`}>
        <div className="lo-preview-title">
          <ShoppingBag size={16} />
          {t("loyalty.preview.title", { defaultValue: "Как это будет работать" })}
          {!enabled && (
            <span className="lo-preview-off">
              {t("loyalty.preview.off", { defaultValue: "программа выключена" })}
            </span>
          )}
        </div>

        <div className="lo-timeline" aria-hidden="true">
          {dots.map((d, i) =>
            d === "gap" ? (
              <span key={`gap-${i}`} className="lo-dot-gap">···</span>
            ) : (
              <span
                key={d}
                className={`lo-dot ${d === giftNo ? "gift" : ""}`}
                title={`#${d}`}
              >
                {d === giftNo ? <Gift size={14} /> : d}
              </span>
            )
          )}
        </div>
        <div className="lo-timeline-legend">
          <span>
            {t("loyalty.preview.regular", {
              defaultValue: "Заказы 1–{{n}} — по обычной цене", n: goodN,
            })}
          </span>
          <span className="gift">
            {t("loyalty.preview.gift", {
              defaultValue: "{{n}}-й — скидка {{v}}", n: giftNo, v: valueLabel,
            })}
          </span>
        </div>

        <div className="lo-example">
          <div className="lo-example-head">
            {t("loyalty.preview.example", {
              defaultValue: "Пример: {{n}}-й заказ клиента", n: giftNo,
            })}
          </div>
          <div className="lo-example-row">
            <span>{t("loyalty.preview.orderSum", { defaultValue: "Сумма заказа" })}</span>
            <span>{formatCents(exampleCents)} €</span>
          </div>
          <div className="lo-example-row disc">
            <span>
              {t("loyalty.preview.discount", { defaultValue: "Скидка лояльности" })}
            </span>
            <span>−{formatCents(exampleDiscountCents)} €</span>
          </div>
          <div className="lo-example-row total">
            <span>{t("loyalty.preview.total", { defaultValue: "К оплате" })}</span>
            <span>{formatCents(exampleTotalCents)} €</span>
          </div>
        </div>

        <ul className="lo-rules">
          <li>
            <Info size={14} />
            {t("loyalty.rules.phone", {
              defaultValue: "Клиент определяется по номеру телефона",
            })}
          </li>
          <li>
            <Info size={14} />
            {t("loyalty.rules.cancelled", {
              defaultValue: "Отменённые заказы в счёт не идут; если заказ со скидкой отменён, скидка возвращается",
            })}
          </li>
          <li>
            <Info size={14} />
            {t("loyalty.rules.best", {
              defaultValue: "Не складывается с другими скидками — применяется наибольшая",
            })}
          </li>
          <li>
            <Info size={14} />
            {t("loyalty.rules.since", {
              defaultValue: "Заказы считаются с момента включения программы",
            })}
          </li>
        </ul>
      </aside>
    </div>

    {/* Список клиентов: блок виден всегда; при выключенной (сохранённой)
        программе внутри пишется, что бонус отключён, и список пуст */}
    <LoyaltyCustomers
      API={API}
      authHeaders={authHeaders}
      t={t}
      enabled={!!saved?.enabled && ready}
      refreshKey={listVersion}
    />

    {confirmOpen && createPortal(
      <div
        className="lo-confirm-overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}
      >
        <div className="lo-confirm" role="dialog" aria-modal="true" aria-labelledby="lo-confirm-title">
          <div className="lo-confirm-head">
            <span className="lo-confirm-ico"><ShieldAlert size={18} /></span>
            <h4 id="lo-confirm-title">
              {t("loyalty.confirmOff.title", { defaultValue: "Отключить программу лояльности?" })}
            </h4>
            <button type="button" className="lo-confirm-x" onClick={closeConfirm} disabled={saving} aria-label="×">
              <X size={16} />
            </button>
          </div>

          <div className="lo-confirm-warn">
            <AlertTriangle size={15} />
            <span>
              {t("loyalty.confirmOff.warning", {
                defaultValue: "Новые заказы перестанут получать скидку лояльности, а клиенты перестанут накапливать заказы для неё.",
              })}
            </span>
          </div>

          <div className="lo-confirm-body">
            <label htmlFor="lo-confirm-input">
              {t("loyalty.confirmOff.prompt", {
                defaultValue: "Чтобы подтвердить, введите {{phrase}} в поле ниже:",
                phrase: CONFIRM_PHRASE,
              })}
            </label>
            <div className="lo-confirm-phrase">{CONFIRM_PHRASE}</div>
            <input
              id="lo-confirm-input"
              ref={confirmInputRef}
              className="lo-confirm-input"
              value={confirmText}
              autoComplete="off"
              spellCheck={false}
              disabled={saving}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmDisable(); } }}
            />
          </div>

          <div className="lo-confirm-foot">
            <button type="button" className="lo-confirm-cancel" onClick={closeConfirm} disabled={saving}>
              {t("loyalty.confirmOff.cancel", { defaultValue: "Отмена" })}
            </button>
            <button
              type="button"
              className="lo-confirm-danger"
              onClick={confirmDisable}
              disabled={!confirmMatches || saving}
            >
              {saving
                ? t("loyalty.saving", { defaultValue: "Сохранение…" })
                : t("loyalty.confirmOff.confirm", { defaultValue: "Я понимаю, отключить лояльность" })}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
