import type { ISODate, VacationWindow, Weekday } from './types'

// All math happens on UTC midnights built from calendar dates, so daylight
// saving changes never shift a day.

const DAY_MS = 86_400_000

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

function toUTC(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS)
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS)
}

export function weekdayOf(date: ISODate): Weekday {
  return new Date(toUTC(date)).getUTCDay() as Weekday
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

export function isInVacation(date: ISODate, vacations: VacationWindow[]): boolean {
  return vacations.some((v) => date >= v.start && date <= v.end)
}

/**
 * Days strictly after `from` up to and including `to` that are NOT inside a
 * vacation window. Used so overdue time stops counting during vacation.
 */
export function activeDaysBetween(from: ISODate, to: ISODate, vacations: VacationWindow[]): number {
  let count = 0
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) {
    if (!isInVacation(d, vacations)) count++
  }
  return count
}
