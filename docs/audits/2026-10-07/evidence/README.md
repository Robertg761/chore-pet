> Historical characterization evidence for baseline commit `9617aaa`. These probes intentionally assert the original bugs and are not post-fix regression tests. See ../INTEGRATION.md for remediation verification.

# Chore Pet data audit probes

These probes use the real application functions with memory storage/fake remote dependencies. They reproduce current defects; a passing test confirms the faulty behavior, not a fix. No live Supabase requests are made. No tracked application files are edited.

Run from the repository root after installing dependencies:

```sh
npx vitest run --config docs/audits/2026-10-07/evidence/vitest.config.mts
```

Verified 2026-10-07: **1 test file passed; 3 tests passed**, 233 ms. The config isolates these characterization probes from the normal test suite. The accompanying .mjs probes require a Node version with TypeScript stripping and registerHooks, verified with Node 26.8.1.

## 1. Cached home transferred to replacement account

Fixture: an IndexedDB-equivalent snapshot belonging to saved account `saved-A`, pet `Private Pet`, no pending changes. The current remote session is `new-guest-B`, whose remote database begins empty.

Observed: sync creates a backup with `heldFor: new-guest-B`; `savedHomes()` offers A's home to B; `restoreSaved('saved-A')` succeeds and uploads cloned home/pet rows with new IDs under B. No remote A database exists in the fixture: this is entirely **same-browser cached-data transfer**, not cross-account database access or an RLS bypass.

Relevant source: `src/data/store.ts:413`, `src/data/store.ts:645`, `src/lib/supabase.ts:82`.

Expected fixed behavior: a saved account's backup stays held for that same account, requiring reauthentication before restore. Transferring guest homes should be a separately authorized case.

### Existing offline cache exposure is broader than this transfer

The app already intentionally renders the cached home before authentication/session hydration: store load sets `ready: true` with the saved snapshot at `src/data/store.ts:361`; `src/App.tsx:162–164` only waits for hydration if there is **no cached home**. Someone using the same browser profile can therefore already see the cached account's home while offline or while authentication loads. Do not describe the transfer issue as newly revealing previously inaccessible data, or imply that another browser can read A's remote rows. The incremental defect is authorizing a replacement account to retain/reupload the previous saved account's cache, including after session revocation, rather than requiring A to authenticate again. Whether local offline access itself should require a lock is a product/privacy decision.

Normal successful `signOutSafely()` clears the cached home and avoids this path. The scenario requires session replacement while the prior cache remains (for example refresh-token invalidation, account deletion on another device, or clearing auth storage without clearing IndexedDB).

## 2. Durable wipe failure reported as success

Fixture: durable memory storage with saved-A's home; `local.save()` rejects with `QuotaExceededError`; no remote dependency is needed to isolate reset behavior.

Observed: `reset({backup:false})` resolves; in-memory UI is empty; `savedLocally` remains true; a new store using the same storage reloads `Private Pet`. `deleteAccount()` trusts this reset result and returns success after its remote operation (`src/lib/account.ts:228–231`).

Relevant source: `src/data/store.ts:607–622`. Local backup removal errors are similarly swallowed; backup creation errors are swallowed at line 321.

Expected fixed behavior: surface durable cleanup failure and keep retryable cleanup state rather than asserting the copy was removed. If preserving unsynced data before sign-out, atomically verify its backup before replacing its snapshot.

## 3. Stale deletion loses counted completion

Fixture: one daily chore created 2026-10-01; one counted completion at 2026-10-01T12:00:00Z. Device B takes a snapshot. Server/device A adds a second completion at 2026-10-02T12:00:00Z. Device B prepares removeChore() from its stale snapshot.

Observed: deletion banks one completion, SQL-equivalent max merge retains cached chore_count=2, then the real application's cascade logic deletes all chore completions. selectHome() derives the displayed total from remaining rows and retired counts and returns **1**.

The probe models exactly the relevant SQL progress count merge plus FK cascade using the application's shared pure cascade implementation. It is not a live PostgreSQL concurrency test. Existing progress fields in this fixture are unchanged, so the omitted union/max merges on other columns cannot affect the outcome.

Relevant source: `src/data/actions.ts:61–68`, `src/data/state.ts:450`, `supabase/migrations/0004_progress_merge.sql`, `supabase/migrations/0006_tenant_integrity.sql` completion FK. Removing the placed object follows the same banking path.

Expected fixed behavior: total remains 2 after deletion on both devices. Bank authoritative history and delete atomically server-side, or retain immutable history/tombstones. Pull-before-delete alone leaves a race.

## Limits

These are isolated repository-level tests, not browser end-to-end tests or verification of deployed Supabase migration/Auth configuration. The fake storage simulates storage exceptions; it does not establish which real browsers generate that exception on a shrinking write. Other write failures (closed database, transaction failure, blocked storage) reach the same catch-and-resolve code path. Existing fake-server deletion in `src/data/store.test.ts:59–64` does not cascade, so add a faithful cascade integration test when fixing the stale deletion issue.

Additional domain probes:

```sh
node docs/audits/2026-10-07/evidence/chore-pet-domain-audit.mjs
node docs/audits/2026-10-07/evidence/chore-pet-next-upcoming-audit.mjs
```
