# Retained chore history implementation plan

**Goal:** Fix audit findings 2 and 9 without losing completion credit or rewriting earlier achievements when a chore or object is removed.

**Architecture:** Keep chores with optional `archivedOn`, an exclusive local-calendar end date. Keep dated completion rows and legacy retired-count fallback. Filter obligations by date, and intercept old hard deletes in Postgres. Home/account removal remains destructive.

**Scope:** `docs/SPEC.md` and audit findings 2/9. Existing art, copy tone, pure domain logic and signatures remain. No account provenance or milestone reconciliation refactor.

- [x] Add failing regression tests for the October 1–6 fixture, historical health, current obligations, object keep/remove, and archived/live/retired totals. Implement `choreActiveOn`, lifecycle-aware domain replay and local removal. `selectHome().chores` continues returning all history. Current UI filters archives.
- [x] Add failing PGlite tests for stale-device delete with newer completions, both completion/delete orders, legacy object cascade, stale upsert, tenant integrity and true account deletion. Implement migration 0007, atomic object removal RPC and mapper/sync changes. Old clients are protected against destructive cascades but their UI is not archive-aware.
- [x] Document schema-first rollout and unrecoverable pre-migration history. Run focused tests, full `npm test`, lint and build. Review final diff and obtain independent review; fix actionable findings. Commit, push this branch, open a draft PR and register it with this thread and the coordinator.

Review focus: unsynced new chore removed before first sync; stale edits after archive; unknown tasks during object removal with keep enabled; historical schedule changes; legacy retired counts without dated history. Cover these in local/database regressions.

Validation ledger: desired-behavior tests failed before implementation; all retained-history regressions now pass. Independent GPT-6-Astra review found no correctness findings. Its test-harness observation was addressed by forwarding queued removal metadata through the PGlite device helper and adding both keep/remove tests with unseen server tasks. Browser removal and reload retained nine completions, total nine, streak six, and hid the archived chore. Hosted Auth/PostgREST and parallel network transactions are not exercised locally.

Final checks: 1,083 tests passed; lint passed; production build passed with the existing chunk-size warning. Draft PR handoff is against main; no merge or deployment.
