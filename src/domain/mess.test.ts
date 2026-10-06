import { describe, expect, it } from 'vitest'
import { messStageFor, messiestObject, objectMessStages } from './mess'
import { choreStatus } from './schedule'
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

describe('mess stages', () => {
  it('maps lateness to a stage', () => {
    expect(messStageFor(0)).toBe('clean')
    expect(messStageFor(1)).toBe('messy1')
    expect(messStageFor(2)).toBe('messy1')
    expect(messStageFor(3)).toBe('messy2')
    expect(messStageFor(30)).toBe('messy2')
  })

  it('is clean when due today, a little messy a day late, very messy three days late', () => {
    const c = [chore('dishes', 'sink')]
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-05')], '2026-10-06'))).toEqual({})
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-04')], '2026-10-06'))).toEqual({ sink: 'messy1' })
    expect(objectMessStages(c, statuses(c, [done('dishes', '2026-10-02')], '2026-10-06'))).toEqual({ sink: 'messy2' })
  })

  it("follows an object's worst chore and ignores chores not tied to an object", () => {
    const c = [
      chore('wipe', 'stove', { schedule: { kind: 'everyNDays', n: 3 } }),
      chore('oven', 'stove', { schedule: { kind: 'monthly', dayOfMonth: 1 } }),
      chore('walk', null),
    ]
    const s = statuses(c, [done('wipe', '2026-10-05')], '2026-10-06')
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

  it('finds the messiest object for the pet to mention', () => {
    const c = [chore('dishes', 'sink'), chore('bed', 'bed-1', { schedule: { kind: 'everyNDays', n: 2 } }), chore('walk', null)]
    const s = statuses(c, [done('dishes', '2026-10-02'), done('bed', '2026-10-03')], '2026-10-06')
    expect(messiestObject(c, s)).toMatchObject({ objectId: 'sink', overdueDays: 3 })
    expect(messiestObject(c, statuses(c, [done('dishes', '2026-10-06'), done('bed', '2026-10-06')], '2026-10-06'))).toBeNull()
  })
})
