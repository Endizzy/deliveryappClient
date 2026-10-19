import { useCallback, useEffect, useRef, useState } from "react";

// Данные для Dashboard владельца (вкладка «Общие сведения»).
//
// Два независимых запроса: сводка /dashboard/summary и программа лояльности
// /loyalty/customers (уже существующий эндпоинт). Падение любого из них не
// ломает страницу: недостающий блок просто показывает «нет данных».
//
// Ответ старого запроса (после смены периода) отбрасывается по номеру запроса.
export default function useDashboardSummary({ API, authHeaders, period }) {
  const [summary, setSummary] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  // заголовки читаем из ref: смена ссылки на объект не должна перезапускать загрузку
  const headersRef = useRef(authHeaders);
  headersRef.current = authHeaders;

  useEffect(() => {
    const my = ++seq.current;
    setLoading(true);

    (async () => {
      const [sRes, lRes] = await Promise.allSettled([
        fetch(`${API}/dashboard/summary?period=${encodeURIComponent(period)}`, { headers: headersRef.current })
          .then(async (r) => {
            const data = await r.json().catch(() => null);
            if (!r.ok || !data?.ok) throw new Error(data?.error || `HTTP ${r.status}`);
            return data;
          }),
        fetch(`${API}/loyalty/customers`, { headers: headersRef.current })
          .then(async (r) => {
            const data = await r.json().catch(() => null);
            if (!r.ok || !data?.ok) throw new Error(data?.error || `HTTP ${r.status}`);
            return data;
          }),
      ]);
      if (my !== seq.current) return;

      if (sRes.status === "fulfilled") {
        setSummary(sRes.value);
        setError("");
      } else {
        // прошлые данные не стираем: лучше показать их, чем пустой экран
        setError(String(sRes.reason?.message || sRes.reason || "error"));
      }
      setLoyalty(lRes.status === "fulfilled" ? lRes.value : null);
      setLoading(false);
    })();

    return () => {
      // смена периода/размонтирование: ответ этого запроса уже не нужен
      seq.current += 1;
    };
  }, [API, period, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  return { summary, loyalty, loading, error, reload };
}
