import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Единый источник данных об авторизованном пользователе.
// Токен по-прежнему живёт в localStorage/sessionStorage (ключ "token"),
// здесь — только профиль. persist сохраняет его между перезагрузками страницы.

function readToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

const EMPTY = {
  id: null,
  companyId: null,
  email: null,
  phone: null,
  firstName: null,
  lastName: null,
  role: null,
}

const useUserStore = create(
  persist(
    (set, get) => ({
      // State
      user: null, // { id, companyId, email, phone, firstName, lastName, role } | null

      // Записать данные пользователя (после авторизации / профиля)
      setUser: (user) => set({ user: user ? { ...EMPTY, ...user } : null }),

      // Обновить отдельные поля (например, после редактирования профиля)
      updateUser: (fields) =>
        set((state) => ({ user: { ...EMPTY, ...(state.user || {}), ...fields } })),

      // Догрузить профиль с сервера по токену. Возвращает user или null.
      // Используется при логине и при гидрации (токен есть, а стор пуст).
      fetchUser: async () => {
        const token = readToken()
        if (!token) return null
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) return null
          const data = await res.json()
          const u = data?.user
          if (!u) return null
          const user = {
            id: u.id ?? null,
            companyId: u.companyId ?? null,
            email: u.email ?? null,
            phone: u.phone ?? null,
            firstName: u.firstName ?? null,
            lastName: u.lastName ?? null,
            role: u.role ?? null,
          }
          set({ user })
          return user
        } catch {
          return null
        }
      },

      // Выход: чистим профиль и токены разом.
      logout: () => {
        try {
          localStorage.removeItem('token')
          sessionStorage.removeItem('token')
        } catch {}
        set({ user: null })
      },

      // Совместимость: очистить только профиль
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'user-storage', // ключ в localStorage
    }
  )
)

export default useUserStore
