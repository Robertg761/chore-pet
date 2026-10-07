# Completion dialogs and room keys implementation plan

Goal: fix audit findings #5 and #6 while preserving rewards and room controls.
Spec: docs/SPEC.md and the coordinator's 2026-10-07 audit, findings 5 and 6.

The native dialog owns focus and interaction. Gifts will use it too. Undo belongs
inside the gift or All chores footer while those are open, and otherwise beside
the app. Its timer pauses while a modal blocks it, while a gift is active, and
while hovered or focused. Completion feedback lives in the existing app frame so
Place it and Try it can navigate without losing queued gifts or Undo.

Constraints: no domain/schema changes, no new art, no broad App refactor, no
merge/deploy. Existing reduced motion and mobile sheet dismissal must survive.

- [x] Add production-browser regressions using node:test and existing playwright-core.
  Prove Cancel/Turn keyboard behavior and reachable sheet/gift Undo fail first.
- [x] Scope BuildRoom shortcuts to the room target. Preserve arrows, R, Enter.
- [x] Give GiftBox native modality and focus restoration; add Sheet footer and
  context-owned Undo. Pause blocked/active-gift expiry; retain queued shortcuts.
- [x] Cover gift queue, wear/place/try, delayed Undo, focus, reduced motion,
  desktop and phone dismissal. Run unit tests, lint, build, browser tests and T3 QA.
- [x] Review the diff, obtain independent review and fix actionable findings.

Delivery: commit and push this branch, open/link a draft PR and report to the coordinator.

Review focus: dialog close ordering and focus fallback; Undo crossing contexts;
multiple queued gifts during shortcut navigation; timers during modal blocking;
Cancel and Turn must never create furniture or chores.

Execution: native implementation in this thread, as explicitly authorized.


Verification: 1,063 unit tests and 13 production Chromium regressions passed;
lint and production build passed. A Pages-base build under /chore-pet/ passed
three additional browser smoke checks. The initial tests reproduced Enter on
Cancel adding a washer, unreachable sheet Undo, and the sheet intercepting gift
clicks. T3 phone inspection checked gift/Undo pointer and keyboard interaction,
Escape restoration and Cancel without adding furniture. The automated touch
probe checked sheet drag dismissal. Independent review found two focus fallback
bugs; both gained failing regression assertions, were fixed, and review approved.
Physical-phone and non-Chromium checks were not performed. The existing Vite
large-chunk advisory remains.

Integration with the navigation bundle: REMOVE standalone gift onPlace/onTry
setAllChores(false) calls; navigation setView({name:'build'}) replaces the existing
sheet route atomically. No history.back then push. Retain framed()+Sheet footer
completion feedback together with navigation scope reset/delayed gift guard.
Transient gifts stay outside the URL; native cancel stops propagation without
closing the underlying sheet. Browser helpers are shared with that bundle.
