import { neglectThresholds, type NeglectLevel } from './neglect'
import { choreStatus, type ChoreStatus } from './schedule'
import type { Chore, Completion, ISODate, Mood, VacationWindow } from './types'

// Tuning lives here so it can be adjusted in one place. A late chore costs
// health by how neglected it is for its schedule (src/domain/neglect.ts), so
// the pet feels exactly what the room shows.
export const HEALTH_TUNING = {
  /** Penalty at each neglect level (0 to 3). */
  levelPenalty: [0, 6, 15, 25] as const,
  /** Extra penalty per day a chore stays at level 3. */
  perDayAtWorst: 2,
  /** Cap per chore so one neglected chore can't flatten the pet alone. */
  maxPenaltyPerChore: 35,
  /** Lower bounds (inclusive) for each mood, checked top-down. */
  moodThresholds: { happy: 85, content: 65, meh: 45, scruffy: 25 } as const,
}

/** Health cost of one chore's status: its neglect level, growing slowly while it stays very late. */
export function penaltyFor(status: Pick<ChoreStatus, 'neglect'> & { daysAtWorst?: number }): number {
  const level: NeglectLevel = status.neglect
  if (level <= 0) return 0
  const { levelPenalty, perDayAtWorst, maxPenaltyPerChore } = HEALTH_TUNING
  const extra = level === 3 ? perDayAtWorst * Math.max(0, status.daysAtWorst ?? 0) : 0
  return Math.min(maxPenaltyPerChore, levelPenalty[level] + extra)
}

/** 0 to 100. The pet never dies: 0 just means very sick. */
export function healthFromStatuses(statuses: (Pick<ChoreStatus, 'neglect'> & { daysAtWorst?: number })[]): number {
  const total = statuses.reduce((sum, s) => sum + penaltyFor(s), 0)
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
  const health = healthFromStatuses(
    statuses.map((s, i) => ({ neglect: s.neglect, daysAtWorst: s.neglect === 3 ? s.overdueDays - neglectThresholds(chores[i].schedule).level3 : 0 })),
  )
  const worst = statuses.filter((s) => s.neglect > 0).sort((a, b) => b.neglect - a.neglect || b.overdueDays - a.overdueDays)[0] ?? null
  return { health, mood: moodFor(health), statuses, worst }
}
