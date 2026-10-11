import { useEffect, useSyncExternalStore } from "react";
import { addBlocker, subscribeBlockers, getBlockersCount } from "../utils/updateGuard.js";

/**
 * Пока active === true (и компонент смонтирован) окно обновления приложения
 * не показывается. Блокировка снимается сама при размонтировании.
 */
export function useBlockUpdate(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    return addBlocker();
  }, [active]);
}

/** true, если сейчас есть хотя бы один блокировщик. */
export function useUpdateBlocked() {
  return useSyncExternalStore(subscribeBlockers, getBlockersCount) > 0;
}

export default useBlockUpdate;
