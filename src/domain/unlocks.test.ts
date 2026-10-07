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
  it('counts days in a row with a chore done, including today', () => {
    const c = [daily('dishes', '2026-10-01')]
    expect(currentStreak(c, everyDay('dishes', '2026-10-01', TODAY), TODAY)).toBe(6)
  })

  it("doesn't hold today against you while it can still be done", () => {
    const c = [daily('dishes', '2026-10-01')]
    // Due today but not done yet: today isn't judged, and counts as soon as a chore is done.
    expect(currentStreak(c, everyDay('dishes', '2026-10-01', addDays(TODAY, -1)), TODAY)).toBe(5)
    expect(currentStreak(c, everyDay('dishes', '2026-10-01', TODAY), TODAY)).toBe(6)
  })

  it('judges up to yesterday while today has nothing done yet', () => {
    const c = [daily('dishes', '2026-10-01')]
    // Done through Oct 4, nothing on Oct 5 and no rest token yet: Oct 5 breaks it.
    expect(currentStreak(c, everyDay('dishes', '2026-10-01', '2026-10-04'), TODAY)).toBe(0)
  })

  it('breaks on a day with something due and nothing done', () => {
    const c = [daily('dishes', '2026-10-01')]
    const missedOct3 = everyDay('dishes', '2026-10-01', TODAY).filter((x) => x.completedOn !== '2026-10-03')
    // Nothing on Oct 3 breaks the streak (no rest token after two days), even though it was done late on Oct 4.
    expect(currentStreak(c, missedOct3, TODAY)).toBe(3)
  })

  it('one chore a day keeps it going while the others are only a little late', () => {
    const c = [daily('dishes', '2026-10-01'), daily('bins', '2026-10-01')]
    // Bins done every other day: never more than a day late (level 1).
    const comps = [...everyDay('dishes', '2026-10-01', TODAY), ...['2026-10-01', '2026-10-03', '2026-10-05'].map((d) => done('bins', d))]
    expect(currentStreak(c, comps, TODAY)).toBe(6)
  })

  it('a chore left to get very neglected (level 2) fails the day, however much else got done', () => {
    const c = [daily('dishes', '2026-10-01'), daily('bins', '2026-10-01')]
    // Bins done Oct 1, due Oct 2: two days late (level 2) by the end of Oct 4, so Oct 4 fails.
    const comps = [...everyDay('dishes', '2026-10-01', TODAY), done('bins', '2026-10-01'), done('bins', '2026-10-05'), done('bins', TODAY)]
    expect(currentStreak(c, comps, TODAY)).toBe(2)
  })

  it('a day with nothing due counts without doing anything', () => {
    const c = [{ ...daily('W', '2026-09-28'), schedule: { kind: 'weekly' as const, weekday: 1 as const } }] // Mondays
    expect(currentStreak(c, [done('W', '2026-09-28'), done('W', '2026-10-05')], TODAY)).toBe(9)
  })

  it("seeded sample history (counts: false) isn't the player's, so it doesn't make a day count", () => {
    const c = [daily('dishes', '2026-10-01')]
    const seeded = everyDay('dishes', '2026-10-01', '2026-10-05').map((x) => ({ ...x, counts: false }))
    expect(currentStreak(c, seeded, TODAY)).toBe(0)
    expect(currentStreak(c, [...seeded, done('dishes', TODAY)], TODAY)).toBe(1)
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

describe('streaks after a schedule edit', () => {
  it('does not turn long-skipped days into a streak when the chore is edited', () => {
    // Made months ago, never done, then switched to every 2 days today and done once.
    const chore: Chore = { ...daily('a', '2026-05-01'), schedule: { kind: 'everyNDays', n: 2, since: TODAY } }
    expect(currentStreak([chore], [done('a', TODAY)], TODAY)).toBe(1)
  })

  it('keeps the streak of a chore that was done all along', () => {
    const before = currentStreak([daily('a', '2026-09-01')], everyDay('a', '2026-09-01', TODAY), TODAY)
    const edited: Chore = { ...daily('a', '2026-09-01'), schedule: { kind: 'everyNDays', n: 2, since: TODAY } }
    expect(currentStreak([edited], everyDay('a', '2026-09-01', TODAY), TODAY)).toBe(before)
    expect(before).toBeGreaterThan(30)
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
    expect(next.chores).toMatchObject({ unlock: { id: 'decor:teddy' }, remaining: 2 })
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

  it('counts a chore deleted mid-sync once, whether or not its rows are still around', () => {
    const rows = [on('x', '2026-10-01'), on('x', '2026-10-02'), on('x', '2026-10-03'), on('x', '2026-10-04')]
    // The progress row (x banked at 4) synced, the delete did not: 4, not 8.
    expect(choreCountOf(rows, { x: 4 })).toBe(4)
    expect(choreCountOf(rows, { x: 4 }, ['x'])).toBe(4)
    // Once the delete lands, the banked count stands in for the rows.
    expect(choreCountOf([], { x: 4 })).toBe(4)
  })

  it('ignores the banked count of a chore that still exists', () => {
    expect(choreCountOf([on('x', '2026-10-01')], { x: 4 }, new Set(['x']))).toBe(1)
    expect(choreCountOf([on('x', '2026-10-01')], { x: 4, gone: 2 }, ['x'])).toBe(3)
  })

  it('never lets rows of a deleted chore take away from its banked count', () => {
    expect(choreCountOf([on('x', '2026-10-01')], { x: 4 })).toBe(4)
    expect(choreCountOf([on('x', '2026-10-01'), on('x', '2026-10-02'), on('x', '2026-10-03'), on('x', '2026-10-04'), on('x', '2026-10-05')], { x: 4 })).toBe(5)
  })
})

describe('rest tokens', () => {
  const c = [daily('dishes', '2026-09-01')]
  const skipping = (...skipped: string[]) => everyDay('dishes', '2026-09-01', TODAY).filter((x) => !skipped.includes(x.completedOn))

  it('a week of counted days banks a token that covers one missed day, which adds nothing', () => {
    // Sep 1 .. Oct 6 is 36 days; one missed day leaves 35.
    expect(currentStreak(c, skipping('2026-10-01'), TODAY)).toBe(35)
  })

  it('without a token banked, a missed day still breaks it', () => {
    const short = [daily('dishes', '2026-09-28')]
    // Sep 28 .. Oct 2 is only five days: no token yet, so missing Oct 3 breaks it.
    const comps = everyDay('dishes', '2026-09-28', TODAY).filter((x) => x.completedOn !== '2026-10-03')
    expect(currentStreak(short, comps, TODAY)).toBe(3)
  })

  it('holds at most two tokens: a third missed day in a row breaks it', () => {
    expect(currentStreak(c, skipping('2026-10-01', '2026-10-02'), TODAY)).toBe(34)
    expect(currentStreak(c, skipping('2026-10-01', '2026-10-02', '2026-10-03'), TODAY)).toBe(3)
  })

  it('spent tokens are earned back by the next seven counted days', () => {
    // Sep 1-14 bank two tokens; missing Sep 15 and 16 spends both; Sep 17-23 bank one for Sep 24.
    expect(currentStreak(c, skipping('2026-09-15', '2026-09-16', '2026-09-24'), TODAY)).toBe(33)
    // Missing Sep 23 instead comes a day too soon: no token yet, so it breaks there.
    expect(currentStreak(c, skipping('2026-09-15', '2026-09-16', '2026-09-23'), TODAY)).toBe(13)
  })

  it('vacation days spend nothing', () => {
    const v = [{ start: '2026-09-20', end: '2026-09-30' }]
    const comps = everyDay('dishes', '2026-09-01', TODAY).filter((x) => x.completedOn < '2026-09-20' || x.completedOn > '2026-09-30')
    expect(currentStreak(c, comps, TODAY, v)).toBe(25)
  })
})
