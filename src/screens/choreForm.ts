import { todayISO, weekdayOf } from '../domain/dates'
import type { Chore, ISODate, Schedule, Weekday } from '../domain/types'

// Pure helpers for the chore editor: form state <-> Schedule, validation and a
// short human description of a schedule. No React in here.

export type ScheduleKind = Schedule['kind']

export const SCHEDULE_KINDS: readonly { kind: ScheduleKind; label: string }[] = [
  { kind: 'daily', label: 'Every day' },
  { kind: 'everyNDays', label: 'Every few days' },
  { kind: 'weekdays', label: 'Some days of the week' },
  { kind: 'weekly', label: 'Once a week' },
  { kind: 'monthly', label: 'Once a month' },
]

export const NAME_MAX = 40
export const N_MIN = 2
export const N_MAX = 60

/** The UI week starts on Monday; stored values use 0 = Sunday. */
export const WEEK_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0]
export const WEEKDAY_SHORT: Record<Weekday, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
export const WEEKDAY_LONG: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

/**
 * Everything the form edits. Every kind's detail lives side by side so that
 * switching kinds and back never loses what the user picked.
 */
export interface ChoreFormState {
  name: string
  kind: ScheduleKind
  /** Kept as text so the field can be typed into; validated on save. */
  n: string
  days: Weekday[]
  weekday: Weekday
  dayOfMonth: number
}

export interface ChoreFormErrors {
  name?: string
  n?: string
  days?: string
}

/** Initial form state. Unused kinds get defaults based on today's date. */
export function formFromChore(chore: Chore | undefined, today: ISODate = todayISO()): ChoreFormState {
  const todayWeekday = weekdayOf(today)
  const form: ChoreFormState = {
    name: chore?.name ?? '',
    kind: 'daily',
    n: '3',
    days: [todayWeekday],
    weekday: todayWeekday,
    dayOfMonth: Number(today.slice(8, 10)),
  }
  const s = chore?.schedule
  if (!s) return form
  form.kind = s.kind
  if (s.kind === 'everyNDays') form.n = String(s.n)
  if (s.kind === 'weekdays') form.days = sortDays(s.days)
  if (s.kind === 'weekly') form.weekday = s.weekday
  if (s.kind === 'monthly') form.dayOfMonth = s.dayOfMonth
  return form
}

/** Days in UI order (Monday first), without duplicates. */
export function sortDays(days: readonly Weekday[]): Weekday[] {
  return WEEK_ORDER.filter((d) => days.includes(d))
}

export function toggleDay(days: readonly Weekday[], day: Weekday): Weekday[] {
  return sortDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day])
}

/** Parses the "every N days" text. Returns null unless it is a whole number from 2 to 60. */
export function parseN(text: string): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= N_MIN && n <= N_MAX ? n : null
}

/** Moves N by a step, clamped to range. Unreadable text starts from the minimum. */
export function stepN(text: string, delta: 1 | -1): string {
  const t = text.trim()
  const current = /^\d+$/.test(t) ? Number(t) : N_MIN - delta
  return String(Math.min(N_MAX, Math.max(N_MIN, current + delta)))
}

export function validateForm(form: ChoreFormState): ChoreFormErrors {
  const errors: ChoreFormErrors = {}
  const name = form.name.trim()
  if (!name) errors.name = 'Give this chore a name.'
  else if (name.length > NAME_MAX) errors.name = `Keep the name to ${NAME_MAX} characters or fewer.`
  if (form.kind === 'everyNDays' && parseN(form.n) === null) errors.n = `Pick a number from ${N_MIN} to ${N_MAX}.`
  if (form.kind === 'weekdays' && form.days.length === 0) errors.days = 'Pick at least one day.'
  return errors
}

export function isValid(form: ChoreFormState): boolean {
  return Object.keys(validateForm(form)).length === 0
}

/** The schedule the form currently describes, or null while its detail is invalid. */
export function scheduleFromForm(form: ChoreFormState): Schedule | null {
  switch (form.kind) {
    case 'daily':
      return { kind: 'daily' }
    case 'everyNDays': {
      const n = parseN(form.n)
      return n === null ? null : { kind: 'everyNDays', n }
    }
    case 'weekdays':
      return form.days.length === 0 ? null : { kind: 'weekdays', days: sortDays(form.days) }
    case 'weekly':
      return { kind: 'weekly', weekday: form.weekday }
    case 'monthly':
      return { kind: 'monthly', dayOfMonth: Math.min(31, Math.max(1, Math.round(form.dayOfMonth))) }
  }
}

/** The value to hand to onSave, or null when the form is invalid. */
export function valueFromForm(form: ChoreFormState): { name: string; schedule: Schedule } | null {
  if (!isValid(form)) return null
  const schedule = scheduleFromForm(form)
  return schedule ? { name: form.name.trim(), schedule } : null
}

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** Month lengths below this can be shorter than the chosen day. */
export const SHORT_MONTH_LIMIT = 28

/** A short, plain description such as "Every 3 days" or "Mon, Wed, Fri". */
export function describeSchedule(schedule: Schedule): string {
  switch (schedule.kind) {
    case 'daily':
      return 'Every day'
    case 'everyNDays':
      return `Every ${schedule.n} days`
    case 'weekdays': {
      const days = sortDays(schedule.days)
      if (days.length === 0) return 'No days picked'
      if (days.length === 7) return 'Every day'
      return days.map((d) => WEEKDAY_SHORT[d]).join(', ')
    }
    case 'weekly':
      return `Every ${WEEKDAY_LONG[schedule.weekday]}`
    case 'monthly':
      return schedule.dayOfMonth > SHORT_MONTH_LIMIT
        ? `On the ${ordinal(schedule.dayOfMonth)} (or the last day of shorter months)`
        : `On the ${ordinal(schedule.dayOfMonth)}`
  }
}
