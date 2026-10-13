# Batch42 home speech/text layout review

Independent report-only review, 2026-10-12. Verdict: **PASS for the frozen Batch42 change and sampled acceptance scope.** No actionable regression found. Severity counts: Critical/P0 0, High/P1 0, Medium/P2 0, Low/P3 0.

Immutable input: [scene-dialogue-review-input.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/scene-dialogue-review-input.json).

Exact input SHA-256: `8cc4a0fdb4cab146e29e1cb9c3c85510df51930a96ce13159ab4897380e4e209`.

Base commit: `3296d4a82052758ba7cdd05eb1691dc946e609b2`.

## Integrity and provenance

I independently read and hashed the files, checked the recorded exit values, reconstructed the frozen patch in memory against the exact base commit, and recomputed the stored comparison fields from its JSON/PNG inputs. These were static evidence checks. I did not execute the comparison runner or any project runner.

| Evidence | Result |
| --- | --- |
| Five changed source files | All five current SHA-256 values match the freeze; each differs from the base or is new. |
| Twelve declared unchanged dependencies | All twelve match the freeze and their exact base-commit bytes. |
| Separate freeze | Equals the input's embedded freeze; SHA-256 `bc288abc66c16667730f7ab508fcad5ec2390544f0410c9e26339a3765237e9e`. |
| Frozen source patch | SHA-256 `d7a001d70935132ddc38ba96c048765984c9bb1ecc04e2b4b7c88ece80f96268`; applying its hunks in memory reproduces all five frozen source files exactly, with no extra patch paths. No added trailing whitespace found. |
| Artifact manifest | SHA-256 `6060813447ba8f777b75c364c45aac205bb1d9b3f3e5f02b6c59ea98d744806a`; all 100 listed files match. |
| Eleven completed checks | All eleven raw logs and eleven exit-evidence files match their input hashes; all exit values agree. |
| Nested comparison inputs | All 48 references match both disk bytes and the artifact manifest: twelve before JSONs, twelve final JSONs, twelve before PNGs, twelve final PNGs. |
| Comparison runner | Its frozen source hash and output's `runnerSha256` both equal `f63ba18f1f7b8c1fc5f106e898a0a07c92b396a4f396f1a010ffbbd220d7d2f8`. |

Both stored CSS baselines are byte-exact copies of the named files at the exact base commit:

| Base source | Baseline SHA-256 |
| --- | --- |
| `src/index.css` | `beb2718dcfa019a1eded9ed62139f6aae435dc25d41a71916c5641077a2ad9e8` |
| `src/room/HomeScene.css` | `bc00ad2e5bbcab611da199dfd3bff8524fbd6a21e061219a7a1c71cdbf071f04` |

The five changed files are `src/index.css`, `src/room/HomeScene.css`, `scripts/browser/scene-dialogue.test.mjs`, `docs/ART.md`, and the audit comparison runner. The twelve unchanged dependencies are `src/App.tsx`, `src/room/HomeScene.tsx`, `src/pet/LivingRoom.tsx`, `src/pet/usePetMotion.ts`, `src/pet/usePetVisibility.ts`, `src/pet/behaviour.ts`, `src/pet/activityMotion.ts`, `src/character/motion.ts`, and the TSX/CSS pairs for `PetExplore` and `PetPlay`.

The 100 artifacts comprise four audit-root files plus 24 files in each of the before, initial prototype, revised prototype, and production capture directories. The stored prototype runner represents the final strengthened prototype. Its injection branch is absent from the final native test. The native test retains only the deliberate 200% root-font fixture override. Earlier prototype logs/captures are historical evidence, not acceptance against the current runner.

## Source and assertion review

[HomeScene.css](/home/robert/.codex/worktrees/4511/chore-pet/src/room/HomeScene.css:1) assigns tools, compact doors, canvas, and status to explicit rows. The viewport and speech overlay share the canvas area. The overlay's 4px top margin therefore follows the actual row heights, replacing the fixed 52px offset that collided with wrapped tools and compact doors. `align-self: start` keeps speech at the canvas top; the existing z-index and pointer-event behavior preserve the overlay and underlying interactions. The visually hidden status is absolutely positioned and does not create an implicit content row.

The explicit `minmax(0, 1fr)` column lets the grid fit its allocated stage rather than expand to a child's intrinsic width. This addresses the historical initial prototype's 251.296875px canvas in a 184px allocation at 640px/200%, a 67.296875px excess. Final stored geometry independently confirms canvas and zoom-button horizontal containment in all twelve cases.

[index.css](/home/robert/.codex/worktrees/4511/chore-pet/src/index.css:343) nests the 34rem `app-shell` query inside the exact existing wide/landscape media condition. Only home descendants receive fallback rules. Root text enlargement raises the threshold from 544px at the sampled default root size to 1088px at 200%. The 640px and 844px enlarged landscapes stack; sampled default landscapes and 1280px views preserve their existing arrangement. The fallback restores the 420px stage minimum, 250px canvas floor, and ordinary content flow for chores. The existing `.app-view` scroll container accommodates the longer stack.

[The native speech test](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/scene-dialogue.test.mjs:7) uses actual production UI controls, actual body rectangles, a real compact-door row in the two-room fixtures, and persisted-table snapshots. Assertions check control clearance of at least 2px, canvas-relative speech placement, at least 8px before resident ink, bubble width containment, stage/canvas and stage/zoom bounds, enlarged-landscape canvas/body floors, unchanged character markup and placement transform, unchanged camera, canvas dimensions within 0.5px during each invitation, and unchanged saved tables. The bound comparison independently establishes the stronger exact 4px control gap in every final capture.

The comparison's nine exact canvas/body size pairs concern before-versus-production layouts. The native test's unchanged geometry checks concern before-versus-after speech within each production invitation. These are distinct claims. Three enlarged landscapes deliberately change layout and resident size relative to baseline.

[Portrait readability assertions](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/scene-readability.test.mjs:17) support the recorded default 420px stage, 282px canvas, and resident size, plus following-content separation and enlarged portrait visibility. The separate real-clock scene/player tests support finite offscreen behavior and unchanged announcements/focus/camera; the frozen speech matrix itself does not establish temporal quality. [The art guidance](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md:205) describes the implemented scope consistently.

## Still inspection

I directly opened all 24 required PNGs, including the five identical pairs. Each key below names `scene-dialogue-<key>.png` in both the [before directory](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/scene-dialogue-before-captures) and [production directory](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/scene-dialogue-final-captures). All PNG dimensions match their declared viewports. Measurements below come from independently checked stored JSON, in CSS pixels.

| Pair key | Control gap before → final | Final resident gap | Visual result |
| --- | --- | --- | --- |
| 320-100-one | 4 → 4 | 123.16 | Already clear; byte-exact PNGs. |
| 320-100-two | -50 → 4 | 75.48 | Bedroom control uncovered; resident size preserved. |
| 320-200-one | -48 → 4 | 50.40 | Wrapped hint/Fit home cleared; resident size preserved. |
| 320-200-two | -102 → 4 | 24.78 | Wrapped tools and Bedroom control cleared; resident remains visible. |
| 390-200-one | -24 → 4 | 50.40 | Fit home cleared; resident size preserved. |
| 640-100-one | 4 → 4 | 68.02 | Existing landscape retained; byte-exact PNGs. |
| 640-200-one | -112 → 4 | 50.40 | Stacked flow restores room art; body height 5.60 → 25.07. |
| 844-100-one | 4 → 4 | 88.70 | Existing landscape retained; byte-exact PNGs. |
| 844-200-one | -24 → 4 | 50.40 | Stacked flow restores room art; body height 15.22 → 25.07. |
| 844-200-two | -78 → 4 | 24.78 | Door and tools cleared; body height 7.08 → 20.55. |
| 1280-100-one | 4 → 4 | 352.01 | Existing desktop retained; byte-exact PNGs. |
| 1280-200-one | 4 → 4 | 273.55 | Enlarged desktop retained; byte-exact PNGs. |

All twelve final PNGs also match the revised prototype PNG bytes. Final acceptance here rests on the production source, production logs, and directly inspected production images. The nine unaffected samples preserve exact canvas/body width and height. The three adapted samples have a 250px canvas. Speech remains over the upper room artwork in some enlarged views, consistent with the canvas-overlay design; it clears the measured resident and the required controls. This is not a claim that all furniture remains unobscured.

## Recorded checks and containment coverage

These are verified stored results, not executions performed by this reviewer. All test logs record zero cancelled, skipped, and todo cases.

| Check | Recorded exit | Recorded result |
| --- | --- | --- |
| build | 0 | Production build completed; chunk-size advisory present. |
| comparison | 0 | Twelve pairs; nine exact-size layouts, three adaptations, five exact PNG pairs. |
| diff | 0 | Empty raw log; static patch inspection found no added trailing whitespace. |
| lint | 0 | Completed; no lint warning/error recorded. |
| lint-final | 0 | Completed; no lint warning/error recorded. |
| native | 0 | 37/37 passed, 48.525s, including the twelve final speech cases. |
| shell-regressions | 0 | 6/6 passed, 10.843s. |
| red | 1 | Expected baseline failure: 5 passed, 7 actual control-clearance failures, 12.128s. |
| prototype | 0 | Historical original assertions, 12/12 passed, 11.742s. |
| prototype-revised | 0 | Historical revised prototype, 12/12 passed, 11.827s. |
| prototype-bounds | 0 | Strengthened prototype assertions, 12/12 passed, 10.921s. |

Adding inline-size containment to `.app` affects the shared shell even though the new query styles only home. I checked the six recorded default 390×664 regression cases against their source assertions:

- Visible gift and pending gift cases both dismiss the All chores sheet and gift through Back, leave Undo clickable, restore the corrected chore, and avoid gift replay on Forward.
- More/All chores history, menu replacement, and deep-link reload remain reachable.
- Adding a bathroom retains kitchen objects and independent room chores.
- The room pill retains late chores from other rooms.
- Removing a room retains safe confirmation focus and archives its chores.

The [gift tests](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/integration.test.mjs:50), [sheet/history test](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/navigation.test.mjs:41), and [room tests](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/rooms.test.mjs:18) provide meaningful functional regression evidence for shared containment. Sheets and gifts use native modal dialogs. The recorded navigation matrix adds six viewport sizes at each root text size, including target/text/pill bounds and keyboard More/Escape; player checks add panel text, target, overflow, and focus containment. No shared-shell regression is established by this evidence. The six default cases do not certify every overlay's geometry at every text size.

## Limits and declined judgments

- No build, test, project runner, comparison runner, browser launch, install, network operation, Git mutation, extra agent, or external message was performed. Only this report was written. Checks used file reads, hashing, in-memory patch reconstruction/arithmetic, read-only base-commit access, and local image viewing.
- Chromium 152.0.7977.82 and sampled 100%/200% root text sizes are the supplied native evidence. Browser zoom, other browser engines, physical devices, unusual safe-area settings, and assistive-technology certification are outside this review's evidence.
- The speech matrix uses reduced motion and a frozen clock with one selected dining-table line, one-room fixtures, and three two-room fixtures. Arbitrary messages, resident locations, cameras/zoom levels, more rooms, localization, and motion playback are not certified. The existing real-clock regressions supply only their stated finite-deadline coverage.
- JSON geometry is collected before the explicit Show room capture action; PNGs are viewport screenshots after that action. Cropped headings or below-fold chores in short/enlarged stills are not evidence that the full scrolling page lost them. Exact absolute screenshot coordinates are not asserted from the earlier JSON.
- The comparison runner binds stored geometry and image bytes. It does not independently attest when a browser run occurred or certify human temporal quality. Earlier prototype revisions are not reproducible from the single final strengthened prototype-runner artifact.
- The prior 2285-test/113-file full TypeScript checkpoint predates the CSS-only product change. It is background for unchanged TypeScript, not a post-CSS full-suite result. No post-CSS full-unit claim is made here.
- Next43 sniff follow-through drafts, its new test, and `/tmp` probes are excluded by the delegation. They were not reviewed or included in this verdict. The verdict applies to the exact frozen Batch42 input and declared dependency set, not unrelated concurrent workspace changes.

Declined judgments are the unsampled environments, arbitrary content/camera combinations, temporal/whole-app accessibility certification, historical fixture reconstruction, and disjoint Next43 work listed above. None conceals a demonstrated Batch42 regression. The frozen change is ready for the root's final review/checkpoint within these limits.
