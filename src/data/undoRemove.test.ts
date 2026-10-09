import { describe, expect, it } from 'vitest'
import { addDays } from '../domain/dates'
import { choreStatus, standingOf } from '../domain/schedule'
import type { Chore, Completion, Home, Schedule, VacationWindow } from '../domain/types'
import { againInput } from '../screens/manageModel'
import { addChoreAgain, removeChore, undoRemove } from './actions'

const home = (vacations: VacationWindow[] = []): Home => ({ id: 'h', ownerId: 'u', name: 'Home', vacations })
const make = (schedule: Schedule, createdOn: string, extra: Partial<Chore> = {}): Chore => ({ id: 'old', homeId: 'h', objectId: null, name: 'Trash', schedule, createdOn, photoProof: false, ...extra })
const done = (...days: string[]): Completion[] => days.map((d, i) => ({ id: `x${i}`, choreId: 'old', completedOn: d, completedAt: `${d}T12:00:00Z` }))

/** Remove the chore on `today`, then Undo; returns the chore that comes back and the ops that made it. */
function removeThenUndo(chore: Chore, completions: Completion[], today: string, vacations: VacationWindow[] = []) {
  const removed = (removeChore(chore.id, { chores: [chore] } as never, today)[0] as { value: Chore }).value
  expect(removed.archivedOn).toBe(today)
  const ops = undoRemove(home(vacations), chore, againInput(chore, []), completions, today)
  return { ops, back: (ops[0] as { value: Chore }).value }
}

/** A chore's status on `day`, whichever chore it is. */
const standing = (chore: Chore, completions: Completion[], day: string, vacations: VacationWindow[] = []) => {
  const { choreId: _id, ...rest } = choreStatus(chore, completions, day, vacations)
  return rest
}

function expectSame(chore: Chore, completions: Completion[], today: string, vacations: VacationWindow[] = []) {
  const { back, ops } = removeThenUndo(chore, completions, today, vacations)
  // A new chore (the old one stays archived), starting today, with no completion copied.
  expect(back.id).not.toBe(chore.id)
  expect(back.createdOn).toBe(today)
  expect(ops.map((o) => o.table)).toEqual(['chores'])
  // Same standing today and on every day after, as if nothing had happened.
  for (let i = 0; i < 12; i++) {
    const day = addDays(today, i)
    expect(standing(back, [], day, vacations), day).toEqual(standing(chore, completions, day, vacations))
  }
  return { back, before: standing(chore, completions, today, vacations) }
}

describe('Undo after removing a chore', () => {
  it('a chore 3 days late is still 3 days late', () => {
    // Daily, last done on the 2nd: due the 3rd, so on the 6th it is 3 days late.
    const { before } = expectSame(make({ kind: 'daily' }, '2026-09-20'), done('2026-10-02'), '2026-10-06')
    expect(before).toMatchObject({ state: 'overdue', overdueDays: 3, dueDate: '2026-10-03' })
  })

  it('a chore due today stays due today', () => {
    const { before } = expectSame(make({ kind: 'daily' }, '2026-09-20'), done('2026-10-05'), '2026-10-06')
    expect(before).toMatchObject({ state: 'due', overdueDays: 0, dueDate: '2026-10-06' })
  })

  it('an upcoming chore keeps its due date', () => {
    // Weekly on Mondays, done on the 5th: next due the 12th.
    const { before } = expectSame(make({ kind: 'weekly', weekday: 1 }, '2026-09-21'), done('2026-10-05'), '2026-10-06')
    expect(before).toMatchObject({ state: 'upcoming', dueDate: '2026-10-12' })
  })

  it('a late weekly chore never done is as late as it was', () => {
    const { before } = expectSame(make({ kind: 'weekly', weekday: 1 }, '2026-09-21'), [], '2026-10-06')
    expect(before.state).toBe('overdue')
  })

  it('keeps the grace of a chore made today, and of one that has none', () => {
    // Created the day it is first due, nothing done: gets a day's grace, then is late.
    expectSame(make({ kind: 'daily' }, '2026-10-06'), [], '2026-10-06')
    // Every 4 days created 2 days ago: due today with no grace, so tomorrow it is 1 day late.
    const { before } = expectSame(make({ kind: 'everyNDays', n: 4 }, '2026-10-04'), [], '2026-10-06')
    expect(before).toMatchObject({ state: 'due', dueDate: '2026-10-06' })
  })

  it('carries where an every-N-days round stood, so an early completion counts as it would have', () => {
    // Every 4 days done on the 6th: due the 10th.
    const chore = make({ kind: 'everyNDays', n: 4 }, '2026-09-20')
    const { back } = removeThenUndo(chore, done('2026-10-06'), '2026-10-07')
    expect(standingOf(back, [])).toMatchObject({ due: '2026-10-10', last: '2026-10-06' })
  })

  it('counts days off for the vacation as before', () => {
    const vacations = [{ start: '2026-10-04', end: '2026-10-05' }]
    expectSame(make({ kind: 'daily' }, '2026-09-20'), done('2026-10-01'), '2026-10-08', vacations)
  })

  it('keeps a skipped round settled, and carries no skips along', () => {
    const chore = make({ kind: 'daily', skips: ['2026-10-06'] }, '2026-09-20')
    const { back } = expectSame(chore, done('2026-10-02'), '2026-10-06')
    expect(back.schedule.skips).toBeUndefined()
  })

  it('keeps a changed schedule from before the change', () => {
    // Weekly since the 3rd (it was daily); nothing owed before that.
    const chore = make({ kind: 'weekly', weekday: 1, since: '2026-10-03', before: { kind: 'daily' } }, '2026-09-20')
    expectSame(chore, done('2026-10-01'), '2026-10-06')
  })

  it('works again on a chore that was itself undone', () => {
    const first = removeThenUndo(make({ kind: 'daily' }, '2026-09-20'), done('2026-10-02'), '2026-10-06').back
    const second = removeThenUndo(first, [], '2026-10-07').back
    expect(standing(second, [], '2026-10-07')).toEqual(standing(first, [], '2026-10-07'))
    expect(standing(second, [], '2026-10-07')).toMatchObject({ state: 'overdue', overdueDays: 4 })
  })

  it('a completion on the undone chore moves it on like the old one', () => {
    const chore = make({ kind: 'daily' }, '2026-09-20')
    const { back } = removeThenUndo(chore, done('2026-10-02'), '2026-10-06')
    const doneAfter = [{ id: 'n', choreId: back.id, completedOn: '2026-10-06', completedAt: '2026-10-06T12:00:00Z' }]
    const oldDoneAfter = [...done('2026-10-02'), { id: 'n', choreId: 'old', completedOn: '2026-10-06', completedAt: '2026-10-06T12:00:00Z' }]
    for (const day of ['2026-10-06', '2026-10-07', '2026-10-09']) {
      expect(standing(back, doneAfter, day)).toEqual(standing(chore, oldDoneAfter, day))
    }
  })

  it('the Removed list still adds a late chore back fresh and kind', () => {
    const chore = make({ kind: 'daily' }, '2026-09-20')
    const [op] = addChoreAgain(home(), { ...chore, archivedOn: '2026-10-06' }, againInput(chore, []), done('2026-10-02'), '2026-10-06')
    const back = (op as { value: Chore }).value
    expect(back.schedule).toEqual({ kind: 'daily' })
    expect(choreStatus(back, [], '2026-10-06').state).toBe('due')
  })
})
