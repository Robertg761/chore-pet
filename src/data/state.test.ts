import { describe, expect, it } from 'vitest'
import type { Chore, Completion, Home, Progress } from '../domain/types'
import { acknowledge, applyOp, change, claim, deleteOp, emptySnapshot, emptyTables, mergeProgress, mergeQueuedProgress, planFlush, rebase, selectHome, upsertOp } from './state'

const home: Home = { id: 'h1', ownerId: 'u1', name: 'Home', vacations: [] }
const chore = (id: string, extra: Partial<Chore> = {}): Chore => ({
  id,
  homeId: 'h1',
  objectId: null,
  name: id,
  schedule: { kind: 'daily' },
  createdOn: '2026-10-01',
  photoProof: false,
  ...extra,
})
const completion = (id: string, choreId: string): Completion => ({ id, choreId, completedAt: '', completedOn: '2026-10-05' })

describe('local changes', () => {
  it('applies upserts and keeps only the latest queued change per row', () => {
    let s = emptySnapshot('u1')
    s = change(s, upsertOp('chores', chore('c1', { name: 'Dishes' })))
    s = change(s, upsertOp('chores', chore('c1', { name: 'Wash dishes' })))
    expect(s.tables.chores.c1.name).toBe('Wash dishes')
    expect(Object.values(s.outbox)).toHaveLength(1)
    expect(Object.values(s.outbox)[0]).toMatchObject({ kind: 'upsert', seq: 2 })
  })

  it('cascades deletes like the database does', () => {
    let t = emptyTables()
    t = applyOp(t, { ...upsertOp('homes', home), seq: 1 } as never)
    t = applyOp(t, { ...upsertOp('chores', chore('c1')), seq: 2 } as never)
    t = applyOp(t, { ...upsertOp('chores', chore('c2')), seq: 3 } as never)
    t = applyOp(t, { ...upsertOp('completions', completion('x1', 'c1')), seq: 4 } as never)
    t = applyOp(t, { ...upsertOp('completions', completion('x2', 'c2')), seq: 5 } as never)

    const afterChore = applyOp(t, { ...deleteOp('chores', 'c1'), seq: 6 })
    expect(Object.keys(afterChore.chores)).toEqual(['c2'])
    expect(Object.keys(afterChore.completions)).toEqual(['x2'])

    const afterHome = applyOp(t, { ...deleteOp('homes', 'h1'), seq: 7 })
    expect(afterHome.chores).toEqual({})
    expect(afterHome.completions).toEqual({})
  })
})

describe('flushing', () => {
  it('sends upserts parents first and deletes children first', () => {
    let s = emptySnapshot('u1')
    s = change(s, upsertOp('completions', completion('x1', 'c1')))
    s = change(s, upsertOp('chores', chore('c1')))
    s = change(s, upsertOp('homes', home))
    s = change(s, deleteOp('rooms', 'r1'))
    s = change(s, deleteOp('placed_objects', 'o1'))
    expect(planFlush(s.outbox).map((p) => `${p.kind} ${p.table}`)).toEqual([
      'upsert homes',
      'upsert chores',
      'upsert completions',
      'delete placed_objects',
      'delete rooms',
    ])
  })

  it('keeps a change made while an older version of the same row was in flight', () => {
    let s = emptySnapshot('u1')
    s = change(s, upsertOp('chores', chore('c1', { name: 'A' })))
    const sent = Object.values(s.outbox)
    s = change(s, upsertOp('chores', chore('c1', { name: 'B' })))
    const outbox = acknowledge(s.outbox, sent)
    expect(Object.values(outbox)).toHaveLength(1)
    expect(rebase(emptyTables(), outbox).chores.c1.name).toBe('B')
  })

  it('re-applies unsynced changes on top of what the server sent', () => {
    let s = emptySnapshot('u1')
    s = change(s, upsertOp('chores', chore('local')))
    s = change(s, deleteOp('chores', 'gone'))
    const server = emptyTables()
    server.chores = { gone: chore('gone'), remote: chore('remote') }
    expect(Object.keys(rebase(server, s.outbox).chores).sort()).toEqual(['local', 'remote'])
  })
})

describe('accounts', () => {
  it('adopts data made before the first session', () => {
    const s = change(emptySnapshot(null), upsertOp('homes', home))
    const claimed = claim(s, 'u1')
    expect(claimed.userId).toBe('u1')
    expect(claimed.tables.homes.h1).toBeDefined()
    expect(Object.values(claimed.outbox)).toHaveLength(1)
  })

  it("drops another account's data", () => {
    const s = change(emptySnapshot('u1'), upsertOp('homes', home))
    expect(claim(s, 'u2')).toEqual(emptySnapshot('u2'))
  })
})

describe('selectHome', () => {
  it('returns an empty home before onboarding', () => {
    expect(selectHome(emptyTables()).home).toBeNull()
  })

  it("collects the home's rows", () => {
    let s = emptySnapshot('u1')
    s = change(s, upsertOp('homes', home))
    s = change(s, upsertOp('chores', chore('c1')))
    s = change(s, upsertOp('completions', completion('x1', 'c1')))
    s = change(s, upsertOp('progress', { homeId: 'h1', choreCount: 1, currentStreak: 0, bestStreak: 0, unlockedItems: [] }))
    const data = selectHome(s.tables)
    expect(data.home?.id).toBe('h1')
    expect(data.chores.map((c) => c.id)).toEqual(['c1'])
    expect(data.completions.map((c) => c.id)).toEqual(['x1'])
    expect(data.progress?.choreCount).toBe(1)
  })
})

describe('mergeProgress', () => {
  const p = (over: Partial<Progress> = {}): Progress => ({ homeId: 'h', choreCount: 3, currentStreak: 1, bestStreak: 2, unlockedItems: ['item:beanie-red'], ...over })

  it('keeps rewards from both sides and the higher counters', () => {
    const merged = mergeProgress(p({ choreCount: 5, unlockedItems: ['item:beanie-red', 'decor:plant'] }), p({ choreCount: 4, bestStreak: 6, unlockedItems: ['item:beanie-red', 'wall:mint'] }))
    expect(merged).toEqual({ homeId: 'h', choreCount: 5, currentStreak: 1, bestStreak: 6, unlockedItems: ['item:beanie-red', 'decor:plant', 'wall:mint'] })
  })

  it('merges a queued progress row with the server copy, keeping its seq', () => {
    const snap = change(emptySnapshot('u1'), upsertOp('progress', p({ choreCount: 4 })))
    const merged = mergeQueuedProgress(snap, { h: p({ choreCount: 9, unlockedItems: ['wall:mint'] }) })
    const op = merged.outbox['progress:h']
    expect(op.seq).toBe(snap.outbox['progress:h'].seq)
    expect(op.kind === 'upsert' && op.value).toMatchObject({ choreCount: 9, unlockedItems: ['item:beanie-red', 'wall:mint'] })
    expect(merged.tables.progress.h.choreCount).toBe(9)
    expect(mergeQueuedProgress(snap, {})).toBe(snap)
  })
})
