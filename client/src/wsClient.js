// ─────────────────────────────────────────────────────────────────────────────
// wsClient — единственное WS-соединение на вкладку (синглтон).
//
// Гарантия консистентности: каждый переход сокета в open → все подписанные
// страницы делают полный REST-ресинк (onOpen). Пропущенные за время разрыва
// события перекрываются свежим снапшотом, WS доставляет только дельты.
//
// Устойчивость:
//  • реконнект с экспоненциальным backoff + jitter;
//  • watchdog: сервер пингует каждые ~30 c, если 75 c тишины — соединение
//    считается полумёртвым и пересоздаётся;
//  • visibilitychange/online: вкладка снова видима или сеть вернулась —
//    мгновенный реконнект без ожидания таймера;
//  • close 4401 (невалидный JWT) — реконнект прекращается, шлётся
//    window-событие "ws-unauthorized" (страница должна отправить на /login).
// ─────────────────────────────────────────────────────────────────────────────

import useUserStore from "./store/userStore.js";
import { jwtDecode } from "jwt-decode";

const API = import.meta.env.VITE_API_URL;
export const WS_URL =
  import.meta.env.VITE_WS_URL || (API || "").replace(/^http/, "ws");

const WATCHDOG_MS = 75_000;   // > 2 серверных heartbeat-интервалов (30 c)
const MAX_BACKOFF_MS = 15_000;

let ws = null;
let attempts = 0;
let watchdogTimer = null;
let reconnectTimer = null;
let stopped = false; // true после 4401 — до явного connect()

const messageListeners = new Set();
const openListeners = new Set();

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function getCompanyId() {
  const fromStore = useUserStore.getState().user?.companyId;
  if (Number.isFinite(Number(fromStore))) return Number(fromStore);
  try {
    const token = getToken();
    if (!token) return null;
    const p = jwtDecode(token);
    const cid = Number(p?.companyId ?? p?.company_id);
    return Number.isFinite(cid) ? cid : null;
  } catch {
    return null;
  }
}

/** Подписка на входящие сообщения. Возвращает функцию отписки. */
export function subscribe(fn) {
  messageListeners.add(fn);
  return () => messageListeners.delete(fn);
}

/**
 * Колбэк на каждый (ре)коннект — сюда вешается REST-ресинк страницы.
 * Если сокет уже открыт, колбэк вызывается сразу (страница могла
 * смонтироваться позже установления соединения).
 */
export function onOpen(fn) {
  openListeners.add(fn);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { fn(); } catch (e) { console.warn("wsClient onOpen cb", e); }
  }
  return () => openListeners.delete(fn);
}

export function isConnected() {
  return !!ws && ws.readyState === WebSocket.OPEN;
}

function armWatchdog() {
  clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(() => {
    // Долгая тишина: сервер шлёт ping каждые ~30 c, значит соединение мертво.
    console.warn("[ws] watchdog: no traffic, forcing reconnect");
    try { ws?.close(); } catch { /* onclose сам запустит реконнект */ }
  }, WATCHDOG_MS);
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  const delay =
    Math.min(MAX_BACKOFF_MS, 500 * 2 ** Math.min(attempts, 5)) +
    Math.floor(Math.random() * 300);
  attempts += 1;
  reconnectTimer = setTimeout(connect, delay);
}

export function connect() {
  stopped = false;
  if (!getToken()) return; // не авторизованы — нечего подключать
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    attempts = 0;
    armWatchdog();
    ws.send(JSON.stringify({
      type: "hello",
      role: "admin",
      companyId: getCompanyId(), // сервер всё равно берёт из токена; поле — для совместимости
      token: getToken(),
    }));
    openListeners.forEach((fn) => {
      try { fn(); } catch (e) { console.warn("wsClient onOpen cb", e); }
    });
  };

  ws.onmessage = (e) => {
    armWatchdog();
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    messageListeners.forEach((fn) => {
      try { fn(msg); } catch (err) { console.warn("wsClient listener", err); }
    });
  };

  ws.onclose = (e) => {
    clearTimeout(watchdogTimer);
    if (e.code === 4401) {
      // Токен невалиден/просрочен: реконнект бессмыслен, нужен перелогин.
      stopped = true;
      window.dispatchEvent(new Event("ws-unauthorized"));
      return;
    }
    if (!stopped) scheduleReconnect();
  };

  ws.onerror = () => {
    try { ws.close(); } catch { /* noop */ }
  };
}

/** Полная остановка (например, при logout). */
export function disconnect() {
  stopped = true;
  clearTimeout(reconnectTimer);
  clearTimeout(watchdogTimer);
  try { ws?.close(); } catch { /* noop */ }
  ws = null;
}

// Вкладка снова видима / сеть вернулась → немедленная проверка соединения.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !stopped) {
      attempts = 0;
      clearTimeout(reconnectTimer);
      connect();
    }
  });
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (!stopped) {
      attempts = 0;
      clearTimeout(reconnectTimer);
      connect();
    }
  });
}
