import { describe, expect, it } from 'vitest'
import type { Chore, Completion, Home, PlacedObject, Room } from '../domain/types'
import {
  acknowledge,
  applyOp,
  change,
  claim,
  claimDrops,
  deleteOp,
  emptySnapshot,
  emptyTables,
  tableChanges,
  unapplied,
  withChanges,
  mergeSnapshots,
  planFlush,
  rebase,
  reject,
  repairOps,
  requeueRejected,
  selectHome,
  upsertOp,
  worthBackingUp,
  type Op,
  type Snapshot,
} from './state'

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

describe('which home and rooms show', () => {
  const room = (id: string, homeId: string, createdAt?: string): Room & { createdAt?: string } => ({ id, homeId, type: 'kitchen', floorStyle: 'wood', wallStyle: 'peach', ...(createdAt ? { createdAt } : {}) })
  const object = (id: string, roomId: string): PlacedObject => ({ id, roomId, catalogId: 'sink', tileX: 0, tileY: 0, rotation: 0 })

  it('shows rooms oldest first, rooms not yet on the server last', () => {
    const t = emptyTables()
    t.homes = { h1: home }
    t.rooms = { b: room('b', 'h1'), z: room('z', 'h1', '2026-01-01T00:00:00+00:00'), a: room('a', 'h1', '2026-03-01T00:00:00+00:00') }
    expect(selectHome(t).rooms.map((r) => r.id)).toEqual(['z', 'a', 'b'])
  })

  it('prefers the home being lived in, then the oldest, never the lowest id', () => {
    const t = emptyTables()
    t.homes = {
      a: { ...home, id: 'a', createdAt: '2026-05-01T00:00:00+00:00' },
      b: { ...home, id: 'b', createdAt: '2026-01-01T00:00:00+00:00' },
      c: { ...home, id: 'c' },
    }
    expect(selectHome(t).home?.id).toBe('b')
    t.rooms = { r: room('r', 'c') }
    t.placed_objects = { o: object('o', 'r') }
    expect(selectHome(t).home?.id).toBe('c')
  })
})

describe('the chore count', () => {
  it('counts a deleted chore once: its banked count, not its completions still waiting to be removed', () => {
    const t = emptyTables()
    t.homes = { h1: home }
    t.completions = { x1: completion('x1', 'gone') } // the chore row is already gone locally
    t.progress = { h1: { homeId: 'h1', choreCount: 1, retired: { gone: 1 }, currentStreak: 0, bestStreak: 0, unlockedItems: [] } }
    expect(selectHome(t).progress?.choreCount).toBe(1)
  })
})

describe('refused changes', () => {
  it('leave the queue for the rejected list, and can be queued again', () => {
    let s = change(emptySnapshot('u1'), upsertOp('chores', chore('c1')))
    const op = Object.values(s.outbox)[0]
    s = reject(s, [op], 'refused', '2026-10-07T00:00:00Z')
    expect(s.outbox).toEqual({})
    expect(s.rejected).toEqual([{ op, message: 'refused', at: '2026-10-07T00:00:00Z' }])
    const again = requeueRejected(s)
    expect(again.rejected).toEqual([])
    expect(Object.values(again.outbox)).toMatchObject([{ table: 'chores', key: 'c1' }])
  })

  it('only keep the latest change to a row (an older refused one is moot)', () => {
    let s = change(emptySnapshot('u1'), upsertOp('chores', chore('c1', { name: 'A' })))
    const old = Object.values(s.outbox)[0]
    s = change(s, upsertOp('chores', chore('c1', { name: 'B' })))
    s = reject(s, [old], 'refused', '')
    expect(s.rejected).toEqual([])
    expect(Object.values(s.outbox)).toHaveLength(1)
  })
})

describe('backups when an account switch drops data', () => {
  it('drops only another account’s data, and backs up anything unsynced or any home', () => {
    const guest = change(emptySnapshot('anon'), upsertOp('homes', home))
    expect(claimDrops(guest, 'u1')).toBe(true)
    expect(claimDrops(guest, 'anon')).toBe(false)
    expect(claimDrops(emptySnapshot(null), 'u1')).toBe(false)
    expect(worthBackingUp(guest)).toBe(true)
    expect(worthBackingUp({ ...guest, outbox: {} })).toBe(true) // a guest home lives nowhere else
    expect(worthBackingUp(emptySnapshot('u1'))).toBe(false)
  })
})

describe('change: deleting a row', () => {
  it('drops queued changes to the rows that went with it', () => {
    const offline = change(change(emptySnapshot('u1'), upsertOp('homes', home)), upsertOp('chores', chore('a')))
    const gone = change(offline, deleteOp('homes', home.id))
    expect(Object.keys(gone.outbox)).toEqual(['homes:h1'])
    expect(gone.tables.chores).toEqual({})
  })

  it('drops set-aside changes under it too, but keeps unrelated ones', () => {
    const synced = { ...change(emptySnapshot('u1'), upsertOp('homes', home)), outbox: {} }
    const refused = (key: string, value: Chore) => ({ op: { table: 'chores', kind: 'upsert', key, value, seq: 1, id: key } as Op, message: 'no', at: '2026-10-07T00:00:00.000Z' })
    const elsewhere: Chore = { ...chore('z'), homeId: 'other-home' }
    const withRefused = { ...synced, rejected: [refused('a', chore('a')), refused('z', elsewhere)] }
    const gone = change(withRefused, deleteOp('homes', home.id))
    expect(gone.rejected?.map((r) => r.op.key)).toEqual(['z'])
  })
})

describe('mergeSnapshots (two tabs, one offline copy)', () => {
  const start = change(emptySnapshot('u1'), upsertOp('homes', home))

  it('takes a change only the other tab made, and applies it', () => {
    const theirs = change(start, upsertOp('chores', chore('b')))
    const merged = mergeSnapshots(start, start, theirs, 'mine')
    expect(Object.keys(merged.tables.chores)).toEqual(['b'])
    expect(Object.keys(merged.outbox).sort()).toEqual(['chores:b', 'homes:h1'])
  })

  it('takes the other tab\'s fresher pull and keeps this tab\'s pending changes on top', () => {
    const synced: Snapshot = { ...change(start, upsertOp('chores', chore('a'))), outbox: {}, pulledAt: '2026-10-07T08:00:00.000Z' }
    // The other tab pulled later: chore a was renamed on another device and chore b appeared.
    const theirs: Snapshot = {
      ...synced,
      tables: { ...synced.tables, chores: { a: { ...chore('a'), name: 'Renamed' }, b: chore('b') } },
      pulledAt: '2026-10-07T09:00:00.000Z',
    }
    const mine = change(synced, upsertOp('chores', chore('c')))
    const merged = mergeSnapshots(mine, synced, theirs, 'stored')
    expect(merged.tables.chores.a.name).toBe('Renamed')
    expect(Object.keys(merged.tables.chores).sort()).toEqual(['a', 'b', 'c'])
    expect(Object.keys(merged.outbox)).toEqual(['chores:c'])
    expect(merged.pulledAt).toBe('2026-10-07T09:00:00.000Z')
    // And an older pull never replaces a fresher one.
    expect(mergeSnapshots(theirs, theirs, synced, 'stored')).toBe(theirs)
  })

  it('keeps changes from both tabs', () => {
    const mine = change(start, upsertOp('chores', chore('a')))
    const theirs = change(start, upsertOp('chores', chore('b')))
    const merged = mergeSnapshots(mine, start, theirs, 'mine')
    expect(Object.keys(merged.tables.chores).sort()).toEqual(['a', 'b'])
    expect(Object.keys(merged.outbox)).toHaveLength(3)
    expect(merged.seq).toBe(2)
  })

  it('drops a change the other tab already sent, but not one this tab made since', () => {
    const sentByThem = { ...start, outbox: {} }
    expect(mergeSnapshots(start, start, sentByThem, 'mine').outbox).toEqual({})
    const changedAgain = change(start, upsertOp('homes', { ...home, name: 'Newer' }))
    expect(mergeSnapshots(changedAgain, start, sentByThem, 'mine').outbox['homes:h1']).toBe(changedAgain.outbox['homes:h1'])
  })

  it('does not bring back a change this tab sent', () => {
    const sentByMe = { ...start, outbox: {} }
    expect(mergeSnapshots(sentByMe, start, start, 'mine').outbox).toEqual({})
  })

  it('lets the later change win when both tabs changed the same row', () => {
    const mine = change(start, upsertOp('homes', { ...home, name: 'Mine' }))
    const theirs = change(change(start, upsertOp('homes', { ...home, name: 'x' })), upsertOp('homes', { ...home, name: 'Theirs' }))
    const merged = mergeSnapshots(mine, start, theirs, 'mine')
    expect(merged.tables.homes.h1.name).toBe('Theirs')
  })

  it('returns the same snapshot when nothing changed, so nothing re-renders', () => {
    expect(mergeSnapshots(start, start, start, 'mine')).toBe(start)
  })

  it('lets the newer decision win when the tabs are on different accounts', () => {
    const other = emptySnapshot('u2')
    expect(mergeSnapshots(start, start, other, 'mine')).toBe(start)
    expect(mergeSnapshots(start, start, other, 'stored')).toBe(other)
  })

  it('keeps a rejected change dismissed in either tab dismissed', () => {
    const op = Object.values(start.outbox)[0]
    const withRejected: Snapshot = { ...start, rejected: [{ op, message: 'no', at: '' }] }
    const dismissed: Snapshot = { ...withRejected, rejected: [] }
    expect(mergeSnapshots(dismissed, withRejected, withRejected, 'mine').rejected).toEqual([])
    expect(mergeSnapshots(withRejected, withRejected, dismissed, 'stored').rejected).toEqual([])
    expect(mergeSnapshots(start, start, withRejected, 'stored').rejected).toHaveLength(1)
  })
})

describe('repairOps', () => {
  it('recreates a missing progress row with the count and the rewards it earned', () => {
    const t = emptyTables()
    t.homes = { h1: home }
    t.chores = { c1: chore('c1') }
    t.completions = { x1: completion('x1', 'c1') }
    expect(repairOps(t)).toEqual([upsertOp('progress', { homeId: 'h1', choreCount: 1, retired: {}, currentStreak: 0, bestStreak: 0, unlockedItems: ['item:beanie-red'] })])
    t.progress = { h1: { homeId: 'h1', choreCount: 1, currentStreak: 0, bestStreak: 0, unlockedItems: [] } }
    expect(repairOps(t)).toEqual([])
    expect(repairOps(emptyTables())).toEqual([])
  })
})

describe('table changes', () => {
  const chore = (id: string, name: string): Chore => ({ id, homeId: 'h', objectId: null, name, schedule: { kind: 'daily' }, createdOn: '2026-10-01', photoProof: false })
  const withChores = (...chores: Chore[]) => ({ ...emptyTables(), chores: Object.fromEntries(chores.map((c) => [c.id, c])) })

  it('finds rows added, changed and removed, and replays them on another copy', () => {
    const before = withChores(chore('a', 'Dishes'), chore('b', 'Bins'))
    const after = withChores(chore('b', 'Recycling'), chore('c', 'Plants'))
    const changes = tableChanges(before, after)
    expect(changes.put.map((p) => p.key).sort()).toEqual(['b', 'c'])
    expect(changes.removed).toEqual([{ table: 'chores', key: 'a' }])
    const mine = withChores(chore('a', 'Dishes'), chore('b', 'Bins'), chore('d', 'Mine'))
    expect(Object.values(withChanges(mine, changes).chores).map((c) => c.name).sort()).toEqual(['Mine', 'Plants', 'Recycling'])
  })

  it('leaves out what a copy already has', () => {
    const changes = tableChanges(withChores(chore('a', 'Dishes')), withChores(chore('b', 'Bins')))
    expect(unapplied(changes, withChores(chore('b', 'Bins')))).toEqual({ put: [], removed: [] })
    expect(unapplied(changes, withChores(chore('a', 'Dishes'))).put).toHaveLength(1)
  })
})
