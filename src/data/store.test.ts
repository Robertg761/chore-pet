import { describe, expect, it } from 'vitest'
import type { Chore, Progress } from '../domain/types'
import { addChore, completeChore, completeChoreWithRewards, createHousehold, removeChore } from './actions'
import { memoryStore, type LocalStore } from './local'
import type { Remote, RemoteResult } from './remote'
import { emptyTables, selectHome, type Tables } from './state'
import { createStore, type Store } from './store'
import { keyOf, type TableName } from './tables'

/** What supabase/migrations/0004_progress_merge.sql does to an updated progress row. */
function mergeLikeTrigger(old: Progress, row: Progress): Progress {
  return {
    ...row,
    unlockedItems: [...new Set([...old.unlockedItems, ...row.unlockedItems])],
    bestStreak: Math.max(old.bestStreak, row.bestStreak),
    choreCount: Math.max(old.choreCount, row.choreCount),
    countedFrom: [old.countedFrom, row.countedFrom].filter(Boolean).sort()[0] ?? null,
  }
}

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
      for (const r of rows) {
        const key = keyOf(table, r)
        const old = t[key] as Progress | undefined
        // Like the progress_merge trigger (migration 0004): updates merge instead of overwriting.
        t[key] = table === 'progress' && old ? mergeLikeTrigger(old, r as Progress) : structuredClone(r)
      }
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

describe('when the browser refuses local storage', () => {
  const broken = (): LocalStore => ({
    load: () => Promise.reject(new Error('SecurityError')),
    save: () => Promise.reject(new Error('QuotaExceededError')),
  })
  const settle = () => new Promise((r) => setTimeout(r, 0))

  it('says so instead of claiming the home is saved', async () => {
    const store = createStore({ local: broken(), remote: null })
    await store.start()
    expect(store.getState()).toMatchObject({ ready: true, savedLocally: false })
  })

  it('notices a failing save, and recovers once saving works again', async () => {
    let fail = true
    const local = memoryStore()
    const flaky: LocalStore = { load: () => local.load(), save: (s) => (fail ? Promise.reject(new Error('QuotaExceededError')) : local.save(s)) }
    const store = createStore({ local: flaky, remote: null })
    await store.start()
    expect(store.getState().savedLocally).toBe(true)
    store.apply(...createHousehold({ species: 'bun', petName: 'Pip', userId: null }))
    await settle()
    expect(store.getState().savedLocally).toBe(false)
    fail = false
    store.apply(...dishes(store))
    await settle()
    expect(store.getState().savedLocally).toBe(true)
    expect(local.current).not.toBeNull()
  })
})

describe('two devices on one account', () => {
  async function pair() {
    const { server, remote } = fakeServer()
    const phone = await onboarded(remote)
    phone.apply(...dishes(phone))
    const { home } = selectHome(phone.getState().snapshot.tables)
    phone.apply(...addChore(home!, { name: 'Bins', schedule: { kind: 'daily' } }, '2026-10-01'))
    await phone.sync()
    const tablet = createStore({ local: memoryStore(), remote })
    await tablet.start()
    await tablet.sync()
    return { server, phone, tablet }
  }
  const finish = (s: Store, name: string, day: number) => {
    const data = selectHome(s.getState().snapshot.tables)
    const chore = data.chores.find((c) => c.name === name)!
    s.apply(...completeChoreWithRewards(chore, data.progress, { ...data, vacations: data.home!.vacations }, new Date(2026, 9, day, 9)).ops)
  }
  const progressOf = (s: Store) => selectHome(s.getState().snapshot.tables).progress!

  it('keeps every chore and reward from both while each was offline, whatever order they sync in', async () => {
    const { server, phone, tablet } = await pair()
    server.offline = true
    finish(phone, 'Dishes', 6) // chore 1: the red beanie
    finish(tablet, 'Bins', 6)
    finish(tablet, 'Bins', 7)
    // Both reconnect; the tablet's progress row lands last, and still nothing is lost.
    server.offline = false
    await phone.sync()
    await tablet.sync()
    await phone.sync()
    for (const s of [phone, tablet]) {
      expect(progressOf(s).choreCount).toBe(3)
      expect(progressOf(s).unlockedItems).toContain('item:beanie-red')
    }
    expect(server.tables.progress[progressOf(phone).homeId].unlockedItems).toContain('item:beanie-red')
  })

  it('counts the same chore ticked off on both devices once', async () => {
    const { server, phone, tablet } = await pair()
    server.offline = true
    finish(phone, 'Dishes', 6)
    finish(tablet, 'Dishes', 6)
    server.offline = false
    await phone.sync()
    await tablet.sync()
    await phone.sync()
    expect(Object.keys(server.tables.completions)).toHaveLength(2)
    expect(progressOf(phone).choreCount).toBe(1)
    expect(progressOf(tablet).choreCount).toBe(1)
  })
})

describe('first sync for an account', () => {
  it('stays unhydrated until the first pull, so onboarding waits for a saved home', async () => {
    const { server, remote } = fakeServer()
    const phone = await onboarded(remote)
    expect(phone.getState().hydrated).toBe(true)
    let release = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const slow: Remote = { ...remote, pull: () => gate.then(() => structuredClone(server.tables)) }
    const tablet = createStore({ local: memoryStore(), remote: slow })
    await tablet.start()
    expect(tablet.getState()).toMatchObject({ ready: true, hydrated: false })
    const synced = tablet.sync()
    await new Promise((r) => setTimeout(r, 0))
    expect(tablet.getState().hydrated).toBe(false)
    release()
    await synced
    expect(tablet.getState().hydrated).toBe(true)
    expect(selectHome(tablet.getState().snapshot.tables).home).not.toBeNull()
  })

  it('hydrates at once without a server, and when offline', async () => {
    expect(createStore({ local: memoryStore(), remote: null }).getState().hydrated).toBe(true)
    const { server, remote } = fakeServer()
    server.offline = true
    const store = createStore({ local: memoryStore(), remote })
    await store.start()
    await store.sync()
    expect(store.getState().hydrated).toBe(true)
  })
})

describe('signing in to a saved account on a flaky connection', () => {
  it('keeps waiting for the saved home when its first pull fails, then shows it', async () => {
    const { server, remote } = fakeServer('u2')
    // The account u2 already has a home on the server.
    const other = createStore({ local: memoryStore(), remote })
    await other.start()
    await other.sync()
    other.apply(...createHousehold({ species: 'mochi', petName: 'Mo', userId: 'u2' }))
    await other.sync()

    // This device was a guest (u1) and now signs in as u2; the first pull fails.
    const local = memoryStore()
    const guest = await onboarded(fakeServer('u1').remote, local)
    expect(selectHome(guest.getState().snapshot.tables).home).not.toBeNull()
    let failPull = true
    const flaky: Remote = { ...remote, pull: () => (failPull ? Promise.reject(new Error('Failed to fetch')) : remote.pull()) }
    const device = createStore({ local, remote: flaky })
    await device.start()
    await device.sync()
    expect(device.getState()).toMatchObject({ hydrated: false, sync: 'error' })
    expect(selectHome(device.getState().snapshot.tables).home).toBeNull()

    failPull = false
    await device.sync()
    expect(device.getState().hydrated).toBe(true)
    expect(selectHome(device.getState().snapshot.tables).pet?.name).toBe('Mo')
    expect(server.tables.homes).not.toEqual({})
  })
})

describe('changes made while sync is signing in', () => {
  it('are kept and sent, not overwritten by the snapshot from before the wait', async () => {
    const { server, remote } = fakeServer()
    const phone = await onboarded(remote)
    let release = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const slow = createStore({ local: memoryStore(phone.getState().snapshot), remote: { ...remote, session: () => gate.then(() => 'u1') } })
    await slow.start()
    slow.apply(...dishes(slow)) // starts a sync, which waits on the session
    const { home } = selectHome(slow.getState().snapshot.tables)
    slow.apply(...addChore(home!, { name: 'Bins', schedule: { kind: 'daily' } }, '2026-10-01'))
    release()
    await slow.sync()
    const names = (s: Record<string, Chore>) => Object.values(s).map((c) => c.name).sort()
    expect(names(slow.getState().snapshot.tables.chores)).toEqual(['Bins', 'Dishes'])
    expect(names(server.tables.chores)).toEqual(['Bins', 'Dishes'])
  })
})
