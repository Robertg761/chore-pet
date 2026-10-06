import { activeDaysBetween, addDays, isInVacation } from './dates'
import { choreStatus, nextDueDate } from './schedule'
import type { Chore, Completion, ISODate, Progress, VacationWindow } from './types'

// Rewards come only from real chores getting done (docs/SPEC.md):
// - chore milestones count chores the player finishes (progress.choreCount);
// - streaks count days in a row with nothing overdue. Vacation days neither
//   count nor break a streak, so going away never costs you.
// The first unlock is the very first chore, so it lands in the first session.

export type UnlockKind = 'item' | 'decor' | 'wall' | 'floor'

export type UnlockRule = { type: 'chores'; count: number } | { type: 'streak'; days: number }

export interface Unlock {
  /** Stored in progress.unlockedItems, e.g. "item:beanie-red", "decor:plant", "wall:mint". */
  id: string
  kind: UnlockKind
  /** The item id, catalog id or style id the reward refers to. */
  ref: string
  name: string
  rule: UnlockRule
}

const u = (kind: UnlockKind, ref: string, name: string, rule: UnlockRule): Unlock => ({ id: `${kind}:${ref}`, kind, ref, name, rule })

/** Every reward, in the order a typical player earns them. */
export const UNLOCKS: Unlock[] = [
  u('item', 'beanie-red', 'Red beanie', { type: 'chores', count: 1 }),
  u('decor', 'plant', 'Potted plant', { type: 'chores', count: 3 }),
  u('wall', 'mint', 'Mint walls', { type: 'streak', days: 2 }),
  u('item', 'bow', 'Bow', { type: 'chores', count: 5 }),
  u('decor', 'lamp', 'Lamp', { type: 'chores', count: 8 }),
  u('floor', 'tile', 'Tiled floor', { type: 'streak', days: 4 }),
  u('item', 'glasses', 'Round glasses', { type: 'chores', count: 12 }),
  u('decor', 'poster', 'Poster', { type: 'chores', count: 16 }),
  u('wall', 'lavender', 'Lavender walls', { type: 'streak', days: 7 }),
  u('item', 'scarf', 'Scarf', { type: 'chores', count: 20 }),
  u('decor', 'fish-tank', 'Fish tank', { type: 'chores', count: 25 }),
  u('item', 'bow-tie', 'Bow tie', { type: 'chores', count: 30 }),
  u('floor', 'carpet', 'Carpet', { type: 'streak', days: 14 }),
  u('item', 'backpack', 'Backpack', { type: 'chores', count: 40 }),
  // The autumn set: a seasonal outfit and a matching hat.
  u('item', 'knit-sweater', 'Cosy knit sweater', { type: 'streak', days: 10 }),
  u('item', 'leaf-crown', 'Autumn leaf crown', { type: 'chores', count: 50 }),
]

/** Styles every home has from the start. */
export const FREE_STYLES = ['wall:peach', 'floor:wood']

/** Outfits every pet has from the start, so dressing up can begin on day one. */
export const FREE_ITEMS = ['item:hoodie', 'item:overalls', 'item:dress']

/**
 * The chore count rewards run on: completions that counted when they were
 * recorded, once per chore per day (so the same chore ticked off on two
 * devices counts once), plus the banked counts of deleted chores. Completion
 * rows are never edited, so devices can't overwrite each other's count, and
 * editing a chore's schedule doesn't rewrite its history.
 */
export function choreCountOf(completions: Completion[], retired: Record<string, number> = {}): number {
  const days = new Set(completions.filter((c) => c.counts !== false).map((c) => `${c.choreId}:${c.completedOn}`))
  return days.size + Object.values(retired).reduce((a, b) => a + b, 0)
}

export function isUnlocked(progress: Pick<Progress, 'unlockedItems'> | null, id: string): boolean {
  return FREE_STYLES.includes(id) || FREE_ITEMS.includes(id) || Boolean(progress?.unlockedItems.includes(id))
}

/** How far back a streak is counted, in active (non-vacation) days. Long enough for every streak reward. */
const STREAK_LOOKBACK = 120
/** Vacation days skipped while looking back, at most. */
const MAX_VACATION_DAYS = 400

/**
 * A past day is clean when, by its end, every chore that had fallen due was
 * done, except ones whose due days were all vacation days (those are paused).
 */
function cleanPastDay(chores: Chore[], completions: Completion[], day: ISODate, vacations: VacationWindow[]): boolean {
  const doneBy = completions.filter((c) => c.completedOn <= day)
  return chores
    .filter((c) => c.createdOn <= day)
    .every((c) => {
      const due = nextDueDate(c, doneBy)
      return due > day || activeDaysBetween(addDays(due, -1), day, vacations) === 0
    })
}

/** Today is clean while nothing is overdue yet: chores due today can still be done. */
function cleanSoFar(chores: Chore[], completions: Completion[], today: ISODate, vacations: VacationWindow[]): boolean {
  return chores.filter((c) => c.createdOn <= today).every((c) => choreStatus(c, completions, today, vacations).overdueDays === 0)
}

/**
 * Days in a row with nothing overdue, ending today (today counts while it is
 * clean so far). Vacation days are skipped: they don't count or break it.
 */
export function currentStreak(chores: Chore[], completions: Completion[], today: ISODate, vacations: VacationWindow[] = []): number {
  if (chores.length === 0) return 0
  const firstDay = chores.reduce((min, c) => (c.createdOn < min ? c.createdOn : min), chores[0].createdOn)
  let streak = 0
  let active = 0
  // The lookback counts active days only, so a long vacation can't hide the streak before it.
  for (let i = 0; i <= STREAK_LOOKBACK + MAX_VACATION_DAYS && active <= STREAK_LOOKBACK; i++) {
    const day = addDays(today, -i)
    if (day < firstDay) break
    if (isInVacation(day, vacations)) continue
    active++
    const clean = i === 0 ? cleanSoFar(chores, completions, day, vacations) : cleanPastDay(chores, completions, day, vacations)
    if (!clean) {
      if (i === 0) continue // something is overdue now; judge the streak up to yesterday
      break
    }
    streak++
  }
  return streak
}

function earned(rule: UnlockRule, choreCount: number, streak: number): boolean {
  return rule.type === 'chores' ? choreCount >= rule.count : streak >= rule.days
}

/**
 * Progress after counting the streak: rewards newly earned are added (in
 * order) and returned so the UI can open a gift box for each.
 */
export function applyUnlocks(progress: Progress, streak: number): { progress: Progress; unlocked: Unlock[] } {
  const bestStreak = Math.max(progress.bestStreak, streak)
  const unlocked = UNLOCKS.filter((x) => !progress.unlockedItems.includes(x.id) && earned(x.rule, progress.choreCount, Math.max(streak, bestStreak)))
  return {
    progress: { ...progress, currentStreak: streak, bestStreak, unlockedItems: [...progress.unlockedItems, ...unlocked.map((x) => x.id)] },
    unlocked,
  }
}

export interface NextUnlock {
  unlock: Unlock
  /** Chores or streak days still to go. */
  remaining: number
}

/** The next reward of each kind of rule, for "3 more chores to the bow". */
export function nextUnlocks(progress: Progress, streak: number): { chores: NextUnlock | null; streak: NextUnlock | null } {
  const pending = UNLOCKS.filter((x) => !progress.unlockedItems.includes(x.id))
  const nextChore = pending.filter((x) => x.rule.type === 'chores').sort((a, b) => count(a) - count(b))[0]
  const nextStreak = pending.filter((x) => x.rule.type === 'streak').sort((a, b) => days(a) - days(b))[0]
  return {
    chores: nextChore ? { unlock: nextChore, remaining: Math.max(0, count(nextChore) - progress.choreCount) } : null,
    streak: nextStreak ? { unlock: nextStreak, remaining: Math.max(0, days(nextStreak) - Math.max(streak, progress.bestStreak)) } : null,
  }
}

const count = (x: Unlock) => (x.rule.type === 'chores' ? x.rule.count : Infinity)
const days = (x: Unlock) => (x.rule.type === 'streak' ? x.rule.days : Infinity)
