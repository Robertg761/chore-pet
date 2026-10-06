import { toISODate } from '../domain/dates'
import type { ISODate } from '../domain/types'

// Dev-only time travel for recording the demo. A whole-day offset that shifts
// "now" for the entire app. The default offset is 0, which changes nothing.

export const DAY_OFFSET_KEY = 'chore-pet:dayOffset'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

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

/** A day-offset store. Every storage access is guarded so failures fall back to 0. */
export function createDevClock(getStorage: () => StorageLike | null = defaultStorage) {
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
    if (offset === null) offset = read()
    return offset
  }

  function set(days: number): void {
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

  return { get, set, subscribe, now, today }
}

const clock = createDevClock()

export const getDayOffset = clock.get
export const setDayOffset = clock.set
export const subscribeDayOffset = clock.subscribe
/** The app's "now": the real clock shifted by the dev day offset. */
export const devNow = (): Date => clock.now()
/** The app's "today" as a local ISO date, shifted by the dev day offset. */
export const devToday = (): ISODate => clock.today()
