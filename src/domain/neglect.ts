import type { Schedule } from './types'

// How neglected a late chore is, from 0 (not late) to 3 (very late). The scale
// follows the chore's own rhythm: dishes three days late are much worse than a
// monthly oven clean three days late. Mess, the neglect cue over an object, the
// pet's health and the list's late tags all follow this one level.

export type NeglectLevel = 0 | 1 | 2 | 3

export const NEGLECT_TUNING = {
  /** Level 2 starts at this share of the chore's cadence, kept within [min, max] days. */
  level2: { share: 0.4, min: 2, max: 7 },
  /** Level 3 starts after a whole cadence, kept within [min, max] days. */
  level3: { share: 1, min: 4, max: 14 },
}

/** Typical days between occurrences of a schedule (monthly counts as 30). */
export function cadenceDays(schedule: Schedule): number {
  switch (schedule.kind) {
    case 'daily':
      return 1
    case 'everyNDays':
      return Math.max(1, schedule.n)
    case 'weekly':
      return 7
    case 'monthly':
      return 30
    case 'weekdays': {
      const days = [...new Set(schedule.days)].sort((a, b) => a - b)
      if (days.length === 0) return 7
      // The longest wait between two chosen days, wrapping round the week.
      return Math.max(...days.map((d, i) => (i + 1 < days.length ? days[i + 1] - d : days[0] + 7 - d)))
    }
  }
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Overdue days at which a chore on this schedule reaches level 2 and level 3. Level 1 starts at 1 day late. */
export function neglectThresholds(schedule: Schedule): { level2: number; level3: number } {
  const c = cadenceDays(schedule)
  const { level2: t2, level3: t3 } = NEGLECT_TUNING
  const level2 = clamp(Math.round(c * t2.share), t2.min, t2.max)
  const level3 = Math.max(level2 + 1, clamp(Math.round(c * t3.share), t3.min, t3.max))
  return { level2, level3 }
}

export function neglectLevel(overdueDays: number, schedule: Schedule): NeglectLevel {
  if (overdueDays < 1) return 0
  const { level2, level3 } = neglectThresholds(schedule)
  if (overdueDays >= level3) return 3
  if (overdueDays >= level2) return 2
  return 1
}
