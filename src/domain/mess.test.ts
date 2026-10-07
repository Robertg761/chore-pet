import { describe, expect, it } from 'vitest'
import { messStageFor, messiestObject, objectMessStages, objectNeglect } from './mess'
import type { NeglectLevel } from './neglect'
import { choreStatus, type ChoreStatus } from './schedule'
import type { Chore, Completion, VacationWindow } from './types'

const chore = (id: string, objectId: string | null, extra: Partial<Chore> = {}): Chore => ({
  id,
  homeId: 'h',
  objectId,
  name: id,
  schedule: { kind: 'daily' },
  createdOn: '2026-10-01',
  photoProof: false,
  ...extra,
})
const statuses = (chores: Chore[], completions: Completion[], today: string, vacations: VacationWindow[] = []) =>
  chores.map((c) => choreStatus(c, completions, today, vacations))
const done = (choreId: string, on: string): Completion => ({ id: `${choreId}-${on}`, choreId, completedAt: '', completedOn: on })
/** A status literal at a given neglect level, for tests that don't need the schedule. */
const st = (choreId: string, neglect: NeglectLevel, overdueDays: number = neglect): ChoreStatus => ({
  choreId,
  dueDate: '2026-10-01',
  state: neglect > 0 ? 'overdue' : 'upcoming',
  overdueDays,
  neglect,
})

describe('mess stages', () => {
  it('maps neglect level to a stage: levels 2 and 3 share the very messy art', () => {
    expect(messStageFor(0)).toBe('clean')
    expect(messStageFor(1)).toBe('messy1')
    expect(messStageFor(2)).toBe('messy2')
    expect(messStageFor(3)).toBe('messy2')
  })

  it('is clean when due today, a little messy a day late, very messy from two days late (daily)', () => {
    const c = [chore('dishes', 'sink')]
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-05')], '2026-10-06'))).toEqual({})
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-04')], '2026-10-06'))).toEqual({ sink: 'messy1' })
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-03')], '2026-10-06'))).toEqual({ sink: 'messy2' }) // 2 days late
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-02')], '2026-10-06'))).toEqual({ sink: 'messy2' }) // 3 days late
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-01')], '2026-10-06'))).toEqual({ sink: 'messy2' }) // 4 days late
  })

  it('scales to the chore: a monthly chore stays a little messy for much longer', () => {
    const c = [chore('oven', 'stove', { schedule: { kind: 'monthly', dayOfMonth: 1 } })] // due 10-01
    expect(objectMessStages(c, statuses(c, [], '2026-10-02'))).toEqual({ stove: 'messy1' })
    expect(objectMessStages(c, statuses(c, [], '2026-10-06'))).toEqual({ stove: 'messy1' }) // 5 days late
    expect(objectMessStages(c, statuses(c, [], '2026-10-08'))).toEqual({ stove: 'messy2' }) // 7 days late
  })

  it("follows an object's worst chore and ignores chores not tied to an object", () => {
    const c = [
      chore('wipe', 'stove', { schedule: { kind: 'everyNDays', n: 3 } }),
      chore('oven', 'stove', { schedule: { kind: 'monthly', dayOfMonth: 1 } }),
      chore('walk', null),
    ]
    // wipe: done 10-01, due 10-04, 2 days late (level 2). oven: 5 days late (level 1). walk: 5 days late, no object.
    const s = statuses(c, [done('wipe', '2026-10-01')], '2026-10-06')
    expect(s.map((x) => x.neglect)).toEqual([2, 1, 3])
    expect(objectMessStages(c, s)).toEqual({ stove: 'messy2' })
  })

  it('cleans up as soon as the chore is done', () => {
    const c = [chore('dishes', 'sink')]
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-06')], '2026-10-06'))).toEqual({})
  })

  it("doesn't get messier during a vacation", () => {
    const c = [chore('dishes', 'sink')]
    const v = [{ start: '2026-10-02', end: '2026-10-10' }]
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-01')], '2026-10-09', v))).toEqual({})
  })

  it('a vacation freezes the stage rather than clearing it', () => {
    const c = [chore('dishes', 'sink', { createdOn: '2026-10-05' })] // due 10-05
    const v = [{ start: '2026-10-07', end: '2026-10-20' }]
    expect(objectMessStages(c, statuses(c, [], '2026-10-06', v))).toEqual({ sink: 'messy1' })
    expect(objectMessStages(c, statuses(c, [], '2026-10-15', v))).toEqual({ sink: 'messy1' })
    expect(objectMessStages(c, statuses(c, [], '2026-10-21', v))).toEqual({ sink: 'messy2' })
  })

  it('is empty with no chores or no statuses', () => {
    expect(objectMessStages([], [])).toEqual({})
    expect(objectMessStages([chore('a', 'sink')], [])).toEqual({})
  })
})

describe('objectNeglect', () => {
  it('gives the level of an object with one late chore', () => {
    expect(objectNeglect([chore('a', 'sink')], [st('a', 2)])).toEqual({ sink: 2 })
  })

  it("takes the max across an object's chores, whatever order they come in", () => {
    const c = [chore('a', 'sink'), chore('b', 'sink'), chore('c', 'sink')]
    expect(objectNeglect(c, [st('a', 1), st('b', 3), st('c', 2)])).toEqual({ sink: 3 })
    expect(objectNeglect(c, [st('a', 3), st('b', 1), st('c', 2)])).toEqual({ sink: 3 })
    expect(objectNeglect(c, [st('a', 1), st('b', 2), st('c', 0)])).toEqual({ sink: 2 })
  })

  it('keeps each object separate', () => {
    const c = [chore('a', 'sink'), chore('b', 'bed'), chore('c', 'sink')]
    expect(objectNeglect(c, [st('a', 1), st('b', 3), st('c', 2)])).toEqual({ sink: 2, bed: 3 })
  })

  it('leaves out objects with nothing late', () => {
    const c = [chore('a', 'sink'), chore('b', 'bed')]
    const result = objectNeglect(c, [st('a', 0), st('b', 1)])
    expect(result).toEqual({ bed: 1 })
    expect('sink' in result).toBe(false)
  })

  it('leaves out chores with no object, and statuses with no matching chore', () => {
    const c = [chore('walk', null), chore('a', 'sink')]
    expect(objectNeglect(c, [st('walk', 3), st('ghost', 3), st('a', 1)])).toEqual({ sink: 1 })
    expect(objectNeglect(c, [st('walk', 3), st('ghost', 3)])).toEqual({})
  })

  it('is empty with nothing at all', () => {
    expect(objectNeglect([], [])).toEqual({})
  })

  it('works from real statuses: a late daily beats a barely late monthly on the same object', () => {
    const c = [
      chore('dishes', 'sink'),
      chore('descale', 'sink', { schedule: { kind: 'monthly', dayOfMonth: 1 } }),
    ]
    const s = statuses(c, [done('dishes', '2026-10-01')], '2026-10-06') // dishes 4 days late, descale 5 days late
    expect(s.map((x) => x.neglect)).toEqual([3, 1])
    expect(objectNeglect(c, s)).toEqual({ sink: 3 })
  })

  it('objectMessStages is the stage of each level', () => {
    const c = [chore('a', 'o1'), chore('b', 'o2'), chore('c', 'o3'), chore('d', 'o4')]
    expect(objectMessStages(c, [st('a', 1), st('b', 2), st('c', 3), st('d', 0)])).toEqual({ o1: 'messy1', o2: 'messy2', o3: 'messy2' })
  })
})

describe('messiestObject', () => {
  it('finds the messiest object for the pet to mention', () => {
    const c = [chore('dishes', 'sink'), chore('bed', 'bed-1', { schedule: { kind: 'everyNDays', n: 2 } }), chore('walk', null)]
    const s = statuses(c, [done('dishes', '2026-10-02'), done('bed', '2026-10-03')], '2026-10-06')
    expect(messiestObject(c, s)).toMatchObject({ objectId: 'sink', overdueDays: 3 })
    expect(messiestObject(c, statuses(c, [done('dishes', '2026-10-06'), done('bed', '2026-10-06')], '2026-10-06'))).toBeNull()
  })

  it('returns the object, its chore and its overdue days, and nothing else', () => {
    const c = [chore('a', 'sink')]
    const result = messiestObject(c, [st('a', 2, 3)])
    expect(result).toEqual({ objectId: 'sink', chore: c[0], overdueDays: 3 })
  })

  it('is null with nothing late, nothing tied to an object, or nothing at all', () => {
    expect(messiestObject([], [])).toBeNull()
    expect(messiestObject([chore('a', 'sink')], [st('a', 0)])).toBeNull()
    expect(messiestObject([chore('walk', null)], [st('walk', 3, 9)])).toBeNull()
    expect(messiestObject([chore('a', 'sink')], [st('ghost', 3)])).toBeNull()
  })

  it('picks by neglect level before overdue days', () => {
    // A monthly chore 6 days late is only level 1; a daily chore 2 days late is level 2.
    const c = [chore('oven', 'stove', { schedule: { kind: 'monthly', dayOfMonth: 31 }, createdOn: '2026-09-01' }), chore('dishes', 'sink', { createdOn: '2026-10-04' })]
    const s = statuses(c, [], '2026-10-06')
    expect(s.map((x) => [x.overdueDays, x.neglect])).toEqual([[6, 1], [2, 2]])
    expect(messiestObject(c, s)).toMatchObject({ objectId: 'sink', overdueDays: 2 })
  })

  it('breaks a tie on level by more overdue days, wherever it is in the list', () => {
    const c = [chore('a', 'one'), chore('b', 'two'), chore('c', 'three')]
    expect(messiestObject(c, [st('a', 3, 5), st('b', 3, 9), st('c', 3, 7)])?.objectId).toBe('two')
    expect(messiestObject(c, [st('a', 3, 9), st('b', 3, 5), st('c', 3, 7)])?.objectId).toBe('one')
  })

  it('keeps the first when level and overdue days both tie', () => {
    const c = [chore('a', 'one'), chore('b', 'two')]
    expect(messiestObject(c, [st('a', 2, 3), st('b', 2, 3)])?.objectId).toBe('one')
  })

  it('skips the worst chore if it has no object, and takes the worst one that has', () => {
    const c = [chore('walk', null), chore('a', 'sink'), chore('b', 'bed')]
    expect(messiestObject(c, [st('walk', 3, 20), st('a', 1), st('b', 2)])?.objectId).toBe('bed')
  })
})
