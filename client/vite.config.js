import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Отключаем кэширование и включаем HMR (Hot Module Replacement)
    middlewareMode: false,
    watch: {
      // Убедитесь что Vite отслеживает все файлы .css и .module.css
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'dist/**'],
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  // Отключаем кэширование для CSS модулей в разработке
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
})
