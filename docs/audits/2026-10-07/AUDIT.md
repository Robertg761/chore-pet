# Chore Pet app audit

Audited 2026-10-07 against commit `9617aaa`. This report covers product usefulness, UI, accessibility risks, domain behavior, persistence, account recovery, and release readiness. Application code was not changed during the audit. This is the frozen baseline report; implementation and verification are tracked in [REMEDIATION.md](REMEDIATION.md) and [INTEGRATION.md](INTEGRATION.md).

## Assessment

Chore Pet has a convincing first session and a distinctive visual identity. Building a room creates useful chores, finishing one changes the room and pet, and the first gift makes the loop easy to understand. The existing test coverage is substantial. A visual redesign is not the highest-value next step.

The next release should make progress and recovery trustworthy, fix several interaction bugs, and give people control over real household exceptions. After that, add dependable reminders and a better daily planning view. Shared households and multiple rooms are valuable larger projects, but should follow those foundations.

## Evidence and limits

- `npm ci`: succeeded; npm reported zero known dependency vulnerabilities at installation time. This is not a security guarantee.
- `npm test`: 43 files, 1,063 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed, with a chunk-size warning. Main JS is 549.51 kB minified, 168.07 kB gzip; precache is 930.25 KiB. These are bundle measurements, not measured load-time scores.
- Three additional data probes and five domain scenarios reproduced the findings below. The probes assert the current faulty behavior, so a passing probe confirms a defect, not a fix. Commands and caveats are in [evidence/README.md](evidence/README.md).
- Browser checks used the T3 collaborative Chromium browser, local development and production builds, principally 390 × 664 and 1280 × 800. The chore editor was also checked at 320 × 568 and with a 200% root font-size override. The enlarged editor remained scrollable; this does not establish full zoom or accessibility compliance.
- A fresh production-build journey passed: choose Sprout, name Fern, place a sink, finish onboarding, complete dishes, open and wear the beanie, inspect wardrobe/rewards/settings/vacation, and export a PNG. Reload retained the home and completion. After stopping the local production server, the service worker still loaded the app and saved home; curl confirmed the origin was unavailable. This checks cached launch, not cloud synchronization while offline.
- Cloud Auth was not configured for this browser run. Email delivery, Google redirects, deployed RLS/migrations, live two-device sync, real notification delivery, and real iOS/Android installation were not verified. Account/data findings use actual repository logic with controlled storage and remote substitutes. No live account data was changed.
- This is a broad application audit, not a claim that every possible defect has been found, nor a penetration test or complete WCAG certification.

## Findings to fix

P1 means address before expanding usage because a failure can lose data or misreport deletion. P2 means a material correctness or usability problem for the next quality release. P3 means a smaller reporting or recovery gap. Effort is relative: S is a local change, M spans several components, L changes the data model or backend.

### 1. P1: Failed local cleanup can still be reported as successful deletion

**Evidence:** [store.ts](../../../src/data/store.ts), lines 587–622; [account.ts](../../../src/lib/account.ts), lines 228–231. Data probe 2.

If the storage write that clears the snapshot fails, `reset({ backup: false })` logs the failure and resolves. The UI is emptied in memory, `savedLocally` remains true, and the account layer proceeds as though cleanup succeeded. A fresh store reloads the supposedly deleted home. This does not mean server deletion failed; it means its device-cleanup promise is false. Backup creation failures at store line 321 are also swallowed, allowing a sign-out reset to discard unsynced work after preservation failed.

**Change:** Make preservation and replacement atomic where possible. Return explicit cleanup results, retain retryable cleanup state, and report any device copy that could not be removed. Do not clear the only copy of unsynced changes after a failed backup. **Effort: M.**

**Acceptance:** A failed clear cannot return a fully successful deletion result. A failed backup cannot discard unsynced work. Exercise transaction abort, inaccessible storage, and backup failure separately.

### 2. P2: Deleting from a stale device loses newer completion credit

**Evidence:** [actions.ts](../../../src/data/actions.ts), lines 59–73; [state.ts](../../../src/data/state.ts), line 450; data probe 3.

Device B knows one completion. Device A records a second. B deletes the chore using its cached state, banks only one completion, then the server cascade removes both completion rows. The displayed lifetime total becomes one. The SQL maximum on cached `chore_count` does not prevent this because the UI derives its total from remaining rows and retired counts. Removing the associated object has the same risk.

**Change:** Archive chores and retain immutable completion history, or bank authoritative counts and delete in one server transaction. Pulling immediately before deletion still leaves a race. **Effort: M–L.**

**Acceptance:** Completion-versus-deletion races preserve both credits. Test actual cascade behavior; the current store fake deletes parent rows without simulating their cascades.

### 3. P2: Earned streak milestones can remain locked and then be forgotten

**Evidence:** [actions.ts](../../../src/data/actions.ts), lines 152–168; [RewardsScreen.tsx](../../../src/screens/RewardsScreen.tsx), lines 59–63; domain probe.

Reward reconciliation only runs after a completion. A weekly chore completed September 28 produces a two-day streak on September 29, but mint walls remain locked with zero days remaining. The streak reaches seven on October 4. If the next chore stays unfinished until October 7, the streak breaks while stored best remains one. The intervening milestones were never recorded.

**Change:** Reconcile earned progress on hydration, day rollover, sync, and relevant edits. Replay must recover historical maximums when a user returns after a break. Handle thresholds reached by merging completions from multiple devices too. **Effort: M.**

**Acceptance:** Weekly-only users receive their earned streak rewards without inventing an extra chore. Returning after a break preserves the best streak already achieved.

### 4. P2: A replacement account can adopt the previous saved account's cache

**Evidence:** [store.ts](../../../src/data/store.ts), lines 413 and 638–645; [supabase.ts](../../../src/lib/supabase.ts), lines 82–86; data probe 1.

When the current session changes, the old snapshot is held for the new account without distinguishing a guest from a saved account. If saved account A's authentication disappears while its IndexedDB copy remains, a new guest B can be offered A's cached home and restore/upload a clone into B.

This is a **same-browser cache ownership issue**, not an RLS bypass or access to A's remote database. The app already deliberately renders cached homes before authentication finishes. Successful normal sign-out avoids this scenario; session replacement with a retained cache does not.

**Change:** Persist owner type and backup provenance. Only transfer guest homes through an explicit, intended path. Require the original saved account to authenticate before its backup is reowned by another account. **Effort: M.**

**Acceptance:** Session revocation cannot make a saved account's backup transferable to an unrelated guest. Intended guest-to-account recovery still works.

### 5. P2: The All chores modal blocks gifts and Undo

**Evidence:** [App.tsx](../../../src/App.tsx), lines 591–610; [Sheet.tsx](../../../src/shell/Sheet.tsx), line 63; [GiftBox.tsx](../../../src/screens/GiftBox.tsx), line 139. Browser reproduced.

All chores uses a native modal dialog. GiftBox and UndoToast are siblings outside it. Earning a gift in the sheet renders it behind the browser's top-layer dialog, where it cannot receive focus or clicks. Closing the sheet reveals it. Undo is also outside the active modal and its five-second window can expire before the user can reach it. The normal home gift can also cover the short-lived undo action.

**Change:** Coordinate modal ownership and completion feedback. Keep Undo reachable in the active surface, pause its expiry while obscured, and present gifts through the same modal system. Add a persistent completion history action to correct mistakes later. **Effort: M.**

**Acceptance:** Complete a chore from All chores, undo it, then earn/open a gift there using both pointer and keyboard. No active modal hides the required next action.

### 6. P2: Enter on Cancel places furniture

**Evidence:** [BuildRoom.tsx](../../../src/room/BuildRoom.tsx), lines 171–205 and 248–259. Browser reproduced.

Pick a washing machine, press Tab three times to focus Cancel, then Enter. Object count changes from seven to eight, and two washer chores are created. The room's bubbled key handler interprets Enter as placement and prevents the Cancel button's native activation. Turn has the same conflict.

**Change:** Apply room shortcuts only when the room itself is the event target, or exclude interactive descendants. **Effort: S.**

**Acceptance:** Enter and Space activate the focused Turn/Cancel button; Enter on the room continues to place the preview.

### 7. P2: The caught-up card gives the wrong next chore

**Evidence:** [choreListModel.ts](../../../src/screens/choreListModel.ts), lines 73–74 and 95–96; browser and standalone domain reproduction.

In a new sink-only home, complete Wednesday's dishes. The card says "Next: Scrub the sink, on Mon" even though dishes recur tomorrow. `nextUpcoming()` only examines Coming up, ignoring Done today rows that already contain their next due dates. With only a daily chore, the next action disappears altogether.

**Change:** Find the earliest next due date across all upcoming statuses, including chores finished today. **Effort: S.**

**Acceptance:** This fixture says dishes tomorrow; a done-only list still names its next recurrence.

### 8. P2: Removing furniture can silently switch the active home

**Evidence:** [state.ts](../../../src/data/state.ts), lines 415–429; domain probe.

If concurrent/offline onboarding leaves two homes, the app chooses whichever has the most objects on every read. Home A with two objects wins over older B with one. Remove one A object and the age tie-breaker selects B. Pet, chores and rewards suddenly change, with no normal home selector to recover A.

**Change:** Persist the active home ID. Use heuristics once when recovering duplicate homes, then provide an explicit choice. **Effort: M.**

**Acceptance:** Adding or removing furniture never changes the selected home.

### 9. P2 product behavior: Deletion rewrites historical achievements

**Evidence:** [actions.ts](../../../src/data/actions.ts), lines 59–68; [tables.ts](../../../src/data/tables.ts), completion cascade; [unlocks.ts](../../../src/domain/unlocks.ts), lines 172–178; domain probe.

Delete a daily chore completed October 1–6 while keeping another completed October 4–6. Current streak drops from six to three and the week total from nine to three. Lifetime count remains nine. Historical health also changes when the underlying chores disappear.

Existing tests intentionally encode deletion discarding history, so this is a product decision to revisit rather than an accidental regression. People expect removing an obsolete task to stop future obligations, not erase past work.

**Change:** Archive chores with an effective end date and keep dated completions. Use the same history model to resolve finding 2. **Effort: L.**

### 10. P2 usability: Returning users cannot sign in from the landing screen

**Evidence:** [Landing.tsx](../../../src/screens/Landing.tsx), lines 38–48; [SettingsScreen.tsx](../../../src/screens/SettingsScreen.tsx), line 52. Landing inspected; navigation verified in source.

A person with an account on a new device sees only sample/build choices. Sign-in is inside Settings, which requires creating a temporary home first. This undermines the promise of finding an existing pet on another device.

**Change:** Add "I already have a home" beside the first-run choices, reusing the existing sign-in flow. Follow through with a clear loading, retry, and recovered-home state. **Effort: S–M.**

### 11. P2 usability: Navigation ignores browser history and drops drafts

**Evidence:** [App.tsx](../../../src/App.tsx), lines 106–111 and 241; [ChoreEditor.tsx](../../../src/screens/ChoreEditor.tsx), local form state.

Screen changes do not update URL or browser history. Browser Back therefore follows history outside these app views instead of reversing navigation. In the browser, typing "Clean air filter", tapping Home, and reopening Add a chore discarded the draft without warning. History length and path stayed unchanged while changing app screens.

**Change:** Use lightweight URL/history navigation, including sheet dismissal where appropriate. Preserve drafts across tab changes, or ask before discarding a dirty form. **Effort: M.**

### 12. P3: Failed recovery gives no visible explanation

**Evidence:** [SavedHomes.tsx](../../../src/screens/SavedHomes.tsx), lines 39–49.

The UI ignores `restoreSaved()` returning false and only logs thrown failures. The confirmation closes and controls reset regardless of outcome. Users cannot tell whether storage, a competing restore, or another failure stopped recovery.

**Change:** Handle both false results and thrown errors. Keep the selected home visible, explain the failure, and offer retry. **Effort: S.**

### 13. P3: Week totals include fabricated sample activity

**Evidence:** [weekModel.ts](../../../src/screens/weekModel.ts), lines 58–66; domain probe.

The weekly counter includes `counts: false` sample-history rows even though rewards and streaks exclude them. A new sample visitor is credited with chores they never did, including after adopting the sample home.

**Change:** Exclude seed activity from personal completion totals or label it explicitly. Retain seed data only where needed to explain sample health. **Effort: S.**

## Improvements for daily use

These are opportunities, not claims that existing committed features are broken.

| Order | Improvement | Useful first version | Effort |
| --- | --- | --- | --- |
| 1 | Set an initial due date or last-done date | When adding an existing household task, let people specify when it actually needs doing. Show the resulting next due date before Save. Every-N tasks currently start halfway through the interval. | M |
| 2 | Skip once, snooze, or pause one chore | Handle illness, a task done by someone else, or a chore that is not needed this round without claiming completion or changing every future occurrence. Keep these actions distinct in history and rewards. | M |
| 3 | Completion history and durable corrections | Show when a task was last done and who did it if sharing arrives later. Allow undo beyond a five-second toast. Archive obsolete tasks. | L |
| 4 | Reminders that can bring people back | Current reminders run from a React interval while the app is running; there is no closed-app push scheduler. Add scheduled delivery with timezone and permission handling, or clearly present the current feature as an in-app nudge. Verify on real devices. | L |
| 5 | A task-focused daily view | Show due and overdue totals, an upcoming seven-day plan, search/filter by room or object, and a compact list option. On the tested phone home, one task is visible while Build, Wardrobe and Rewards have permanent tabs. Let frequent users get to their whole task list directly. | M |
| 6 | Better setup of a real home | Preview the exact chores and frequencies an object adds, allow deselecting irrelevant defaults, name duplicate objects such as "Upstairs toilet", and offer a small starter routine. Preserve playful building as an option. | M |
| 7 | Recovery and save status people can act on | Export/import a home, expose last successful sync and retryable failures, explain device-only storage, and provide an in-app local reset. On phones sync status is buried in More; failed sync copy is vague. | M |
| 8 | Explain the rules at the point of use | Show why an early repeat is unavailable, the next eligible day, banked rest tokens, and what vacation will defer. Avoid making users infer schedule rules from "All set". | S–M |
| 9 | Sustainable rewards | Extend the finite 50-chore/14-streak-day track with optional cosmetic collections or personal goals. Preview at least the next reward so people know what they are earning. Avoid making productive chores depend on unlocks. | M |
| 10 | Shared households and multiple rooms | Start with named rooms and chore ownership, then invitations and shared completion attribution. Define conflict behavior and privacy before adding invitations. This is currently deferred in the product plan. | L |

## UI and accessibility direction

Keep the art, clear button shapes, large primary controls, immediate feedback and kind copy. The ordinary phone and desktop layouts inspected here are coherent. The main UI work is clearer task hierarchy and behavior rather than another styling pass.

- Make room objects useful entry points on Home: tapping a messy sink should open its chores. Currently Home exposes the pet as the room's interactive button; object management is in Build.
- Keep today's completed tasks collapsible and expose the next recurrence accurately. Add last-done context and an obvious edit action, rather than relying on people discovering that chore names are buttons.
- Make vacation read as a deliberate paused state with the return date. Clarify whether chores can still be voluntarily completed. Current copy says paused while task statuses can still read Today.
- Fix modal ownership and keyboard activation before calling the experience accessible. Labels, form validation, reduced-motion styles, and a screen-reader table for the week chart are good foundations. Static checks or screenshots alone cannot prove focus behavior or screen-reader usability.
- Add physical-device checks for the software keyboard, install flow, safe areas, screen rotation, reduced motion, text enlargement, and notification permission recovery. The 200% root-font experiment is only a limited reflow check.

## Release and engineering work

1. Add a small browser suite against the production build: new home to first gift, All chores with Undo/gift, keyboard Cancel/Turn, dirty form navigation, next recurrence, reload, and cached offline launch. Current CI runs logic tests and build but has no asserting browser suite; the demo recorder is not a substitute.
2. Add a database-backed completion/delete race test and real Auth integration checks in a dedicated test project. Confirm all six migrations and required Auth provider/linking/redirect settings are deployed before claiming account recovery is verified.
3. Profile cold load on a low-end phone before performance changes. Then consider lazy-loading secondary screens and art that are not needed in the first session. The current main chunk warning is a reason to measure, not proof the app is slow.
4. Introduce a small amount of opt-in, privacy-conscious error reporting or a user-copyable diagnostic report. The current recovery failures often only reach the console. Do not add analytics merely to satisfy an engineering checklist.
5. Ask a few people to use their actual chores for a week. Watch setup, a missed day, a correction, and a return visit. Use those observations to choose between a dedicated Chores tab and the current room-first home, and to decide how important shared households are to the first audience.

## Suggested delivery sequence

| Release | Scope | Exit condition |
| --- | --- | --- |
| A: Trust and correctness | Findings 1–8, recovery errors, browser regression coverage | No silent data loss in tested failure/race cases; milestones persist; keyboard/modal flows work; next due date is truthful. |
| B: Everyday chore control | Archive/history, first due date, skip/snooze, drafts, direct sign-in, task-focused list, truthful sample totals | A person can model an existing household, handle an exception, recover a mistake, and return on another device without a workaround. |
| C: Return and grow | Reliable reminders, export/import, setup templates, named rooms, longer rewards | A week-long pilot shows reminders arrive, chores stay manageable, and recovery is understandable. |
| D: Shared household use | Invitations, assignments, attribution, multiple rooms and conflict policy | Two people can work concurrently and see accurate ownership and history. |

## Screenshot walkthrough

These captures were made during this audit. The sample journey and fresh-home journey use different local origins and fixtures. Screenshots document inspected states, not every action in the test log.

1. **Sample home:** Clear art and one obvious next action. A fuller daily overview would help after onboarding. [Screenshot](evidence/01-sample.png).
2. **First gift:** The main-home completion loop works and feels rewarding. Undo sits behind the gift, so correction needs a more durable path. [Screenshot](evidence/02-gift.png).
3. **All chores after earning another gift:** The native sheet covers a gift that exists in the DOM. Browser hit-testing confirms the gift's button cannot receive the click. [Screenshot](evidence/03-giftBug.png).
4. **Build:** Large controls and consistent artwork. Keyboard Cancel was verified to add a washer and chores accidentally. [Screenshot](evidence/04-build.png).
5. **Desktop home:** The room and full list share available width. The list scrolls independently. [Screenshot](evidence/05-desktop.png).
6. **Small-phone editor:** Schedule choices and Save fit at 320 × 568; long selected place text is truncated. Empty-name validation worked. [Screenshot](evidence/06-editor.png).
7. **Fresh pet selection:** Pet choice and naming are clear. New-device sign-in needs an earlier entry on Landing. [Screenshot](evidence/07-onboard.png).
8. **First real chore:** The reminder to do the task in real life supports the core purpose. Sink placement creates the expected chores. [Screenshot](evidence/08-newHome.png).
9. **Settings:** Device-only persistence is disclosed. Closed-app reminders and portable recovery remain product gaps. Notification permission is blocked in this test browser. [Screenshot](evidence/09-settings.png).
10. **Cached launch with the server stopped:** Pet, beanie and completion survive. The "Next" message incorrectly selects Monday instead of tomorrow's dishes. [Screenshot](evidence/10-offline.png).
11. **Wardrobe:** The earned beanie is selected and correctly shown on Sprout. [Screenshot](evidence/11-wardrobe.png).
12. **Rewards:** Milestones are visible; most future items are hidden as surprises. Reward persistence on no-due days needs fixing. [Screenshot](evidence/12-rewards.png).
13. **Vacation:** Adding the default interval worked and Home changed to On vacation. The explanation should be consistent with the resulting task presentation. [Screenshot](evidence/13-vacation.png).

The preserved probes, screenshots, and source references make this report suitable for turning into implementation issues. No fixes, commits, deployment, or production account changes are included in this audit.
