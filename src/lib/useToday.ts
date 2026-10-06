import { useSyncExternalStore } from 'react'
import { devToday, subscribeDayOffset } from './devClock'

/** Notifies on dev offset changes, when the tab becomes visible, and once a minute (for midnight). */
function subscribe(notify: () => void): () => void {
  const off = subscribeDayOffset(notify)
  const timer = window.setInterval(notify, 60_000)
  document.addEventListener('visibilitychange', notify)
  return () => {
    off()
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', notify)
  }
}

/**
 * Today's local ISO date, updated when the day rolls over while the app is open.
 * The dev time panel can shift it by whole days; with no offset it is the real date.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, devToday)
}
