import { addDays, isInVacation } from './dates'
import { choreAsOf, completionDays, scheduleStart, startReplay, type ChoreReplay } from './schedule'
import type { Chore, Completion, ISODate, Progress, VacationWindow } from './types'

// Rewards come only from real chores getting done (docs/SPEC.md), and every
// reward is purely cosmetic: outfits, styles and decor that brings no chores.
// - chore milestones count chores the player finishes (progress.choreCount);
// - streaks count days in a row the player kept the home going (see
//   currentStreak), with rest tokens so one off day doesn't undo a good run.
//   Vacation days neither count nor break a streak, so going away never costs you.
// The first unlock is the very first chore, so it lands in the first session.

export type UnlockKind = 'item' | 'decor' | 'wall' | 'floor'

export type UnlockRule = { type: 'chores'; count: number } | { type: 'streak'; days: number }

export interface Unlock {
  /** Stored in progress.unlockedItems, e.g. "item:beanie-red", "decor:teddy", "wall:mint". */
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
  u('decor', 'teddy', 'Teddy bear', { type: 'chores', count: 3 }),
  u('wall', 'mint', 'Mint walls', { type: 'streak', days: 2 }),
  u('item', 'bow', 'Bow', { type: 'chores', count: 5 }),
  u('decor', 'lamp', 'Lamp', { type: 'chores', count: 8 }),
  u('floor', 'tile', 'Tiled floor', { type: 'streak', days: 4 }),
  u('item', 'glasses', 'Round glasses', { type: 'chores', count: 12 }),
  u('decor', 'poster', 'Poster', { type: 'chores', count: 16 }),
  u('wall', 'lavender', 'Lavender walls', { type: 'streak', days: 7 }),
  u('item', 'scarf', 'Scarf', { type: 'chores', count: 20 }),
  u('decor', 'fairy-lights', 'Fairy lights', { type: 'chores', count: 25 }),
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
 *
 * A chore is counted once either way: from its completions or from its banked
 * count, whichever is larger, so a chore deleted on one device while its rows
 * are still around (a delete that hasn't synced yet) never counts twice. A
 * chore in `liveChoreIds` still exists, so its banked count is ignored.
 */
export function choreCountOf(completions: Completion[], retired: Record<string, number> = {}, liveChoreIds?: Iterable<string>): number {
  const live = new Set(liveChoreIds ?? [])
  const perChore = new Map<string, number>()
  const seen = new Set<string>()
  for (const c of completions) {
    if (c.counts === false) continue
    const key = `${c.choreId}:${c.completedOn}`
    if (seen.has(key)) continue
    seen.add(key)
    perChore.set(c.choreId, (perChore.get(c.choreId) ?? 0) + 1)
  }
  let total = 0
  for (const n of perChore.values()) total += n
  for (const [choreId, banked] of Object.entries(retired)) {
    if (live.has(choreId)) continue
    total += Math.max(0, banked - (perChore.get(choreId) ?? 0))
  }
  return total
}

export function isUnlocked(progress: Pick<Progress, 'unlockedItems'> | null, id: string): boolean {
  return FREE_STYLES.includes(id) || FREE_ITEMS.includes(id) || Boolean(progress?.unlockedItems.includes(id))
}

export const STREAK_TUNING = {
  /** Counted days it takes to bank a rest token. */
  daysPerRestToken: 7,
  /** Rest tokens held at most. */
  maxRestTokens: 2,
}

/** One chore's replay, fed its completion days as the streak walks forward. */
interface Walker {
  chore: Chore
  replay: ChoreReplay
  days: ISODate[]
  /** How many of `days` have been fed in. */
  fed: number
  /** The days this replay judges: from `from`, up to but not including `until`. */
  from: ISODate
  until?: ISODate
}

/**
 * The replays that judge a chore's days. A chore whose schedule was changed
 * gets two: its current schedule from the change on, and before that the
 * schedule it replaced, as if that had always applied. So days before an edit
 * are judged by the rule of the time: editing a chore neither wipes a streak
 * nor makes long-skipped days look like nothing was due. (A change made before
 * schedules kept `before` falls back to the current rule.)
 */
function walkersFor(chore: Chore, completions: Completion[]): Walker[] {
  const days = completionDays(chore, completions)
  const start = scheduleStart(chore)
  const walkers: Walker[] = [{ chore, replay: startReplay(chore), days, fed: 0, from: start }]
  // Each earlier rule judges the days from its own start up to the next change.
  // The oldest rule kept (as choreAsOf sees it) reaches back to the chore's creation.
  let until = start
  let link = chore.schedule.before
  while (until > chore.createdOn) {
    const from = link?.before && link.since && link.since > chore.createdOn && link.since < until ? link.since : chore.createdOn
    walkers.unshift({ chore, replay: startReplay(choreAsOf(chore, addDays(until, -1))), days, fed: 0, from, until })
    until = from
    link = link?.before
  }
  return walkers
}

/** Feed a walker every completion day up to and including `day`. */
function feedThrough(w: Walker, day: ISODate) {
  while (w.fed < w.days.length && w.days[w.fed] <= day) w.replay.add(w.days[w.fed++])
}

/**
 * Whether a day counts toward the streak: at least one chore was done that
 * day (or nothing was due), and no chore ended the day at neglect level 2 or
 * worse. For today, "ended the day" means right now. Leaves every walker fed
 * through `day`.
 */
function dayCounts(walkers: Walker[], active: Set<ISODate>, day: ISODate, vacations: VacationWindow[]): boolean {
  const live = walkers.filter((w) => w.from <= day && (w.until === undefined || day < w.until))
  let somethingDue = false
  for (const w of live) {
    feedThrough(w, addDays(day, -1))
    if (w.replay.statusOn(day, vacations).state !== 'upcoming') somethingDue = true
  }
  for (const w of walkers) feedThrough(w, day)
  if (somethingDue && !active.has(day)) return false
  return live.every((w) => w.replay.statusOn(day, vacations).neglect < 2)
}

/**
 * Days in a row the home was kept going, ending today. A day counts when at
 * least one chore was done (or nothing was due) and nothing was left to get
 * very neglected (level 2 or worse). Today counts as soon as it qualifies, and
 * while it doesn't yet it is simply not judged.
 *
 * Every 7 counted days bank a rest token (at most 2). A day that doesn't count
 * spends a token instead of breaking the streak, and adds nothing to it.
 * Vacation days are skipped: they don't count, break or spend anything.
 * Seeded sample history (counts: false) isn't the player's, so it doesn't
 * make a day count.
 */
export function currentStreak(chores: Chore[], completions: Completion[], today: ISODate, vacations: VacationWindow[] = []): number {
  if (chores.length === 0) return 0
  const firstDay = chores.reduce((min, c) => (c.createdOn < min ? c.createdOn : min), chores[0].createdOn)
  const { daysPerRestToken, maxRestTokens } = STREAK_TUNING

  const ids = new Set(chores.map((c) => c.id))
  const walkers = chores.flatMap((chore) => walkersFor(chore, completions))
  const active = new Set(completions.filter((c) => c.counts !== false && ids.has(c.choreId)).map((c) => c.completedOn))

  let streak = 0
  // Every day from the first chore on, so rest tokens are exactly what was banked.
  let tokens = 0
  let towardToken = 0
  for (let day = firstDay; day <= today; day = addDays(day, 1)) {
    if (isInVacation(day, vacations)) continue
    if (dayCounts(walkers, active, day, vacations)) {
      streak++
      if (++towardToken >= daysPerRestToken) {
        towardToken = 0
        tokens = Math.min(maxRestTokens, tokens + 1)
      }
    } else if (day === today) {
      // Today can still be turned around, so it is not held against the streak.
    } else if (tokens > 0) {
      tokens--
    } else {
      streak = 0
      towardToken = 0
    }
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
