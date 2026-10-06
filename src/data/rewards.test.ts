import { describe, expect, it } from 'vitest'
import { sampleHome } from '../content/sampleHome'
import { addDays } from '../domain/dates'
import { choreStatus } from '../domain/schedule'
import type { Chore, Completion, Progress } from '../domain/types'
import { UNLOCKS } from '../domain/unlocks'
import { completeChoreWithRewards, removeChore, removeObject, updateChore } from './actions'
import { change, emptySnapshot, selectHome, type NewOp, type Snapshot } from './state'

// 2026-10-06 is a Tuesday. Dates passed to completeChoreWithRewards are local-time Dates.
const TODAY = '2026-10-06'
const at = (hour: number, day = 6) => new Date(2026, 9, day, hour, 30)

const apply = (s: Snapshot, ops: NewOp[]): Snapshot => ops.reduce(change, s)
const ctx = (chores: Chore[], completions: Completion[], vacations: { start: string; end: string }[] = []) => ({ chores, completions, vacations })
const progress = (over: Partial<Progress> = {}): Progress => ({ homeId: 'h', choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [], ...over })
const dailyChore = (id: string, createdOn: string): Chore => ({ id, homeId: 'h', objectId: null, name: id, schedule: { kind: 'daily' }, createdOn, photoProof: false })
const done = (choreId: string, on: string): Completion => ({ id: `${choreId}-${on}`, choreId, completedAt: '', completedOn: on })
const daysOf = (choreId: string, from: string, to: string) => {
  const out: Completion[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(done(choreId, d))
  return out
}
const upsertOf = <T extends string>(ops: NewOp[], table: T) => ops.filter((o) => o.table === table && o.kind === 'upsert') as Extract<NewOp, { table: T; kind: 'upsert' }>[]

describe('completeChoreWithRewards on a sample home', () => {
  const sample = () => apply(emptySnapshot('u1'), sampleHome({ species: 'mochi', userId: 'u1', today: TODAY }))

  it('starts with no progress, so the sample history unlocks nothing by itself', () => {
    const data = selectHome(sample().tables)
    expect(data.progress).toMatchObject({ choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [] })
  })

  it('gives only the beanie on the first completion, with the new streak and best streak in the progress op', () => {
    const s = sample()
    const data = selectHome(s.tables)
    const overdue = data.chores.find((c) => choreStatus(c, data.completions, TODAY).state === 'overdue')!
    expect(overdue).toBeDefined()

    const result = completeChoreWithRewards(overdue, data.progress, ctx(data.chores, data.completions), at(9))
    expect(result.unlocked.map((u) => u.id)).toEqual(['item:beanie-red'])

    expect(result.ops).toHaveLength(2)
    const [completion] = upsertOf(result.ops, 'completions')
    expect(completion.value).toMatchObject({ choreId: overdue.id, completedOn: TODAY })
    const [prog] = upsertOf(result.ops, 'progress')
    expect(prog.value).toMatchObject({ homeId: data.home!.id, choreCount: 1, unlockedItems: ['item:beanie-red'] })
    // Another chore is still overdue and yesterday was not clean, so there is no streak yet.
    expect(prog.value.currentStreak).toBe(0)
    expect(prog.value.bestStreak).toBe(0)
  })

  it('after catching up on everything overdue, the streak is 1 and nothing else unlocks yet', () => {
    let s = sample()
    let data = selectHome(s.tables)
    const overdue = data.chores.filter((c) => choreStatus(c, data.completions, TODAY).state === 'overdue')
    expect(overdue.length).toBeGreaterThanOrEqual(2)

    let last = completeChoreWithRewards(overdue[0], data.progress, ctx(data.chores, data.completions), at(9))
    s = apply(s, last.ops)
    for (const [i, c] of overdue.slice(1).entries()) {
      data = selectHome(s.tables)
      last = completeChoreWithRewards(c, data.progress, ctx(data.chores, data.completions), at(10 + i))
      s = apply(s, last.ops)
    }
    data = selectHome(s.tables)
    // Two overdue chores: beanie only, no plant before three chores.
    if (overdue.length === 2) expect(last.unlocked).toEqual([])
    expect(data.progress).toMatchObject({ choreCount: overdue.length, currentStreak: 1, bestStreak: 1 })
    expect(data.progress!.unlockedItems).toEqual(overdue.length >= 3 ? ['item:beanie-red', 'decor:plant'] : ['item:beanie-red'])
  })

  it('the third counted chore brings the plant', () => {
    let s = sample()
    let data = selectHome(s.tables)
    const chores = data.chores
    const unlockedPerStep: string[][] = []
    for (const [i, c] of chores.slice(0, 3).entries()) {
      data = selectHome(s.tables)
      const r = completeChoreWithRewards(c, data.progress, ctx(data.chores, data.completions), at(8 + i))
      unlockedPerStep.push(r.unlocked.map((u) => u.id))
      s = apply(s, r.ops)
    }
    expect(unlockedPerStep).toEqual([['item:beanie-red'], [], ['decor:plant']])
    expect(selectHome(s.tables).progress).toMatchObject({ choreCount: 3, unlockedItems: ['item:beanie-red', 'decor:plant'] })
  })
})

describe('completeChoreWithRewards basics', () => {
  it('a null progress produces only the completion op', () => {
    const c = dailyChore('A', '2026-10-01')
    const result = completeChoreWithRewards(c, null, ctx([c], []), at(9))
    expect(result.unlocked).toEqual([])
    expect(result.ops).toHaveLength(1)
    expect(result.ops[0]).toMatchObject({ table: 'completions', kind: 'upsert' })
  })

  it('records the completion on the local calendar date, even late at night', () => {
    const c = dailyChore('A', '2026-10-01')
    const [late] = upsertOf(completeChoreWithRewards(c, null, ctx([c], []), new Date(2026, 9, 6, 23, 59)).ops, 'completions')
    expect(late.value.completedOn).toBe('2026-10-06')
    const [early] = upsertOf(completeChoreWithRewards(c, null, ctx([c], []), new Date(2026, 9, 7, 0, 1)).ops, 'completions')
    expect(early.value.completedOn).toBe('2026-10-07')
    expect(early.value.choreId).toBe('A')
    expect(early.value.completedAt).toBe(new Date(2026, 9, 7, 0, 1).toISOString())
  })

  it('includes this completion in the streak', () => {
    // Done through 10-04, missed 10-05, completed today: only today counts.
    const c = dailyChore('A', '2026-10-01')
    const result = completeChoreWithRewards(c, progress({ choreCount: 4 }), ctx([c], daysOf('A', '2026-10-01', '2026-10-04')), at(9))
    expect(upsertOf(result.ops, 'progress')[0].value).toMatchObject({ choreCount: 5, currentStreak: 1, bestStreak: 1 })
  })

  it('builds on the existing streak and keeps a higher best streak', () => {
    const c = dailyChore('A', '2026-09-30')
    const p = progress({ choreCount: 20, currentStreak: 6, bestStreak: 9, unlockedItems: UNLOCKS.map((u) => u.id) })
    const result = completeChoreWithRewards(c, p, ctx([c], daysOf('A', '2026-09-30', '2026-10-05')), at(9))
    // The count comes from the completions (six days, plus today), not from the stored 20.
    expect(upsertOf(result.ops, 'progress')[0].value).toMatchObject({ choreCount: 7, currentStreak: 7, bestStreak: 9 })
    expect(result.unlocked).toEqual([])
  })

  it('raises the best streak and hands out all newly earned rewards in UNLOCKS order', () => {
    const c = dailyChore('A', '2026-09-30')
    const p = progress({ choreCount: 4, bestStreak: 3 })
    const result = completeChoreWithRewards(c, p, ctx([c], daysOf('A', '2026-09-30', '2026-10-05')), at(9))
    expect(result.unlocked.map((u) => u.id)).toEqual(['item:beanie-red', 'decor:plant', 'wall:mint', 'item:bow', 'floor:tile', 'wall:lavender'])
    expect(upsertOf(result.ops, 'progress')[0].value).toMatchObject({ choreCount: 7, currentStreak: 7, bestStreak: 7 })
  })

  it('bumps the chore count before unlocking: the chore that reaches a threshold earns it', () => {
    // 39 days done (28 Aug to 5 Oct), so today's is chore 40: the backpack.
    const c = dailyChore('A', '2026-08-28')
    const others = UNLOCKS.filter((u) => u.id !== 'item:backpack').map((u) => u.id)
    const result = completeChoreWithRewards(c, progress({ choreCount: 39, bestStreak: 14, unlockedItems: others }), ctx([c], daysOf('A', '2026-08-28', '2026-10-05')), at(9))
    expect(result.unlocked.map((u) => u.id)).toEqual(['item:backpack'])
    expect(upsertOf(result.ops, 'progress')[0].value.choreCount).toBe(40)

    const notYet = completeChoreWithRewards(c, progress({ choreCount: 38, bestStreak: 14, unlockedItems: others }), ctx([c], []), at(9))
    expect(notYet.unlocked).toEqual([])
  })

  it('respects vacations when working out the streak', () => {
    const c = dailyChore('A', '2026-09-25')
    const v = [{ start: '2026-09-30', end: '2026-10-05' }]
    const result = completeChoreWithRewards(c, progress({ choreCount: 1, unlockedItems: ['item:beanie-red'] }), ctx([c], daysOf('A', '2026-09-25', '2026-09-29'), v), at(9))
    expect(upsertOf(result.ops, 'progress')[0].value).toMatchObject({ currentStreak: 6, bestStreak: 6 })
  })

  it('does not mutate the progress it was given', () => {
    const c = dailyChore('A', '2026-10-01')
    const p = progress({ choreCount: 2 })
    const copy = structuredClone(p)
    completeChoreWithRewards(c, p, ctx([c], []), at(9))
    expect(p).toEqual(copy)
  })
})

describe('completeChoreWithRewards repeats', () => {
  it('neither records nor counts a completion the schedule ignores', () => {
    const chore = dailyChore('dishes', '2026-10-01')
    const first = completeChoreWithRewards(chore, progress(), ctx([chore], []), at(9))
    expect(upsertOf(first.ops, 'progress')[0].value.choreCount).toBe(1)
    const completions = upsertOf(first.ops, 'completions').map((o) => o.value)
    const again = completeChoreWithRewards(chore, progress({ choreCount: 1 }), ctx([chore], completions), at(10))
    expect(again).toEqual({ ops: [], unlocked: [] })
  })
})

describe('progress that chores take with them', () => {
  const homeData = () => {
    let s = apply(emptySnapshot('u1'), sampleHome({ species: 'mochi', userId: 'u1', today: TODAY }))
    let data = selectHome(s.tables)
    for (const [i, c] of data.chores.slice(0, 3).entries()) {
      data = selectHome(s.tables)
      s = apply(s, completeChoreWithRewards(c, data.progress, ctx(data.chores, data.completions), at(8 + i)).ops)
    }
    return s
  }

  it('starts at zero on a sample home and counts only what the visitor does', () => {
    expect(selectHome(homeData().tables).progress!.choreCount).toBe(3)
  })

  it("keeps the count when a chore's schedule changes", () => {
    let s = homeData()
    const data = selectHome(s.tables)
    const done = data.chores.find((c) => data.completions.some((x) => x.choreId === c.id && x.completedOn === TODAY))!
    s = apply(s, updateChore(done, { schedule: { kind: 'monthly', dayOfMonth: 1 } }))
    expect(selectHome(s.tables).progress!.choreCount).toBe(3)
  })

  it('keeps the count when a chore or a whole object is removed', () => {
    let s = homeData()
    let data = selectHome(s.tables)
    const done = data.chores.find((c) => data.completions.some((x) => x.choreId === c.id && x.completedOn === TODAY))!
    s = apply(s, removeChore(done.id, data))
    data = selectHome(s.tables)
    expect(data.progress!.choreCount).toBe(3)
    const object = data.objects.find((o) => data.chores.some((c) => c.objectId === o.id && data.completions.some((x) => x.choreId === c.id && x.counts !== false)))!
    s = apply(s, removeObject(object.id, data))
    expect(selectHome(s.tables).progress!.choreCount).toBe(3)
  })
})
