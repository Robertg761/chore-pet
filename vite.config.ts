import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * The production page's Content-Security-Policy, as a meta tag (GitHub Pages
 * can't send headers). Only the built app gets it: the dev server needs
 * inline scripts for hot reload.
 *
 * - style-src 'unsafe-inline': React style={} attributes (room layout, swatches).
 * - img-src data: blob:: the share card draws its SVG into a canvas from a blob or data URL.
 * - connect-src: Supabase, narrowed to the project's own origin when VITE_SUPABASE_URL is set at build time.
 */
function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  let supabase = 'https://*.supabase.co wss://*.supabase.co'
  if (supabaseUrl) {
    const origin = new URL(supabaseUrl).origin
    supabase = `${origin} ${origin.replace(/^http/, 'ws')}`
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${supabase}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'chore-pet-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      // Right after <meta charset>, before any script or stylesheet it governs.
      handler: (html) => {
        const tag = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`
        const charset = /<meta charset="[^"]*"\s*\/?>/i
        if (!charset.test(html)) throw new Error('index.html needs a <meta charset> for the CSP to follow')
        return html.replace(charset, (m) => `${m}\n    ${tag}`)
      },
    },
  }
}

// BASE_PATH lets the app live under a sub-path, e.g. /chore-pet/ on GitHub Pages.
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    contentSecurityPolicy(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL || undefined),
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
}))
