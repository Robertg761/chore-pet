import { addDays } from '../domain/dates'
import type { ISODate, VacationWindow } from '../domain/types'

// Pure helpers for the vacation screen. Date math goes through domain/dates.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidISO(date: string): boolean {
  if (!ISO_RE.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  const probe = new Date(Date.UTC(y, m - 1, d))
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
}

/** "14 Oct", with the year added only when it is not the current year ("14 Oct 2027"). */
export function formatShortDate(date: ISODate, today: ISODate): string {
  if (!isValidISO(date)) return date
  const [y, m, d] = date.split('-').map(Number)
  const base = `${d} ${MONTHS[m - 1]}`
  return String(y) === today.slice(0, 4) ? base : `${base} ${y}`
}

/** "14 Oct" for a single day, "14 Oct to 21 Oct" for a range. */
export function formatRange(w: VacationWindow, today: ISODate): string {
  if (w.start === w.end) return formatShortDate(w.start, today)
  return `${formatShortDate(w.start, today)} to ${formatShortDate(w.end, today)}`
}

export interface RangeErrors {
  start?: string
  end?: string
}

/** Kind inline errors for a window someone wants to add. Empty object means it is fine. */
export function validateRange(start: string, end: string, today: ISODate): RangeErrors {
  const errors: RangeErrors = {}
  if (!isValidISO(start)) errors.start = 'Pick a start date.'
  else if (start < today) errors.start = "Pick today or a day coming up. Past days can't be added."
  if (!isValidISO(end)) errors.end = 'Pick an end date.'
  else if (isValidISO(start) && end < start) errors.end = 'Pick an end date on or after the start.'
  return errors
}

export function sortWindows(list: VacationWindow[]): VacationWindow[] {
  return [...list].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
}

/** Sorts and merges windows that overlap or touch (end + 1 day >= next start). */
export function mergeWindows(list: VacationWindow[]): VacationWindow[] {
  const merged: VacationWindow[] = []
  for (const w of sortWindows(list)) {
    const last = merged[merged.length - 1]
    if (last && w.start <= addDays(last.end, 1)) {
      if (w.end > last.end) last.end = w.end
    } else {
      merged.push({ start: w.start, end: w.end })
    }
  }
  return merged
}

/** Adds a window and merges. Existing past windows are never dropped. */
export function addWindow(list: VacationWindow[], w: VacationWindow): VacationWindow[] {
  return mergeWindows([...list, w])
}

export function removeWindow(list: VacationWindow[], w: VacationWindow): VacationWindow[] {
  return list.filter((x) => !(x.start === w.start && x.end === w.end))
}

/** Ends a running vacation yesterday, or removes it if it only started today. */
export function endEarly(list: VacationWindow[], w: VacationWindow, today: ISODate): VacationWindow[] {
  if (w.start >= today) return removeWindow(list, w)
  const yesterday = addDays(today, -1)
  return list.map((x) => (x.start === w.start && x.end === w.end ? { start: x.start, end: yesterday } : x))
}

export interface VacationGroups {
  current: VacationWindow | null
  upcoming: VacationWindow[] // soonest first
  past: VacationWindow[] // most recent first
}

export function splitVacations(list: VacationWindow[], today: ISODate): VacationGroups {
  const sorted = sortWindows(list)
  const current = sorted.find((w) => w.start <= today && today <= w.end) ?? null
  const upcoming = sorted.filter((w) => w.start > today)
  const past = sorted.filter((w) => w.end < today).reverse()
  return { current, upcoming, past }
}
