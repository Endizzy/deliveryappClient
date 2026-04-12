import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUserStore = create(
  persist(
    (set) => ({
      // State
      user_id: null,
      company_id: null,
      email: null,
      phone: null,
      first_name: null,
      last_name: null,
      role: null,

      // Записать данные пользователя после авторизации
      setUser: (userData) => set({ ...userData }),

      // Обновить отдельные поля (например, после редактирования профиля)
      updateUser: (fields) => set((state) => ({ ...state, ...fields })),

      // Очистить при выходе из аккаунта
      clearUser: () =>
        set({
          user_id: null,
          company_id: null,
          email: null,
          phone: null,
          first_name: null,
          last_name: null,
          role: null,
        }),
    }),
    {
      name: 'user-storage', // ключ в localStorage
    }
  )
)

export default useUserStore