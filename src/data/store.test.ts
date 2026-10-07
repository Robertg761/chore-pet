import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Chore, Progress } from '../domain/types'
import { addChore, completeChore, completeChoreWithRewards, createHousehold, removeChore } from './actions'
import { memoryStore, volatileStore, type LocalStore } from './local'
import type { Remote, RemoteResult } from './remote'
import { change, emptySnapshot, emptyTables, selectHome, type Snapshot, type Tables } from './state'
import { MAX_ATTEMPTS, createStore, type Store, type StoreChannel, type StoreMessage } from './store'
import { keyOf, type TableName } from './tables'

/** What supabase/migrations/0004_progress_merge.sql does to an updated progress row. */
function mergeLikeTrigger(old: Progress, row: Progress): Progress {
  return {
    ...row,
    unlockedItems: [...new Set([...old.unlockedItems, ...row.unlockedItems])],
    bestStreak: Math.max(old.bestStreak, row.bestStreak),
    choreCount: Math.max(old.choreCount, row.choreCount),
    retired: Object.fromEntries(
      [...new Set([...Object.keys(old.retired ?? {}), ...Object.keys(row.retired ?? {})])].map((k) => [k, Math.max(old.retired?.[k] ?? 0, row.retired?.[k] ?? 0)]),
    ),
  }
}

/** An in-memory server. `offline` makes every call fail like a dropped connection. */
function fakeServer(userId = 'u1') {
  const server = {
    tables: emptyTables(),
    offline: false,
    /** Answer for a refused row: permanent unless set otherwise. */
    refuse: (_table: TableName, _row: unknown): false | RemoteResult => false,
    calls: [] as string[],
    user: userId,
  }
  const down = (): RemoteResult => ({ ok: false, transient: true, message: 'Failed to fetch' })
  const remote: Remote = {
    async session() {
      if (server.offline) throw new Error('Failed to fetch')
      return server.user
    },
    async pull() {
      if (server.offline) throw new Error('Failed to fetch')
      return structuredClone(server.tables)
    },
    async upsert(table, rows) {
      server.calls.push(`upsert ${table} ${rows.length}`)
      if (server.offline) return down()
      for (const r of rows) {
        const refused = server.refuse(table, r)
        if (refused) return refused
      }
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

const settle = () => new Promise((r) => setTimeout(r, 0))

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

  it('sets aside only the row the server refuses, not the whole batch', async () => {
    const { server, remote } = fakeServer()
    const local = memoryStore()
    const store = await onboarded(remote, local)
    server.refuse = (table, row) => table === 'chores' && (row as Chore).name === 'Bad' && { ok: false, transient: false, message: 'refused' }
    const { home } = selectHome(store.getState().snapshot.tables)
    store.apply(
      ...addChore(home!, { name: 'Good', schedule: { kind: 'daily' } }, '2026-10-01'),
      ...addChore(home!, { name: 'Bad', schedule: { kind: 'daily' } }, '2026-10-01'),
    )
    await store.sync()
    expect(store.getState().sync).toBe('synced')
    expect(Object.values(server.tables.chores).map((c) => c.name)).toEqual(['Good'])
    expect(selectHome(store.getState().snapshot.tables).chores.map((c) => c.name)).toEqual(['Good'])
    // Not dropped silently: kept on the snapshot (and saved) for the UI to mention.
    expect(store.getState().rejectedCount).toBe(1)
    expect(store.getState().snapshot.rejected?.[0]).toMatchObject({ message: 'refused', op: { table: 'chores', value: { name: 'Bad' } } })
    await settle()
    expect(local.current?.rejected).toHaveLength(1)
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

/** Tabs in one browser: every channel hears every other channel's messages, like a BroadcastChannel. */
function channelBus() {
  const listeners = new Set<(m: StoreMessage) => void>()
  return (): StoreChannel => {
    let mine: ((m: StoreMessage) => void) | null = null
    return {
      post: (m) => listeners.forEach((l) => l !== mine && l(m)),
      listen(fn) {
        mine = fn
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
    }
  }
}

const choreNames = (tables: Tables) => Object.values(tables.chores).map((c) => c.name).sort()

describe('changes the server refuses', () => {
  it('waits out a schema mismatch (a migration not applied yet) instead of setting the row aside', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    let migrated = false
    server.refuse = (table) => table === 'chores' && !migrated && { ok: false, transient: true, kind: 'schema', message: 'Could not find the column' }
    store.apply(...dishes(store))
    await store.sync()
    expect(store.getState()).toMatchObject({ sync: 'error', rejectedCount: 0, pendingCount: 1 })
    expect(selectHome(store.getState().snapshot.tables).chores).toHaveLength(1)
    await store.sync()
    expect(store.getState().rejectedCount).toBe(0)

    migrated = true
    await store.sync()
    expect(store.getState()).toMatchObject({ sync: 'synced', rejectedCount: 0, pendingCount: 0 })
    expect(choreNames(server.tables)).toEqual(['Dishes'])
  })

  it('sets a row aside after it keeps getting stuck (a 413 with no code), so the queue moves again', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    server.refuse = (table, row) => table === 'chores' && (row as Chore).name === 'Huge' && { ok: false, transient: true, kind: 'stuck', message: 'Payload Too Large' }
    const { home } = selectHome(store.getState().snapshot.tables)
    store.apply(...addChore(home!, { name: 'Huge', schedule: { kind: 'daily' } }, '2026-10-01'))
    store.apply(...addChore(home!, { name: 'Fine', schedule: { kind: 'daily' } }, '2026-10-01'))
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      await store.sync()
      expect(store.getState(), `try ${i}`).toMatchObject({ sync: 'error', rejectedCount: 0 })
    }
    // The good row went through meanwhile.
    expect(choreNames(server.tables)).toEqual(['Fine'])
    await store.sync()
    expect(store.getState()).toMatchObject({ sync: 'synced', rejectedCount: 1, pendingCount: 0 })
    expect(store.getState().snapshot.rejected?.[0].message).toBe('Payload Too Large')
  })

  it('never counts a network outage against a row', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    store.apply(...dishes(store))
    server.offline = true
    for (let i = 0; i < MAX_ATTEMPTS * 2; i++) await store.sync()
    server.offline = false
    await store.sync()
    expect(store.getState()).toMatchObject({ sync: 'synced', rejectedCount: 0 })
    expect(choreNames(server.tables)).toEqual(['Dishes'])
  })

  it('can queue set-aside rows again, or forget them', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    let allowed = false
    server.refuse = (table) => table === 'chores' && !allowed && { ok: false, transient: false, message: 'refused' }
    store.apply(...dishes(store))
    await store.sync()
    expect(store.getState().rejectedCount).toBe(1)
    allowed = true
    store.retryRejected()
    await store.sync()
    expect(store.getState().rejectedCount).toBe(0)
    expect(choreNames(server.tables)).toEqual(['Dishes'])

    allowed = false
    const { home } = selectHome(store.getState().snapshot.tables)
    store.apply(...addChore(home!, { name: 'Bins', schedule: { kind: 'daily' } }, '2026-10-01'))
    await store.sync()
    expect(store.getState().rejectedCount).toBe(1)
    store.dismissRejected()
    expect(store.getState().rejectedCount).toBe(0)
  })
})

describe('retrying after a failed sync', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('backs off exponentially up to the cap, and stops once a sync works', async () => {
    vi.useFakeTimers()
    const { server, remote } = fakeServer()
    let sessions = 0
    const counted: Remote = { ...remote, session: () => (sessions++, remote.session()), currentUser: async () => 'u1' }
    const store = createStore({ local: memoryStore(), remote: counted, backoff: { baseMs: 1000, maxMs: 4000 } })
    await store.start()
    await vi.runAllTimersAsync()
    expect(sessions).toBe(1)

    server.offline = true
    await store.sync()
    expect(sessions).toBe(2)
    // 1s, 2s, 4s, then capped at 4s.
    for (const [wait, total] of [[999, 2], [1, 3], [2000, 4], [4000, 5], [4000, 6]] as const) {
      await vi.advanceTimersByTimeAsync(wait)
      expect(sessions, `after ${wait}ms`).toBe(total)
    }
    server.offline = false
    await vi.advanceTimersByTimeAsync(4000)
    expect(store.getState().sync).toBe('synced')
    const after = sessions
    await vi.advanceTimersByTimeAsync(60_000)
    expect(sessions).toBe(after)
  })

  it('does not retry on a timer while the device is offline (the online event does that)', async () => {
    vi.useFakeTimers()
    const { remote } = fakeServer()
    let sessions = 0
    const store = createStore({ local: memoryStore(), remote: { ...remote, session: () => (sessions++, remote.session()) }, isOnline: () => false, backoff: { baseMs: 1000, maxMs: 4000 } })
    await store.start()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(store.getState().sync).toBe('offline')
    expect(sessions).toBe(0)
  })
})

describe('the offline copy', () => {
  it('says so when it only lives in memory (no IndexedDB)', async () => {
    const store = createStore({ local: volatileStore(), remote: null })
    await store.start()
    store.apply(...createHousehold({ species: 'bun', petName: 'Pip', userId: null }))
    await settle()
    expect(store.getState()).toMatchObject({ ready: true, savedLocally: false })
  })

  it('stops waiting for a stuck load, runs from memory, and never writes over the stored copy', async () => {
    let saves = 0
    const stuck: LocalStore = { load: () => new Promise(() => {}), save: async () => void saves++ }
    const store = createStore({ local: stuck, remote: null, loadTimeoutMs: 20 })
    await store.start()
    expect(store.getState()).toMatchObject({ ready: true, savedLocally: false })
    store.apply(...createHousehold({ species: 'bun', petName: 'Pip', userId: null }))
    await settle()
    expect(selectHome(store.getState().snapshot.tables).pet?.name).toBe('Pip')
    expect(saves).toBe(0)
  })

  it('is loaded before any sync runs, even one started before start()', async () => {
    const { server, remote } = fakeServer()
    const phone = await onboarded(remote)
    phone.apply(...dishes(phone))
    await phone.sync()
    server.offline = true
    phone.apply(...addChore(selectHome(phone.getState().snapshot.tables).home!, { name: 'Offline', schedule: { kind: 'daily' } }, '2026-10-01'))
    await settle()
    const saved = structuredClone(phone.getState().snapshot)
    server.offline = false

    let release = () => {}
    const gate = new Promise<void>((r) => (release = r))
    const local = memoryStore(saved)
    const slow: LocalStore = { ...local, load: () => gate.then(() => local.load()) }
    const reopened = createStore({ local: slow, remote })
    const synced = reopened.sync() // e.g. a SIGNED_IN event right at start-up
    await settle()
    expect(server.calls.filter((c) => c.startsWith('upsert chores'))).toHaveLength(1)
    release()
    await synced
    expect(choreNames(server.tables)).toEqual(['Dishes', 'Offline'])
    expect(choreNames(reopened.getState().snapshot.tables)).toEqual(['Dishes', 'Offline'])
  })
})

describe('switching accounts', () => {
  it('backs up the old snapshot before dropping it (audit: a replaced session lost offline edits)', async () => {
    const { server, remote } = fakeServer('u1')
    const local = memoryStore()
    const store = await onboarded(remote, local)
    server.offline = true
    store.apply(...addChore(selectHome(store.getState().snapshot.tables).home!, { name: 'Offline chore', schedule: { kind: 'daily' } }, '2026-10-07'))
    await store.sync()
    server.offline = false
    server.user = 'anon-new' // refresh token revoked: a new anonymous account
    await store.sync()
    await settle()
    expect(store.getState().snapshot.userId).toBe('anon-new')
    const backup = local.backups['snapshot-backup-u1'] as Snapshot
    expect(choreNames(backup.tables)).toEqual(['Offline chore'])
    expect(Object.values(backup.outbox).some((op) => op.table === 'chores')).toBe(true)
  })

  it('stops a flush when the account changes partway, so old rows never go out under the new account', async () => {
    const { server, remote } = fakeServer('u1')
    const local = memoryStore()
    const store = createStore({ local, remote })
    await store.start()
    await store.sync()
    server.offline = true
    store.apply(...createHousehold({ species: 'bun', petName: 'Pip', userId: 'u1' })) // homes, rooms, pets, progress
    await store.sync()
    server.offline = false
    server.calls.length = 0

    // The first step goes out as u1; then the session becomes u2 (signed in elsewhere in this browser).
    let checks = 0
    const switching: Remote = {
      ...remote,
      currentUser: async () => (++checks > 1 ? 'u2' : 'u1'),
      session: async () => (checks > 1 ? 'u2' : 'u1'),
      // u2's own home (row-level security hides u1's rows from it).
      pull: async () => (checks > 1 ? emptyTables() : remote.pull()),
    }
    const tab = createStore({ local, remote: switching })
    await tab.start()
    await tab.sync()
    expect(server.calls).toEqual(['upsert homes 1'])
    expect(tab.getState().snapshot.userId).toBe('u2')
    await settle()
    expect(Object.keys((local.backups['snapshot-backup-u1'] as Snapshot).outbox).length).toBeGreaterThan(0)
  })
})

describe('reset (signing out, deleting the account)', () => {
  it('forgets the home, keeping a backup when anything was unsynced, and pauses syncing meanwhile', async () => {
    const { server, remote } = fakeServer('u1')
    const local = memoryStore()
    const store = await onboarded(remote, local)
    server.offline = true
    store.apply(...dishes(store))
    await store.sync()
    expect(store.getState().pendingCount).toBe(1)
    server.offline = false

    const resume = store.pause()
    await store.reset()
    await store.sync() // held while paused
    expect(server.calls.filter((c) => c.startsWith('upsert chores'))).toHaveLength(0)
    expect(store.getState()).toMatchObject({ pendingCount: 0, hydrated: false })
    expect(store.getState().snapshot.userId).toBeNull()
    expect(selectHome(store.getState().snapshot.tables).home).toBeNull()
    expect(local.current?.userId).toBeNull()
    expect(choreNames((local.backups['snapshot-backup-u1'] as Snapshot).tables)).toEqual(['Dishes'])

    server.user = 'u-new'
    resume()
    await store.sync()
    expect(store.getState()).toMatchObject({ hydrated: true, sync: 'synced' })
    expect(store.getState().snapshot.userId).toBe('u-new')
  })

  it('does not hang on a stuck sync, and the stuck sync never touches the fresh home', async () => {
    const { server, remote } = fakeServer('u1')
    let release = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    let stuck = false
    const hung: Remote = { ...remote, upsert: (table, rows) => (stuck ? gate.then(() => remote.upsert(table, rows)) : remote.upsert(table, rows)) }
    const store = createStore({ local: memoryStore(), remote: hung, resetWaitMs: 10 })
    await store.start()
    await store.sync()
    stuck = true
    store.apply(...createHousehold({ species: 'bun', petName: 'Pip', userId: 'u1' }))
    void store.sync() // hangs on the upsert
    await new Promise((r) => setTimeout(r, 0))
    await store.reset()
    expect(store.getState().snapshot.userId).toBeNull()

    stuck = false
    server.user = 'u-new'
    await store.sync() // the fresh home syncs without waiting for the stuck one
    expect(store.getState()).toMatchObject({ sync: 'synced', hydrated: true })
    const fresh = store.getState().snapshot
    expect(fresh.userId).toBe('u-new')

    release()
    await new Promise((r) => setTimeout(r, 0))
    expect(store.getState().snapshot).toBe(fresh)
  })

  it('keeps no backup when the account was deleted', async () => {
    const { remote } = fakeServer('u1')
    const local = memoryStore()
    const store = await onboarded(remote, local)
    await local.backup!('u1', store.getState().snapshot)
    await store.reset({ backup: false })
    expect(local.backups).toEqual({})
  })
})

describe('two tabs sharing one offline copy', () => {
  async function twoTabs() {
    const { server, remote } = fakeServer()
    const shared = memoryStore()
    const bus = channelBus()
    const a = createStore({ local: shared, remote, channel: bus() })
    await a.start()
    await a.sync()
    a.apply(...createHousehold({ species: 'bun', petName: 'P', userId: 'u1' }))
    await a.sync()
    const b = createStore({ local: shared, remote, channel: bus() })
    await b.start()
    await b.sync()
    await settle()
    return { server, shared, a, b }
  }
  const add = (s: Store, name: string) => s.apply(...addChore(selectHome(s.getState().snapshot.tables).home!, { name, schedule: { kind: 'daily' } }, '2026-10-07'))

  it('keeps offline edits from both tabs (audit: the second tab’s save wiped the first’s)', async () => {
    const { server, shared, a, b } = await twoTabs()
    server.offline = true
    add(a, 'Tab A chore')
    await a.sync()
    await settle()
    add(b, 'Tab B chore')
    await b.sync()
    await settle()
    await settle()

    expect(choreNames((shared.current as Snapshot).tables)).toEqual(['Tab A chore', 'Tab B chore'])
    expect(Object.keys((shared.current as Snapshot).outbox)).toHaveLength(2)
    // Each tab hears the other's save and shows both.
    expect(choreNames(a.getState().snapshot.tables)).toEqual(['Tab A chore', 'Tab B chore'])
    expect(choreNames(b.getState().snapshot.tables)).toEqual(['Tab A chore', 'Tab B chore'])

    server.offline = false
    await a.sync()
    expect(choreNames(server.tables)).toEqual(['Tab A chore', 'Tab B chore'])
  })

  it('does not resend a change the other tab already sent, over a newer one', async () => {
    const { server, a, b } = await twoTabs()
    server.offline = true
    add(b, 'Dishes')
    await b.sync()
    await settle()
    server.offline = false
    const id = Object.values(a.getState().snapshot.tables.chores)[0].id
    await a.sync() // tab A sends tab B's change
    await settle()
    // A newer edit on the server, from another device.
    ;(server.tables.chores[id] as Chore).name = 'Dishes (renamed on phone)'
    await b.sync()
    await settle()
    expect(server.tables.chores[id].name).toBe('Dishes (renamed on phone)')
    expect(b.getState().pendingCount).toBe(0)
  })

  it('follows the other tab when it signs out', async () => {
    const { a, b } = await twoTabs()
    const resume = a.pause()
    await a.reset()
    await settle()
    await settle()
    expect(selectHome(b.getState().snapshot.tables).home).toBeNull()
    resume()
  })
})

describe('a missing progress row', () => {
  it('is recreated once the server’s copy has been pulled, with the rewards already earned', async () => {
    const { server, remote } = fakeServer()
    const store = await onboarded(remote)
    store.apply(...dishes(store))
    const d = selectHome(store.getState().snapshot.tables)
    store.apply(...completeChore(d.chores[0], d.progress, new Date(2026, 9, 6, 9)))
    await store.sync()
    // The progress row never made it (e.g. refused); the next sync pulls without it.
    server.tables.progress = {}
    await store.sync()
    const homeId = d.home!.id
    expect(selectHome(store.getState().snapshot.tables).progress).toMatchObject({ homeId, choreCount: 1 })
    expect(server.tables.progress[homeId]).toMatchObject({ unlockedItems: ['item:beanie-red'] })
  })
})

describe('deleted chores', () => {
  // Audit repro: if deleting a chore's completions didn't reach the server
  // after its banked count did, another device counted them twice.
  it('count once, even while their completions are still on the server', async () => {
    const { remote, server } = fakeServer()
    let failDeletes = false
    const flaky: Remote = { ...remote, remove: (t, k) => (failDeletes ? Promise.resolve({ ok: false, transient: true, message: 'Failed to fetch' }) : remote.remove(t, k)) }
    const phone = await onboarded(flaky)
    phone.apply(...dishes(phone))
    for (let i = 1; i <= 4; i++) {
      const d = selectHome(phone.getState().snapshot.tables)
      phone.apply(...completeChoreWithRewards(d.chores[0], d.progress, { chores: d.chores, completions: d.completions, vacations: [] }, new Date(2026, 9, i, 12)).ops)
    }
    await phone.sync()
    failDeletes = true
    const d = selectHome(phone.getState().snapshot.tables)
    phone.apply(...removeChore(d.chores[0].id, d))
    await phone.sync()
    expect(Object.keys(server.tables.completions)).toHaveLength(4)

    const tablet = createStore({ local: memoryStore(), remote })
    await tablet.start()
    await tablet.sync()
    expect(selectHome(tablet.getState().snapshot.tables).progress?.choreCount).toBe(4)
  })
})

describe('a failed save', () => {
  it('never makes this tab forget its own unsaved changes on the next save', async () => {
    const shared = memoryStore()
    let failNext = false
    const flaky: LocalStore = {
      ...shared,
      update: async (fn) => {
        if (failNext) {
          failNext = false
          fn(await shared.load()) // the transaction ran, then the write failed
          throw new Error('QuotaExceededError')
        }
        return shared.update!(fn)
      },
    }
    const store = createStore({ local: flaky, remote: null })
    await store.start()
    store.apply(...createHousehold({ species: 'bun', petName: 'Pip', userId: null }))
    await settle()
    failNext = true
    store.apply(...addChore(selectHome(store.getState().snapshot.tables).home!, { name: 'Dishes', schedule: { kind: 'daily' } }, '2026-10-01'))
    await settle()
    expect(store.getState().savedLocally).toBe(false)
    store.apply(...addChore(selectHome(store.getState().snapshot.tables).home!, { name: 'Bins', schedule: { kind: 'daily' } }, '2026-10-01'))
    await settle()
    expect(store.getState().savedLocally).toBe(true)
    expect(choreNames((shared.current as Snapshot).tables)).toEqual(['Bins', 'Dishes'])
    expect(choreNames(store.getState().snapshot.tables)).toEqual(['Bins', 'Dishes'])
  })
})

describe('saved homes (backups kept on this device)', () => {
  it('lists a saved home and brings it back, keeping the replaced one', async () => {
    const { remote } = fakeServer('u1')
    const local = memoryStore()
    const store = await onboarded(remote, local)
    const guest = createHousehold({ species: 'mochi', petName: 'Bun', userId: 'guest' }).reduce(change, emptySnapshot('guest'))
    await local.backup!('guest', guest)

    expect((await store.savedHomes()).map((h) => [h.ownerId, h.petName])).toEqual([['guest', 'Bun']])
    expect(await store.restoreSaved('guest')).toBe(true)
    expect(selectHome(store.getState().snapshot.tables).pet?.name).toBe('Bun')
    // The guest copy now lives in the account; Pip's home is kept on this device to swap back.
    expect((await store.savedHomes()).map((h) => [h.ownerId, h.petName])).toEqual([['u1', 'Pip']])
    expect(await store.restoreSaved('u1')).toBe(true)
    expect(selectHome(store.getState().snapshot.tables).pet?.name).toBe('Pip')
  })

  it('has nothing to offer without a store that keeps backups', async () => {
    const store = createStore({ local: volatileStore(), remote: null })
    await store.start()
    expect(await store.savedHomes()).toEqual([])
    expect(await store.restoreSaved('guest')).toBe(false)
  })
})

