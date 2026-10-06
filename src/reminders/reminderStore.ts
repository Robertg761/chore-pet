import { DEFAULT_PREFS, parsePrefs, type ReminderPrefs } from './reminderLogic'

// Reminder choices live on this device only. Every access is guarded: private
// browsing or a full disk must never break the app.

export const PREFS_KEY = 'chore-pet:reminders'
export const LAST_SENT_KEY = 'chore-pet:reminders:lastSent'
/** Fired on window when the prefs change, so the running reminder loop reacts at once. */
export const PREFS_EVENT = 'chore-pet:reminders-changed'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadPrefs(storage: StorageLike | null = defaultStorage()): ReminderPrefs {
  try {
    return parsePrefs(storage?.getItem(PREFS_KEY))
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs: ReminderPrefs, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Not saved; the choice lasts until the page closes.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PREFS_EVENT))
}

export function loadLastSent(storage: StorageLike | null = defaultStorage()): string | null {
  try {
    return storage?.getItem(LAST_SENT_KEY) ?? null
  } catch {
    return null
  }
}

export function saveLastSent(date: string, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(LAST_SENT_KEY, date)
  } catch {
    // Worst case, a second nudge on a day the page reloads.
  }
}
