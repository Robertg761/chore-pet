import { choreStatus, type ChoreStatus } from './schedule'
import type { Chore, Completion, ISODate, Mood, VacationWindow } from './types'

// Tuning lives here so it can be adjusted in one place.
export const HEALTH_TUNING = {
  /** Penalty for the first overdue day of a chore. */
  basePenalty: 8,
  /** Extra penalty per additional overdue day. */
  perDayPenalty: 6,
  /** Cap per chore so one neglected chore can't flatten the pet alone. */
  maxPenaltyPerChore: 35,
  /** Lower bounds (inclusive) for each mood, checked top-down. */
  moodThresholds: { happy: 85, content: 65, meh: 45, scruffy: 25 } as const,
}

export function penaltyFor(overdueDays: number): number {
  if (overdueDays <= 0) return 0
  const { basePenalty, perDayPenalty, maxPenaltyPerChore } = HEALTH_TUNING
  return Math.min(maxPenaltyPerChore, basePenalty + perDayPenalty * (overdueDays - 1))
}

/** 0 to 100. The pet never dies: 0 just means very sick. */
export function healthFromStatuses(statuses: ChoreStatus[]): number {
  const total = statuses.reduce((sum, s) => sum + penaltyFor(s.overdueDays), 0)
  return Math.max(0, Math.min(100, Math.round(100 - total)))
}

export function moodFor(health: number): Mood {
  const t = HEALTH_TUNING.moodThresholds
  if (health >= t.happy) return 'happy'
  if (health >= t.content) return 'content'
  if (health >= t.meh) return 'meh'
  if (health >= t.scruffy) return 'scruffy'
  return 'sick'
}

export interface PetCondition {
  health: number
  mood: Mood
  statuses: ChoreStatus[]
  /** The most overdue chore, for hints like "the sink is getting to me". */
  worst: ChoreStatus | null
}

export function petCondition(
  chores: Chore[],
  completions: Completion[],
  today: ISODate,
  vacations: VacationWindow[] = [],
): PetCondition {
  const statuses = chores.map((c) => choreStatus(c, completions, today, vacations))
  const health = healthFromStatuses(statuses)
  const worst = statuses.filter((s) => s.overdueDays > 0).sort((a, b) => b.overdueDays - a.overdueDays)[0] ?? null
  return { health, mood: moodFor(health), statuses, worst }
}
