import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['@ghostery/adblocker-electron', 'electron-datastore', 'robotjs']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options: any) {
          options.reload()
        },
      },
      {
        entry: 'electron/webview-preload.ts',
      }
    ]),
  ],
})
