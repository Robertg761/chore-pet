# Progress accuracy implementation plan

**Goal:** Fix audit findings #3, #7 and #13 in one draft PR, without merging or deploying.

**Architecture:** Keep schedule rules in the pure domain replay. Recover the historical best in the same pass as the current streak, and reconcile persisted progress through a no-op-aware action. One App effect observes hydration, data changes and the current day. Passive recovery makes rewards available without replaying gift animations.

**Spec:** `docs/SPEC.md` and findings #3, #7, #13 in the coordinator's read-only `docs/audits/2026-10-07/AUDIT.md`.

**Constraints:** Preserve current domain APIs, art and copy; no schema changes or account/navigation refactors. Coordinate historical chore input with the retained-history bundle. Use the assigned worktree and branch.

## Tasks

- [x] Add failing regressions for the next recurrence among completed and upcoming rows, done-only lists, and personal week totals excluding sample history while retaining health replay and legacy real completions. Fix `choreListModel.ts` and `weekModel.ts`; run their tests.
- [x] Add `streakHistory(chores, completions, today, vacations)` returning `{ currentStreak, bestStreak }`, preserving `currentStreak` as a wrapper. Add failing action regressions for September 28 weekly completion, September 29 rollover, October 7 reopening after a break, merged completion thresholds, schedule edits, vacation, sample history and future dates. Implement `reconcileProgress(progress, context, today)` returning `{ ops, unlocked }`; reuse it for completions and add a minimal App effect. Verify repeat reconciliation produces no writes or gifts.
- [x] Run `npm test`, `npm run lint`, `npm run build`; validate next recurrence, passive reward recovery, reload, rollover and stable writes in an owned T3 preview tab on a private unused port. Review the final diff and obtain independent review; fix actionable findings.
- [ ] Commit and push this branch. Open a draft PR against main, link it to this thread and the coordinator, verify linkage, and send the coordinator the results and integration points.

## Review focus

Sample rows must not earn personal credit. Vacation and schedule history must retain the existing streak rules. Future timestamps must not earn rewards early. Reconciliation must settle without repeated sync writes, including raw versus derived chore counts. Monotonic best/unlocks must survive undo and merge; recovered gifts must not replay on reload.


## Verification and integration notes

- Regression tests failed before implementation for wrong next recurrence, fabricated week totals, and lost historical best. Updated two older assertions that encoded those faulty behaviors.
- Full checks: 1,079 tests pass, lint passes, production build passes with the existing chunk-size warning.
- T3 preview on port 5193, owned tab, desktop and 390 x 664: next dishes tomorrow, done-only next recurrence, sample week zeros with health intact. A stale IndexedDB weekly fixture recovered best 7 and milestones with exactly one write under StrictMode; reload made no additional write. Changing the displayed day from September 28 to 29 awarded mint walls without a gift replay.
- Independent read-only review found no actionable issues and independently ran 95 focused tests. Live cloud synchronization was not exercised; cross-device completion merging uses the real pure merge implementation in tests.
- Passive recovery persists earned items quietly. The existing completion path still returns gifts. Higher server chore-count caches are tolerated after Undo to avoid repeated writes; rewards always use completion history.
- No schema migration. The retained-history bundle owns exclusive `archivedOn` filtering and freezing the replay on days with no active chores and no real completions. Both bundles pass all retained chores into replay. Joint archive-date completion, freeze/resume and historical reward tests remain for integration before merge.
