/* global __APP_VERSION__ */
import { useCallback, useEffect, useRef, useState } from "react";

// Версия сборки, вшитая Vite (см. vite.config.js). В dev — "dev".
export const CURRENT_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/**
 * Периодически сверяет вшитую версию с /version.json на сервере.
 * Проверка: при старте, раз в pollMs, при возврате на вкладку, фокусе и
 * восстановлении сети. Любая ошибка сети/разбора молча игнорируется.
 *
 * Возвращает { latest }: null, если версия совпадает, иначе { version, force }.
 */
export default function useVersionCheck({
  pollMs = 120_000,
  minGapMs = 15_000,
  currentVersion = CURRENT_VERSION,
  enabled = !import.meta.env.DEV && CURRENT_VERSION !== "dev",
  url = "/version.json",
} = {}) {
  const [latest, setLatest] = useState(null);
  const lastRef = useRef(0);
  const inflightRef = useRef(false);

  const check = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (inflightRef.current) return;
      if (!force && now - lastRef.current < minGapMs) return;
      inflightRef.current = true;
      lastRef.current = now;
      try {
        const res = await fetch(`${url}?t=${now}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const version = typeof data?.version === "string" ? data.version : "";
        if (!version) return;
        if (version !== currentVersion) {
          setLatest((prev) =>
            prev && prev.version === version && prev.force === (data.force === true)
              ? prev
              : { version, force: data.force === true }
          );
        } else {
          setLatest(null);
        }
      } catch {
        // сеть недоступна / не JSON (например, dev-сервер вернул index.html)
      } finally {
        inflightRef.current = false;
      }
    },
    [url, currentVersion, minGapMs]
  );

  useEffect(() => {
    if (!enabled) return undefined;

    check(true);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, pollMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    const onFocus = () => check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [enabled, check, pollMs]);

  return { latest };
}
