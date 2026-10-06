import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import type { Chore, Completion, Progress } from './types'
import { applyUnlocks, choreCountOf, currentStreak, isUnlocked, nextUnlocks, UNLOCKS } from './unlocks'

const TODAY = '2026-10-06'
const daily = (id: string, createdOn = '2026-09-20'): Chore => ({ id, homeId: 'h', objectId: null, name: id, schedule: { kind: 'daily' }, createdOn, photoProof: false })
const done = (choreId: string, on: string): Completion => ({ id: `${choreId}-${on}`, choreId, completedAt: '', completedOn: on })
const everyDay = (choreId: string, from: string, to: string) => {
  const out: Completion[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(done(choreId, d))
  return out
}
const progress = (over: Partial<Progress> = {}): Progress => ({ homeId: 'h', choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [], ...over })

describe('streaks', () => {
  it('counts days in a row with nothing overdue, including today so far', () => {
    const c = [daily('dishes', '2026-10-01')]
    expect(currentStreak(c, everyDay('dishes', '2026-10-01', TODAY), TODAY)).toBe(6)
  })

  it("doesn't hold today against you while it can still be done", () => {
    const c = [daily('dishes', '2026-10-01')]
    // Due today but not done yet: nothing is overdue, so today still counts.
    expect(currentStreak(c, everyDay('dishes', '2026-10-01', addDays(TODAY, -1)), TODAY)).toBe(6)
  })

  it('judges up to yesterday when something is overdue right now', () => {
    const c = [daily('dishes', '2026-10-01')]
    // Done through Oct 4, missed Oct 5: Oct 5 breaks it and nothing after counts yet.
    expect(currentStreak(c, everyDay('dishes', '2026-10-01', '2026-10-04'), TODAY)).toBe(0)
  })

  it('breaks on a day something was overdue', () => {
    const c = [daily('dishes', '2026-10-01')]
    const missedOct3 = everyDay('dishes', '2026-10-01', TODAY).filter((x) => x.completedOn !== '2026-10-03')
    // Missing Oct 3 breaks the streak, even though it was done late on Oct 4.
    expect(currentStreak(c, missedOct3, TODAY)).toBe(3)
  })

  it('is protected by vacation: away days neither count nor break it', () => {
    const c = [daily('dishes', '2026-09-25')]
    const v = [{ start: '2026-09-30', end: '2026-10-03' }]
    const completions = [...everyDay('dishes', '2026-09-25', '2026-09-29'), ...everyDay('dishes', '2026-10-04', TODAY)]
    expect(currentStreak(c, completions, TODAY, v)).toBe(8)
  })

  it('is zero with no chores', () => {
    expect(currentStreak([], [], TODAY)).toBe(0)
  })
})

describe('unlocks', () => {
  it('gives the first reward for the very first chore', () => {
    const { progress: p, unlocked } = applyUnlocks(progress({ choreCount: 1 }), 0)
    expect(unlocked.map((x) => x.id)).toEqual(['item:beanie-red'])
    expect(p.unlockedItems).toEqual(['item:beanie-red'])
  })

  it('never gives the same reward twice', () => {
    const once = applyUnlocks(progress({ choreCount: 3 }), 0).progress
    expect(applyUnlocks(once, 0).unlocked).toEqual([])
  })

  it('unlocks streak rewards and keeps the best streak', () => {
    const { progress: p, unlocked } = applyUnlocks(progress({ choreCount: 1 }), 4)
    expect(unlocked.map((x) => x.id)).toEqual(['item:beanie-red', 'wall:mint', 'floor:tile'])
    expect(p).toMatchObject({ currentStreak: 4, bestStreak: 4 })
    expect(applyUnlocks(p, 0).progress).toMatchObject({ currentStreak: 0, bestStreak: 4 })
  })

  it('offers at least four decor items and four accessories', () => {
    expect(UNLOCKS.filter((x) => x.kind === 'decor').length).toBeGreaterThanOrEqual(4)
    expect(UNLOCKS.filter((x) => x.kind === 'item').length).toBeGreaterThanOrEqual(4)
    expect(new Set(UNLOCKS.map((x) => x.id)).size).toBe(UNLOCKS.length)
  })

  it('says what is next', () => {
    const next = nextUnlocks(progress({ choreCount: 1, unlockedItems: ['item:beanie-red'] }), 1)
    expect(next.chores).toMatchObject({ unlock: { id: 'decor:plant' }, remaining: 2 })
    expect(next.streak).toMatchObject({ unlock: { id: 'wall:mint' }, remaining: 1 })
  })

  it('treats the starting styles as always unlocked', () => {
    expect(isUnlocked(progress(), 'wall:peach')).toBe(true)
    expect(isUnlocked(progress(), 'wall:mint')).toBe(false)
    expect(isUnlocked(progress({ unlockedItems: ['wall:mint'] }), 'wall:mint')).toBe(true)
  })
})

describe('choreCountOf', () => {
  const on = (choreId: string, completedOn: string, over: Partial<Completion> = {}): Completion => ({ id: `${choreId}-${completedOn}-${over.id ?? ''}`, choreId, completedAt: '', completedOn, ...over })

  it('counts completions that counted, once per chore per day', () => {
    expect(choreCountOf([on('a', '2026-10-01'), on('a', '2026-10-02'), on('b', '2026-10-02')])).toBe(3)
  })

  it('counts the same chore ticked off on two devices the same day once', () => {
    expect(choreCountOf([on('a', '2026-10-06', { id: 'phone' }), on('a', '2026-10-06', { id: 'tablet' })])).toBe(1)
  })

  it("skips seeded history that doesn't count", () => {
    expect(choreCountOf([on('a', '2026-10-01', { counts: false }), on('a', '2026-10-06')])).toBe(1)
  })

  it('adds the banked counts of deleted chores', () => {
    expect(choreCountOf([on('a', '2026-10-06')], { sink: 4, bed: 2 })).toBe(7)
  })
})
