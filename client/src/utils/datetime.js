// Хелперы для значений <input type="date"> / <input type="time"> в локальной зоне.

export const pad2 = (n) => String(n).padStart(2, "0");

export const toLocalDateInput = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const toLocalTimeInput = (d) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
