// Хелперы для значений <input type="date"> / <input type="time"> в локальной зоне.

export const pad2 = (n) => String(n).padStart(2, "0");

export const toLocalDateInput = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const toLocalTimeInput = (d) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/**
 * Обратное преобразование: поля формы ("2026-08-29" + "11:25") → ISO-строка
 * в UTC для отправки на сервер.
 *
 * Почему обязательно с зоной: строка вида "2026-08-29T11:25" без смещения —
 * это «наивное» время. Браузер трактует его как локальное, а Node на сервере
 * (TZ=UTC в контейнере) — как UTC, и предзаказ уезжал на +3 часа. ISO с Z
 * однозначен для обеих сторон: сервер кладёт в MySQL UTC, клиент при чтении
 * показывает его в зоне пользователя.
 *
 * @returns {string|null} "2026-08-29T08:25:00.000Z" либо null
 */
export const localInputsToISO = (dateInput, timeInput) => {
  if (!dateInput || !timeInput) return null;
  const d = new Date(`${dateInput}T${timeInput}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
