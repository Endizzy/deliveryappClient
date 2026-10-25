import { useCallback, useEffect, useRef, useState } from "react";

// Подсказки адреса при вводе (Geoapify Autocomplete через сервер).
// Экономия кредитов: пауза в наборе, минимум символов, кэш на клиенте,
// отмена устаревших запросов. Если подсказки недоступны — форма работает как раньше.
const DEBOUNCE_MS = 500;
const MIN_CHARS = 3;

/** Вариант из списка → значения полей формы + точка на карте. */
export function suggestionToAddress(s) {
  const city = String(s?.city || "").trim();
  const inRiga = /^r[iī]ga$/i.test(city);
  // Вне Риги добавляем город к улице («Skudru iela, Mārupe»), иначе перепроверка адреса неоднозначна.
  const street = String(s?.street || "").trim() + (city && !inRiga ? `, ${city}` : "");
  const house = String(s?.house || "").trim();
  const lat = Number(s?.lat);
  const lng = Number(s?.lng);
  return {
    street,
    house,
    // точку ставим сразу только если вариант — конкретный дом
    point: house && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
  };
}

function buildQuery(street, house) {
  const raw = String(street || "").trim();
  const i = raw.indexOf(",");
  const name = (i >= 0 ? raw.slice(0, i) : raw).trim();
  const district = i >= 0 ? raw.slice(i + 1).trim() : "";
  if (name.length < MIN_CHARS) return "";
  const h = String(house || "").trim();
  return `${name}${h ? ` ${h}` : ""}${district ? `, ${district}` : ""}`;
}

export default function useAddressSuggest({ API, authHeaders, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  // true, если сервис подсказок недоступен (закончился лимит / сбой Geoapify) — форма работает без него
  const [unavailable, setUnavailable] = useState(false);

  const timer = useRef(null);
  const ctrl = useRef(null);
  const cache = useRef(new Map());
  const headersRef = useRef(authHeaders);
  const unauthRef = useRef(onUnauthorized);
  headersRef.current = authHeaders;
  unauthRef.current = onUnauthorized;

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (ctrl.current) ctrl.current.abort();
    ctrl.current = null;
  }, []);

  const close = useCallback(() => {
    cancel();
    setItems([]);
    setLoading(false);
  }, [cancel]);

  // Вызывается ТОЛЬКО при ручном вводе улицы/дома (не при подстановке из чипов/списка).
  const search = useCallback(
    (street, house) => {
      cancel();
      const text = buildQuery(street, house);
      if (!text) {
        setItems([]);
        setLoading(false);
        return;
      }
      const key = text.toLowerCase();
      const hit = cache.current.get(key);
      if (hit) {
        setItems(hit);
        setLoading(false);
        return;
      }
      setLoading(true);
      timer.current = setTimeout(async () => {
        const c = new AbortController();
        ctrl.current = c;
        try {
          const res = await fetch(`${API}/geocode-suggest`, {
            method: "POST",
            headers: headersRef.current,
            body: JSON.stringify({ text }),
            signal: c.signal,
          });
          if (res.status === 401) {
            unauthRef.current?.();
            return;
          }
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
            setItems([]);
            if (data?.unavailable) setUnavailable(true);
            return;
          }
          setUnavailable(false);
          cache.current.set(key, data.items);
          setItems(data.items);
        } catch (e) {
          if (e?.name !== "AbortError") setItems([]);
        } finally {
          if (ctrl.current === c) {
            ctrl.current = null;
            setLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [API, cancel]
  );

  useEffect(() => cancel, [cancel]);

  return { items, loading, unavailable, search, close };
}
