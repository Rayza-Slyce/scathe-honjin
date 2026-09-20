import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SCATHE HONJIN',
        short_name: 'HONJIN',
        description: 'SCATHE Ranked War intelligence PWA',
        display: 'standalone',
        start_url: '/',
        theme_color: '#111111',
        background_color: '#111111',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
