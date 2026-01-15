export const WS_URL = 'wss://deliveryappserver-1.onrender.com';



export function createAdminSocket({ companyId, onMessage }) {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "hello", role: "admin", companyId }));
  };

  ws.onmessage = (e) => {
    try {
      onMessage?.(JSON.parse(e.data));
    } catch {}
  };

  ws.onclose = () => {
    setTimeout(() => createAdminSocket({ companyId, onMessage }), 1500);
  };

  return ws;
}
