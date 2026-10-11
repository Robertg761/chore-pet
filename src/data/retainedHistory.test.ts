import { describe, expect, it } from 'vitest'
import type { Chore, Completion } from '../domain/types'
import { currentStreak } from '../domain/unlocks'
import { nextDueDate } from '../domain/schedule'
import { petCondition } from '../domain/health'
import { buildSections } from '../screens/choreListModel'
import { completedPerDay, healthPerDay, weekDays } from '../screens/weekModel'
import { addChoreAgain, clearHome, completeChoreWithRewards, removeChore, removeObject, restoreHome } from './actions'
import { change, emptySnapshot, planFlush, selectHome, upsertOp } from './state'

/** A home's data as App hands it to clearHome. */
const homeOf = (tables: ReturnType<typeof fixture>['tables']) => {
  const h = selectHome(tables)
  return { ...h, home: h.home! }
}
const chore = (id: string, createdOn = '2026-10-01'): Chore => ({ id, homeId: 'h', objectId: 'o', name: id, createdOn, schedule: { kind: 'daily' }, photoProof: false })
function fixture() {
  let s = emptySnapshot('u')
  s = change(s, upsertOp('homes', { id: 'h', ownerId: 'u', name: 'Home', vacations: [] }))
  s = change(s, upsertOp('rooms', { id: 'r', homeId: 'h', type: 'kitchen', floorStyle: 'wood', wallStyle: 'peach' }))
  s = change(s, upsertOp('placed_objects', { id: 'o', roomId: 'r', catalogId: 'sink', tileX: 0, tileY: 0, rotation: 0 }))
  s = change(s, upsertOp('progress', { homeId: 'h', choreCount: 9, currentStreak: 6, bestStreak: 6, unlockedItems: [] }))
  for (const c of [chore('a'), chore('b', '2026-10-04')]) {
    s = change(s, upsertOp('chores', c))
    for (let i = Number(c.createdOn.slice(-2)); i <= 6; i++) {
      const date = `2026-10-0${i}`
      const x: Completion = { id: `${c.id}${i}`, choreId: c.id, completedOn: date, completedAt: `${date}T12:00:00Z` }
      s = change(s, upsertOp('completions', x))
    }
  }
  return s
}

describe('retained chore history', () => {
  it('removing A preserves six earned days, nine weekly completions and earlier health', () => {
    const s = fixture()
    const before = selectHome(s.tables)
    const after = selectHome(removeChore('a', before, '2026-10-06').reduce(change, s).tables)
    expect(after.chores.find(c => c.id === 'a')?.archivedOn).toBe('2026-10-06')
    expect(currentStreak(after.chores, after.completions, '2026-10-06')).toBe(6)
    expect(completedPerDay(after.completions, weekDays('2026-10-06')).reduce((a,b) => a+b)).toBe(9)
    expect(after.progress?.choreCount).toBe(9)
    expect(healthPerDay(after.chores, after.completions, [], weekDays('2026-10-05'))).toEqual(healthPerDay(before.chores, before.completions, [], weekDays('2026-10-05')))
    expect(buildSections(after.chores, after.completions, [], '2026-10-06').flatMap(s => s.rows).map(r => r.chore.id)).toEqual(['b'])
  })

  it('stops neglect on the archive date without repairing neglected earlier days', () => {
    const c = { ...chore('late'), archivedOn: '2026-10-06' }
    expect(petCondition([c], [], '2026-10-05').health).toBeLessThan(100)
    expect(petCondition([c], [], '2026-10-06').statuses).toEqual([])
    expect(completeChoreWithRewards(c, null, { chores: [c], completions: [], vacations: [] }, new Date('2026-10-06T12:00:00Z'), new Date('2026-10-06T12:00:00Z')).ops).toEqual([])
  })

  it('freezes a streak after the final chore is archived, without earning idle days', () => {
    const s = fixture()
    const after = selectHome(removeObject('o', selectHome(s.tables), '2026-10-07').reduce(change, s).tables)
    expect(currentStreak(after.chores, after.completions, '2026-10-20')).toBe(6)
    expect(after.objects).toHaveLength(0)
    expect(after.completions).toHaveLength(9)
    expect(after.chores.every(c => c.objectId === null && c.archivedOn === '2026-10-07')).toBe(true)
  })

  it('keeps detached chores active when keep chores is selected', () => {
    const s = fixture()
    const after = selectHome(removeObject('o', selectHome(s.tables), '2026-10-07', true).reduce(change, s).tables)
    expect(after.chores.every(c => c.objectId === null && !c.archivedOn)).toBe(true)
    expect(after.completions).toHaveLength(9)
    expect(after.objects).toHaveLength(0)
  })

  it('syncs an unsaved archived chore before its completions and restores archived history', () => {
    const s = fixture()
    const after = removeChore('a', selectHome(s.tables), '2026-10-07').reduce(change, s)
    const steps = planFlush(after.outbox)
    expect(steps.find(s => s.table === 'chores')?.ops.some(o => o.kind === 'upsert' && o.key === 'a')).toBe(true)
    expect(steps.find(s => s.table === 'completions')?.ops).toHaveLength(9)
    const restored = selectHome(restoreHome(after, emptySnapshot('u')).reduce(change, emptySnapshot('u')).tables)
    expect(restored.chores.find(c => c.name === 'a')?.archivedOn).toBe('2026-10-07')
    expect(restored.completions).toHaveLength(9)
  })

  it('detaches never-synced tasks before the removed object leaves the queue', () => {
    const s = fixture()
    const after = removeObject('o', selectHome(s.tables), '2026-10-07').reduce(change, s)
    const pending = planFlush(after.outbox).find(s => s.table === 'chores')!.ops
    expect(pending).toHaveLength(2)
    expect(pending.every(o => o.kind === 'upsert' && o.table === 'chores' && o.value.objectId === null && o.value.archivedOn === '2026-10-07')).toBe(true)
    expect(Object.values(after.outbox).filter(o => o.table === 'completions')).toHaveLength(9)
  })

  it('keeps differently configured removals in separate sync batches', () => {
    let s = fixture()
    s = removeObject('o', undefined, '2026-10-07', true).reduce(change, s)
    s = removeObject('another', undefined, '2026-10-06', false).reduce(change, s)
    const batches = planFlush(s.outbox).filter(s => s.table === 'placed_objects')
    expect(batches).toHaveLength(2)
    expect(batches.map(s => s.ops[0].key)).toEqual(['o', 'another'])
  })

  it('resumes judging on a new chore and keeps stored best and earned rewards', () => {
    let s = fixture()
    s = change(s, upsertOp('progress', { ...selectHome(s.tables).progress!, bestStreak: 6, unlockedItems: ['wall:mint'] }))
    s = removeObject('o', selectHome(s.tables), '2026-10-07').reduce(change, s)
    s = change(s, upsertOp('chores', { ...chore('new', '2026-10-10'), objectId: null }))
    let data = selectHome(s.tables)
    expect(currentStreak(data.chores, data.completions, '2026-10-10')).toBe(6)
    s = change(s, upsertOp('completions', { id: 'new-done', choreId: 'new', completedOn: '2026-10-10', completedAt: '2026-10-10T12:00:00Z' }))
    data = selectHome(s.tables)
    expect(currentStreak(data.chores, data.completions, '2026-10-10')).toBe(7)
    expect(data.progress?.bestStreak).toBe(6)
    expect(data.progress?.unlockedItems).toContain('wall:mint')
  })

  it('retains the schedule that judged earlier days after both editing and archiving', () => {
    const c: Chore = { ...chore('late'), schedule: { kind: 'weekly', weekday: 3, since: '2026-10-06', before: { kind: 'daily' } } }
    const archived = { ...c, archivedOn: '2026-10-07' }
    const days = weekDays('2026-10-06')
    expect(healthPerDay([archived], [], [], days)).toEqual(healthPerDay([c], [], [], days))
    expect(currentStreak([archived], [], '2026-10-06')).toBe(currentStreak([c], [], '2026-10-06'))
  })

  it('does not double legacy retired counts for retained history', () => {
    let s = fixture()
    const data = selectHome(s.tables)
    s = change(s, upsertOp('progress', { ...data.progress!, retired: { a: 6, deletedBeforeMigration: 2 } }))
    const after = selectHome(removeChore('a', selectHome(s.tables), '2026-10-07').reduce(change, s).tables)
    expect(after.progress?.choreCount).toBe(11)
  })
})

describe('clearing the home', () => {
  it('removes furniture and retires every chore, keeping the pet, past work and rewards', () => {
    let s = fixture()
    s = change(s, upsertOp('pets', { id: 'p', homeId: 'h', species: 'mochi', name: 'Mochi', bodyColour: '#F7B5C6', equipped: { hat: 'beanie' } } as never))
    s = change(s, upsertOp('chores', { ...chore('loose', '2026-10-07'), objectId: null }))
    // Removed on a device with its clock set ahead, so it was still on the list until the 20th.
    s = change(s, upsertOp('chores', { ...chore('ahead', '2026-10-07'), objectId: null, archivedOn: '2026-10-20' }))
    const before = selectHome(s.tables)
    const ops = clearHome(homeOf(s.tables), '2026-10-07', new Date('2026-10-07T18:00:00Z'))
    // Last, one clear for the server, for anything another device added that this one hasn't pulled.
    expect(ops.at(-1)).toMatchObject({ table: 'homes', kind: 'delete', key: 'clear:h', removal: { archivedOn: '2026-10-07', clearBefore: '2026-10-07T18:00:00.000Z' } })
    const next = ops.reduce(change, s)
    expect(next.tables.homes).toEqual(s.tables.homes)
    expect(next.outbox['homes:clear:h']).toBeDefined()
    const after = selectHome(next.tables)
    expect(after.objects).toEqual([])
    expect(after.chores.map((c) => [c.id, c.archivedOn]).sort()).toEqual([['a', '2026-10-07'], ['ahead', '2026-10-07'], ['b', '2026-10-07'], ['loose', '2026-10-07']])
    expect(buildSections(after.chores, after.completions, [], '2026-10-07')).toEqual([])
    expect(after.completions).toHaveLength(before.completions.length)
    expect(after.progress).toEqual(before.progress)
    expect(after.pet).toEqual(before.pet)
    expect(after.rooms).toEqual(before.rooms)
    expect(currentStreak(after.chores, after.completions, '2026-10-06')).toBe(6)
  })
})

describe('removing a chore dated ahead of today', () => {
  // A device clock set ahead can date a chore after today; the server refuses an end before the start.
  const ahead = { ...chore('ahead', '2026-10-09'), objectId: null }
  it('ends it on its start date, not before', () => {
    const s = change(fixture(), upsertOp('chores', ahead))
    const after = selectHome(removeChore('ahead', selectHome(s.tables), '2026-10-07').reduce(change, s).tables)
    expect(after.chores.find((c) => c.id === 'ahead')?.archivedOn).toBe('2026-10-09')
  })
  it('settles on the earliest end: a later removal or a stale open copy never moves it', () => {
    let s = change(fixture(), upsertOp('chores', { ...ahead, createdOn: '2026-10-02', archivedOn: '2026-10-20' }))
    const end = () => s.tables.chores.ahead.archivedOn
    s = change(s, upsertOp('chores', { ...ahead, createdOn: '2026-10-02', archivedOn: '2026-10-25' }))
    s = change(s, upsertOp('chores', { ...ahead, createdOn: '2026-10-02' }))
    expect(end()).toBe('2026-10-20')
    s = removeChore('ahead', selectHome(s.tables), '2026-10-07').reduce(change, s)
    expect(end()).toBe('2026-10-07')
  })
  it('does the same when its furniture goes', () => {
    const s = change(fixture(), upsertOp('chores', { ...ahead, objectId: 'o' }))
    const after = selectHome(removeObject('o', selectHome(s.tables), '2026-10-07').reduce(change, s).tables)
    expect(after.chores.find((c) => c.id === 'ahead')?.archivedOn).toBe('2026-10-09')
    expect(after.chores.find((c) => c.id === 'a')?.archivedOn).toBe('2026-10-07')
  })
})

describe('adding a removed chore back', () => {
  const home = { id: 'h', ownerId: 'u', name: 'Home', vacations: [] }
  const input = { name: 'a', schedule: { kind: 'daily' as const }, objectId: null }
  const added = (ops: ReturnType<typeof addChoreAgain>) => (ops[0] as { value: Chore }).value

  it('resumes a round done today: on the list but all set, so it can’t be done twice', () => {
    let s = fixture()
    s = clearHome(homeOf(s.tables), '2026-10-06').reduce(change, s)
    const before = selectHome(s.tables)
    const ops = addChoreAgain(home, before.chores.find((c) => c.id === 'a')!, input, before.completions, '2026-10-06')
    expect(ops.map((o) => o.table)).toEqual(['chores'])
    const back = added(ops)
    expect(back).toMatchObject({ createdOn: '2026-10-06', schedule: { kind: 'daily', resume: { due: '2026-10-07', last: '2026-10-06' } } })
    const after = selectHome(ops.reduce(change, s).tables)
    expect(buildSections(after.chores, after.completions, [], '2026-10-06').flatMap((x) => x.rows).map((r) => [r.chore.id, r.allSet])).toEqual([[back.id, true]])
    const tick = completeChoreWithRewards(back, after.progress, { chores: after.chores, completions: after.completions, vacations: [] }, new Date(2026, 9, 6, 18), new Date(2026, 9, 6, 18))
    expect(tick.completion).toBeFalsy()
    expect(nextDueDate(back, [])).toBe('2026-10-07')
  })

  it('starts a fresh round when the old one was due again, or never done', () => {
    let s = fixture()
    s = removeChore('a', selectHome(s.tables), '2026-10-08').reduce(change, s)
    const before = selectHome(s.tables)
    expect(added(addChoreAgain(home, before.chores.find((c) => c.id === 'a')!, input, before.completions, '2026-10-08')).schedule).toEqual({ kind: 'daily' })
    expect(added(addChoreAgain(home, { ...chore('n'), archivedOn: '2026-10-08' }, input, [], '2026-10-08')).schedule).toEqual({ kind: 'daily' })
  })

  it('a weekly chore done early and added back on its due date keeps the streak it would have had', () => {
    // Weekly on Mondays; done early on Sat 3 Oct, which covers Mon 5 Oct. Removed and added back on Mon 5 Oct.
    const weekly: Chore = { ...chore('w', '2026-09-28'), objectId: null, schedule: { kind: 'weekly', weekday: 1 } }
    const done: Completion[] = [
      { id: 'w1', choreId: 'w', completedOn: '2026-09-28', completedAt: '2026-09-28T12:00:00Z' },
      { id: 'w2', choreId: 'w', completedOn: '2026-10-03', completedAt: '2026-10-03T12:00:00Z' },
    ]
    const gone = { ...weekly, archivedOn: '2026-10-05' }
    const back = added(addChoreAgain(home, gone, { ...input, schedule: weekly.schedule }, done, '2026-10-05'))
    expect(back.createdOn).toBe('2026-10-05')
    expect(nextDueDate(back, [])).toBe('2026-10-12')
    // Mon 5 Oct and after are judged exactly as if it had never been removed.
    for (const day of ['2026-10-06', '2026-10-13']) {
      expect(currentStreak([gone, back], done, day)).toBe(currentStreak([weekly], done, day))
    }
  })

  it('an every-N-days chore stays due on the day its round ends, even added back late in it', () => {
    // Every 4 days, done on the 6th: next due the 10th. Added back on the 7th, or on the 9th.
    const every4: Chore = { ...chore('e'), objectId: null, schedule: { kind: 'everyNDays', n: 4 } }
    const done = [{ id: 'x', choreId: 'e', completedOn: '2026-10-06', completedAt: '2026-10-06T12:00:00Z' }]
    for (const today of ['2026-10-07', '2026-10-09']) {
      const back = added(addChoreAgain(home, { ...every4, archivedOn: today }, { ...input, schedule: every4.schedule }, done, today))
      expect(back.createdOn).toBe(today)
      expect(nextDueDate(back, [])).toBe('2026-10-10')
    }
  })
})
