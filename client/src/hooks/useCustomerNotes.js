import { useCallback, useEffect, useRef, useState } from "react";

// Заметки администраторов о клиенте (журнал заметок в CreateOrder / EditOrder).
// Заметки привязаны к телефону клиента и сохраняются на сервере сразу, а не
// вместе с заказом. В заказ и накладную они не попадают.
//
// ready=false — на сервере ещё нет таблицы (или ошибка загрузки): блок скрыт,
// форма заказа от заметок никак не зависит.
const PHONE_RE = /^\+\d{8,15}$/;

export default function useCustomerNotes({ phone, API, authHeaders, onUnauthorized }) {
  const [notes, setNotes] = useState([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const raw = String(phone || "").replace(/\s/g, "");
  const valid = PHONE_RE.test(raw);
  const phoneRef = useRef(raw);
  phoneRef.current = raw;

  useEffect(() => {
    setError("");
    if (!valid) {
      setNotes([]);
      setReady(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/customer-notes?phone=${encodeURIComponent(raw)}`, {
          headers: authHeaders,
        });
        if (res.status === 401) return onUnauthorized?.();
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (data?.ok && data.ready) {
          setNotes(Array.isArray(data.notes) ? data.notes : []);
          setReady(true);
        } else {
          setNotes([]);
          setReady(false);
        }
      } catch {
        if (!cancelled) {
          setNotes([]);
          setReady(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [raw, valid, API, authHeaders, onUnauthorized]);

  // Общий вызов: возвращает { ok, data }; ошибку кладёт в error.
  const call = useCallback(
    async (path, method, body) => {
      setError("");
      try {
        const res = await fetch(`${API}/customer-notes${path}`, {
          method,
          headers: authHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (res.status === 401) {
          onUnauthorized?.();
          return { ok: false };
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setError(data?.error || "Не удалось выполнить действие");
          return { ok: false };
        }
        return { ok: true, data };
      } catch {
        setError("Нет связи с сервером");
        return { ok: false };
      }
    },
    [API, authHeaders, onUnauthorized]
  );

  // Открытые заметки сверху, выполненные — внизу (как отдаёт сервер)
  const sortNotes = (list) =>
    [...list].sort((a, b) => Number(a.done) - Number(b.done) || b.id - a.id);

  const add = useCallback(
    async (text) => {
      const phoneNow = phoneRef.current;
      const r = await call("", "POST", { phone: phoneNow, text });
      if (r.ok && phoneRef.current === phoneNow) {
        setNotes((prev) => sortNotes([r.data.note, ...prev]));
      }
      return r.ok;
    },
    [call]
  );

  const patch = useCallback(
    async (id, body) => {
      const r = await call(`/${id}`, "PUT", body);
      if (r.ok) setNotes((prev) => sortNotes(prev.map((n) => (n.id === id ? r.data.note : n))));
      return r.ok;
    },
    [call]
  );

  const remove = useCallback(
    async (id) => {
      const r = await call(`/${id}`, "DELETE");
      if (r.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
      return r.ok;
    },
    [call]
  );

  return {
    notes,
    ready: ready && valid,
    loading,
    error,
    add,
    setDone: (id, done) => patch(id, { done }),
    saveText: (id, text) => patch(id, { text }),
    remove,
  };
}
