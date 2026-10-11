// Реестр «блокировщиков» окна обновления приложения.
// Страница с несохранёнными данными (создание/правка заказа, форма настроек)
// регистрирует блокировщик через useBlockUpdate(); пока он есть, окно
// «Доступна новая версия» не показывается.

const blockers = new Set();
const listeners = new Set();
let nextId = 1;

const emit = () => listeners.forEach((fn) => fn());

/** Добавляет блокировщик. Возвращает функцию, которая его снимает. */
export function addBlocker() {
  const id = nextId++;
  blockers.add(id);
  emit();
  return () => {
    if (blockers.delete(id)) emit();
  };
}

export function subscribeBlockers(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getBlockersCount() {
  return blockers.size;
}
