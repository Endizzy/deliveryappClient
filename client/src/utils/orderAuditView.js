// Вспомогательные функции вкладки «Журнал» (чистые, без React).

const pad2 = (n) => String(n).padStart(2, "0");

// Начало локального дня; shift — смещение в днях (DST-безопасно)
const startOfDay = (d, shift = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + shift);

const parseDateInput = (v) => {
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Период → границы в ISO (UTC). Границы — по ЛОКАЛЬНЫМ суткам владельца,
 * чтобы «сегодня» означало его сегодня, а не сегодня по времени сервера.
 * key: "today" | "7" | "30" | "custom"; from/to — "YYYY-MM-DD" для custom.
 */
export function periodRange({ key, from, to } = {}, now = new Date()) {
  const tomorrow = startOfDay(now, 1);
  let a;
  let b = tomorrow;
  if (key === "today") a = startOfDay(now);
  else if (key === "30") a = startOfDay(now, -29);
  else if (key === "custom") {
    const f = parseDateInput(from);
    const t = parseDateInput(to);
    a = f || startOfDay(now, -6);
    b = t ? startOfDay(t, 1) : tomorrow;
    if (a.getTime() >= b.getTime()) {
      a = startOfDay(now, -6);
      b = tomorrow;
    }
  } else a = startOfDay(now, -6); // "7" и значение по умолчанию
  return { from: a.toISOString(), to: b.toISOString() };
}

/** Параметры запроса к /api/order-audit */
export function buildAuditQuery({ range, actor, type, source, important, q } = {}, page = 1, pageSize = 50) {
  const p = new URLSearchParams();
  if (range?.from) p.set("from", range.from);
  if (range?.to) p.set("to", range.to);
  if (actor) p.set("actor", String(actor));
  if (type) p.set("type", String(type));
  if (source) p.set("source", String(source));
  if (important) p.set("important", "1");
  if (q && String(q).trim()) p.set("q", String(q).trim());
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  return p.toString();
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}

/** Номера страниц с многоточиями: [1, "…", 4, 5, 6, "…", 22] */
export function pageNumbers(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((x, y) => x - y);
  const out = [];
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/** "preorder @ 2026-11-01T10:00:00.000Z" → { type, at } */
export function parseSchedule(v) {
  const [type, at] = String(v || "").split(" @ ");
  const d = at ? new Date(at) : null;
  return { type: type || "", at: d && !Number.isNaN(d.getTime()) ? d : null };
}

/** "active|cash|3" → { type, payment, n } */
export function parseCreated(v) {
  const [type, payment, n] = String(v || "").split("|");
  return { type: type || "", payment: payment || "", n: Number(n) || 0 };
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Таблица (массив массивов) → CSV с разделителем «;» и BOM — открывается в Excel */
export function toCsv(rows) {
  return "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export function localDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { time: "—", date: "" };
  return {
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`,
  };
}
