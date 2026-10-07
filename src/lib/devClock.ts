import { toISODate } from '../domain/dates'
import type { ISODate } from '../domain/types'

// Dev-only time travel for recording the demo. A whole-day offset that shifts
// "now" for the entire app. The default offset is 0, which changes nothing.
//
// It only ever applies in a dev build, or in a production tab that was opened
// with ?dev or ?demo (remembered for that tab's session). Anywhere else the
// app runs on the real date, whatever offset an old session left behind.

export const DAY_OFFSET_KEY = 'chore-pet:dayOffset'
/** Session flag: this tab was opened with ?dev or ?demo. */
export const DEV_SESSION_KEY = 'chore-pet:dev'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem'>>

/** Real `now` moved by whole local calendar days, keeping the local time of day. */
export function shiftDays(from: Date, days: number): Date {
  return new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate() + days,
    from.getHours(),
    from.getMinutes(),
    from.getSeconds(),
    from.getMilliseconds(),
  )
}

/** Anything that is not a whole number (missing, junk, NaN) becomes 0. */
export function parseOffset(raw: string | null | undefined): number {
  if (raw == null || raw.trim() === '') return 0
  const n = Number(raw)
  return Number.isInteger(n) ? n : 0
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/**
 * A day-offset store. Every storage access is guarded so failures fall back to 0.
 * While `isActive()` is false the offset is 0 and stored values are ignored.
 */
export function createDevClock(getStorage: () => StorageLike | null = defaultStorage, isActive: () => boolean = () => true) {
  let offset: number | null = null
  const listeners = new Set<() => void>()

  function read(): number {
    try {
      return parseOffset(getStorage()?.getItem(DAY_OFFSET_KEY))
    } catch {
      return 0
    }
  }

  function get(): number {
    if (!isActive()) return 0
    if (offset === null) offset = read()
    return offset
  }

  function set(days: number): void {
    if (!isActive()) return
    const next = Number.isInteger(days) ? days : 0
    if (next === get()) return
    offset = next
    try {
      getStorage()?.setItem(DAY_OFFSET_KEY, String(next))
    } catch {
      // Storage is full or blocked; the offset still works until reload.
    }
    listeners.forEach((l) => l())
  }

  /** Back to the real date, and forget the stored offset. */
  function clear(): void {
    const had = offset !== null && offset !== 0
    offset = 0
    try {
      getStorage()?.removeItem?.(DAY_OFFSET_KEY)
    } catch {
      // Storage is blocked; nothing was kept there either.
    }
    if (had) listeners.forEach((l) => l())
  }

  /** Something outside changed whether the clock is active: tell listeners to read it again. */
  function changed(): void {
    listeners.forEach((l) => l())
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function now(base: Date = new Date()): Date {
    const days = get()
    return days === 0 ? base : shiftDays(base, days)
  }

  function today(base?: Date): ISODate {
    return toISODate(now(base))
  }

  return { get, set, clear, changed, subscribe, now, today }
}

function sessionStore(): StorageLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function askedInUrl(): boolean {
  try {
    const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
    return params.has('dev') || params.has('demo')
  } catch {
    return false
  }
}

/** Whether ?dev or ?demo was in the URL at some point in this tab's session. */
export function readDevSession(storage: StorageLike | null, asked: boolean): boolean {
  try {
    if (asked) storage?.setItem(DEV_SESSION_KEY, '1')
    return asked || storage?.getItem(DEV_SESSION_KEY) === '1'
  } catch {
    return asked
  }
}

let devSession: boolean | null = null

/** This tab was opened with ?dev or ?demo (or the panel was opened by hand in a dev build). */
export function devSessionActive(): boolean {
  devSession ??= readDevSession(sessionStore(), askedInUrl())
  return devSession
}

/** Dev builds, or a tab explicitly opened for the demo. */
export function devClockAllowed(): boolean {
  return import.meta.env.DEV || devSessionActive()
}

const clock = createDevClock(defaultStorage, devClockAllowed)

/** Turn the dev session on (the panel was opened) or off (closed: back to the real date, offset forgotten). */
export function setDevSession(on: boolean): void {
  devSession = on
  try {
    if (on) sessionStore()?.setItem(DEV_SESSION_KEY, '1')
    else sessionStore()?.removeItem?.(DEV_SESSION_KEY)
  } catch {
    // Session storage is blocked; the flag just won't survive a reload.
  }
  if (!on) clock.clear()
  clock.changed()
}

// An offset left behind by an earlier demo session must not linger in storage.
if (!devClockAllowed()) clock.clear()

export const getDayOffset = clock.get
export const setDayOffset = clock.set
export const subscribeDayOffset = clock.subscribe
/** The app's "now": the real clock shifted by the dev day offset. */
export const devNow = (): Date => clock.now()
/** The app's "today" as a local ISO date, shifted by the dev day offset. */
export const devToday = (): ISODate => clock.today()
