import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import type { Chore, Completion, Progress, Schedule, VacationWindow } from './types'
import { applyUnlocks, currentStreak, FREE_STYLES, isUnlocked, nextUnlocks, UNLOCKS } from './unlocks'

// 2026-10-06 is a Tuesday. 2026-09-28 and 2026-10-05 are Mondays.
const TODAY = '2026-10-06'

const chore = (id: string, schedule: Schedule, createdOn: string): Chore => ({ id, homeId: 'h', objectId: null, name: id, schedule, createdOn, photoProof: false })
const daily = (id: string, createdOn: string) => chore(id, { kind: 'daily' }, createdOn)
const done = (choreId: string, on: string): Completion => ({ id: `${choreId}-${on}-${Math.random()}`, choreId, completedAt: '', completedOn: on })
const days = (choreId: string, from: string, to: string) => {
  const out: Completion[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(done(choreId, d))
  return out
}
const on = (choreId: string, ...dates: string[]) => dates.map((d) => done(choreId, d))
const progress = (over: Partial<Progress> = {}): Progress => ({ homeId: 'h', choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [], ...over })
const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('streaks with mixed schedules', () => {
  const mixed = () => [
    daily('D', '2026-10-01'),
    chore('W', { kind: 'weekly', weekday: 1 }, '2026-10-01'), // first due Mon 10-05
    chore('M', { kind: 'monthly', dayOfMonth: 3 }, '2026-10-01'), // first due 10-03
    chore('E', { kind: 'everyNDays', n: 3 }, '2026-10-01'), // first due 10-01
  ]
  const allDone = () => [...days('D', '2026-10-01', TODAY), ...on('W', '2026-10-05'), ...on('M', '2026-10-03'), ...on('E', '2026-10-01', '2026-10-04')]

  it('counts every day when each chore is done by its due date', () => {
    expect(currentStreak(mixed(), allDone(), TODAY)).toBe(6)
  })

  it('breaks on the day the weekly chore was missed; today is then skipped, not counted', () => {
    const c = allDone().filter((x) => x.choreId !== 'W')
    // W is due 10-05 and still not done: 10-05 is unclean, and today is overdue.
    expect(currentStreak(mixed(), c, TODAY)).toBe(0)
  })

  it('a late completion the next day does not repair the missed day', () => {
    // Monthly chore due 10-03, done 10-04: 10-03 is a break, 10-04..10-06 count.
    const c = [...days('D', '2026-10-01', TODAY), ...on('W', '2026-10-05'), ...on('M', '2026-10-04'), ...on('E', '2026-10-01', '2026-10-04')]
    expect(currentStreak(mixed(), c, TODAY)).toBe(3)
  })

  it('an everyNDays chore that was overdue for a day breaks the streak on that day', () => {
    // E done 10-01, due 10-04, done late on 10-05: 10-04 is unclean.
    const c = [...days('D', '2026-10-01', TODAY), ...on('W', '2026-10-05'), ...on('M', '2026-10-03'), ...on('E', '2026-10-01', '2026-10-05')]
    expect(currentStreak(mixed(), c, TODAY)).toBe(2)
  })

  it('a weekly chore only matters on and after its due day', () => {
    // Weekly Monday, created Tue 09-29, so due 10-05. Done 10-05; before that it is not overdue.
    const c = [chore('W', { kind: 'weekly', weekday: 1 }, '2026-09-29')]
    expect(currentStreak(c, on('W', '2026-10-05'), TODAY)).toBe(8) // 09-29 .. 10-06
  })

  it('a monthly chore clamped to the month end is judged on the clamped day', () => {
    // dayOfMonth 31 in September is the 30th. Created 09-25, done 09-30 on time, due again 10-31.
    const c = [chore('M', { kind: 'monthly', dayOfMonth: 31 }, '2026-09-25')]
    expect(currentStreak(c, on('M', '2026-09-30'), TODAY)).toBe(12) // 09-25 .. 10-06
    // Never done: due 09-30 and overdue ever since, so there is no streak.
    expect(currentStreak(c, [], TODAY)).toBe(0)
  })
})

describe('streaks and chore creation, deletion and early completion', () => {
  it('a chore created mid-streak only matters from its createdOn', () => {
    const c = [daily('A', '2026-10-01'), daily('B', '2026-10-04')]
    const completions = [...days('A', '2026-10-01', TODAY), ...days('B', '2026-10-04', TODAY)]
    expect(currentStreak(c, completions, TODAY)).toBe(6)
  })

  it('a chore created mid-streak and missed on its first day breaks the days up to then', () => {
    const c = [daily('A', '2026-10-01'), daily('B', '2026-10-04')]
    const completions = [...days('A', '2026-10-01', TODAY), ...days('B', '2026-10-05', TODAY)]
    expect(currentStreak(c, completions, TODAY)).toBe(2) // 10-04 is unclean
  })

  it('a chore created today and not done yet still lets today count', () => {
    const c = [daily('A', '2026-10-01'), daily('B', TODAY)]
    expect(currentStreak(c, days('A', '2026-10-01', TODAY), TODAY)).toBe(6)
  })

  it('a deleted chore (no longer in the list) stops counting, and its completions are ignored', () => {
    const a = daily('A', '2026-10-03')
    const x = daily('X', '2026-10-01') // never done
    const completions = days('A', '2026-10-03', TODAY)
    expect(currentStreak([a, x], completions, TODAY)).toBe(0)
    expect(currentStreak([a], completions, TODAY)).toBe(4)
    // The streak also starts from the earliest remaining chore, not the deleted one.
    expect(currentStreak([a], [...completions, ...days('X', '2026-10-01', '2026-10-02')], TODAY)).toBe(4)
  })

  it('an early completion satisfies the pending occurrence', () => {
    // Weekly Monday created Mon 09-28. Done 09-28, then early on Fri 10-02 for Mon 10-05.
    const c = [chore('W', { kind: 'weekly', weekday: 1 }, '2026-09-28')]
    expect(currentStreak(c, on('W', '2026-09-28', '2026-10-02'), TODAY)).toBe(9) // 09-28 .. 10-06
  })

  it('without that early completion the Monday is missed', () => {
    const c = [chore('W', { kind: 'weekly', weekday: 1 }, '2026-09-28')]
    expect(currentStreak(c, on('W', '2026-09-28'), TODAY)).toBe(0)
  })

  it('multiple completions on one day count once and do not pay for another day', () => {
    const c = [daily('A', '2026-10-03')]
    const completions = [...on('A', '2026-10-03', '2026-10-04', '2026-10-04', '2026-10-06', '2026-10-06')]
    // 10-05 had nothing done (the second 10-04 does not cover it): breaks there.
    expect(currentStreak(c, completions, TODAY)).toBe(1)
  })

  it('multiple completions on one day do not hurt either', () => {
    const c = [daily('A', '2026-10-04')]
    const completions = [...on('A', '2026-10-04', '2026-10-04', '2026-10-05', '2026-10-05', '2026-10-06', '2026-10-06', '2026-10-06')]
    expect(currentStreak(c, completions, TODAY)).toBe(3)
  })

  it('completions dated after the day being judged are not used for that day', () => {
    // A single completion today does not retroactively clean the days before it.
    const c = [daily('A', '2026-10-01')]
    expect(currentStreak(c, on('A', TODAY), TODAY)).toBe(1)
  })
})

describe('streaks and vacations', () => {
  it('a streak survives a long vacation', () => {
    const c = [daily('A', '2026-08-01')]
    const v: VacationWindow[] = [{ start: '2026-08-11', end: '2026-09-30' }]
    const completions = [...days('A', '2026-08-01', '2026-08-10'), ...days('A', '2026-10-01', TODAY)]
    expect(currentStreak(c, completions, TODAY, v)).toBe(16)
  })

  it('a vacation starting today: today is skipped and the streak keeps what came before', () => {
    const c = [daily('A', '2026-10-01')]
    const v = [{ start: TODAY, end: '2026-10-10' }]
    expect(currentStreak(c, days('A', '2026-10-01', '2026-10-05'), TODAY, v)).toBe(5)
  })

  it('a vacation starting today does not hide a day that was missed before it', () => {
    const c = [daily('A', '2026-10-01')]
    const v = [{ start: TODAY, end: '2026-10-10' }]
    expect(currentStreak(c, days('A', '2026-10-01', '2026-10-04'), TODAY, v)).toBe(0) // 10-05 missed
  })

  it('a one-day vacation yesterday with the chore due then: today overdue is skipped, not a break', () => {
    const c = [daily('A', '2026-10-01')]
    const v = [{ start: '2026-10-05', end: '2026-10-05' }]
    expect(currentStreak(c, days('A', '2026-10-01', '2026-10-04'), TODAY, v)).toBe(4)
    // Done today: today counts too.
    expect(currentStreak(c, days('A', '2026-10-01', '2026-10-04').concat(on('A', TODAY)), TODAY, v)).toBe(5)
  })

  it('back-to-back vacations are skipped as one stretch', () => {
    const c = [daily('A', '2026-09-25')]
    const v = [
      { start: '2026-09-28', end: '2026-10-01' },
      { start: '2026-10-02', end: '2026-10-04' },
    ]
    const completions = [...days('A', '2026-09-25', '2026-09-27'), ...days('A', '2026-10-05', TODAY)]
    expect(currentStreak(c, completions, TODAY, v)).toBe(5)
  })

  it('overlapping vacations behave like their union', () => {
    const c = [daily('A', '2026-09-25')]
    const v = [
      { start: '2026-09-28', end: '2026-10-02' },
      { start: '2026-10-01', end: '2026-10-04' },
    ]
    const completions = [...days('A', '2026-09-25', '2026-09-27'), ...days('A', '2026-10-05', TODAY)]
    expect(currentStreak(c, completions, TODAY, v)).toBe(5)
  })

  it('a weekly chore that fell due during vacation and is done the day after is not a break', () => {
    // Weekly Monday created Mon 09-21; done 09-21 and 09-28; due 10-05 falls in the vacation 10-03..10-05.
    const c = [chore('W', { kind: 'weekly', weekday: 1 }, '2026-09-21')]
    const v = [{ start: '2026-10-03', end: '2026-10-05' }]
    const completions = on('W', '2026-09-21', '2026-09-28', TODAY)
    expect(currentStreak(c, completions, TODAY, v)).toBe(13) // 09-21 .. 10-02 (12 days) + today
  })

  it('the same chore still overdue today after the vacation is skipped, not a break', () => {
    const c = [chore('W', { kind: 'weekly', weekday: 1 }, '2026-09-21')]
    const v = [{ start: '2026-10-03', end: '2026-10-05' }]
    expect(currentStreak(c, on('W', '2026-09-21', '2026-09-28'), TODAY, v)).toBe(12)
  })

  it('a daily chore done on the first day after the vacation keeps the streak', () => {
    const c = [daily('A', '2026-09-25')]
    const v = [{ start: '2026-09-30', end: '2026-10-02' }]
    const completions = [...days('A', '2026-09-25', '2026-09-29'), ...days('A', '2026-10-03', TODAY)]
    expect(currentStreak(c, completions, TODAY, v)).toBe(9) // 5 before + 4 after
  })

  it('a daily chore not done on the first active day after the vacation breaks there', () => {
    const c = [daily('A', '2026-09-25')]
    const v = [{ start: '2026-09-30', end: '2026-10-02' }]
    const completions = [...days('A', '2026-09-25', '2026-09-29'), ...days('A', '2026-10-04', TODAY)]
    expect(currentStreak(c, completions, TODAY, v)).toBe(3) // 10-03 broke it
  })

  it('a chore never done after the vacation: the first active day after it is the break', () => {
    const c = [daily('A', '2026-09-25')]
    const v = [{ start: '2026-09-30', end: '2026-10-02' }]
    // Today is a clean-so-far day only if nothing is overdue; the chore is overdue (due since 09-30).
    expect(currentStreak(c, days('A', '2026-09-25', '2026-09-29'), TODAY, v)).toBe(0)
  })

  it('a vacation covering every day since creation gives a zero streak', () => {
    const c = [daily('A', '2026-10-01')]
    expect(currentStreak(c, [], TODAY, [{ start: '2026-10-01', end: '2026-10-10' }])).toBe(0)
  })
})

describe('streaks today', () => {
  it('a brand new home with everything done is exactly 1', () => {
    const c = [daily('A', TODAY), chore('W', { kind: 'weekly', weekday: 2 }, TODAY), chore('E', { kind: 'everyNDays', n: 2 }, TODAY)]
    const completions = [...on('A', TODAY), ...on('W', TODAY), ...on('E', TODAY)]
    expect(currentStreak(c, completions, TODAY)).toBe(1)
  })

  it('a brand new home with nothing done yet is also 1: chores due today are not overdue', () => {
    expect(currentStreak([daily('A', TODAY)], [], TODAY)).toBe(1)
  })

  it('does not count days before the earliest chore existed', () => {
    expect(currentStreak([daily('A', '2026-10-05')], days('A', '2026-10-05', TODAY), TODAY)).toBe(2)
  })

  it('a chore created in the future does not matter yet', () => {
    const c = [daily('A', '2026-10-05'), daily('F', '2026-10-09')]
    expect(currentStreak(c, days('A', '2026-10-05', TODAY), TODAY)).toBe(2)
  })

  it('a chore due today (not yet overdue) lets today count', () => {
    // Overdue-now-but-yesterday-clean needs a vacation yesterday: see the vacation tests.
    const c = [chore('W', { kind: 'weekly', weekday: 2 }, '2026-09-29')]
    expect(currentStreak(c, on('W', '2026-09-29'), TODAY)).toBe(8) // due again today, not overdue
  })
})

describe('streak lookback cap', () => {
  it('a very long streak is capped (about 121 days) and returns quickly', () => {
    const c = [daily('A', '2025-01-01')]
    const completions = days('A', '2025-01-01', TODAY)
    const t0 = Date.now()
    const streak = currentStreak(c, completions, TODAY)
    expect(Date.now() - t0).toBeLessThan(5000)
    expect(streak).toBeGreaterThanOrEqual(120)
    expect(streak).toBeLessThanOrEqual(121)
  })

  it('the cap is still enough for every streak reward', () => {
    const longest = Math.max(...UNLOCKS.flatMap((x) => (x.rule.type === 'streak' ? [x.rule.days] : [])))
    const streak = currentStreak([daily('A', '2025-01-01')], days('A', '2025-01-01', TODAY), TODAY)
    expect(streak).toBeGreaterThanOrEqual(longest)
  })

  // The lookback counts active days only, so a long trip can't hide the streak from before it.
  it('a vacation longer than the lookback does not erase the streak from before it', () => {
    const c = [daily('A', '2026-01-01')]
    const v = [{ start: '2026-01-21', end: '2026-10-05' }]
    const completions = [...days('A', '2026-01-01', '2026-01-20'), ...on('A', TODAY)]
    expect(currentStreak(c, completions, TODAY, v)).toBe(21)
  })
})

describe('applyUnlocks edge cases', () => {
  it('several rewards at once come out in UNLOCKS order', () => {
    const maxChores = Math.max(...UNLOCKS.map((x) => (x.rule.type === 'chores' ? x.rule.count : 0)))
    const maxStreak = Math.max(...UNLOCKS.map((x) => (x.rule.type === 'streak' ? x.rule.days : 0)))
    const { unlocked, progress: p } = applyUnlocks(progress({ choreCount: maxChores }), maxStreak)
    expect(ids(unlocked)).toEqual(ids(UNLOCKS))
    expect(p.unlockedItems).toEqual(ids(UNLOCKS))
  })

  it('mixed chore and streak rewards interleave in UNLOCKS order, not by kind', () => {
    const { unlocked } = applyUnlocks(progress({ choreCount: 5 }), 4)
    expect(ids(unlocked)).toEqual(['item:beanie-red', 'decor:plant', 'wall:mint', 'item:bow', 'floor:tile'])
  })

  it('unlocks exactly at a chore threshold, and not one before', () => {
    expect(ids(applyUnlocks(progress({ choreCount: 11 }), 0).unlocked)).not.toContain('item:glasses')
    expect(ids(applyUnlocks(progress({ choreCount: 12 }), 0).unlocked)).toEqual(['item:beanie-red', 'decor:plant', 'item:bow', 'decor:lamp', 'item:glasses'])
  })

  it('unlocks exactly at a streak threshold, and not one before', () => {
    expect(applyUnlocks(progress(), 1).unlocked).toEqual([])
    expect(ids(applyUnlocks(progress(), 2).unlocked)).toEqual(['wall:mint'])
    expect(ids(applyUnlocks(progress(), 6).unlocked)).toEqual(['wall:mint', 'floor:tile'])
    expect(ids(applyUnlocks(progress(), 7).unlocked)).toEqual(['wall:mint', 'floor:tile', 'wall:lavender'])
    expect(ids(applyUnlocks(progress(), 13).unlocked)).not.toContain('floor:carpet')
    expect(ids(applyUnlocks(progress(), 14).unlocked)).toContain('floor:carpet')
  })

  it('keeps streak rewards through bestStreak after the streak breaks', () => {
    const p = progress({ choreCount: 0, bestStreak: 7 })
    const result = applyUnlocks(p, 0)
    expect(ids(result.unlocked)).toEqual(['wall:mint', 'floor:tile', 'wall:lavender'])
    expect(result.progress).toMatchObject({ currentStreak: 0, bestStreak: 7 })
  })

  it('never lowers bestStreak', () => {
    expect(applyUnlocks(progress({ bestStreak: 9 }), 3).progress).toMatchObject({ currentStreak: 3, bestStreak: 9 })
    expect(applyUnlocks(progress({ bestStreak: 3 }), 9).progress).toMatchObject({ currentStreak: 9, bestStreak: 9 })
  })

  it('preserves unknown ids already in unlockedItems, ahead of the new ones', () => {
    const p = progress({ choreCount: 3, unlockedItems: ['item:mystery', 'decor:plant'] })
    const result = applyUnlocks(p, 0)
    expect(ids(result.unlocked)).toEqual(['item:beanie-red'])
    expect(result.progress.unlockedItems).toEqual(['item:mystery', 'decor:plant', 'item:beanie-red'])
  })

  it('does not mutate its input and leaves the other fields alone', () => {
    const p = progress({ choreCount: 5, unlockedItems: ['item:beanie-red'] })
    const snapshot = JSON.parse(JSON.stringify(p))
    const result = applyUnlocks(p, 2)
    expect(p).toEqual(snapshot)
    expect(result.progress).not.toBe(p)
    expect(result.progress.choreCount).toBe(5)
    expect(result.progress.homeId).toBe('h')
  })

  it('returns nothing and changes nothing when everything is already unlocked', () => {
    const p = progress({ choreCount: 99, bestStreak: 99, unlockedItems: ids(UNLOCKS) })
    const result = applyUnlocks(p, 99)
    expect(result.unlocked).toEqual([])
    expect(result.progress.unlockedItems).toEqual(ids(UNLOCKS))
  })
})

describe('nextUnlocks edge cases', () => {
  it('returns nulls when everything is unlocked', () => {
    expect(nextUnlocks(progress({ unlockedItems: ids(UNLOCKS) }), 0)).toEqual({ chores: null, streak: null })
  })

  it('returns a null only for the kind that is finished', () => {
    const chores = ids(UNLOCKS.filter((x) => x.rule.type === 'chores'))
    const next = nextUnlocks(progress({ unlockedItems: chores }), 0)
    expect(next.chores).toBeNull()
    expect(next.streak).toMatchObject({ unlock: { id: 'wall:mint' }, remaining: 2 })
  })

  it('remaining is never negative, even when the reward is overdue to be unlocked', () => {
    const next = nextUnlocks(progress({ choreCount: 100, bestStreak: 50 }), 80)
    expect(next.chores).toMatchObject({ unlock: { id: 'item:beanie-red' }, remaining: 0 })
    expect(next.streak).toMatchObject({ unlock: { id: 'wall:mint' }, remaining: 0 })
  })

  it('picks the smallest pending threshold, skipping unlocked ones', () => {
    const next = nextUnlocks(progress({ choreCount: 4, unlockedItems: ['item:beanie-red', 'wall:mint', 'floor:tile'] }), 0)
    expect(next.chores).toMatchObject({ unlock: { id: 'decor:plant' }, remaining: 0 })
    expect(next.streak).toMatchObject({ unlock: { id: 'wall:lavender' }, remaining: 7 })
  })

  it('measures the streak against the best of the current and best streaks', () => {
    const next = nextUnlocks(progress({ bestStreak: 5, unlockedItems: ['wall:mint', 'floor:tile'] }), 1)
    expect(next.streak).toMatchObject({ unlock: { id: 'wall:lavender' }, remaining: 2 })
  })

  it('ignores unknown ids in unlockedItems', () => {
    const next = nextUnlocks(progress({ unlockedItems: ['item:mystery'] }), 0)
    expect(next.chores).toMatchObject({ unlock: { id: 'item:beanie-red' }, remaining: 1 })
  })
})

describe('isUnlocked and FREE_STYLES', () => {
  it('free styles are unlocked even without a progress row', () => {
    for (const id of FREE_STYLES) expect(isUnlocked(null, id)).toBe(true)
    expect(isUnlocked(null, 'wall:mint')).toBe(false)
    expect(isUnlocked(null, 'item:beanie-red')).toBe(false)
  })

  it('free styles never overlap with earnable rewards', () => {
    const earnable = new Set(ids(UNLOCKS))
    for (const id of FREE_STYLES) expect(earnable.has(id)).toBe(false)
  })

  it('an unknown id is locked unless it is in unlockedItems', () => {
    expect(isUnlocked(progress(), 'item:mystery')).toBe(false)
    expect(isUnlocked(progress({ unlockedItems: ['item:mystery'] }), 'item:mystery')).toBe(true)
  })

  it('matches whole ids only', () => {
    expect(isUnlocked(progress({ unlockedItems: ['wall:mint-dark'] }), 'wall:mint')).toBe(false)
  })
})
