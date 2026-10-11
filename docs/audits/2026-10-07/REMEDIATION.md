# Audit remediation threads

Coordinator: fbb4b550-0936-43ab-a430-98957311473a

Robert authorized separate implementation threads and bundled PRs on 2026-10-07. All branches start at 9617aaa407ebb3650f5b03ce9fbf4ede744245c0. Scope is the 13 audit findings; the larger product roadmap is deferred.

Each thread must reproduce, implement, add regressions, run lint/tests/build, review, and open a draft PR against main. Every PR must be linked in its implementation thread and this coordinator. No merge or deployment is included.

## Chore Pet: account recovery and home selection

- Findings: 1, 4, 8, 12
- Branch: audit/account-recovery
- Draft PR: [#14](https://github.com/Robertg761/chore-pet/pull/14)
- Reviewed handoff commit: `6e097b5`; CI fixture fix `87a92f6` (linked to coordinator)
- Thread: [Chore Pet: account recovery and home selection](t3-thread://v1/a7d1672f-f5c1-4d7b-bd6d-85ab1799f767/mcp%3Ae70d64fe-3e1f-4447-a852-5ea900b5fe8d)
- ID: `mcp:e70d64fe-3e1f-4447-a852-5ea900b5fe8d`
- Worktree: `/home/robert/.t3/worktrees/chore-pet/audit-account-recovery`
- Status: draft PR ready; individual review and checks passed

Fix findings 1,4,8,12 as one recovery/data-ownership PR.
#1 store.reset catches failed local clear/backup and resolves, so account deletion reports success and reload resurrects cached data; failed preservation can lose unsynced work. Make cleanup/preservation results honest, atomic where feasible, retryable and visible. Cover local snapshot clear, backup creation/removal and signout vs server-account-delete partial success.
#4 store.run holds a replaced saved account cache for replacement guest, allowing savedHomes/restore to clone it under the new identity. This is SAME BROWSER cached-data reownership, not an RLS bypass. Preserve intentional offline cache reading; distinguish anonymous guest transfers from saved-account backups and require correct owner authentication for the latter. Normal successful signOutSafely already avoids this path. Include legacy cache provenance strategy.
#8 selectHome picks most-furnished home every time. With A newer/2 objects and B older/1, removing A object silently selects B. Persist active home selection scoped correctly to user/session; explicit duplicate-home recovery/selection and stable fallback without auto-switching on ordinary furniture edits.
#12 SavedHomes ignores false restoration and only console.logs exceptions. Return/show clear retryable errors and preserve selected-home context.
Primary files src/data/store.ts,state.ts,local.ts,appStore.ts; src/lib/account.ts,supabase.ts; src/screens/SavedHomes.tsx,AccountSection.tsx. Navigation thread may extract/reuse AccountSection: preserve its reusable interface, avoid moving navigation logic. History thread owns archival/deletion of chores; do not implement that here. Notify coordinator of new store/snapshot interfaces early.

## Chore Pet: retain chore history and safe deletion

- Findings: 2, 9
- Branch: audit/retained-history
- Draft PR: [#12](https://github.com/Robertg761/chore-pet/pull/12)
- Reviewed handoff commit: `9836adecf2eb169abfe863315a3bb0615fd73ac9`; review fix `ac205cec3f61eb18c5863713ee8aa9d991353960` (linked to coordinator)
- Thread: [Chore Pet: retain chore history and safe deletion](t3-thread://v1/a7d1672f-f5c1-4d7b-bd6d-85ab1799f767/mcp%3A5ace7b02-569e-488f-b794-76597fec7f4a)
- ID: `mcp:5ace7b02-569e-488f-b794-76597fec7f4a`
- Worktree: `/home/robert/.t3/worktrees/chore-pet/audit-retained-history`
- Status: draft PR ready; individual review and checks passed

Fix findings 2 and 9 together using retained/archived chore history, with compatible migration and accurate aggregates.
#2 stale device B banks one cached completion then deletes a chore; database cascade destroys A's newer second completion, dropping derived total 2 to 1. Pull-before-delete alone is insufficient.
#9 deleting a completed chore rewrites historical streak, weekly work and health. Fixture A daily Oct1-6, B daily Oct4-6: delete A changes current streak 6->3 and weekly total9->3 though lifetime total remains9. Stop future obligations without deleting past achievements. Preserve removal of furniture while detaching/archiving its relevant tasks; keep-chore option must continue to work.
Design a small, explicit historical lifecycle with effective end dates, immutable completion retention and correct historical schedule evaluation. Account deletion must still truly delete everything. Consider old clients/offline queued hard deletes, current SQL cascades/tenant integrity, migration rollout and retired counts so history is never doubled. Add appropriate migration(s) and rollout notes. Server-side atomic handling is needed for any remaining destructive path. Do not silently claim protection from old clients if it isn't provided.
Primary src/domain/types.ts,schedule.ts,unlocks.ts; src/data/actions.ts,tables.ts,state.ts,mappers.ts,remote.ts; Supabase schema/migration tests; screen models. Preserve existing signatures where possible. Progress bundle is independently fixing milestone reconciliation in actions/unlocks and next/sample counts; send proposed archived-history interfaces/semantics to coordinator BEFORE extensive implementation so the branches can integrate. Account bundle owns store cleanup/provenance and active home choice; do not refactor those.

## Chore Pet: accurate rewards and next chores

- Findings: 3, 7, 13
- Branch: audit/progress-accuracy
- Draft PR: [#11](https://github.com/Robertg761/chore-pet/pull/11)
- Reviewed handoff commit: `2eadf0944a9f0c59660b9ea1654e5c75706578db` (linked to coordinator)
- Thread: [Chore Pet: accurate rewards and next chores](t3-thread://v1/a7d1672f-f5c1-4d7b-bd6d-85ab1799f767/mcp%3A4de376e4-e274-48a0-a165-10e0a6e77329)
- ID: `mcp:4de376e4-e274-48a0-a165-10e0a6e77329`
- Worktree: `/home/robert/.t3/worktrees/chore-pet/audit-progress-accuracy`
- Status: draft PR ready; individual review and checks passed

Fix findings 3,7,13 in a progress/reporting PR.
#3 applyUnlocks only runs after completion. Weekly Monday chore completed Sep28 reaches streak2 Sep29,7 Oct4, then0 Oct7; earned streak rewards never persisted, best remains1. Reconcile on hydration/day rollover/sync/relevant edits; recover historical maximum and milestones when reopening after a missed period. Also award combined completion thresholds after cross-device merge. Ensure reconciliation is idempotent, doesn't create sync/render loops or replay gifts repeatedly, and respects sample history, vacation, schedule history and future timestamp rules.
#7 nextUpcoming selects only soon section. New sink-only home Wednesday Oct7, dishes completed today and due Oct8, scrub sink due Monday Oct12. Home currently says scrub Monday. Select earliest next occurrence across doneToday and soon rows; include done-only lists.
#13 Week completedPerDay includes counts:false seed activity. Exclude synthetic sample work from personal counts without breaking seeded health reconstruction or legacy genuine completions.
Primary src/domain/unlocks.ts; data/actions.ts and a minimal integration point; screens/choreListModel.ts,weekModel.ts,RewardsScreen.tsx/App.tsx as needed. Retained-history thread will archive chores and retain completed history. Keep reconciliation helpers explicit, preserve APIs where feasible, and tell coordinator any new domain interface early. Avoid touching active-home choice/account reset/navigation architecture.

## Chore Pet: accessible gifts, undo and build controls

- Findings: 5, 6
- Branch: audit/interaction-fixes
- Draft PR: [#13](https://github.com/Robertg761/chore-pet/pull/13)
- Reviewed handoff commit: `75a6a4c` (linked to coordinator)
- Thread: [Chore Pet: accessible gifts, undo and build controls](t3-thread://v1/a7d1672f-f5c1-4d7b-bd6d-85ab1799f767/mcp%3A3ad69afc-ed4d-4e3c-b0a3-94767d98a677)
- ID: `mcp:3ad69afc-ed4d-4e3c-b0a3-94767d98a677`
- Worktree: `/home/robert/.t3/worktrees/chore-pet/audit-interaction-fixes`
- Status: draft PR ready; individual review and checks passed

Fix findings 5 and 6 as a focused UI correctness PR with real browser regression coverage.
#5 All chores uses native dialog.showModal, but UndoToast and GiftBox render as outside siblings. Their controls are inert/behind the top-layer dialog; gift inaccessible until sheet closes and undo expires after five seconds. Normal home gifts can also obscure undo. Coordinate modal ownership/focus; make undo reachable in active context and prevent timeout while another dialog blocks it. Keep gift queue, wear/place/try shortcuts, reduced motion, keyboard focus restoration and mobile sheet dismissal working. Don't replace this with simply ignoring rewards in the sheet. A durable history UI is separate future work; solve the immediate reachable correction behavior.
#6 BuildRoom keydown bubbles from descendant controls. Pick washer, Tab to Cancel, Enter adds washer and two chores instead of canceling. Scope room shortcuts to correct target. Test Enter/Space on Cancel and Turn, arrows/R/Enter on room.
Primary App.tsx, shell/Sheet.tsx,UndoToast.tsx, screens/GiftBox.tsx,room/BuildRoom.tsx and relevant CSS/tests. Navigation thread also touches App; avoid broad App restructuring. Add a minimal, meaningful browser-test command/setup if none exists, against production build; include CI integration where practical but do not introduce an oversized framework. Notify coordinator of browser test conventions so other bundles can follow. Verify phone and keyboard flows with own T3 browser tab.

## Chore Pet: returning-user sign-in and safe navigation

- Findings: 10, 11
- Branch: audit/navigation-signin
- Draft PR: [#15](https://github.com/Robertg761/chore-pet/pull/15)
- Reviewed handoff commit: `bc4bd14` (linked to coordinator)
- Thread: [Chore Pet: returning-user sign-in and safe navigation](t3-thread://v1/a7d1672f-f5c1-4d7b-bd6d-85ab1799f767/mcp%3Afc8d501f-886c-4ac6-9b95-7a270453b1ab)
- ID: `mcp:fc8d501f-886c-4ac6-9b95-7a270453b1ab`
- Worktree: `/home/robert/.t3/worktrees/chore-pet/audit-navigation-signin`
- Status: draft PR ready; individual review and checks passed

Fix findings 10 and 11 as one navigation/account-entry PR.
#10 Landing only offers sample/build and local SavedHomes. Existing user on new device must create disposable home to get Settings > Sign in. Add an accessible 'I already have a home' entry using existing auth flow without requiring a home. Handle loading, auth error/retry, successful recovery and canceled sign-in. Do not silently replace local guest work beyond existing explicit sign-in semantics.
#11 App views are useState only; browser Back does not reverse app screens/sheets and tab changes discard drafts. Add lightweight URL/history navigation suitable for static GitHub Pages subpath deployment, with reload/deep-link behavior, browser back/forward and modal dismissal where appropriate. Preserve chore drafts across navigation or give a clear discard guard. Cover new and existing chore edits, Save/Cancel, deleted-elsewhere stale edits, and ensure drafts don't leak across accounts/homes. Stay within existing screens; no redesign.
Primary App.tsx, Landing.tsx, AccountSection.tsx reuse, ChoreEditor.tsx/shell and navigation helpers. Account bundle is fixing AccountSection recovery/cleanup and store ownership; preserve compatible API and avoid changing those semantics. Modal/keyboard bundle owns Sheet/GiftBox/UndoToast; coordinate history integration via narrow interfaces rather than redesigning their implementation. Notify coordinator of intended routing/draft contracts early. Browser regression checks required; do not claim email/Google delivery verified if no test backend.

## Integration review

### Agreed interfaces

- History: `Chore.archivedOn?: ISODate` is an exclusive end. `choreActiveOn(c, day)` requires creation on/before day and archive after day. `selectHome().chores` and completions retain all history; no separate history collection. Filter current UI, but feed all chores to streak/reconciliation and historical health.
- Streaks: history owns the active-day filter and skip condition; progress owns `streakHistory(...) -> {currentStreak,bestStreak}` and the existing `currentStreak` wrapper. Days with no active chores and no real completions freeze streaks without increments, breaks, or token spending. Real completion on archive day still qualifies. Later chores resume normal judging; best and earned rewards remain.
- Counts: no new retired banking. Legacy retired counts remain a fallback only for IDs not retained as chores.
- Progress: pure `reconcileProgress(progress, context, today) -> {ops,unlocked}`, unchanged-state no-op. Minimal App effect gates on ready/hydrated and reads fresh store state for StrictMode idempotence. Passive reconciliation persists rewards without replaying gifts; completion gifts retain existing behavior.
- Deletion: existing remove parameters gain optional date/options. Object-delete metadata includes local archive date and keepChores, grouped by options. SECURITY INVOKER RPC locks the object, archives or keeps all attached chores (including unseen tasks), detaches, and deletes atomically. Migration 0007 handles legacy DELETE with server-date fallback, stale resurrection protection, and genuine home/account cascades. New chore deletion archives through upsert to retain pending parent/completions.
- Recovery: additive local Snapshot ownerKind (`guest`/`saved`, absent legacy restricted), activeHomeId, cleanup journal. `Store.reset(): Promise<void>` rejects failed cleanup/preservation; new `setCleanup(...)` and `selectActiveHome(id)`. `selectHome(tables, activeHomeId?)` preserves existing callers; useHome reads persisted choice. Optional atomic LocalStore reset and optional Remote.ownerKind coexist with deletion options. App pending-cleanup gate must remain reachable even when the home disappears.
- Navigation: query-string routes preserve pathname/base and auth hashes, with Back/Forward for screens and More/All chores via optional controlled AppNav props. AccountSection adds landing/sign-in-only mode while retaining no-prop Settings behavior. Top-level App hooks and framed draft provider hold in-memory drafts scoped by account/home; Save/Cancel clear, deleted/archived chores invalidate drafts, and beforeunload warns on leaving/reload.
- Feedback: localized framed() integration keeps gift queue and Undo through Place it/Try it navigation. Sheet optional footer; native-dialog GiftBox optional completion feedback. Undo lives in active gift/sheet/home context and pauses while blocked. Navigation does not edit Sheet/GiftBox/UndoToast.
- Modal/navigation merge rule: remove the interaction branch's two standalone `setAllChores(false)` calls in gift onPlace/onTry before openBuild. Navigation's `setView({name:'build'})` atomically replaces the sheet route; never dismiss asynchronously with history.back then push. Preserve framed() and sheet-footer feedback ownership together with navigation's scope reset/delayed gift guard. Transient gifts stay outside URL history; native gift cancel stops propagation without dismissing the underlying sheet.
- Browser tests: `scripts/browser/*.test.mjs`, built-in node:test plus existing playwright-core, `npm run test:browser` against production dist through isolated ephemeral-port preview server. Optional CHROME; CI installs Chromium through playwright-core CLI. Interactive validation uses T3 preview.

### Combined verification

The coordinator combined all five bundles in `audit/integration-verification`, leaving main and the source PR branches unchanged. See [INTEGRATION.md](INTEGRATION.md) for the final integration record.

- Preserved full retained chores for streak/reward replay and active-day filtering for visible/editable chores.
- Reward effect uses `selectHome(state.snapshot.tables, state.snapshot.activeHomeId)` and depends on selection as well as tables/day.
- Retained recovery's AccountCleanup gate and operation-error interface, account/home draft scoping, delayed gift guard, and framed feedback.
- Removed standalone gift shortcut sheet-dismiss calls; direct Build navigation replaces the sheet route.
- Browser Back/Forward follows URL history and clears visible/pending transient gifts; Undo stays reachable on the destination. Escape closes only the top gift. Forward never replays dismissed gifts.
- Replaced the old multi-gift fixture with real prior completions so its next completion earns decor and style; earlier earned rewards correctly reconcile without passive gift replay.
- Four combined domain tests cover archive-date credit, schedule history/broken historical maximum, pause/token/resume behavior, completion-path gifts, sample archives, and retained-ID legacy-count fallback. Mutation checks confirmed failures when either the archive pause or historical-best tracking was removed.
- Independent data review passed 79 focused tests and found one extreme-clock date-range mismatch. History PR fixed it with eight actual SQL regressions, aligning archive dates with migration 0006's accepted creation-date range.
- Independent UI integration review found no actionable issues and passed 25 focused tests.
- Final full suite: 1,160 tests across 53 files on actual Node 22.23.3; lint passed. Production build passed with the existing chunk-size advisory. All 21 production browser regressions passed at both root and Pages base with cloud configuration and verified external-request blocking; the PR #16 CI follow-up is recorded in INTEGRATION.md.

No PR has been merged and no migration or client deployed. Hosted Auth/PostgREST, truly simultaneous network transactions, physical phones, and non-Chromium engines remain unverified. Migration 0007 must precede the client. Legacy clients retain rows but lack archive-aware UI; previously destroyed history cannot be reconstructed.
