// Which server errors are worth retrying. A permanent error drops the row from
// the outbox (src/data/store.ts), so anything that might succeed later must be
// transient, or a passing outage would lose local edits.

/**
 * Permanent: the server read the request and the data itself is refused, so
 * the same request can never succeed:
 * - SQLSTATE 22 (bad data), 23 (constraint), 42 (bad query, or row-level security), 44 (check option);
 * - P0 (raised by a trigger);
 * - PostgREST PGRST1xx (bad request) and PGRST2xx (schema mismatch).
 *
 * Everything else is transient: no code (the network), PGRST0xx (database
 * unreachable), PGRST3xx (JWT expired or invalid, fixed by a session refresh),
 * and SQLSTATE classes like 08 (connection), 40 (serialization or deadlock),
 * 53 (resources), 57 (shutdown or cancelled), 58 and XX (system).
 */
export function isPermanentError(code: string | undefined): boolean {
  if (!code) return false
  const postgrest = /^PGRST(\d)\d\d$/.exec(code)
  if (postgrest) return postgrest[1] === '1' || postgrest[1] === '2'
  if (!/^[0-9A-Z]{5}$/.test(code)) return false
  return ['22', '23', '42', '44', 'P0'].includes(code.slice(0, 2))
}
