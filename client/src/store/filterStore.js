import { create } from 'zustand';

export const useFilterStore = create((set) => ({
  // Фильтры
  filters: {
    status: [],
    timeRange: { from: null, to: null },
    amountRange: { from: null, to: null },
    restaurant: [],
    courier: [],
    timeSort: null, // 'asc' | 'desc' | null
    amountSort: null, // 'asc' | 'desc' | null
  },

  // Открытая колонка
  openFilterColumn: null,

  // Действия для изменения фильтров
  setStatusFilter: (statuses) => set((state) => ({
    filters: { ...state.filters, status: statuses },
  })),


  setTimeSort: (sort) => set((state) => ({
    filters: { ...state.filters, timeSort: sort },
  })),

  setAmountSort: (sort) => set((state) => ({
    filters: { ...state.filters, amountSort: sort },
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
      timeSort: null,
      amountSort: null,
    },
  }),

  // Проверить есть ли активные фильтры
  hasActiveFilters: (state) => {
    const { filters } = state;
    return (
      filters.status.length > 0 ||
      filters.timeSort !== null ||
      filters.amountSort !== null ||
      filters.restaurant.length > 0 ||
      filters.courier.length > 0
    );
  },
}));
