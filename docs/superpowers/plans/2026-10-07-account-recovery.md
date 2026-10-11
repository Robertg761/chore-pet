# Account recovery implementation plan

> Execute in this worktree using the executing-plans and test-driven-development skills. Robert has authorized implementation and draft PR creation.

**Goal:** Fix audit findings 1, 4, 8 and 12 without changing domain rules or server schema.

**Architecture:** Keep recovery metadata in the local snapshot. Commit IndexedDB reset, preservation and backup deletion in one transaction. Persist a cleanup journal before destructive account operations so errors and retries survive reload. Restrict legacy and saved-account caches to their original owner; known guest transfers remain supported.

**Tech stack:** React, TypeScript, IndexedDB, Supabase, Vitest.

**Spec:** docs/SPEC.md and the coordinator's read-only docs/audits/2026-10-07/AUDIT.md.

## Constraints and review focus

- Preserve intentional offline reading, existing art/copy and AccountSection reuse.
- No application edits outside this worktree; no merge, deployment or server schema changes.
- Exercise failed preservation, transaction abort, inaccessible storage, deletion/sign-out partial success, revoked sessions and legacy provenance.
- Verify selection across furniture changes, reload, user changes and explicit duplicate-home choice.
- Keep restore failures visible with selected-home context and retry.

## Task 1: Durable recovery and ownership

Files: src/data/{state,local,store,remote}.ts, src/lib/account.ts and tests.
Interfaces: optional Snapshot.ownerKind, activeHomeId, cleanup; LocalStore.reset transaction; Store.setCleanup and selectActiveHome; Remote.ownerKind. reset rejects failures. selectHome accepts optional activeHomeId.

- [x] Add regression tests that require preservation on backup failure, honest reset failure, restricted saved/legacy cache ownership, stable selection and account cleanup retries.
- [x] Run focused Vitest tests and observe failures.
- [x] Implement storage transaction, provenance checks, selection persistence and cleanup journal.
- [x] Run focused tests and fix failures.

## Task 2: Recovery controls

Files: src/data/appStore.ts, src/screens/{SavedHomes,AccountSection,AccountCleanup}.tsx, src/App.tsx.
Interfaces: unchanged AccountSection props; pending cleanup gate before normal App content; explicit duplicate-home selection in SavedHomes.

- [x] Verify false/thrown recovery failures and duplicate-home choice in the T3 preview with isolated fixtures.
- [x] Preserve restore context, show retry errors, and expose cleanup retries after partial account operations.
- [x] Run npm test, npm run lint and npm run build.
- [x] Obtain independent branch review; fix actionable findings and repeat relevant checks.
Delivery: commit and push this branch, open a draft PR against main, link it in both threads, and report to the coordinator. Do not merge.


## Verification and integration notes

- `npm test`: 1,089 tests passed in 44 files.
- `npm run lint`: passed.
- `npm run build`: passed; existing large-chunk warning remains.
- T3 preview, isolated tab on port 44303: injected actual IndexedDB transaction aborts during reset, backup creation and backup removal. Rejections were visible to callers, snapshots/backups survived, and retries succeeded.
- T3 preview: false and thrown restore failures kept Clover selected with a visible error and retry; removing the injected failure restored Clover. Explicit selection of Fern survived reload. Confirmed-deletion cleanup copy and retry remained reachable after reload. A held Web Lock refused a concurrent operation and showed its error.
- Independent read-only review: two rounds, approved after fixing late-edit preservation, cleanup fences, cross-tab operation/cancellation serialization, remount error propagation, legacy backup deletion ownership, and uncertain gateway responses.

Local metadata is additive: `Snapshot.ownerKind`, `activeHomeId`, `cleanup`. Legacy snapshots remain readable; missing provenance is restricted to the original owner, including legacy `heldFor` metadata. Authenticated sync records known owner kind. Active selection is device-local and resets with the account. No server migration.

Account changes require Web Locks; unsupported browsers report a retryable failure without starting the operation. If IndexedDB could not be loaded at startup, reload after restoring storage access. A lost server deletion reply cannot be confirmed locally: the recovery screen offers retry or explicitly clearing only this device. Live Supabase Auth/RPC deletion was not exercised; remote results are covered by unit tests.

Coordinator integration: preserve the App cleanup gate immediately after `ready`. AccountSection keeps its existing no-prop API and imports shared account-error state. History restore copies all retained chore/completion rows and spread fields, including `archivedOn`. The rewards effect from PR #11 must call `selectHome(state.snapshot.tables, state.snapshot.activeHomeId)` and depend on `snapshot.activeHomeId` so reconciliation follows explicit selection.
