import type { ChoreStatus } from './schedule'
import type { Chore, MessStage } from './types'

// How an object looks follows its most overdue chore. Due today is still
// clean (it isn't late yet); vacation days don't count (overdueDays already
// skips them), so a room never gets messier while you're away.

export const MESS_TUNING = {
  /** Overdue this many days or more: a little mess. */
  messy1: 1,
  /** Overdue this many days or more: a big, funny mess. */
  messy2: 3,
}

export function messStageFor(overdueDays: number): MessStage {
  if (overdueDays >= MESS_TUNING.messy2) return 'messy2'
  if (overdueDays >= MESS_TUNING.messy1) return 'messy1'
  return 'clean'
}

/** Mess stage per placed object id, from the chores tied to it. Objects with nothing late are left out (clean). */
export function objectMessStages(chores: Chore[], statuses: ChoreStatus[]): Record<string, MessStage> {
  const worst = new Map<string, number>()
  const byId = new Map(chores.map((c) => [c.id, c]))
  for (const s of statuses) {
    const objectId = byId.get(s.choreId)?.objectId
    if (!objectId) continue
    worst.set(objectId, Math.max(worst.get(objectId) ?? 0, s.overdueDays))
  }
  const stages: Record<string, MessStage> = {}
  for (const [id, days] of worst) {
    const stage = messStageFor(days)
    if (stage !== 'clean') stages[id] = stage
  }
  return stages
}

/** The most overdue chore tied to an object, for the pet to grumble about kindly. */
export function messiestObject(chores: Chore[], statuses: ChoreStatus[]): { objectId: string; chore: Chore; overdueDays: number } | null {
  const byId = new Map(chores.map((c) => [c.id, c]))
  let best: { objectId: string; chore: Chore; overdueDays: number } | null = null
  for (const s of statuses) {
    const chore = byId.get(s.choreId)
    if (!chore?.objectId || s.overdueDays < MESS_TUNING.messy1) continue
    if (!best || s.overdueDays > best.overdueDays) best = { objectId: chore.objectId, chore, overdueDays: s.overdueDays }
  }
  return best
}
