# Audit remediation integration

All 13 actionable findings from the [baseline audit](AUDIT.md) are covered by five draft PRs. The coordinator combines them in `audit/integration-verification` so overlapping changes and their regression tests can be reviewed as one release candidate. Main and the focused PR branches were not changed by integration; nothing was merged or deployed.

| Focused review | Audit findings | Source commits |
| --- | --- | --- |
| [Progress #11](https://github.com/Robertg761/chore-pet/pull/11) | 3, 7, 13 | `2eadf09` |
| [Retained history #12](https://github.com/Robertg761/chore-pet/pull/12) | 2, 9 | `9836ade`, `ac205ce` |
| [Gifts, Undo, keyboard #13](https://github.com/Robertg761/chore-pet/pull/13) | 5, 6 | `75a6a4c` |
| [Account recovery #14](https://github.com/Robertg761/chore-pet/pull/14) | 1, 4, 8, 12 | `6e097b5`, `87a92f6` |
| [Navigation and sign-in #15](https://github.com/Robertg761/chore-pet/pull/15) | 10, 11 | `61ff6c5`, `bc4bd14` |

## Integration decisions

- Reconciliation receives every retained chore/completion and the explicitly selected home. Selection changes trigger the effect even when table references are unchanged. Current lists, editors, and room obligations filter active chores.
- Archived tasks retain history through restoration, count derivation, schedule replay, weekly health and rewards. An empty household pauses its streak; archive-date real completions still count. Historical best tracking survives both archive filtering and streak pauses.
- The cleanup journal gate remains reachable after local home removal. Store write fences prevent pre-return effects from mutating data during cleanup.
- One draft provider wraps app screens. Framed gifts and sheet-footer Undo remain inside that provider. Account/home changes clear transient feedback and invalidate delayed gifts.
- Place it/Try it replaces a sheet route directly with Build and preserves queued gifts. Browser Back/Forward follows URL history, dismisses visible/pending gift presentation, and leaves Undo available on the destination. Escape closes only the top gift. Gifts add no URL or history entries.
- Explicit All chores URLs render a sheet on desktop as well as phones; Undo follows the actual sheet rather than viewport width.
- The browser fixture for queued gifts uses real prior completions. Its next completion earns the third-chore decor and two-day streak style together. Previously earned rewards are recovered silently during hydration.

## Verification

- Combined `npm test`: **1,160 tests across 53 files passed** on CI Node 22.23.3 (the preceding tree also passed 1,159 on Node 26).
- `npm run lint` and production builds at `/` and `/chore-pet/`: passed. Existing main-chunk size advisory remains (about 568 kB minified / 174 kB gzip).
- `npm run test:browser`: **20/20 passed** against each production base path. Covers navigation/drafts/auth entry, gift/Undo focus and timing, touch sheet dismissal, room keyboard controls, selected-home reconciliation, and visible/pending gift Back/Forward behavior.
- Four new combined domain tests cover old schedule maxima after a break/archive, same-day archive credit, rest-token preservation through idle periods, resumed completion gifts, archived sample exclusions and legacy count fallback. Temporarily removing the archive pause or historical maximum causes the tests to fail; restoring both passes.
- The selected-home browser test failed before selection was passed into reconciliation. Both gift Back cases failed before the popstate/delayed-presentation guard. All pass after integration.
- Independent data review passed 79 focused tests. It found a P3 mismatch between accepted creation dates and archive end dates; PR #12 fixed it with eight SQL regressions for 2150 and 2999 across explicit archive, legacy chore/object DELETE, and object RPC.
- Independent UI review passed 25 focused tests with no actionable findings.
- T3 phone preview at 390 × 664 verified returning-user entry/cancel and the combined native gift above All chores with visible Undo. [Screenshot](evidence/14-integrated-gift-undo.png).

Final CI inspection found PR #14's account tests relying on Node 26's built-in Web Locks while CI uses Node 22. Commit `87a92f6` supplies an explicit browser fixture and adds a missing-Web-Locks refusal regression without changing production code. The combined unit suite, lint, Pages build, and all 20 browser tests pass on actual Node 22.23.3. All five focused PR build checks passed on GitHub; deployment jobs were skipped.

## Rollout and remaining limits

Apply [migration 0007](../../migrations/0007-retained-history.md) before releasing this client. It protects legacy deletes and keeps whole-account/home erasure destructive. Old clients retain rows but do not understand archive-aware UI and use server sync dates. Dates/history destroyed before the migration cannot be reconstructed.

Hosted Supabase Auth/PostgREST, simultaneous network transactions, real email/Google delivery, physical phones and non-Chromium browsers remain unverified. Drafts are in-memory for the active account/home; leaving/reloading warns before discarding them. Undo covers the latest completion window, not a durable history editor. Safe account changes require browser Web Locks; unknown legacy saved-cache provenance cannot transfer to another account.

The audit's larger feature opportunities remain a separate roadmap, not part of these fixes. Baseline characterization probes intentionally assert old bugs and are excluded from the normal regression suite.
