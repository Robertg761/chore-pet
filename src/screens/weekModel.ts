import { addDays, isInVacation, weekdayOf } from '../domain/dates'
import { petCondition } from '../domain/health'
import { choreAsOf } from '../domain/schedule'
import type { Chore, Completion, ISODate, Mood, VacationWindow } from '../domain/types'

// Pure helpers for the week view: the last seven days, how many chores were
// done on each, and how the pet was feeling at the end of each day. Health is
// replayed with the domain's petCondition, never re-derived here.

export const WEEK_LENGTH = 7

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

/** A week with fewer chores than this gets the gentle "quiet week" line. */
export const QUIET_BELOW = 3

export interface WeekDay {
  date: ISODate
  /** "Mon" */
  label: string
  /** "Monday" */
  long: string
  isToday: boolean
}

export interface DayHealth {
  date: ISODate
  /** 0 to 100 at the end of the day. */
  health: number
  mood: Mood
  /** The day was inside a vacation window. */
  away: boolean
}

export interface WeekSummary {
  total: number
  /** The day with the most chores (the latest one on a tie); null when nothing was done. */
  bestDay: WeekDay | null
  bestCount: number
  /** One kind line, never guilt. */
  line: string
}

/** The seven days ending today, oldest first. */
export function weekDays(today: ISODate): WeekDay[] {
  return Array.from({ length: WEEK_LENGTH }, (_, i) => {
    const date = addDays(today, i - (WEEK_LENGTH - 1))
    const wd = weekdayOf(date)
    return { date, label: SHORT[wd], long: LONG[wd], isToday: date === today }
  })
}

/**
 * Chores completed on each day, in the same order as `days`. A chore counts
 * once per day, like choreCountOf: ticking it off on two devices is one chore.
 * Seeded sample history is kept for health replay, but isn't personal work.
 */
export function completedPerDay(completions: Completion[], days: WeekDay[]): number[] {
  const counts = new Map<ISODate, number>(days.map((d) => [d.date, 0]))
  const seen = new Set<string>()
  for (const c of completions) {
    if (c.counts === false) continue
    const once = `${c.choreId}:${c.completedOn}`
    if (seen.has(once)) continue
    seen.add(once)
    const n = counts.get(c.completedOn)
    if (n !== undefined) counts.set(c.completedOn, n + 1)
  }
  return days.map((d) => counts.get(d.date) ?? 0)
}

/**
 * The pet's health at the end of each day, using only what was true by then:
 * chores created on or before the day and completions done on or before it.
 */
export function healthPerDay(
  chores: Chore[],
  completions: Completion[],
  vacations: VacationWindow[],
  days: WeekDay[],
): DayHealth[] {
  return days.map((d) => {
    // Each chore as its schedule stood that day, so a later edit doesn't rewrite the past.
    const existing = chores.filter((c) => c.createdOn <= d.date).map((c) => choreAsOf(c, d.date))
    const doneByThen = completions.filter((c) => c.completedOn <= d.date)
    const { health, mood } = petCondition(existing, doneByThen, d.date, vacations)
    return { date: d.date, health, mood, away: isInVacation(d.date, vacations) }
  })
}

export function weekSummary(days: WeekDay[], counts: number[], vacations: VacationWindow[]): WeekSummary {
  const total = counts.reduce((a, b) => a + b, 0)
  let bestIndex = -1
  let bestCount = 0
  counts.forEach((n, i) => {
    if (n > 0 && n >= bestCount) {
      bestCount = n
      bestIndex = i
    }
  })
  const bestDay = bestIndex >= 0 ? days[bestIndex] : null

  const allAway = days.length > 0 && days.every((d) => isInVacation(d.date, vacations))
  let line: string
  if (allAway && total === 0) line = 'A week away. Your pet was resting.'
  else if (total < QUIET_BELOW || !bestDay) line = "A quiet week. I'm here whenever you're ready."
  else line = `${total} chores this week. Your best day was ${bestDay.long}.`

  return { total, bestDay, bestCount, line }
}
