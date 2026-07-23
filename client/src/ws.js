// export const WS_URL = 'wss://deliveryappserver-eu.onrender.com';


// export function createAdminSocket(onMessage) {
//     const ws = new WebSocket(WS_URL);
//     ws.onopen = () => {
//         ws.send(JSON.stringify({ type: 'hello', role: 'admin' }));
//     };
//     ws.onmessage = (e) => {
//         const data = JSON.parse(e.data);
//         onMessage?.(data);
//     };
//     ws.onclose = () => {
//         setTimeout(() => createAdminSocket(onMessage), 1500);
//     };
//     return ws;
// }

// VITE_WS_URL позволяет переключиться на локальный сервер (ws://localhost:4000)
export const WS_URL =
  import.meta.env.VITE_WS_URL || "wss://deliveryappserver-eu.onrender.com";

import useUserStore from "./store/userStore.js";
import { jwtDecode } from "jwt-decode";

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

// companyId: сначала из общего store (единый источник),
// иначе — фолбэк на декодирование JWT (на случай, если store ещё не гидратирован).
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

export function createAdminSocket(onMessage, { companyId } = {}) {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    const cid = Number(companyId ?? getCompanyId());
    ws.send(JSON.stringify({
      type: "hello",
      role: "admin",
      companyId: Number.isFinite(cid) ? cid : null,
      // token можно тоже передавать, если решишь авторизовать WS позже
      token: getToken() || null,
    }));
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage?.(data);
    } catch (err) {
      console.warn("WS parse error", err);
    }
  };

  ws.onclose = () => {
    setTimeout(() => createAdminSocket(onMessage, { companyId }), 1500);
  };

  return ws;
}