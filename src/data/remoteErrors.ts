// Which server errors are worth retrying, and how. A permanently refused row
// leaves the outbox for the snapshot's `rejected` list (src/data/store.ts), so
// anything that might succeed later must not be permanent, or a passing outage
// or a not-yet-applied migration would push local edits aside.

/**
 * How the sync engine treats a failed request:
 * - permanent: the server read the request and refuses the data itself; the
 *   same request can never succeed (bad data, a constraint, row-level security).
 * - schema: the server does not know a column, table or function yet (a newer
 *   app talking to a database whose migration has not run). Retried until it does.
 * - outage: the server, database or network is unavailable, or the session
 *   needs a refresh. Retried with backoff, never given up on.
 * - stuck: the server answered but refused this one request for a reason that
 *   is not about the data (e.g. a payload too large, with no error code).
 *   Retried a few times, then set aside so it can't block the queue forever.
 */
export type ErrorKind = 'permanent' | 'schema' | 'outage' | 'stuck'

/** Schema mismatch: undefined column, table or function, and PostgREST's schema cache errors. */
const SCHEMA_SQLSTATES = ['42703', '42P01', '42883', '42704']

/**
 * Permanent:
 * - SQLSTATE 22 (bad data), 23 (constraint), 42 (bad query, or row-level
 *   security) except schema mismatches, 44 (check option);
 * - P0 (raised by a trigger);
 * - PostgREST PGRST1xx (bad request).
 *
 * Everything else is not permanent: no code (the network), PGRST0xx (database
 * unreachable), PGRST2xx (schema cache: an unknown column or table),
 * PGRST3xx (JWT expired or invalid, fixed by a session refresh), the schema
 * mismatches above, and SQLSTATE classes like 08 (connection), 40
 * (serialization or deadlock), 53 (resources), 57 (shutdown or cancelled),
 * 58 and XX (system).
 */
export function isPermanentError(code: string | undefined): boolean {
  if (!code) return false
  const postgrest = /^PGRST(\d)\d\d$/.exec(code)
  if (postgrest) return postgrest[1] === '1'
  if (!/^[0-9A-Z]{5}$/.test(code)) return false
  if (SCHEMA_SQLSTATES.includes(code)) return false
  return ['22', '23', '42', '44', 'P0'].includes(code.slice(0, 2))
}

export function isSchemaMismatch(code: string | undefined): boolean {
  if (!code) return false
  return /^PGRST2\d\d$/.test(code) || SCHEMA_SQLSTATES.includes(code)
}

/**
 * Sort a failed request into an ErrorKind. `status` is the HTTP status, 0 or
 * missing when the request never got an answer (offline, DNS, CORS).
 */
export function classifyError(error: { code?: string; status?: number }): ErrorKind {
  const { code, status } = error
  if (isPermanentError(code)) return 'permanent'
  if (isSchemaMismatch(code)) return 'schema'
  // A recognised code that is not permanent: the database or session (PGRST0xx, PGRST3xx, 08, 40, 53, 57, ...).
  if (code && (/^PGRST\d\d\d$/.test(code) || /^[0-9A-Z]{5}$/.test(code))) return 'outage'
  // No usable code: decide on the HTTP status.
  if (!status) return 'outage'
  if (status >= 500 || status === 401 || status === 403 || status === 408 || status === 429) return 'outage'
  if (status >= 400) return 'stuck'
  return 'outage'
}
