import { describe, expect, it } from 'vitest'
import type { Chore, Completion, Progress } from '../domain/types'
import { streakHistory } from '../domain/unlocks'
import { completeChoreWithRewards, reconcileProgress, removeChore, updateChore } from './actions'
import { change, emptySnapshot, selectHome, upsertOp, type Snapshot } from './state'

const daily: Chore = { id: 'old', homeId: 'h', objectId: null, name: 'Dishes', createdOn: '2026-10-01', schedule: { kind: 'daily' }, photoProof: false }
const done = (day: string, choreId = 'old', counts = true): Completion => ({ id: `${choreId}-${day}`, choreId, completedOn: day, completedAt: `${day}T12:00:00Z`, counts })
const fresh: Progress = { homeId: 'h', choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [] }

function fixture(chore: Chore, completions: Completion[], progress = fresh) {
  return [
    upsertOp('homes', { id: 'h', ownerId: 'u', name: 'Home', vacations: [] }),
    upsertOp('progress', progress), upsertOp('chores', chore),
    ...completions.map(c => upsertOp('completions', c)),
  ].reduce(change, emptySnapshot('u'))
}

function reconcile(s: Snapshot, today: string) {
  const data = selectHome(s.tables)
  const result = reconcileProgress(s.tables.progress.h, { chores: data.chores, completions: data.completions, vacations: [] }, today, today)
  return { ...result, snapshot: result.ops.reduce(change, s) }
}

describe('retained history and reward reconciliation together', () => {
  it('recovers milestones from an old schedule after archival without earning idle days or banking history twice', () => {
    const weekly: Chore = { ...daily, createdOn: '2026-09-28', schedule: { kind: 'weekly', weekday: 1 } }
    let s = fixture(weekly, [done('2026-09-28')], { ...fresh, retired: { old: 99 } })
    s = updateChore(weekly, { schedule: { kind: 'daily' } }, '2026-10-05').reduce(change, s)
    // The run breaks under the edited daily rule before archival. Only a
    // historical maximum replay can recover the earlier seven-day milestone.
    s = removeChore('old', selectHome(s.tables), '2026-10-08').reduce(change, s)
    const result = reconcile(s, '2026-10-20')
    expect(result.snapshot.tables.progress.h).toMatchObject({ choreCount: 1, currentStreak: 0, bestStreak: 7 })
    expect(result.unlocked.map(u => u.id)).toEqual(['item:beanie-red', 'wall:mint', 'floor:tile', 'wall:lavender'])
    expect(reconcile(result.snapshot, '2026-10-21')).toMatchObject({ ops: [], unlocked: [] })
  })

  it('credits real work on the exclusive archive date and preserves the earned rest token across the pause', () => {
    let s = fixture(daily, Array.from({ length: 7 }, (_, i) => done(`2026-10-0${i + 1}`)))
    s = removeChore('old', selectHome(s.tables), '2026-10-07').reduce(change, s)
    s = reconcile(s, '2026-10-19').snapshot
    expect(s.tables.progress.h).toMatchObject({ choreCount: 7, currentStreak: 7, bestStreak: 7 })
    s = change(s, upsertOp('chores', { ...daily, id: 'new', createdOn: '2026-10-20' }))
    // The one earned rest token covers Oct 20; today remains unjudged.
    expect(reconcile(s, '2026-10-21').snapshot.tables.progress.h.currentStreak).toBe(7)
    // Missing Oct 21 then breaks the run, while the earned maximum/rewards remain.
    const later = reconcile(s, '2026-10-22').snapshot.tables.progress.h
    expect(later).toMatchObject({ currentStreak: 0, bestStreak: 7, choreCount: 7 })
    expect(later.unlockedItems).toContain('wall:lavender')
    expect(later.unlockedItems).not.toContain('floor:carpet')
  })

  it('resumes with a new chore and gifts the next streak milestone using archived history', () => {
    let s = fixture(daily, Array.from({ length: 6 }, (_, i) => done(`2026-10-0${i + 1}`)))
    s = removeChore('old', selectHome(s.tables), '2026-10-07').reduce(change, s)
    s = reconcile(s, '2026-10-09').snapshot
    const next = { ...daily, id: 'new', createdOn: '2026-10-10' }
    s = change(s, upsertOp('chores', next))
    const data = selectHome(s.tables)
    const now = new Date(2026, 9, 10, 12)
    const result = completeChoreWithRewards(next, data.progress, { chores: data.chores, completions: data.completions, vacations: [] }, now, now)
    s = result.ops.reduce(change, s)
    expect(s.tables.progress.h).toMatchObject({ currentStreak: 7, bestStreak: 7, choreCount: 7 })
    expect(result.unlocked.map(u => u.id)).toEqual(['wall:lavender'])
    expect(reconcile(s, '2026-10-10')).toMatchObject({ ops: [], unlocked: [] })
  })

  it('does not turn archived sample work into personal streaks or rewards', () => {
    let s = fixture(daily, [done('2026-10-01', 'old', false)])
    s = removeChore('old', selectHome(s.tables), '2026-10-02').reduce(change, s)
    const data = selectHome(s.tables)
    expect(streakHistory(data.chores, data.completions, '2026-10-20')).toEqual({ currentStreak: 0, bestStreak: 0 })
    expect(reconcile(s, '2026-10-20')).toMatchObject({ ops: [], unlocked: [] })
  })
})
