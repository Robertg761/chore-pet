import { describe, expect, it } from 'vitest'
import { createHousehold } from './actions'
import { memoryStore } from './local'
import { change, emptySnapshot, emptyTables, selectHome, type Snapshot } from './state'
import { createStore } from './store'
import type { Remote } from './remote'

const home = (userId = 'owner'): Snapshot => createHousehold({ species: 'bun', petName: 'Pip', userId }).reduce(change, emptySnapshot(userId))
const failure = async () => { throw new Error('Storage blocked') }

 describe('recovery durability', () => {
  it('keeps unsynced data and rejects when preservation fails, then permits retry', async () => {
    const local = memoryStore(home())
    local.reset = undefined
    const store = createStore({ local, remote: null })
    await store.start()
    const before = store.getState().snapshot
    const backup = local.backup
    local.backup = failure
    await expect(store.reset()).rejects.toThrow()
    expect(store.getState().snapshot.tables).toEqual(before.tables)
    expect(local.current?.tables).toEqual(before.tables)
    local.backup = backup
    await store.reset()
    expect(Object.keys(local.current!.tables.homes)).toHaveLength(0)
  })

  it('rejects a failed local clear and retains owner context for retry', async () => {
    const local = memoryStore(home())
    local.reset = undefined
    const store = createStore({ local, remote: null })
    await store.start()
    const save = local.save
    local.save = failure
    await expect(store.reset({ backup: false })).rejects.toThrow()
    expect(store.getState().snapshot.userId).toBe('owner')
    local.save = save
    await store.reset({ backup: false })
    expect(local.current?.userId).toBeNull()
  })

  it('reports failed backup deletion and retries removal for the original owner', async () => {
    const local = memoryStore(home())
    local.reset = undefined
    await local.backup!('owner', home())
    const store = createStore({ local, remote: null })
    await store.start()
    const drop = local.dropBackup
    local.dropBackup = failure
    await expect(store.reset({ backup: false })).rejects.toThrow()
    local.dropBackup = drop
    await store.reset({ backup: false })
    expect(local.backups).toEqual({})
  })

  it('does not clear an unreadable durable store', async () => {
    const local = memoryStore(home())
    local.reset = undefined
    local.load = failure
    const store = createStore({ local, remote: null })
    await store.start()
    await expect(store.reset({ backup: false })).rejects.toThrow()
    expect(local.current?.userId).toBe('owner')
  })
})

describe('backup provenance', () => {
  const remote: Remote = { session: async () => 'replacement', currentUser: async () => 'replacement', pull: async () => emptyTables(), upsert: async () => ({ ok: true }), remove: async () => ({ ok: true }) }
  it.each(['saved', undefined] as const)('does not transfer %s cache to a replacement guest', async (ownerKind) => {
    const local = memoryStore({ ...home(), ownerKind })
    const store = createStore({ local, remote })
    await store.sync()
    expect(await store.savedHomes()).toEqual([])
    expect(await store.restoreSaved('owner')).toBe(false)
    expect(local.backups['snapshot-backup-owner'].userId).toBe('owner')
  })
  it('allows a known guest home to follow a sign-in', async () => {
    const local = memoryStore({ ...home(), ownerKind: 'guest' })
    const store = createStore({ local, remote })
    await store.sync()
    expect(await store.savedHomes()).toHaveLength(1)
    expect(await store.restoreSaved('owner')).toBe(true)
  })
  it('ignores legacy heldFor metadata that could have transferred a saved account', async () => {
    const local = memoryStore(emptySnapshot('replacement'))
    await local.backup!('owner', { ...home(), heldFor: 'replacement' })
    const store = createStore({ local, remote: null })
    await store.start()
    expect(await store.savedHomes()).toEqual([])
    expect(await store.restoreSaved('owner')).toBe(false)
  })
})

describe('active home', () => {
  it('keeps the chosen home across ordinary edits and reload, and allows explicit selection', async () => {
    const a = home()
    const b = home()
    const aId = Object.keys(a.tables.homes)[0]
    const bId = Object.keys(b.tables.homes)[0]
    let snapshot = Object.values(b.outbox).reduce(change, a)
    // Initial explicit choice must survive even if another home wins the recovery heuristic.
    const local = memoryStore(snapshot)
    const store = createStore({ local, remote: null })
    await store.start()
    store.selectActiveHome(aId)
    store.apply({ kind: 'upsert', table: 'homes', key: bId, value: { ...b.tables.homes[bId], name: 'Other' } })
    await store.sync()
    await new Promise((r) => setTimeout(r, 0))
    const reopened = createStore({ local, remote: null })
    await reopened.start()
    snapshot = reopened.getState().snapshot
    expect(selectHome(snapshot.tables, snapshot.activeHomeId).home?.id).toBe(aId)
    reopened.selectActiveHome(bId)
    expect(reopened.getState().snapshot.activeHomeId).toBe(bId)
  })
})

it('preserves another tab’s unsynced work discovered during a clean sign-out', async () => {
  const initial = home()
  initial.outbox = {}
  const local = memoryStore(initial)
  const store = createStore({ local, remote: null })
  await store.start()
  await store.setCleanup({ kind: 'sign-out', ownerId: 'owner', stage: 'prepared', backup: false })
  const id = Object.keys(initial.tables.homes)[0]
  local.current = change(local.current!, { kind: 'upsert', table: 'homes', key: id, value: { ...initial.tables.homes[id], name: 'New unsynced name' } })
  await store.reset({ backup: false })
  expect(local.backups['snapshot-backup-owner']?.tables.homes[id].name).toBe('New unsynced name')
})

it('blocks sync after a cleanup journal is discovered without a channel notification', async () => {
  const local = memoryStore(home())
  let release!: () => void
  const gate = new Promise<void>((r) => { release = r })
  let writes = 0
  const remote: Remote = { session: async () => { await gate; return 'owner' }, currentUser: async () => 'owner',
    pull: async () => emptyTables(), upsert: async () => { writes++; return { ok: true } }, remove: async () => ({ ok: true }) }
  const store = createStore({ local, remote })
  const sync = store.sync()
  await new Promise((r) => setTimeout(r, 0))
  local.current = { ...local.current!, cleanup: { kind: 'delete', ownerId: 'owner', stage: 'prepared' } }
  release()
  await sync
  expect(writes).toBe(0)
  expect(store.getState().snapshot.cleanup?.kind).toBe('delete')
})

it('pins the furnished home once so furniture removal cannot select the older home', async () => {
  const a = home(), b = home()
  const aId = Object.keys(a.tables.homes)[0], bId = Object.keys(b.tables.homes)[0]
  const aRoom = Object.keys(a.tables.rooms)[0], bRoom = Object.keys(b.tables.rooms)[0]
  const snapshot = Object.values(b.outbox).reduce(change, a)
  snapshot.tables.homes[aId].createdAt = '2026-10-02T00:00:00Z'
  snapshot.tables.homes[bId].createdAt = '2026-10-01T00:00:00Z'
  for (const [id, roomId] of [['a1', aRoom], ['a2', aRoom], ['b1', bRoom]]) {
    snapshot.tables.placed_objects[id] = { id, roomId, catalogId: 'sink', tileX: 1, tileY: 1, rotation: 0 }
  }
  const local = memoryStore(snapshot)
  const store = createStore({ local, remote: null })
  await store.start()
  expect(store.getState().snapshot.activeHomeId).toBe(aId)
  store.apply({ kind: 'delete', table: 'placed_objects', key: 'a2' })
  expect(selectHome(store.getState().snapshot.tables).home?.id).toBe(bId) // the old heuristic would switch
  expect(store.getState().snapshot.activeHomeId).toBe(aId)
  await new Promise((r) => setTimeout(r, 0))
  const reopened = createStore({ local, remote: null })
  await reopened.start()
  expect(reopened.getState().snapshot.activeHomeId).toBe(aId)
})

it('persists cleanup across reload and never starts a new session until resolved', async () => {
  const local = memoryStore(home())
  const store = createStore({ local, remote: null })
  await store.start()
  await store.setCleanup({ kind: 'delete', ownerId: 'owner', stage: 'server-deleted', serverDeleted: true })
  let sessions = 0
  const remote: Remote = { session: async () => { sessions++; return 'replacement' }, pull: async () => emptyTables(), upsert: async () => ({ ok: true }), remove: async () => ({ ok: true }) }
  const reopened = createStore({ local, remote })
  await reopened.sync()
  expect(reopened.getState().snapshot.cleanup?.serverDeleted).toBe(true)
  expect(sessions).toBe(0)
  await reopened.reset({ backup: false })
  expect(local.current?.cleanup?.stage).toBe('local-cleared')
  expect(local.current?.tables.homes).toEqual({})
})

it('requires the original saved owner session when restoring an offline cache', async () => {
  const local = memoryStore(emptySnapshot('owner'))
  await local.backup!('owner', { ...home(), ownerKind: 'saved' })
  const remote: Remote = { session: async () => 'replacement', currentUser: async () => null, pull: async () => emptyTables(), upsert: async () => ({ ok: true }), remove: async () => ({ ok: true }) }
  const store = createStore({ local, remote, isOnline: () => false })
  await store.start()
  expect(await store.restoreSaved('owner')).toBe(false)
  expect(Object.keys(local.backups)).toHaveLength(1)
})

it.each(['saved', undefined] as const)('does not delete a %s owner backup with legacy transfer metadata during another account cleanup', async (ownerKind) => {
  const local = memoryStore(emptySnapshot('replacement'))
  await local.backup!('owner', { ...home(), ownerKind, heldFor: 'replacement' })
  const store = createStore({ local, remote: null })
  await store.start()
  await store.reset({ backup: false })
  expect(local.backups['snapshot-backup-owner']?.userId).toBe('owner')
})
