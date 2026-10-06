import { DEFAULT_PREFS, parsePrefs, type ReminderPrefs } from './reminderLogic'

// Reminder choices live on this device only. Every access is guarded: private
// browsing or a full disk must never break the app.

export const PREFS_KEY = 'chore-pet:reminders'
export const LAST_SENT_KEY = 'chore-pet:reminders:lastSent'
/** Fired on window when the prefs change, so the running reminder loop reacts at once. */
export const PREFS_EVENT = 'chore-pet:reminders-changed'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

// When storage refuses a write, the value is kept here for the rest of the
// visit, so a reminder switched on in a private window still runs.
const NO_STORAGE = {}
const unsaved = new WeakMap<object, Map<string, string>>()

function read(storage: StorageLike | null, key: string): string | null {
  const kept = unsaved.get(storage ?? NO_STORAGE)?.get(key)
  if (kept !== undefined) return kept
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function write(storage: StorageLike | null, key: string, value: string): void {
  const slot = storage ?? NO_STORAGE
  try {
    if (!storage) throw new Error('No storage')
    storage.setItem(key, value)
    unsaved.get(slot)?.delete(key)
  } catch {
    if (!unsaved.has(slot)) unsaved.set(slot, new Map())
    unsaved.get(slot)!.set(key, value)
  }
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadPrefs(storage: StorageLike | null = defaultStorage()): ReminderPrefs {
  try {
    return parsePrefs(read(storage, PREFS_KEY))
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs: ReminderPrefs, storage: StorageLike | null = defaultStorage()): void {
  // If storage refuses, the choice still lasts until the page closes.
  write(storage, PREFS_KEY, JSON.stringify(prefs))
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PREFS_EVENT))
}

export function loadLastSent(storage: StorageLike | null = defaultStorage()): string | null {
  return read(storage, LAST_SENT_KEY)
}

export function saveLastSent(date: string, storage: StorageLike | null = defaultStorage()): void {
  // If storage refuses, worst case is a second nudge on a day the page reloads.
  write(storage, LAST_SENT_KEY, date)
}
