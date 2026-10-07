# Sign-in and navigation implementation plan

> Execute inline using executing-plans, with one independent final review.

Goal: Fix audit #10 and #11 without changing account ownership, data schema, or domain rules.
Spec: docs/SPEC.md and audit 2026-10-07 findings 10–11.
Architecture: Query-string routes preserve the static hosting pathname and auth callback parameters. One account/home-scoped UI session owns ephemeral drafts. Leaving the document warns when drafts exist. Existing AccountSection is reused in sign-in-only mode.

1. Add route codec/controller tests for subpaths, unknown routes, edit IDs, reload, back/forward, sheets, and old-account history. Implement shell navigation helpers and integrate App/AppNav. Keep Sheet internals unchanged.
2. Add landing sign-in regression coverage. Add AccountSection entry mode with loading, unavailable/offline, retryable auth failure, success, and cancel. Preserve Settings default semantics and existing store recovery.
3. Add scoped draft tests and integrate full and inline chore editors. Preserve new/existing drafts across tabs and browser history. Save/Cancel clears drafts, deleted chores cannot be recreated, account/home changes discard scoped state, reload/leave warns. Inline drafts use object-specific new keys.
4. Run focused tests then full npm test/lint/build. Use an isolated T3 browser tab and unused dev port to exercise landing, history/deep links, sheets, drafts, save/cancel, stale deletion. No claims of live auth delivery without a backend.
5. Review diff and independent review; fix actionable findings. Commit/push this branch, create draft PR, link it in both threads, notify coordinator.

Review focus: stale history from another account; failed auth promises; first-load edit link before hydration; duplicate history entries on sheet selection; drafts from two objects sharing one form.

Execution notes:
- Implemented query routing, account/home history ownership, controlled More/All chores, full/inline draft context, and additive AccountSection entry mode. No store/domain/schema edits.
- Tests caught and fixed Strict Mode listener cleanup and persisted history-owner loss during hydration. Draft regressions cover Cancel/Save, scope changes, removal/archive, and per-object isolation.
- Chose in-memory drafts plus beforeunload warning, as approved by coordinator; drafts are intentionally not restored after an accepted reload. History contains route identifiers, never draft text.
- Reused modal bundle's browser helper verbatim. jsdom is a development-only dependency for React integration tests, not a second browser harness.
- Integration: keep account bundle's AccountCleanup gate immediately after !ready; honor selectHome's active selection; preserve modal bundle feedback in framed(). A route selected from a sheet replaces that sheet entry, so gift shortcuts should call setView directly. Transient gifts remain outside URL per coordinator.
- New retained-history archivedOn rows are treated as noneditable without changing the baseline Chore type. Coordinator may simplify the compatibility cast after merging history schema.
