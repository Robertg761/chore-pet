import { activeDaysBetween, addDays, daysInMonth, diffDays, firstActiveOnOrAfter, weekdayOf } from './dates'
import { intervalOf, neglectLevel, type NeglectLevel } from './neglect'
import type { Chore, Completion, ISODate, Schedule, VacationWindow, Weekday } from './types'

/** Whether this chore had obligations on a local calendar day. */
export function choreActiveOn(chore: Chore, day: ISODate): boolean {
  return chore.createdOn <= day && (!chore.archivedOn || day < chore.archivedOn)
}

/**
 * Removed as of `day`: its archive date has come, or it was removed before it
 * started (ended on its own start date, so active on no day at all). A chore
 * not retired is on the list now or will be.
 */
export function choreRetiredBy(chore: Chore, day: ISODate): boolean {
  return Boolean(chore.archivedOn && (chore.archivedOn <= day || chore.archivedOn <= chore.createdOn))
}

/**
 * The day a chore removed on `day` ends: never before it starts (a device clock
 * set ahead), and never later than an end already recorded, so removals from
 * several devices settle on the earliest, as the server does (migration 0008).
 */
export function archiveEnd(chore: Chore, day: ISODate): ISODate {
  const end = day < chore.createdOn ? chore.createdOn : day
  return chore.archivedOn && chore.archivedOn < end ? chore.archivedOn : end
}

/**
 * Where a removed chore stood on `today`, for adding it back mid-round: its
 * next due date and the last day it was done, if its current round was already
 * done (it would be upcoming had it never been removed). The new chore resumes
 * from there (Schedule.resume), so it is due exactly when the old one would
 * have been and an early completion counts exactly as it would have: the round
 * is neither earned twice nor missed. Completions dated after today (a clock
 * set ahead) are ignored. Nothing to resume when it was due, late or never done.
 */
export function resumeFrom(chore: Chore, completions: Completion[], today: ISODate, vacations: VacationWindow[] = []): Schedule['resume'] {
  const days = completionDays(chore, completions).filter((d) => d <= today)
  // A chore that was itself added back mid-round carries on from there, done since or not.
  const last = days.at(-1) ?? chore.schedule.resume?.last
  if (!last) return undefined
  const replay = replayDays({ ...chore, archivedOn: undefined }, days)
  if (replay.statusOn(today, vacations).state !== 'upcoming') return undefined
  return { due: replay.due, last }
}

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
      const { since: _since, before: _before, resume: _resume, ...rest } = schedule as Schedule
      return JSON.stringify(rest)
    }
  }
}

/** Whether two schedules ask for the same thing. `since`, `before` (its history) and `resume` are ignored. */
export function sameSchedule(a: Schedule, b: Schedule): boolean {
  return scheduleKey(a) === scheduleKey(b)
}

/** The day a chore's current schedule starts: its creation day, or the day it moved to this schedule. */
export function scheduleStart(chore: Chore): ISODate {
  const since = chore.schedule.since
  return since && since > chore.createdOn ? since : chore.createdOn
}

/**
 * The chore as its schedule stood on `day`. Before a schedule change, that is
 * the rule in force then (from the `before` chain), starting on the day it
 * took effect; the oldest rule kept applies from the chore's creation. A
 * change made before schedules kept `before` falls back to the current rule.
 * Used to judge past days (streaks, the week's health) by the rule of the time.
 */
export function choreAsOf(chore: Chore, day: ISODate): Chore {
  if (day >= scheduleStart(chore)) return chore
  // Step back to the rule in force that day; the oldest one kept covers everything before it.
  let s: Schedule = chore.schedule
  while (s.before && s.since && day < s.since) s = s.before
  // A rule with an earlier one behind it began on its `since`, exactly as it ran then
  // (earlier completions don't count toward it); the oldest one kept reaches back to the start.
  const { before, since, ...rule } = s
  return { ...chore, schedule: (before && since ? { ...rule, since } : rule) as Schedule }
}

/** Past schedules kept on a chore, at most (each is a few dozen bytes of the row's JSON). */
export const SCHEDULE_HISTORY = 6

/** A schedule with at most `depth` past schedules behind it. */
export function trimHistory(schedule: Schedule, depth = SCHEDULE_HISTORY): Schedule {
  const { before, ...rest } = schedule
  return before && depth > 0 ? ({ ...rest, before: trimHistory(before, depth - 1) } as Schedule) : (rest as Schedule)
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
  // Added back mid-round: pick up where the removed chore stood, as if it had been fed its last completion.
  const resume = schedule.resume && schedule.resume.due >= start ? schedule.resume : undefined
  let due = resume ? resume.due : everyN ? addDays(start, half) : firstOnOrAfter(schedule, start)
  let counted = resume ? 1 : 0
  let last: ISODate | null = resume ? resume.last : null

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
  if (!choreActiveOn(chore, day)) return false
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
