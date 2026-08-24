/**
 * Время суток в 24-часовом (европейском) формате: "15:42".
 *
 * hourCycle:"h23" задаёт цикл 00–23 явно, поэтому формат не зависит от локали
 * пользователя (en-US иначе даёт "3:42 PM"). Именно h23, а не hour12:false —
 * последний в ряде локалей выдаёт "24:15" вместо "00:15".
 *
 * @param {string|number|Date} value  ISO-строка (в т.ч. UTC от eta-сервиса), timestamp или Date
 * @param {string} [locale]           локаль интерфейса (i18n.language)
 */
export function formatClockTime(value, locale) {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString(locale || undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function formatDuration(ms) {
  if (ms < 0) return "00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0")
  );
}