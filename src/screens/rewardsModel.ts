import { catalogEntry } from '../catalog/objects'
import { ITEMS } from '../character/items'
import type { CharacterSlot, Pet, Progress } from '../domain/types'
import { UNLOCKS, nextUnlocks, type NextUnlock, type Unlock, type UnlockRule } from '../domain/unlocks'

// Words and numbers for the rewards screen and the gift box. The rules
// themselves live in src/domain/unlocks.ts; this only describes them.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** How a locked reward is earned: "12 chores", "7-day streak". */
export function requirementLabel(rule: UnlockRule): string {
  return rule.type === 'chores' ? plural(rule.count, 'chore', 'chores') : `${rule.days}-day streak`
}

/** "red beanie", for "You unlocked the red beanie!". */
export function lowerName(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1)
}

export function giftTitle(unlock: Pick<Unlock, 'name'>): string {
  return `You unlocked the ${lowerName(unlock.name)}!`
}

const target = (rule: UnlockRule) => (rule.type === 'chores' ? rule.count : rule.days)

export interface NextLine {
  unlock: Unlock
  /** "2 more chores to the bow". */
  text: string
  /** 0 to 1 along the way from the previous reward of this kind to this one. */
  fraction: number
  /** For the progress bar's accessible value: done so far, and the step size. */
  done: number
  total: number
}

function describeNext(next: NextUnlock): NextLine {
  const { unlock, remaining } = next
  const goal = target(unlock.rule)
  // Count from the last reward of the same kind that sits below this one, so each bar starts near empty.
  const floor = UNLOCKS.filter((x) => x.rule.type === unlock.rule.type && target(x.rule) < goal).reduce((max, x) => Math.max(max, target(x.rule)), 0)
  const total = goal - floor
  const done = Math.min(total, Math.max(0, goal - remaining - floor))
  const unit = unlock.rule.type === 'chores' ? (remaining === 1 ? 'chore' : 'chores') : remaining === 1 ? 'day' : 'days'
  const text = remaining === 0 ? `Almost there: the ${lowerName(unlock.name)}` : `${remaining} more ${unit} to the ${lowerName(unlock.name)}`
  return { unlock, text, fraction: total > 0 ? done / total : 1, done, total }
}

/** The next chore reward and the next streak reward, ready to draw. */
export function nextLines(progress: Progress, streak: number): { chores: NextLine | null; streak: NextLine | null } {
  const next = nextUnlocks(progress, streak)
  return { chores: next.chores && describeNext(next.chores), streak: next.streak && describeNext(next.streak) }
}

/** Chores left until the next gift, e.g. "Gift in 2", or nothing when none is pending. */
export function rewardsNote(progress: Progress | null | undefined): string | undefined {
  if (!progress) return undefined
  const next = nextUnlocks(progress, progress.currentStreak).chores
  return next && next.remaining > 0 ? `Gift in ${next.remaining}` : undefined
}

/** The single reward closest to being earned, for the "next up" highlight on the rewards screen. */
export function nextUpId(progress: Progress, streak: number): string | null {
  const { chores, streak: days } = nextUnlocks(progress, streak)
  const pick = chores && days ? (days.remaining < chores.remaining ? days : chores) : (chores ?? days)
  return pick?.unlock.id ?? null
}

/** How a streak is counted, in one line. */
export const STREAK_RULE = 'A day counts when you do a chore (or none are due) and nothing gets very late.'

/** The rewards button: "Rewards · Gift in 2", or just "Rewards" when nothing is pending. */
export function rewardsButtonLabel(progress: Progress | null | undefined): string {
  const note = rewardsNote(progress)
  return note ? `Rewards · ${note}` : 'Rewards'
}

/** The outfit with one slot set or cleared (one item per slot). */
export function withEquipped(equipped: Pet['equipped'], slot: Exclude<CharacterSlot, 'body'>, itemId: string | null): Pet['equipped'] {
  const rest = { ...equipped }
  delete rest[slot]
  return itemId ? { ...rest, [slot]: itemId } : rest
}

/** True when the art for this reward exists yet (accessories are still being drawn). */
export function hasRewardArt(unlock: Unlock): boolean {
  if (unlock.kind === 'item') return ITEMS.some((i) => i.id === unlock.ref)
  if (unlock.kind === 'decor') return Boolean(catalogEntry(unlock.ref))
  return true
}
