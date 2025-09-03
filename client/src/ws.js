// Укажи сюда публичный URL от ngrok, когда будешь тестировать с телефона
// Локально для браузера можно оставить ws://localhost:4000
// export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
export const WS_URL = 'wss://deliveryappserver-1.onrender.com';



export function createAdminSocket(onMessage) {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'hello', role: 'admin' }));
    };
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        onMessage?.(data);
    };
    ws.onclose = () => {
        setTimeout(() => createAdminSocket(onMessage), 1500);
    };
    return ws;
}