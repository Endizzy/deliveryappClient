import { create } from "zustand";
import { EMPTY_FILTERS } from "../utils/customerFilters.js";

// ── Фильтры вкладки «Клиенты» ───────────────────────────────────────────────
//
// Почему стор, а не useState внутри вкладки: в OwnerSettings вкладки
// размонтируются — `{activeTab === "customers" && <CustomersTab/>}`. Зашёл в
// «Меню» и вернулся — настроенный отбор пропал. Стор это переживает.
//
// Без persist намеренно: сохранись фильтры до следующего входа, владелец
// открыл бы вкладку, увидел 5 клиентов вместо девятисот и решил, что база
// потерялась. Живут в пределах сессии страницы.
//
// Ускорения фильтрации стор не даёт и не должен: за это отвечает useMemo
// поверх чистых функций из utils/customerFilters.js.

export const useCustomersFilterStore = create((set) => ({
  filters: { ...EMPTY_FILTERS },

  // Панель развёрнута? Тоже переживает переключение вкладок.
  panelOpen: false,
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  /** Точечно поменять одно поле. */
  setField: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  /** Границы диапазона одним вызовом — чтобы не дёргать стор дважды. */
  setRange: (fromKey, toKey, from, to) =>
    set((s) => ({ filters: { ...s.filters, [fromKey]: from, [toKey]: to } })),

  /**
   * Сортировка одним выбором из списка. Активной может быть только одна —
   * в боковой панели это один <select>, второй сортировке там просто негде
   * взяться, но правило всё равно держим здесь, а не в разметке.
   *
   * sortBy === null означает «без сортировки»: исходный порядок от сервера
   * (по убыванию суммы).
   */
  setSortExact: (sortBy, sortDir = "desc") =>
    set((s) => ({
      filters: sortBy
        ? { ...s.filters, sortBy, sortDir }
        : { ...s.filters, sortBy: null, sortDir: "desc" },
    })),

  /** Отметить/снять конкретное значение скидки. */
  toggleDiscountValue: (value) =>
    set((s) => {
      const v = Number(value);
      const cur = s.filters.discountValues || [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { filters: { ...s.filters, discountValues: next } };
    }),

  /**
   * Режим скидки. Уточнения по типу и значению имеют смысл только при
   * «есть скидка» — на любом другом режиме гасим их, иначе останется
   * невидимое в интерфейсе условие, которое молча режет выборку.
   */
  setDiscountMode: (mode) =>
    set((s) => ({
      filters:
        mode === "has"
          ? { ...s.filters, discountMode: mode }
          : { ...s.filters, discountMode: mode, discountType: "any", discountValues: [] },
    })),

  /** Сброс всего, включая поиск и сортировку. */
  reset: () => set({ filters: { ...EMPTY_FILTERS } }),
}));
