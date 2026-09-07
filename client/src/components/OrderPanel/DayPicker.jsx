import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import "./dayPicker.css";

/** Локальная дата в виде YYYY-MM-DD — без сдвига часового пояса, который
 *  даёт toISOString() (для Риги он уводил бы дату на день назад ночью). */
export function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → Date в местной полуночи (без него строка парсится как UTC) */
function fromDayKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Читаемая дата из ключа дня. Отдельная функция, чтобы вызывающий код не
 *  писал new Date("2026-09-05") — это UTC-полночь, и в минусовых часовых
 *  поясах она показала бы предыдущий день. */
export function formatDayKey(key, locale, options) {
  if (!key) return "";
  return fromDayKey(key).toLocaleDateString(
    locale,
    options || { day: "2-digit", month: "long", year: "numeric" }
  );
}

/** Понедельник первым: у Date воскресенье это 0, нам нужно 6 */
function mondayIndex(jsDay) {
  return (jsDay + 6) % 7;
}

/**
 * Кнопка-таб с выпадающим календарём для выбора прошедшего дня.
 *
 * value — выбранный день (YYYY-MM-DD) или null, если смотрим сегодняшний.
 * onChange(key | null) — выбор дня либо возврат к сегодняшнему.
 * Будущие дни выбрать нельзя: заказов там нет, а кнопка выглядела бы рабочей.
 */
export default function DayPicker({ value, onChange, t, locale = "ru" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const todayKey = toDayKey(new Date());

  // Месяц, который показан в сетке. Открывая календарь, всегда возвращаемся
  // к месяцу выбранного дня — иначе после долгого листания непонятно, где ты.
  const [viewMonth, setViewMonth] = useState(() =>
    fromDayKey(value || todayKey)
  );

  useEffect(() => {
    if (open) setViewMonth(fromDayKey(value || todayKey));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Закрытие: клик вне, Escape, скролл (поповер спозиционирован относительно
  // кнопки и при прокрутке «уедет») — та же схема, что у меню статусов.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const weekdays = useMemo(() => {
    // 2024-01-01 — понедельник, от него и берём подписи дней недели
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: "short" });
    });
  }, [locale]);

  // Сетка месяца: ведущие пустые ячейки + дни
  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = mondayIndex(first.getDay());

    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(toDayKey(new Date(year, month, d)));
    }
    return out;
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  // Листать вперёд дальше текущего месяца незачем — там только будущее
  const atCurrentMonth =
    viewMonth.getFullYear() === new Date().getFullYear() &&
    viewMonth.getMonth() === new Date().getMonth();

  const shiftMonth = (delta) =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const pick = (key) => {
    setOpen(false);
    // Выбор сегодняшнего дня — это и есть обычный режим работы
    onChange(key === todayKey ? null : key);
  };

  const buttonLabel = value
    ? fromDayKey(value).toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      })
    : t("orderPanel.history.tab", { defaultValue: "История" });

  return (
    <div className="dp-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`nav-tab dp-tab ${value ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title={t("orderPanel.history.tabHint", {
          defaultValue: "Заказы за прошедший день",
        })}
      >
        <CalendarDays size={16} />
        {buttonLabel}
      </button>

      {/* Быстрый возврат к сегодняшнему дню, не открывая календарь */}
      {value && (
        <button
          type="button"
          className="dp-clear"
          onClick={() => onChange(null)}
          title={t("orderPanel.history.backToToday", {
            defaultValue: "Вернуться к сегодняшнему дню",
          })}
        >
          <X size={14} />
        </button>
      )}

      {open && (
        <div className="dp-pop" role="dialog" aria-modal="false">
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="dp-month">{monthLabel}</span>
            <button
              type="button"
              className="dp-nav"
              onClick={() => shiftMonth(1)}
              disabled={atCurrentMonth}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="dp-grid dp-weekdays">
            {weekdays.map((w) => (
              <span key={w} className="dp-weekday">
                {w}
              </span>
            ))}
          </div>

          <div className="dp-grid">
            {cells.map((key, i) =>
              key === null ? (
                <span key={`e${i}`} className="dp-cell dp-empty" />
              ) : (
                <button
                  key={key}
                  type="button"
                  className={`dp-cell ${key === value ? "is-selected" : ""} ${
                    key === todayKey ? "is-today" : ""
                  }`}
                  disabled={key > todayKey}
                  onClick={() => pick(key)}
                >
                  {Number(key.slice(8))}
                </button>
              )
            )}
          </div>

          <button type="button" className="dp-today" onClick={() => pick(todayKey)}>
            {t("orderPanel.history.today", { defaultValue: "Сегодня" })}
          </button>
        </div>
      )}
    </div>
  );
}
