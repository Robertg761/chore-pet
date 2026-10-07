import { describe, expect, it } from 'vitest'
import type { Chore, Completion } from '../domain/types'
import { currentStreak } from '../domain/unlocks'
import { petCondition } from '../domain/health'
import { buildSections } from '../screens/choreListModel'
import { completedPerDay, healthPerDay, weekDays } from '../screens/weekModel'
import { completeChoreWithRewards, removeChore, removeObject, restoreHome } from './actions'
import { change, emptySnapshot, planFlush, selectHome, upsertOp } from './state'

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
