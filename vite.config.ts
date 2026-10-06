import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Chore Pet',
        short_name: 'Chore Pet',
        description: 'A tiny pet that lives in a home you build. Keep up with your chores and it thrives.',
        theme_color: '#EFE9FF',
        background_color: '#EFE9FF',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
})
