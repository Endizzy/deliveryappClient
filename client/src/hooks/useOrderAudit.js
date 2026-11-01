import { useCallback, useEffect, useRef, useState } from "react";
import { buildAuditQuery } from "../utils/orderAuditView.js";

// Данные вкладки «Журнал» (владелец): GET /api/order-audit.
//
// params — { range:{from,to}, actor, type, source, important, q }.
// Ответ устаревшего запроса (после смены фильтра) отбрасывается по номеру
// запроса. Прошлые данные при ошибке не стираем: лучше показать их, чем пустой экран.
export default function useOrderAudit({ API, authHeaders, params, page, pageSize = 50 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  // заголовки читаем из ref: смена ссылки на объект не должна перезапускать загрузку
  const headersRef = useRef(authHeaders);
  headersRef.current = authHeaders;

  const qs = buildAuditQuery(params, page, pageSize);

  useEffect(() => {
    const my = ++seq.current;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API}/order-audit?${qs}`, { headers: headersRef.current });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (my !== seq.current) return;
        setData(json);
        setError("");
      } catch (e) {
        if (my !== seq.current) return;
        setError(String(e?.message || e || "error"));
      }
      if (my === seq.current) setLoading(false);
    })();
    return () => {
      seq.current += 1;
    };
  }, [API, qs, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  // Выгрузка всех строк по текущим фильтрам (сервер отдаёт не больше 5000)
  const fetchAll = useCallback(async () => {
    const q = buildAuditQuery(params, 1, 100) + "&export=1";
    const res = await fetch(`${API}/order-audit?${q}`, { headers: headersRef.current });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json.items || [];
  }, [API, params]);

  return { data, loading, error, reload, fetchAll };
}
