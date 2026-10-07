import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import './UpdateBanner.css'

/** How often an open app checks for a new deploy. */
const CHECK_MS = 60 * 60 * 1000

/** A reload would lose nothing on screen: no form being filled in, no dialog (a gift, say) open. */
function quietToReload(): boolean {
  return !document.querySelector('form, dialog[open], [role="dialog"]')
}

/**
 * Registers the service worker and offers new deploys kindly: a small banner
 * with Refresh, or a quiet swap the next time the app goes into the background
 * with nothing unsaved on screen.
 * Without this, an app left open (an installed iPhone app especially) only
 * picked up a deploy after being closed and opened twice.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false)
  const waiting = useRef(false)
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let timer = 0
    let registration: ServiceWorkerRegistration | undefined
    const check = () => void registration?.update().catch(() => undefined)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check()
      // Hidden with an update waiting: swap now, so the next look is the new version
      // (but never mid-edit, where the reload would throw away what was typed).
      else if (waiting.current && quietToReload()) void update.current?.(true)
    }
    update.current = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        waiting.current = true
        setReady(true)
      },
      onRegisteredSW: (_url, r) => {
        registration = r
        timer = window.setInterval(check, CHECK_MS)
      },
    })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  if (!ready) return null
  return (
    <div className="update-banner" role="status">
      <span>Chore Pet has a fresh update.</span>
      <button type="button" onClick={() => void update.current?.(true)}>
        Refresh
      </button>
    </div>
  )
}
