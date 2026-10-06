import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureSession, getSupabase, supabaseConfigured } from '../lib/supabase'
import { KEY_COLUMN, MAPPERS } from './mappers'
import { isPermanentError } from './remoteErrors'
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

/** A failed request; see isPermanentError for what is worth retrying. */
function result(error: { code?: string; message: string } | null): RemoteResult {
  if (!error) return { ok: true }
  return { ok: false, transient: !isPermanentError(error.code), message: error.message }
}

export function supabaseRemote(getClient: () => Promise<SupabaseClient>): Remote {
  return {
    async session() {
      const s = await ensureSession()
      if (!s) throw new Error('No session')
      return s.user.id
    },
    async pull() {
      const client = await getClient()
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
      const client = await getClient()
      const mapper = MAPPERS[table]
      const { error } = await client.from(table).upsert(rows.map((r) => mapper.toRow(r)), { onConflict: KEY_COLUMN[table] })
      return result(error)
    },
    async remove(table, keys) {
      const client = await getClient()
      const { error } = await client.from(table).delete().in(KEY_COLUMN[table], keys)
      return result(error)
    },
  }
}

async function configuredClient(): Promise<SupabaseClient> {
  const client = await getSupabase()
  if (!client) throw new Error('Supabase is not configured')
  return client
}

export const appRemote: Remote | null = supabaseConfigured ? supabaseRemote(configuredClient) : null
