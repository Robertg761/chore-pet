import type { Chore, Completion, ISODate, VacationWindow } from '../domain/types'
import { isInVacation } from '../domain/dates'
import { completionCounts } from '../domain/schedule'
import { streakHistory } from '../domain/unlocks'

/** A kind line for a player whose streak ended and who has not started a new one today. */
export const STREAK_NUDGE = 'Do one chore today to start a new streak.'

/**
 * The streak the home shows beside the health bar, and whether to nudge. The nudge is for
 * a streak that ended (none now, but a run before) while nothing has counted today. It is
 * never shown on vacation, it goes the moment a chore counts today, and it stays quiet when
 * no chore could count today (every owed round was skipped), since then it asks the impossible.
 */
export function homeStreak(
  chores: Chore[],
  completions: Completion[],
  today: ISODate,
  vacations: VacationWindow[] = [],
): { streak: number; nudge: string | null } {
  const { currentStreak, bestStreak } = streakHistory(chores, completions, today, vacations)
  const ids = new Set(chores.map((c) => c.id))
  const doneToday = completions.some((c) => c.completedOn === today && c.counts !== false && ids.has(c.choreId))
  const canStart = chores.some((c) => completionCounts(c, completions, today))
  const ended = currentStreak === 0 && bestStreak > 0 && !doneToday && canStart && !isInVacation(today, vacations)
  return { streak: currentStreak, nudge: ended ? STREAK_NUDGE : null }
}
