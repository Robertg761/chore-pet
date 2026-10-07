import { describe, expect, it } from 'vitest'
import { sampleHome } from '../content/sampleHome'
import type { Chore, Completion, Progress } from '../domain/types'
import { currentStreak } from '../domain/unlocks'
import { adoptSample, completeChoreWithRewards, reconcileProgress, uncompleteChore, updateChore } from './actions'
import { change, emptySnapshot, mergeSnapshots, selectHome, upsertOp, type Snapshot } from './state'

const TODAY = '2026-10-07'
const weekly: Chore = { id: 'w', homeId: 'h', objectId: null, name: 'Weekly', schedule: { kind: 'weekly', weekday: 1 }, createdOn: '2026-09-28', photoProof: false }
const done = (choreId: string, on: string): Completion => ({ id: `${choreId}-${on}`, choreId, completedOn: on, completedAt: `${on}T12:00:00Z` })
const initial: Progress = { homeId: 'h', choreCount: 1, currentStreak: 1, bestStreak: 1, unlockedItems: ['item:beanie-red'] }
const context = { chores: [weekly], completions: [done('w', '2026-09-28')], vacations: [] }
const snapshot = (progress = initial): Snapshot => [
  upsertOp('homes', { id: 'h', ownerId: 'u', name: 'Home', vacations: [] }),
  upsertOp('chores', weekly), upsertOp('completions', context.completions[0]), upsertOp('progress', progress),
].reduce(change, emptySnapshot('u'))

function reconcile(s: Snapshot, today = TODAY) {
  const data = selectHome(s.tables)
  const result = reconcileProgress(s.tables.progress.h, { ...data, vacations: data.home!.vacations }, today, TODAY)
  return { result, snapshot: result.ops.reduce(change, s) }
}

describe('progress reconciliation', () => {
  it('awards no-due-day milestones without another completion', () => {
    const { result, snapshot: s } = reconcile(snapshot(), '2026-09-29')
    expect(result.unlocked.map(u => u.id)).toEqual(['wall:mint'])
    expect(s.tables.progress.h).toMatchObject({ choreCount: 1, currentStreak: 2, bestStreak: 2 })
    expect(reconcile(s, '2026-09-29').result).toEqual({ ops: [], unlocked: [] })
  })

  it('recovers the seven-day best and its milestones when reopening after a break', () => {
    expect(currentStreak(context.chores, context.completions, TODAY)).toBe(0)
    const { snapshot: s } = reconcile(snapshot())
    expect(s.tables.progress.h).toMatchObject({ choreCount: 1, currentStreak: 0, bestStreak: 7 })
    expect(s.tables.progress.h.unlockedItems).toEqual(['item:beanie-red', 'wall:mint', 'floor:tile', 'wall:lavender'])
    expect(reconcile(s).result).toEqual({ ops: [], unlocked: [] })
  })

  it('awards a combined completion threshold after merging two offline devices', () => {
    const base = snapshot()
    const a: Chore = { ...weekly, id: 'a', createdOn: TODAY, schedule: { kind: 'daily' } }
    const b: Chore = { ...a, id: 'b' }
    const left = [upsertOp('chores', a), upsertOp('completions', done('a', TODAY))].reduce(change, base)
    const right = [upsertOp('chores', b), upsertOp('completions', done('b', TODAY))].reduce(change, base)
    const merged = mergeSnapshots(left, base, right, 'mine')
    const { result, snapshot: s } = reconcile(merged)
    expect(s.tables.progress.h.choreCount).toBe(3)
    expect(result.unlocked.map(u => u.id)).toContain('decor:teddy')
    expect(reconcile(s).result.ops).toEqual([])
  })

  it('does not repeatedly repair a server chore-count cache kept higher after undo', () => {
    const { snapshot: s } = reconcile(snapshot({ ...initial, choreCount: 30 }))
    // SQL merges cached counts with GREATEST; actual count still comes from completions.
    const cached = change(s, upsertOp('progress', { ...s.tables.progress.h, choreCount: 30 }))
    expect(reconcile(cached).result).toEqual({ ops: [], unlocked: [] })
    expect(cached.tables.progress.h.unlockedItems).not.toContain('decor:teddy')
  })

  it('replays vacation pauses when recovering the best', () => {
    const away = { ...context, vacations: [{ start: '2026-09-29', end: '2026-10-02' }] }
    const result = reconcileProgress(initial, away, TODAY, TODAY)
    const p = result.ops.reduce(change, snapshot()).tables.progress.h
    expect(p).toMatchObject({ currentStreak: 0, bestStreak: 3 })
    expect(p.unlockedItems).toEqual(['item:beanie-red', 'wall:mint'])
  })

  it('uses schedule history to recover the best before an edit', () => {
    const s = updateChore(weekly, { schedule: { kind: 'daily' } }, '2026-10-05').reduce(change, snapshot())
    const { snapshot: fixed } = reconcile(s)
    expect(fixed.tables.progress.h).toMatchObject({ currentStreak: 0, bestStreak: 7 })
  })

  it('does not award sample work, including after adopting the sample', () => {
    const s = sampleHome({ userId: 'u', species: 'mochi', today: TODAY }).reduce(change, emptySnapshot('u'))
    const data = selectHome(s.tables)
    const result = reconcileProgress(data.progress, { ...data, vacations: [] }, TODAY, TODAY)
    expect(result).toEqual({ ops: [], unlocked: [] })
    const adopted = selectHome(adoptSample(data.home!).reduce(change, s).tables)
    expect(reconcileProgress(adopted.progress, { ...adopted, vacations: [] }, TODAY, TODAY)).toEqual({ ops: [], unlocked: [] })
  })

  it('ignores future completions and caps passive rewards at the real day', () => {
    const future = { ...context, completions: [...context.completions, done('w', '2026-10-05')] }
    const result = reconcileProgress(initial, future, TODAY, '2026-09-29')
    const p = result.ops.reduce(change, snapshot()).tables.progress.h
    expect(p).toMatchObject({ choreCount: 1, currentStreak: 2, bestStreak: 2 })
    expect(p.unlockedItems).toEqual(['item:beanie-red', 'wall:mint'])
  })

  it('keeps already earned best and rewards after an undo', () => {
    const { snapshot: s } = reconcile(snapshot())
    const undone = uncompleteChore(context.completions[0].id, s.tables.progress.h, context.completions).reduce(change, s)
    const { snapshot: fixed } = reconcile(undone)
    expect(fixed.tables.progress.h.bestStreak).toBe(7)
    expect(fixed.tables.progress.h.unlockedItems).toContain('wall:lavender')
  })

  it('keeps retained rows from double counting legacy banked completions', () => {
    const result = reconcileProgress({ ...initial, retired: { w: 10, deleted: 1 } }, context, TODAY, TODAY)
    const p = result.ops.reduce(change, snapshot()).tables.progress.h
    expect(p.choreCount).toBe(2)
    expect(p.unlockedItems).not.toContain('decor:teddy')
  })

  it('recovers missed milestones on the completion path too', () => {
    const now = new Date(2026, 9, 7, 12)
    const result = completeChoreWithRewards(weekly, initial, context, now, now)
    const p = result.ops.reduce(change, snapshot()).tables.progress.h
    expect(p).toMatchObject({ currentStreak: 1, bestStreak: 7, choreCount: 2 })
    expect(result.unlocked.map(u => u.id)).toContain('wall:lavender')
  })
})
