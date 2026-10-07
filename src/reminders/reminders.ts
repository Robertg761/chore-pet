import { useEffect, useRef } from 'react'
import { toISODate } from '../domain/dates'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore, Pet } from '../domain/types'
import { pickReminder, REMINDER_TAG, shouldNotify, type ReminderMessage } from './reminderLogic'
import { loadLastSent, loadPrefs, PREFS_EVENT, saveLastSent } from './reminderStore'

export interface ReminderContext {
  pet: Pet
  chores: Chore[]
  statuses: ChoreStatus[]
  today: string
  away: boolean
}

const CHECK_EVERY_MS = 60_000
const ICON = `${import.meta.env.BASE_URL}icons/icon-192.png`

/** True when the browser can show notifications and the player has said yes. */
function canNotify(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

/** Shows one nudge, through the service worker when there is one. Resolves false if it couldn't. */
async function show({ title, body }: ReminderMessage): Promise<boolean> {
  const options: NotificationOptions = { body, tag: REMINDER_TAG, icon: ICON }
  try {
    if ('serviceWorker' in navigator) {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        // No worker (dev server, private mode): don't wait for one forever.
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ])
      if (registration) {
        await registration.showNotification(title, options)
        return true
      }
    }
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}

/**
 * Runs while the app is open (or running in the background): sends the pet's
 * daily nudge once the chosen time has come. There is no push server, so
 * nothing can arrive while the app is fully closed.
 */
export function useReminders(context: ReminderContext | null): void {
  const latest = useRef(context)
  useEffect(() => {
    latest.current = context
  })

  const active = context !== null

  useEffect(() => {
    if (!active) return
    let sending = false

    const check = () => {
      const ctx = latest.current
      if (!ctx || sending || !canNotify()) return
      const now = new Date()
      const prefs = loadPrefs()
      if (!shouldNotify(now, prefs, loadLastSent(), ctx.statuses, ctx.away)) return
      const message = pickReminder(ctx.pet.name, ctx.chores, ctx.statuses, ctx.today, { private: prefs.private })
      if (!message) return

      sending = true
      const sentOn = toISODate(now)
      void show(message).then((ok) => {
        sending = false
        // Only count it as sent if it really went out; try again next minute otherwise.
        if (ok) saveLastSent(sentOn)
      })
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    check()
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(PREFS_EVENT, check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(PREFS_EVENT, check)
    }
  }, [active])
}
