/** Read-only application audit probes. Assertions describe current defects, not desired behavior. */
import { expect, it } from 'vitest'
import { createStore } from '../../../../src/data/store'
import { memoryStore } from '../../../../src/data/local'
import { createHousehold, addChore, completeChore, removeChore } from '../../../../src/data/actions'
import { change, emptySnapshot, selectHome } from '../../../../src/data/state'
import { keyOf } from '../../../../src/data/tables'
import type { Remote } from '../../../../src/data/remote'

const seed = () => createHousehold({ species: 'bun', petName: 'Private Pet', userId: 'saved-A' }).reduce(change, emptySnapshot('saved-A'))
const settle = () => new Promise(r => setTimeout(r, 0))

it('replacement account B can offer and clone cached account A home into B', async () => {
  const original = seed()
  original.outbox = {}
  const originalHome = selectHome(original.tables).home!.id
  const local = memoryStore(original)
  const serverB = emptySnapshot('new-guest-B')
  const remote: Remote = {
    session: async () => 'new-guest-B',
    currentUser: async () => 'new-guest-B',
    pull: async () => structuredClone(serverB.tables),
    upsert: async (table, rows) => {
      for (const row of rows) (serverB.tables[table] as Record<string, unknown>)[keyOf(table, row)] = structuredClone(row)
      return {ok:true}
    },
    remove: async (table, keys) => {
      for (const key of keys) delete (serverB.tables[table] as Record<string, unknown>)[key]
      return {ok:true}
    },
  }
  const store = createStore({ local, remote })
  await store.start(); await store.sync(); await settle()
  const homes = await store.savedHomes()
  expect(homes[0]?.petName).toBe('Private Pet')
  expect(local.backups['snapshot-backup-saved-A'].heldFor).toBe('new-guest-B')
  expect(await store.restoreSaved('saved-A')).toBe(true)
  await store.sync()
  const copied = selectHome(serverB.tables)
  expect(copied.pet?.name).toBe('Private Pet')
  expect(copied.home?.id).not.toBe(originalHome)
  expect(copied.home?.ownerId).toBe('new-guest-B')
  // No A-side remote exists in this fixture: all copied data came from this browser's cache.
})

it('failed device wipe resolves successfully and old home reloads from durable storage', async () => {
  const original = seed()
  original.outbox = {}
  const local = memoryStore(original)
  local.save = async () => { throw new Error('QuotaExceededError') }
  const store = createStore({ local, remote:null })
  await store.start()
  await expect(store.reset({backup:false})).resolves.toBeUndefined()
  expect(store.getState().savedLocally).toBe(true)
  expect(selectHome(store.getState().snapshot.tables).home).toBeNull()
  const reload = createStore({local, remote:null}); await reload.start()
  expect(selectHome(reload.getState().snapshot.tables).pet?.name).toBe('Private Pet')
})

it('stale-device chore deletion banks one completion and cascades away the second', () => {
  let server = seed()
  const home = selectHome(server.tables).home!
  server = addChore(home,{name:'Dishes',schedule:{kind:'daily'}},'2026-10-01').reduce(change,server)
  const chore = selectHome(server.tables).chores[0]
  server = completeChore(chore,selectHome(server.tables).progress,new Date('2026-10-01T12:00:00Z'),{realNow:null}).reduce(change,server)
  const stale = structuredClone(server)
  server = completeChore(chore,selectHome(server.tables).progress,new Date('2026-10-02T12:00:00Z'),{realNow:null}).reduce(change,server)
  expect(selectHome(server.tables).progress?.choreCount).toBe(2)
  const history = selectHome(stale.tables)
  // Reproduce SQL's max(chore_count) progress merge, followed by its FK cascade.
  // Other merge fields are unchanged in this fixture; change() mirrors FK cascades.
  for (const op of removeChore(chore.id,history)) {
    if(op.kind==='upsert' && op.table==='progress') op.value.choreCount = Math.max(op.value.choreCount,selectHome(server.tables).progress!.choreCount)
    server = change(server,op)
  }
  expect(server.tables.progress[home.id].choreCount).toBe(2)
  expect(Object.keys(server.tables.completions)).toHaveLength(0)
  expect(selectHome(server.tables).progress?.choreCount).toBe(1)
})
