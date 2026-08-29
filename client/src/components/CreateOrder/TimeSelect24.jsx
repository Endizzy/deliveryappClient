import React, { useMemo } from "react";

/**
 * Выбор времени в 24-часовом формате: часы (00–23) + минуты с шагом.
 *
 * Зачем свой компонент вместо <input type="time">: у нативного поля формат
 * (24 ч или AM/PM) задаёт локаль браузера/ОС, и переопределить её нельзя ни
 * атрибутом, ни CSS. У сотрудника с англоязычной системой поле показывало
 * «06:30 PM» — здесь же вид одинаковый у всех и не зависит от настроек.
 *
 * Значение наружу отдаётся в том же виде, что и у <input type="time">
 * («HH:mm» или пустая строка), поэтому вызывающий код менять не нужно.
 *
 * @param {string}   value      "HH:mm" либо ""
 * @param {function} onChange   (next: "HH:mm" | "") => void
 * @param {string}   [min]      "HH:mm" — минимально допустимое время;
 *                              более ранние варианты становятся недоступны
 * @param {number}   [step=5]   шаг минут
 */
export default function TimeSelect24({
  value = "",
  onChange,
  min,
  step = 5,
  id,
  className = "",
  disabled = false,
  hourLabel,
  minuteLabel,
}) {
  const [hh, mm] = String(value || "").split(":");

  const minHour = useMemo(() => {
    if (!min) return null;
    const n = Number(String(min).split(":")[0]);
    return Number.isFinite(n) ? n : null;
  }, [min]);

  const minMinute = useMemo(() => {
    if (!min) return null;
    const n = Number(String(min).split(":")[1]);
    return Number.isFinite(n) ? n : null;
  }, [min]);

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
    []
  );

  const minutes = useMemo(
    () =>
      Array.from({ length: Math.ceil(60 / step) }, (_, i) =>
        String(i * step).padStart(2, "0")
      ),
    [step]
  );

  // Час недоступен, если он раньше минимально допустимого
  const isHourDisabled = (h) => minHour != null && Number(h) < minHour;

  // Минуты ограничиваем только внутри минимального часа
  const isMinuteDisabled = (m) =>
    minHour != null &&
    minMinute != null &&
    Number(hh) === minHour &&
    Number(m) < minMinute;

  const emit = (nextH, nextM) => {
    if (!nextH || !nextM) {
      onChange?.("");
      return;
    }
    onChange?.(`${nextH}:${nextM}`);
  };

  const handleHour = (nextH) => {
    if (!nextH) return emit("", "");
    let nextM = mm || "00";
    // Переход на минимально допустимый час мог сделать минуты невалидными
    if (minHour != null && minMinute != null && Number(nextH) === minHour && Number(nextM) < minMinute) {
      nextM = minutes.find((m) => Number(m) >= minMinute) ?? minutes[minutes.length - 1];
    }
    emit(nextH, nextM);
  };

  const handleMinute = (nextM) => {
    if (!nextM) return emit("", "");
    emit(hh || String(minHour ?? 0).padStart(2, "0"), nextM);
  };

  return (
    <div className={`time24 ${className}`} id={id}>
      <select
        className="time24-select"
        value={hh || ""}
        onChange={(e) => handleHour(e.target.value)}
        disabled={disabled}
        aria-label={hourLabel || "Часы"}
      >
        <option value="">--</option>
        {hours.map((h) => (
          <option key={h} value={h} disabled={isHourDisabled(h)}>
            {h}
          </option>
        ))}
      </select>

      <span className="time24-sep">:</span>

      <select
        className="time24-select"
        value={mm || ""}
        onChange={(e) => handleMinute(e.target.value)}
        disabled={disabled}
        aria-label={minuteLabel || "Минуты"}
      >
        <option value="">--</option>
        {minutes.map((m) => (
          <option key={m} value={m} disabled={isMinuteDisabled(m)}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
