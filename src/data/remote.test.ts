import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { addChore, completeChoreWithRewards, createHousehold } from './actions'
import { memoryStore } from './local'
import { KEY_COLUMN, MAPPERS } from './mappers'
import { PAGE_SIZE, supabaseRemote, type Remote } from './remote'
import { selectHome } from './state'
import { createStore } from './store'
import { TABLES, type TableName } from './tables'

type Row = Record<string, unknown>

/**
 * Just enough of a PostgREST client: select with order / gt / limit, upsert
 * and delete. Like Supabase, it never returns more than `maxRows` rows per
 * request, whatever the query asks for.
 */
function fakePostgrest(maxRows = 1000) {
  const db: Record<string, Row[]> = Object.fromEntries(TABLES.map((t) => [t, []]))
  const requests: string[] = []
  const answer = (value: unknown) => Promise.resolve(value)

  function select(table: string) {
    let orderBy: string | null = null
    let after: { col: string; value: string } | null = null
    let limit = Infinity
    const query = {
      order(col: string) {
        orderBy = col
        return query
      },
      gt(col: string, value: string) {
        after = { col, value }
        return query
      },
      limit(n: number) {
        limit = n
        return query
      },
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        requests.push(`select ${table}${after ? ` after ${after.value}` : ''}`)
        let rows = [...db[table]]
        if (orderBy) rows.sort((a, b) => String(a[orderBy!]).localeCompare(String(b[orderBy!])))
        if (after) rows = rows.filter((r) => String(r[after!.col]) > after!.value)
        rows = rows.slice(0, Math.min(limit, maxRows))
        return answer({ data: structuredClone(rows), error: null, status: 200 }).then(resolve, reject)
      },
    }
    return query
  }

  const client = {
    from(table: string) {
      return {
        select: () => select(table),
        upsert(rows: Row[], { onConflict }: { onConflict: string }) {
          for (const row of rows) {
            const i = db[table].findIndex((r) => r[onConflict] === row[onConflict])
            if (i >= 0) db[table][i] = { ...db[table][i], ...row }
            else db[table].push({ ...row })
          }
          return answer({ error: null, status: 201 })
        },
        delete: () => ({
          in(col: string, keys: string[]) {
            db[table] = db[table].filter((r) => !keys.includes(r[col] as string))
            return answer({ error: null, status: 204 })
          },
        }),
      }
    },
  }
  return { db, requests, client: client as unknown as SupabaseClient }
}

/** A real supabaseRemote over the fake client, signed in as u1. */
function remoteOver(client: SupabaseClient): Remote {
  return { ...supabaseRemote(async () => client), session: async () => 'u1', ownerKind: async () => 'saved', currentUser: async () => 'u1' }
}

const day = (i: number) => new Date(Date.UTC(2023, 0, 1 + i)).toISOString().slice(0, 10)

describe('pull', () => {
  it('pages past the server’s 1000-row cap, so no row is left behind', async () => {
    const { db, requests, client } = fakePostgrest(1000)
    for (let i = 0; i < 2500; i++) {
      db.completions.push(MAPPERS.completions.toRow({ id: `c-${String(i).padStart(5, '0')}`, choreId: 'ch', completedAt: '', completedOn: day(i) }))
    }
    const tables = await remoteOver(client).pull()
    expect(Object.keys(tables.completions)).toHaveLength(2500)
    expect(requests.filter((r) => r.startsWith('select completions'))).toHaveLength(3)
  })

  it('asks once more when the last page is exactly full', async () => {
    const { db, requests, client } = fakePostgrest(PAGE_SIZE)
    for (let i = 0; i < PAGE_SIZE; i++) db.chores.push({ id: `k-${String(i).padStart(5, '0')}`, home_id: 'h', name: 'x', schedule: { kind: 'daily' }, created_on: '2026-01-01' })
    const tables = await remoteOver(client).pull()
    expect(Object.keys(tables.chores)).toHaveLength(PAGE_SIZE)
    expect(requests.filter((r) => r.startsWith('select chores'))).toHaveLength(2)
  })

  it('pages every table by its primary key', async () => {
    const { requests, client } = fakePostgrest()
    await remoteOver(client).pull()
    expect(requests.sort()).toEqual(TABLES.map((t) => `select ${t}`).sort())
    expect(KEY_COLUMN.progress).toBe('home_id')
  })

  it('reads when homes and rooms were created, so the oldest shows first', async () => {
    const { db, client } = fakePostgrest()
    db.homes.push({ id: 'h1', owner_id: 'u1', name: 'Home', vacations: [], created_at: '2026-01-01T00:00:00+00:00' })
    const tables = await remoteOver(client).pull()
    expect(tables.homes.h1.createdAt).toBe('2026-01-01T00:00:00+00:00')
    // Never written back: the database owns it.
    expect(MAPPERS.homes.toRow(tables.homes.h1)).not.toHaveProperty('created_at')
  })
})

describe('a long history', () => {
  // Audit repro: with 1000+ completions on the server, a chore done just now
  // flipped back to late after the next sync, and the count dropped.
  it('keeps a chore done just now done after a sync', async () => {
    const { db, client } = fakePostgrest(1000)
    const store = createStore({ local: memoryStore(), remote: remoteOver(client) })
    await store.start()
    await store.sync()
    store.apply(...createHousehold({ species: 'bun', petName: 'P', userId: 'u1' }))
    let d = selectHome(store.getState().snapshot.tables)
    store.apply(...addChore(d.home!, { name: 'Dishes', schedule: { kind: 'daily' } }, '2023-01-01'))
    await store.sync()
    d = selectHome(store.getState().snapshot.tables)
    const chore = d.chores[0]
    // 1000 days of history already on the server, sorting before anything new.
    for (let i = 0; i < 1000; i++) db.completions.push({ id: `0-old-${String(i).padStart(4, '0')}`, chore_id: chore.id, completed_at: '', completed_on: day(i), counts: true })
    await store.sync()

    d = selectHome(store.getState().snapshot.tables)
    const done = completeChoreWithRewards(chore, d.progress, { chores: d.chores, completions: d.completions, vacations: [] }, new Date(2026, 9, 7, 12))
    store.apply(...done.ops)
    await store.sync()

    d = selectHome(store.getState().snapshot.tables)
    expect(d.completions).toHaveLength(1001)
    expect(d.completions.some((c) => c.completedOn === '2026-10-07')).toBe(true)
    expect(d.progress?.choreCount).toBe(1001)
  })
})

describe('failed writes', () => {
  function failing(error: { code?: string; message: string } | null, status: number) {
    const client = {
      from: () => ({
        upsert: () => Promise.resolve({ error, status }),
        delete: () => ({ in: () => Promise.resolve({ error, status }) }),
      }),
    } as unknown as SupabaseClient
    return supabaseRemote(async () => client)
  }
  const tables: TableName[] = ['chores']

  it('say how to retry them', async () => {
    expect(await failing({ code: '23505', message: 'duplicate' }, 409).upsert(tables[0], [])).toMatchObject({ ok: false, transient: false, kind: 'permanent' })
    expect(await failing({ code: 'PGRST204', message: 'no column' }, 400).upsert(tables[0], [])).toMatchObject({ ok: false, transient: true, kind: 'schema' })
    expect(await failing({ code: '', message: 'TypeError: Failed to fetch' }, 0).remove(tables[0], ['x'])).toMatchObject({ ok: false, transient: true, kind: 'outage' })
    expect(await failing({ message: 'Payload Too Large' }, 413).upsert(tables[0], [])).toMatchObject({ ok: false, transient: true, kind: 'stuck' })
    expect(await failing(null, 201).upsert(tables[0], [])).toEqual({ ok: true })
  })
})

describe('atomic object removal', () => {
  it('sends keep-chore intent and the local end date to the database transaction', async () => {
    const calls: unknown[] = []
    const client = { rpc: async (...args: unknown[]) => { calls.push(args); return { error: null, status: 200 } } } as unknown as SupabaseClient
    expect(await remoteOver(client).remove('placed_objects', ['object'], { archivedOn: '2026-10-06', keepChores: true })).toEqual({ ok: true })
    expect(calls).toEqual([['remove_objects', { object_ids: ['object'], archive_on: '2026-10-06', keep_chores: true }]])
  })
})
