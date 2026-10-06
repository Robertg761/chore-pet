import { describe, expect, it } from 'vitest'
import type { Chore } from '../domain/types'
import { addChore, completeChore, createHousehold, removeChore } from './actions'
import { memoryStore } from './local'
import type { Remote, RemoteResult } from './remote'
import { emptyTables, selectHome, type Tables } from './state'
import { createStore } from './store'
import { keyOf, type TableName } from './tables'

/** An in-memory server. `offline` makes every call fail like a dropped connection. */
function fakeServer(userId = 'u1') {
  const server = {
    tables: emptyTables(),
    offline: false,
    refuse: (_table: TableName, _row: unknown) => false,
    calls: [] as string[],
  }
  const down = (): RemoteResult => ({ ok: false, transient: true, message: 'Failed to fetch' })
  const remote: Remote = {
    async session() {
      if (server.offline) throw new Error('Failed to fetch')
      return userId
    },
    async pull() {
      if (server.offline) throw new Error('Failed to fetch')
      return structuredClone(server.tables)
    },
    async upsert(table, rows) {
      server.calls.push(`upsert ${table} ${rows.length}`)
      if (server.offline) return down()
      if (rows.some((r) => server.refuse(table, r))) return { ok: false, transient: false, message: 'refused' }
      const t = server.tables[table] as Record<string, unknown>
      for (const r of rows) t[keyOf(table, r)] = structuredClone(r)
      return { ok: true }
    },
    async remove(table, keys) {
      server.calls.push(`delete ${table} ${keys.length}`)
      if (server.offline) return down()
      const t = server.tables[table] as Record<string, unknown>
      for (const k of keys) delete t[k]
      return { ok: true }
    },
  }
  return { server, remote }
}

async function onboarded(remote: Remote, local = memoryStore()) {
  const store = createStore({ local, remote })
  await store.start()
  await store.sync()
  store.apply(...createHousehold({ species: 'bun', petName: 'Pip', userId: 'u1' }))
  await store.sync()
  return store
}

const dishes = (store: Awaited<ReturnType<typeof onboarded>>) => {
  const { home } = selectHome(store.getState().snapshot.tables)
  return addChore(home!, { name: 'Dishes', schedule: { kind: 'daily' } }, '2026-10-01')
}

describe('sync engine', () => {
  it('pushes local changes and ends synced with an empty outbox', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    store.apply(...dishes(store))
    await store.sync()
    expect(store.getState().sync).toBe('synced')
    expect(store.getState().snapshot.outbox).toEqual({})
    expect(Object.values(server.tables.pets)[0]).toMatchObject({ name: 'Pip', species: 'bun' })
    expect(Object.values(server.tables.chores)).toHaveLength(1)
  })

  it('keeps working offline and catches up on reconnect', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    server.offline = true
    store.apply(...dishes(store))
    await store.sync()
    const { chores, progress } = selectHome(store.getState().snapshot.tables)
    store.apply(...completeChore(chores[0] as Chore, progress, new Date(2026, 9, 6, 9)))
    await store.sync()

    expect(store.getState().sync).toBe('error')
    expect(selectHome(store.getState().snapshot.tables).completions).toHaveLength(1)
    expect(Object.values(server.tables.chores)).toHaveLength(0)

    server.offline = false
    await store.sync()
    expect(store.getState().sync).toBe('synced')
    expect(Object.values(server.tables.completions)[0]).toMatchObject({ completedOn: '2026-10-06' })
    expect(Object.values(server.tables.progress)[0]).toMatchObject({ choreCount: 1 })
  })

  it('survives a reload: the offline copy and its queue come back', async () => {
    const { server, remote } = fakeServer()
    const local = memoryStore()
    const store = await onboarded(remote, local)
    server.offline = true
    store.apply(...dishes(store))
    await store.sync()
    await new Promise((r) => setTimeout(r, 0)) // let the save land

    const reloaded = createStore({ local, remote })
    await reloaded.start()
    expect(selectHome(reloaded.getState().snapshot.tables).chores).toHaveLength(1)
    server.offline = false
    await reloaded.sync()
    expect(Object.values(server.tables.chores)).toHaveLength(1)
  })

  it('gives a new device the same home once it signs in to the same account', async () => {
    const { server, remote } = fakeServer('u1')
    const first = await onboarded(remote)
    first.apply(...dishes(first))
    await first.sync()

    const second = createStore({ local: memoryStore(), remote })
    await second.start()
    await second.sync()
    const data = selectHome(second.getState().snapshot.tables)
    expect(data.pet?.species).toBe('bun')
    expect(data.chores.map((c) => c.name)).toEqual(['Dishes'])
    expect(server.tables).toBeDefined()
  })

  it('pulls changes made elsewhere, and the last write per row wins', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    store.apply(...dishes(store))
    await store.sync()
    const id = Object.keys(server.tables.chores)[0]
    ;(server.tables.chores[id] as Chore).name = 'Dishes (renamed on phone)'
    await store.sync()
    expect(selectHome(store.getState().snapshot.tables).chores[0].name).toBe('Dishes (renamed on phone)')
  })

  it('deletes cascade locally and on the server', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    store.apply(...dishes(store))
    const { chores, progress } = selectHome(store.getState().snapshot.tables)
    store.apply(...completeChore(chores[0], progress))
    await store.sync()
    store.apply(...removeChore(chores[0].id))
    expect(selectHome(store.getState().snapshot.tables).completions).toHaveLength(0)
    await store.sync()
    expect(Object.values(server.tables.chores)).toHaveLength(0)
  })

  it('drops only the row the server refuses, not the whole batch', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    server.refuse = (table, row) => table === 'chores' && (row as Chore).name === 'Bad'
    const { home } = selectHome(store.getState().snapshot.tables)
    store.apply(
      ...addChore(home!, { name: 'Good', schedule: { kind: 'daily' } }, '2026-10-01'),
      ...addChore(home!, { name: 'Bad', schedule: { kind: 'daily' } }, '2026-10-01'),
    )
    await store.sync()
    expect(store.getState().sync).toBe('synced')
    expect(Object.values(server.tables.chores).map((c) => c.name)).toEqual(['Good'])
    expect(selectHome(store.getState().snapshot.tables).chores.map((c) => c.name)).toEqual(['Good'])
  })

  it('works with no server at all', async () => {
    const local = memoryStore()
    const store = createStore({ local, remote: null })
    await store.start()
    store.apply(...createHousehold({ species: 'sprout', petName: '', userId: null }))
    await store.sync()
    expect(store.getState().sync).toBe('local-only')
    expect(selectHome(store.getState().snapshot.tables).pet).toMatchObject({ name: 'Pip', species: 'sprout' })
  })
})

// Keep the Tables type referenced for readers of the fake server.
export type _ServerTables = Tables
