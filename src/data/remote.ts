import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureSession, supabase } from '../lib/supabase'
import { KEY_COLUMN, MAPPERS } from './mappers'
import { emptyTables, type Tables } from './state'
import { TABLES, keyOf, type TableMap, type TableName } from './tables'

export type RemoteResult = { ok: true } | { ok: false; transient: boolean; message: string }

/** The server side of sync. Swappable so the sync engine can be tested offline. */
export interface Remote {
  /** Signs in (anonymously if needed) and returns the user id, or throws when offline. */
  session(): Promise<string>
  pull(): Promise<Tables>
  upsert<T extends TableName>(table: T, rows: TableMap[T][]): Promise<RemoteResult>
  remove(table: TableName, keys: string[]): Promise<RemoteResult>
}

/**
 * Postgres and PostgREST errors carry a code (SQLSTATE like 23503, or PGRSTxxx):
 * the server saw the request and refused it, so retrying won't help. Anything
 * without one is a network failure worth retrying.
 */
function result(error: { code?: string; message: string } | null): RemoteResult {
  if (!error) return { ok: true }
  const permanent = Boolean(error.code && /^([0-9A-Z]{5}|PGRST\d+)$/.test(error.code))
  return { ok: false, transient: !permanent, message: error.message }
}

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async session() {
      const s = await ensureSession()
      if (!s) throw new Error('No session')
      return s.user.id
    },
    async pull() {
      const tables = emptyTables()
      await Promise.all(
        TABLES.map(async (table) => {
          const { data, error } = await client.from(table).select('*')
          if (error) throw new Error(`pull ${table}: ${error.message}`)
          const rows = tables[table] as Record<string, unknown>
          for (const row of data ?? []) {
            const value = MAPPERS[table].fromRow(row)
            rows[keyOf(table, value as never)] = value
          }
        }),
      )
      return tables
    },
    async upsert(table, rows) {
      const mapper = MAPPERS[table]
      const { error } = await client.from(table).upsert(rows.map((r) => mapper.toRow(r)), { onConflict: KEY_COLUMN[table] })
      return result(error)
    },
    async remove(table, keys) {
      const { error } = await client.from(table).delete().in(KEY_COLUMN[table], keys)
      return result(error)
    },
  }
}

export const appRemote: Remote | null = supabase ? supabaseRemote(supabase) : null
