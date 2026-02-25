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

export const WS_URL = "wss://deliveryappserver-eu.onrender.com";

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

// если у тебя в localStorage есть user/companyId — можно взять оттуда.
// самый надёжный вариант: прокинуть companyId параметром из UI.
function getCompanyIdFromStorage() {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const cid = Number(u.companyId ?? u.company_id);
    return Number.isFinite(cid) ? cid : null;
  } catch {
    return null;
  }
}

export function createAdminSocket(onMessage, { companyId } = {}) {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    const cid = Number(companyId ?? getCompanyIdFromStorage());
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