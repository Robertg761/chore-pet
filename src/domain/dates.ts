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

/** The first day on or after `date` that is not inside a vacation window. */
export function firstActiveOnOrAfter(date: ISODate, vacations: VacationWindow[]): ISODate {
  let day = date
  for (let window = vacations.find((v) => day >= v.start && day <= v.end); window; window = vacations.find((v) => day >= v.start && day <= v.end)) {
    day = addDays(window.end, 1)
  }
  return day
}

/**
 * Days strictly after `from` up to and including `to` that are NOT inside a
 * vacation window. Used so overdue time stops counting during vacation.
 */
export function activeDaysBetween(from: ISODate, to: ISODate, vacations: VacationWindow[]): number {
  if (to <= from) return 0
  // Clip each window to (from, to], merge overlaps, and take the covered days off.
  const first = addDays(from, 1)
  const clipped = vacations
    .map((v) => ({ start: v.start > first ? v.start : first, end: v.end < to ? v.end : to }))
    .filter((v) => v.start <= v.end)
    .sort((a, b) => a.start.localeCompare(b.start))
  let away = 0
  let coveredTo: ISODate | null = null
  for (const v of clipped) {
    const start = coveredTo && v.start <= coveredTo ? addDays(coveredTo, 1) : v.start
    if (start <= v.end) away += diffDays(start, v.end) + 1
    if (!coveredTo || v.end > coveredTo) coveredTo = v.end
  }
  return diffDays(from, to) - away
}
