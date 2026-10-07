import { activeDaysBetween, addDays, daysInMonth, diffDays, firstActiveOnOrAfter, weekdayOf } from './dates'
import { intervalOf, neglectLevel, type NeglectLevel } from './neglect'
import type { Chore, Completion, ISODate, Schedule, VacationWindow, Weekday } from './types'

export type ChoreState = 'upcoming' | 'due' | 'overdue'

export interface ChoreStatus {
  choreId: string
  /** The scheduled date of the occurrence still owed. */
  dueDate: ISODate
  state: ChoreState
  /** Days late, not counting vacation days or grace days. 0 unless overdue. */
  overdueDays: number
  /** How neglected it is for its schedule (src/domain/neglect.ts). 0 unless overdue. */
  neglect: NeglectLevel
}

// Every switch on a schedule's kind has a default branch: a schedule this app
// doesn't know (a row written by a newer version) is treated as daily rather
// than crashing the app.

/** The chosen weekdays, safe against a malformed row. */
function daysOf(schedule: Extract<Schedule, { kind: 'weekdays' | 'weekly' }>): Weekday[] {
  if (schedule.kind === 'weekly') return [schedule.weekday]
  return Array.isArray(schedule.days) ? schedule.days : []
}

/** First scheduled date on or after `date`. (everyNDays is handled by the replay.) */
export function firstOnOrAfter(schedule: Schedule, date: ISODate): ISODate {
  switch (schedule.kind) {
    case 'daily':
    case 'everyNDays':
      return date
    case 'weekdays':
    case 'weekly': {
      const days = daysOf(schedule)
      for (let i = 0; i < 7; i++) {
        const d = addDays(date, i)
        if (days.includes(weekdayOf(d))) return d
      }
      return date // no days picked: like daily
    }
    case 'monthly': {
      const candidate = monthlyDate(date, schedule.dayOfMonth, 0)
      return candidate >= date ? candidate : monthlyDate(date, schedule.dayOfMonth, 1)
    }
    default:
      return date
  }
}

/** Last scheduled date strictly before `date`. */
export function lastBefore(schedule: Schedule, date: ISODate): ISODate {
  switch (schedule.kind) {
    case 'daily':
      return addDays(date, -1)
    case 'everyNDays':
      return addDays(date, -intervalOf(schedule))
    case 'weekdays':
    case 'weekly': {
      const days = daysOf(schedule)
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
    default:
      return addDays(date, -1)
  }
}

function monthlyDate(ref: ISODate, dayOfMonth: number, monthOffset: number): ISODate {
  const [y, m] = ref.split('-').map(Number)
  const total = y * 12 + (m - 1) + monthOffset
  const year = Math.floor(total / 12)
  const month1 = (total % 12) + 1
  const wanted = Number.isFinite(dayOfMonth) ? Math.round(dayOfMonth) : 1
  const day = Math.min(Math.max(1, wanted), daysInMonth(year, month1))
  return `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** What a schedule asks for, without `since`; weekday order and repeats don't matter. */
function scheduleKey(schedule: Schedule): string {
  switch (schedule.kind) {
    case 'daily':
      return 'daily'
    case 'everyNDays':
      return `everyNDays:${schedule.n}`
    case 'weekdays':
      return `weekdays:${[...new Set(daysOf(schedule))].sort((a, b) => a - b).join(',')}`
    case 'weekly':
      return `weekly:${schedule.weekday}`
    case 'monthly':
      return `monthly:${schedule.dayOfMonth}`
    default: {
      const { since: _since, before: _before, ...rest } = schedule as Schedule
      return JSON.stringify(rest)
    }
  }
}

/** Whether two schedules ask for the same thing. `since` and `before` (its history) are ignored. */
export function sameSchedule(a: Schedule, b: Schedule): boolean {
  return scheduleKey(a) === scheduleKey(b)
}

/** The day a chore's current schedule starts: its creation day, or the day it moved to this schedule. */
export function scheduleStart(chore: Chore): ISODate {
  const since = chore.schedule.since
  return since && since > chore.createdOn ? since : chore.createdOn
}

/** A chore's completion days for the replay: its own, one per calendar day, in order. */
export function completionDays(chore: Chore, completions: Completion[]): ISODate[] {
  return [...new Set(completions.filter((c) => c.choreId === chore.id).map((c) => c.completedOn))].sort()
}

/**
 * A chore's schedule replayed one completion day at a time. The rules:
 *
 * - The schedule starts at scheduleStart. Days before `since` are ignored, so
 *   a schedule change never makes old occurrences late.
 * - On-time or late completion: satisfies the pending occurrence; the next one
 *   is the first scheduled date after the completion day.
 * - Early completion (after the previous scheduled date, before the due date):
 *   satisfies the pending occurrence if nothing was done in that window yet
 *   and, once anything has counted, it falls in the second half of the gap
 *   (from due - floor(gap / 2)). Anything else is a repeat. So a late
 *   completion followed by another the next day never skips an occurrence, a
 *   chore done every day counts at its schedule's pace, and a weekly chore can
 *   still be done a few days early.
 * - everyNDays: due N days after the last counted completion. A new one is
 *   first due halfway through its first interval (floor(N/2) days after it
 *   starts), so a home's chores don't all fall due on day one. A completion
 *   only counts from halfway to the due date (due - floor(N/2)); earlier ones
 *   are repeats.
 */
export interface ChoreReplay {
  /** Feed the next completion day (in date order, one per day). True when it satisfied an occurrence. */
  add(day: ISODate): boolean
  /** The chore's status on `today`, from the days fed so far. */
  statusOn(today: ISODate, vacations?: VacationWindow[]): ChoreStatus
  /** The scheduled date of the occurrence still owed. */
  readonly due: ISODate
}

export function startReplay(chore: Chore): ChoreReplay {
  const { schedule } = chore
  const start = scheduleStart(chore)
  const since = schedule.since
  const everyN = schedule.kind === 'everyNDays' ? intervalOf(schedule) : 0
  const half = Math.floor(everyN / 2)
  let due = everyN ? addDays(start, half) : firstOnOrAfter(schedule, start)
  let counted = 0
  let last: ISODate | null = null

  function add(day: ISODate): boolean {
    if (since && day < since) return false
    let counts = false
    if (everyN) {
      counts = day >= addDays(due, -half)
      if (counts) due = addDays(day, everyN)
    } else if (day >= due) {
      counts = true
      due = firstOnOrAfter(schedule, addDays(day, 1))
    } else {
      const previous = lastBefore(schedule, due)
      const nothingInWindow = last === null || last <= previous
      // Once something has counted, an early completion has to be in the second half of the gap: before that it is a repeat.
      const halfway = counted === 0 ? previous : addDays(due, -Math.floor(diffDays(previous, due) / 2))
      counts = day > previous && day >= halfway && nothingInWindow
      if (counts) due = firstOnOrAfter(schedule, addDays(due, 1))
    }
    if (counts) counted++
    last = day
    return counts
  }

  /**
   * The last day the owed occurrence can be done without being late:
   * - a schedule's first occurrence, due the day it starts with nothing done
   *   yet, gets one extra day (a chore added in the evening isn't late by morning);
   * - an occurrence that falls due during a vacation is due on the first day back.
   */
  function lateAfter(vacations: VacationWindow[]): ISODate {
    const firstGrace = counted === 0 && due === start
    return firstActiveOnOrAfter(firstGrace ? addDays(due, 1) : due, vacations)
  }

  function statusOn(today: ISODate, vacations: VacationWindow[] = []): ChoreStatus {
    const dueDate = due
    if (dueDate > today) return { choreId: chore.id, dueDate, state: 'upcoming', overdueDays: 0, neglect: 0 }
    const overdueDays = activeDaysBetween(lateAfter(vacations), today, vacations)
    if (overdueDays === 0) return { choreId: chore.id, dueDate, state: 'due', overdueDays: 0, neglect: 0 }
    return { choreId: chore.id, dueDate, state: 'overdue', overdueDays, neglect: neglectLevel(overdueDays, schedule) }
  }

  return {
    add,
    statusOn,
    get due() {
      return due
    },
  }
}

function replayDays(chore: Chore, days: readonly ISODate[]): ChoreReplay {
  const replay = startReplay(chore)
  for (const day of days) replay.add(day)
  return replay
}

/** The date the chore is next due, after replaying its completions (rules on startReplay). */
export function nextDueDate(chore: Chore, completions: Completion[]): ISODate {
  return replayDays(chore, completionDays(chore, completions)).due
}

/**
 * Whether finishing the chore on `day` satisfies an occurrence. Doing it again
 * the same day, a second early completion in the same window, or an
 * every-N-days chore redone too soon doesn't: the schedule ignores those, so
 * they must not count toward rewards either.
 */
export function completionCounts(chore: Chore, completions: Completion[], day: ISODate): boolean {
  const days = completionDays(chore, completions)
  if (days.includes(day)) return false
  const replay = startReplay(chore)
  for (const d of [...days, day].sort()) {
    const counts = replay.add(d)
    if (d === day) return counts
  }
  return false
}

export function choreStatus(chore: Chore, completions: Completion[], today: ISODate, vacations: VacationWindow[] = []): ChoreStatus {
  return replayDays(chore, completionDays(chore, completions)).statusOn(today, vacations)
}
