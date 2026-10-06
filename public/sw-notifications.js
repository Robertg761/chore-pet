// Loaded into the generated service worker (vite.config.ts, workbox.importScripts).
// Tapping a nudge brings Chore Pet forward, or opens it if it was closed.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => 'focus' in w)
      return open ? open.focus() : self.clients.openWindow('/')
    }),
  )
})
