import { create } from 'zustand';

export const useFilterStore = create((set) => ({
  // Фильтры
  filters: {
    status: [],
    timeRange: { from: null, to: null },
    amountRange: { from: null, to: null },
    restaurant: [],
    courier: [],
  },

  // Открытая колонка
  openFilterColumn: null,

  // Действия для изменения фильтров
  setStatusFilter: (statuses) => set((state) => ({
    filters: { ...state.filters, status: statuses },
  })),

  setTimeRangeFilter: (from, to) => set((state) => ({
    filters: { ...state.filters, timeRange: { from, to } },
  })),

  setAmountRangeFilter: (from, to) => set((state) => ({
    filters: { ...state.filters, amountRange: { from, to } },
  })),

  setRestaurantFilter: (restaurants) => set((state) => ({
    filters: { ...state.filters, restaurant: restaurants },
  })),

  setCourierFilter: (couriers) => set((state) => ({
    filters: { ...state.filters, courier: couriers },
  })),

  // Установить открытую колонку для фильтра
  setOpenFilterColumn: (column) => set({ openFilterColumn: column }),

  // Очистить все фильтры
  resetFilters: () => set({
    filters: {
      status: [],
      timeRange: { from: null, to: null },
      amountRange: { from: null, to: null },
      restaurant: [],
      courier: [],
    },
  }),

  // Проверить есть ли активные фильтры
  hasActiveFilters: (state) => {
    const { filters } = state;
    return (
      filters.status.length > 0 ||
      filters.timeRange.from !== null ||
      filters.timeRange.to !== null ||
      filters.amountRange.from !== null ||
      filters.amountRange.to !== null ||
      filters.restaurant.length > 0 ||
      filters.courier.length > 0
    );
  },
}));
