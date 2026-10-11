import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Идентификатор сборки: вшивается в бандл (__APP_VERSION__) и пишется в dist/version.json.
// Клиент сверяет их и предлагает обновиться, когда они различаются.
const BUILD_ID = process.env.APP_VERSION || Date.now().toString(36)

function appVersionPlugin() {
  return {
    name: 'app-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source:
          JSON.stringify({
            version: BUILD_ID,
            builtAt: new Date().toISOString(),
            // APP_FORCE_UPDATE=1 при сборке → окно без кнопки «Позже»
            force: process.env.APP_FORCE_UPDATE === '1',
          }) + '\n',
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), appVersionPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_ID),
  },
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
