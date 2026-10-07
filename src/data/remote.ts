import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureSession, getSupabase, supabaseConfigured } from '../lib/supabase'
import { KEY_COLUMN, MAPPERS } from './mappers'
import { classifyError, type ErrorKind } from './remoteErrors'
import { emptyTables, type Tables, type Removal } from './state'
import { TABLES, keyOf, type TableMap, type TableName } from './tables'

/**
 * `kind` says how to retry (see classifyError); without it a transient
 * failure counts as an outage and a non-transient one as permanent.
 */
export type RemoteResult = { ok: true } | { ok: false; transient: boolean; message: string; kind?: ErrorKind }

/** The server side of sync. Swappable so the sync engine can be tested offline. */
export interface Remote {
  /** Signs in (anonymously if needed) and returns the user id, or throws when offline. */
  session(): Promise<string>
  /**
   * Who is signed in right now, without signing anyone in (null when signed
   * out). Checked between sync steps so one account's queued rows are never
   * sent with another account's token. Falls back to session() when missing.
   */
  currentUser?(): Promise<string | null>
  /** Only report provenance for the session whose ID was just claimed. */
  ownerKind?(userId: string): Promise<'guest' | 'saved'>
  pull(): Promise<Tables>
  upsert<T extends TableName>(table: T, rows: TableMap[T][]): Promise<RemoteResult>
  remove(table: TableName, keys: string[], removal?: Removal): Promise<RemoteResult>
}

/**
 * Rows per request when pulling. PostgREST caps every response (max_rows,
 * 1000 on Supabase), so a pull pages until a page comes back short. Must not
 * be above the API's max rows, or a capped page would look like the last one.
 */
export const PAGE_SIZE = 1000

/** A failed request; see classifyError for what is worth retrying. */
function result(error: { code?: string; message: string } | null, status?: number): RemoteResult {
  if (!error) return { ok: true }
  const kind = classifyError({ code: error.code || undefined, status })
  return { ok: false, transient: kind !== 'permanent', message: error.message, kind }
}

/**
 * Every row of one table, a page at a time. Keyset paging (after the last
 * key seen, in key order) rather than offsets, so a row deleted elsewhere
 * between two pages can't shift the next page and skip a row.
 */
async function pullTable(client: SupabaseClient, table: TableName): Promise<Record<string, unknown>[]> {
  const key = KEY_COLUMN[table]
  const all: Record<string, unknown>[] = []
  let after: string | null = null
  for (;;) {
    let query = client.from(table).select('*').order(key, { ascending: true }).limit(PAGE_SIZE)
    if (after !== null) query = query.gt(key, after)
    const { data, error } = await query
    if (error) throw new Error(`pull ${table}: ${error.message}`)
    const rows = (data ?? []) as Record<string, unknown>[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
    after = String(rows[rows.length - 1][key])
  }
}

export function supabaseRemote(getClient: () => Promise<SupabaseClient>): Remote {
  return {
    async session() {
      const s = await ensureSession()
      if (!s) throw new Error('No session')
      return s.user.id
    },
    async currentUser() {
      const client = await getClient()
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      return data.session?.user.id ?? null
    },
    async ownerKind(userId) {
      const client = await getClient()
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      if (data.session?.user.id !== userId) throw new Error('The account changed while syncing')
      return data.session.user.is_anonymous ? 'guest' : 'saved'
    },
    async pull() {
      const client = await getClient()
      const tables = emptyTables()
      await Promise.all(
        TABLES.map(async (table) => {
          const rows = tables[table] as Record<string, unknown>
          for (const row of await pullTable(client, table)) {
            const value = MAPPERS[table].fromRow(row)
            rows[keyOf(table, value as never)] = value
          }
        }),
      )
      return tables
    },
    async upsert(table, rows) {
      const client = await getClient()
      const mapper = MAPPERS[table]
      const { error, status } = await client.from(table).upsert(rows.map((r) => mapper.toRow(r)), { onConflict: KEY_COLUMN[table] })
      return result(error, status)
    },
    async remove(table, keys, removal) {
      const client = await getClient()
      if (table === 'placed_objects' && removal) {
        const { error, status } = await client.rpc('remove_objects', { object_ids: keys, archive_on: removal.archivedOn, keep_chores: removal.keepChores ?? false })
        return result(error, status)
      }
      const { error, status } = await client.from(table).delete().in(KEY_COLUMN[table], keys)
      return result(error, status)
    },
  }
}

async function configuredClient(): Promise<SupabaseClient> {
  const client = await getSupabase()
  if (!client) throw new Error('Supabase is not configured')
  return client
}

export const appRemote: Remote | null = supabaseConfigured ? supabaseRemote(configuredClient) : null
