import { activeDaysBetween, addDays, daysInMonth, weekdayOf } from './dates'
import type { Chore, Completion, ISODate, Schedule, VacationWindow } from './types'

export type ChoreState = 'upcoming' | 'due' | 'overdue'

export interface ChoreStatus {
  choreId: string
  dueDate: ISODate
  state: ChoreState
  /** Days past the due date, not counting vacation days. 0 unless overdue. */
  overdueDays: number
}

/** First scheduled date on or after `date`. (everyNDays is handled separately.) */
export function firstOnOrAfter(schedule: Schedule, date: ISODate): ISODate {
  switch (schedule.kind) {
    case 'daily':
    case 'everyNDays':
      return date
    case 'weekdays': {
      if (schedule.days.length === 0) return date
      for (let i = 0; i < 7; i++) {
        const d = addDays(date, i)
        if (schedule.days.includes(weekdayOf(d))) return d
      }
      return date
    }
    case 'weekly': {
      for (let i = 0; i < 7; i++) {
        const d = addDays(date, i)
        if (weekdayOf(d) === schedule.weekday) return d
      }
      return date
    }
    case 'monthly': {
      const candidate = monthlyDate(date, schedule.dayOfMonth, 0)
      return candidate >= date ? candidate : monthlyDate(date, schedule.dayOfMonth, 1)
    }
  }
}

/** Last scheduled date strictly before `date`. */
export function lastBefore(schedule: Schedule, date: ISODate): ISODate {
  switch (schedule.kind) {
    case 'daily':
      return addDays(date, -1)
    case 'everyNDays':
      return addDays(date, -schedule.n)
    case 'weekdays':
    case 'weekly': {
      const days = schedule.kind === 'weekly' ? [schedule.weekday] : schedule.days
      if (days.length === 0) return addDays(date, -1)
      for (let i = 1; i <= 7; i++) {
        const d = addDays(date, -i)
        if (days.includes(weekdayOf(d))) return d
      }
      return addDays(date, -7)
    }
    case 'monthly': {
      const candidate = monthlyDate(date, schedule.dayOfMonth, 0)
      return candidate < date ? candidate : monthlyDate(date, schedule.dayOfMonth, -1)
    }
  }
}

function monthlyDate(ref: ISODate, dayOfMonth: number, monthOffset: number): ISODate {
  const [y, m] = ref.split('-').map(Number)
  const total = y * 12 + (m - 1) + monthOffset
  const year = Math.floor(total / 12)
  const month1 = (total % 12) + 1
  const day = Math.min(Math.max(1, dayOfMonth), daysInMonth(year, month1))
  return `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * The date the chore is next due, after replaying its completions in order.
 *
 * - On-time or late completion: satisfies the pending occurrence; the next one
 *   is the first scheduled date after the completion day.
 * - Early completion (before the due date but after the previous scheduled
 *   date): satisfies the pending occurrence. Extra early completions in the
 *   same period are ignored.
 * - everyNDays: always due N days after the most recent completion, and never
 *   before the chore was created.
 */
export function nextDueDate(chore: Chore, completions: Completion[]): ISODate {
  const dates = [...new Set(completions.filter((c) => c.choreId === chore.id).map((c) => c.completedOn))].sort()
  const { schedule } = chore

  if (schedule.kind === 'everyNDays') {
    const last = dates[dates.length - 1]
    const next = last ? addDays(last, Math.max(1, schedule.n)) : chore.createdOn
    return next > chore.createdOn ? next : chore.createdOn
  }

  let due = firstOnOrAfter(schedule, chore.createdOn)
  for (const c of dates) {
    if (c >= due) {
      due = firstOnOrAfter(schedule, addDays(c, 1))
    } else if (c > lastBefore(schedule, due)) {
      due = firstOnOrAfter(schedule, addDays(due, 1))
    }
  }
  return due
}

/**
 * Whether finishing the chore on `day` satisfies an occurrence, i.e. moves its
 * next due date. Doing it again the same day, or a second early completion in
 * the same period, doesn't: those are ignored by the schedule, so they must not
 * count toward rewards either.
 */
export function completionCounts(chore: Chore, completions: Completion[], day: ISODate): boolean {
  const extra: Completion = { id: '', choreId: chore.id, completedAt: '', completedOn: day }
  return nextDueDate(chore, [...completions, extra]) !== nextDueDate(chore, completions)
}

export function choreStatus(
  chore: Chore,
  completions: Completion[],
  today: ISODate,
  vacations: VacationWindow[] = [],
): ChoreStatus {
  const dueDate = nextDueDate(chore, completions)
  if (dueDate > today) return { choreId: chore.id, dueDate, state: 'upcoming', overdueDays: 0 }
  if (dueDate === today) return { choreId: chore.id, dueDate, state: 'due', overdueDays: 0 }
  const overdueDays = activeDaysBetween(dueDate, today, vacations)
  return { choreId: chore.id, dueDate, state: overdueDays > 0 ? 'overdue' : 'due', overdueDays }
}
