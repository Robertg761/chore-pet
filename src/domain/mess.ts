import type { ChoreStatus } from './schedule'
import type { NeglectLevel } from './neglect'
import type { Chore, MessStage } from './types'

// How an object looks follows its most neglected chore (src/domain/neglect.ts).
// Due today is still clean (it isn't late yet); vacation days don't count
// (overdueDays already skips them), so a room never gets messier while you're
// away. The object's art has two messy stages; the neglect cue floating above
// it (src/room/neglect.tsx) shows all three levels.

export function messStageFor(level: NeglectLevel): MessStage {
  if (level >= 2) return 'messy2'
  if (level === 1) return 'messy1'
  return 'clean'
}

/** Neglect level per placed object id, from the chores tied to it. Objects with nothing late are left out. */
export function objectNeglect(chores: Chore[], statuses: ChoreStatus[]): Record<string, NeglectLevel> {
  const byId = new Map(chores.map((c) => [c.id, c]))
  const levels: Record<string, NeglectLevel> = {}
  for (const s of statuses) {
    const objectId = byId.get(s.choreId)?.objectId
    if (!objectId || s.neglect === 0) continue
    levels[objectId] = Math.max(levels[objectId] ?? 0, s.neglect) as NeglectLevel
  }
  return levels
}

/** Mess stage per placed object id. Objects with nothing late are left out (clean). */
export function objectMessStages(chores: Chore[], statuses: ChoreStatus[]): Record<string, MessStage> {
  return Object.fromEntries(Object.entries(objectNeglect(chores, statuses)).map(([id, level]) => [id, messStageFor(level)]))
}

/** The most neglected chore tied to an object, for the pet to grumble about kindly. */
export function messiestObject(chores: Chore[], statuses: ChoreStatus[]): { objectId: string; chore: Chore; overdueDays: number } | null {
  const byId = new Map(chores.map((c) => [c.id, c]))
  let best: { objectId: string; chore: Chore; overdueDays: number; neglect: number } | null = null
  for (const s of statuses) {
    const chore = byId.get(s.choreId)
    if (!chore?.objectId || s.neglect === 0) continue
    if (!best || s.neglect > best.neglect || (s.neglect === best.neglect && s.overdueDays > best.overdueDays)) {
      best = { objectId: chore.objectId, chore, overdueDays: s.overdueDays, neglect: s.neglect }
    }
  }
  return best && { objectId: best.objectId, chore: best.chore, overdueDays: best.overdueDays }
}
