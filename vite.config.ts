import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH lets the app live under a sub-path, e.g. /chore-pet/ on GitHub Pages.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Lets a tap on a reminder open the app (public/sw-notifications.js).
      workbox: { importScripts: ['sw-notifications.js'] },
      manifest: {
        name: 'Chore Pet',
        short_name: 'Chore Pet',
        description: 'A tiny pet that lives in a home you build. Keep up with your chores and it thrives.',
        theme_color: '#EFE9FF',
        background_color: '#EFE9FF',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
