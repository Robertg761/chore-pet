import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import './UpdateBanner.css'

/** How often an open app checks for a new deploy. */
const CHECK_MS = 60 * 60 * 1000
/** An update found this soon after opening, before the player has done anything, applies at once. */
const FRESH_MS = 15 * 1000

/**
 * A reload would lose nothing on screen: no form being filled in, no dialog (a
 * gift, say) open, and nothing else marked `data-unsaved` (like an object
 * waiting to be placed in Build).
 */
function quietToReload(): boolean {
  return !document.querySelector('form, dialog[open], [role="dialog"], [data-unsaved]')
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
    // Just opened (a refresh, say) and not yet touched: a waiting update swaps in straight away, so a
    // refresh shows the latest version instead of the copy the app kept for offline.
    const opened = performance.now()
    let touched = false
    const onTouch = () => { touched = true }
    window.addEventListener('pointerdown', onTouch, { once: true, capture: true })
    window.addEventListener('keydown', onTouch, { once: true, capture: true })
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
        if (!touched && performance.now() - opened < FRESH_MS && quietToReload()) void update.current?.(true)
        else setReady(true)
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
      window.removeEventListener('pointerdown', onTouch, { capture: true })
      window.removeEventListener('keydown', onTouch, { capture: true })
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
