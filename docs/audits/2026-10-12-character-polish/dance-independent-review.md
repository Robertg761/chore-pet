# Independent review of the frozen Dance batch

Verdict: PASS. No actionable findings in the frozen Dance scope. This is one bounded static review, performed independently against the supplied requirements and evidence. It does not approve unrelated working-tree changes.

Input: `docs/audits/2026-10-12-character-polish/dance-review-input.json`.

Input SHA256: `0c6cf8307195e22f43dd2e8bf07022d6be1fb4cbdc0c075e7e62ca5b2325fae3`.

Base and observed HEAD: `47302ffd2ec2da5d31c2207ee7fb548b4cd35a26`.

Workspace: `/home/robert/.codex/worktrees/4511/chore-pet`. Evidence names below are relative to its `docs/audits/2026-10-12-character-polish` directory unless a source path is given.

## Verified scope and bindings

- All 25 changed paths match their frozen SHA256 values: 8 production files, 7 unit-test files, 8 native test harnesses and 2 documents. Reviewed the complete 943-line `dance-source.diff`, `dance-design.md`, changed tests and relevant surrounding implementation.
- All 34 declared unchanged dependencies match both their frozen hashes and their base-commit contents. Inspected the motion owner, reaction state/deadline/transition logic, visibility and reduction hooks, character articulation/layering, face handling, player wiring, preview isolation and relevant existing test coverage as needed. Hash verification of a dependency is not a claim of exhaustive line review.
- Patch SHA256 is `00b7263429cd832b58733e98bcbe9e70f0e2e8e42dc921c363443bfe07ee65ef`. Regenerating the patch with the freeze script's command form gives identical bytes. Independently applied all hunks to base contents in memory, including added files; all 25 reconstructed files exactly match the frozen files. No index or checkout mutation occurred.
- Artifact manifest SHA256 is `2f28ad30aa0b61a9fad5492920ae913d86e96c94f29daf573520328a35ccc744`. All 130 artifact entries match. All 24 raw logs and 24 exit files match their input bindings; recorded exit integers agree with their resource sidecars. All 26 requested final PNG hashes agree with both visual inventory and artifact manifest.
- The retained baseline motion snapshot exactly equals the base Git blob. Capture manifest source hashes and differential baseline/current hashes agree with the frozen inputs. Rechecked input and all 59 source/dependency hashes after inspection; no drift.

## Implementation assessment

`src/character/motion.ts:329` defines a finite 2800 ms Dance with `sin(4*pi*t)`, two complete sway cycles, a smooth quarter-duration rise/fall, small hand sweeps and bounded delayed appendages. Species amplitudes are Mochi .82, Bun 1, Sprout .72; existing mood energy further reduces motion. Translation is bounded by 2.5 SVG units, lean by 4.5 degrees, and added compression by 1.2% before scaling. Smoothstep envelopes and the finite guards settle geometry and speed at both endpoints. Recorded one-millisecond metrics agree with these limits; the largest recorded hand angle is about 25 degrees and appendage angle about 3.6 degrees. These are numerical samples, not human temporal approval.

Healthy Dance cancels torso translation at both ground offsets, sets no foot lift or vertical torso displacement, leaves the shadow unchanged and adds no reward accent. The unchanged renderer cancels torso rotation/scale for feet. The three native player records each contain 13 actual screen-coordinate samples; independently recomputed maximum contact drift is 0.0000023686196815242793 px for Bun, 0.0000029178042784573642 px for Mochi and 0.000002320294567773465 px for Sprout. These tiny residuals describe the recorded samples. During an interruption from walking, the existing 120 ms join preserves and replants outgoing contacts instead of snapping immediately to the settled stance.

`src/pet/behaviour.ts:429`, `src/pet/activityMotion.ts:173` and `src/pet/LivingRoom.tsx:257` retain the existing reaction owner, absolute deadline, priority and transition machinery. Explicit retries remain busy without extending the deadline or queuing another Dance. Chore celebrations can interrupt. Fractional walk position and tap alternation remain intact. There is no autonomous Dance trigger or persistence change. Speech remains in the resident live region. The existing successful-response chirp is inherited; no Dance-specific sound implementation is added.

Reduced resident Dance holds the existing still pleased expression through its semantic deadline, then stops the finite clock. Offscreen resident observation suppresses callbacks and advancement on return expires stale activity. Sick/away residents retain resting art and Check in. Scruffy faces retain their existing expression policy. Lifetime blink, face backing, outfit clipping and render order remain shared with existing actions.

`src/pet/PetPlay.tsx:70` and `src/screens/WardrobePreview.tsx:91` add the sixth explicit choice. Container-based CSS produces equal 3+3 rows when labels fit and one column when enlarged text requires it. The preview reuses Stop, Pause/Resume, Mirror, pose cancellation, hidden-tab expiry and live preference cancellation. No new clock, timer, observer, save operation or item-grid render path is introduced. The existing preview hook supplies one active RAF owner and zero while paused or finished.

## Recorded checks and arithmetic

| Credited final evidence | Verified result |
| --- | --- |
| `dance-final-focused-v2.log` and exit | 212 tests, 7 files passed; 6.47 s; exit 0 |
| `dance-final-full-v3.log` and exit | 2462 tests, 130 files passed; 85.49 s; exit 0 |
| `dance-final-native-v3.log` and exit | 73 individually listed passes; 0 failed/cancelled/skipped; 195.701237401 s; exit 0 |
| `dance-final-build.log` and exit | `tsc -b`, production Vite build and PWA generation succeed; exit 0 |
| `dance-final-lint-v2` | 21 specified source/harness paths, empty diagnostics, exit 0 |
| `dance-final-diff-v2.log` | 25 authored paths report whitespace pass; exit 0 |
| `dance-existing-action-compare-v2` | 12,480 exact frame JSON comparisons and 12,480 exact rendered SVG comparisons; 0 unexpected; exit 0 |

Equivalence arithmetic is 16 established actions x 3 species x 5 moods x 13 phases x 2 facings x 2 reduction states = 12,480 sample configurations. Each compares both frame and rendered SVG, not 24,960 distinct configurations. The archived comparison script uses sequential isolated module loaders, fixed blink 3080, distance 1.37 and a representative combined outfit. Dance itself is excluded from this existing-action comparison.

The tests check observable invariants: grounded contacts across healthy moods, speed/amplitude and endpoint bounds, finite timing/invalid inputs, normalized duration overrides, priority/busy behavior, fractional interruption, tap alternation, speech ownership, pending callbacks, node identity, no saves and preview lifecycle. Native tests add actual transforms, keyboard Tab/Enter/Space, focus/clipping/targets, saved-table comparisons and paused/mirrored preview geometry. The original red motion and behavior tests are unchanged in the final versions. The revised native completion assertion preserves existing content-mood posture; waiting for the observer's settled content expression fixes the earlier asynchronous check without dropping exact settled-art equality.

Resource arithmetic independently matches 24 runs, 702 sample rows, minimum observed available RAM 2623.7734375 MiB and minimum observed `/tmp` free space 3995.203125 MiB. All recorded samples retain the 2048 MiB reserve. There are zero reserve-triggered stops and two launch refusals, both exit 125 with no child process group. Cleanup records have no remaining live members. Inferred run intervals do not overlap; commands specify one test worker or native test concurrency of one. These host snapshots are not peak RSS/CPU measurements.

Retained history is not credited as final success: red 21 failed/7 passed; prototype 3/19 then 1/21 then settled 22 passed; UI red 12/132; implemented unit 2/180; initial native 25 failed/48 passed; native player retry 1 failed/3 passed; initial cropped 2300 px sheets; initial equivalence EPERM before comparisons; two full-suite launch refusals; and capped full suite 1 stale action-vocabulary failure/2461 passed. The earlier 182-test focused pass predates final test cleanup and vocabulary coverage. Final focused/full evidence supersedes it. Initial native failures concern stale control counts/layout expectations, content-mood rotation assumptions and observer settling, with archived harness versions retained.

## Actual PNG coverage

I opened every image below directly with `view_image`, sequentially in this order. Requested original detail for each. The six 1200x2376 sheets were displayed by the image transport at 1034x2048; all native screenshots were displayed at their saved dimensions. The sheet art, baselines and layers were readable; the smallest room samples support only small-scale appearance judgments.

| Order | Final PNG | Saved dimensions | Direct inspection |
| --- | --- | --- | --- |
| 1 | `dance-character-sheets/mochi-default.png` | 1200x2376 | All mood/facing rows, endpoints, ground lines, outfit/face layers and small samples |
| 2 | `dance-character-sheets/mochi-ink.png` | 1200x2376 | All mood/facing rows, endpoints, ground lines, outfit/face layers and small samples |
| 3 | `dance-character-sheets/bun-default.png` | 1200x2376 | All mood/facing rows, endpoints, ground lines, outfit/face layers and small samples |
| 4 | `dance-character-sheets/bun-ink.png` | 1200x2376 | All mood/facing rows, endpoints, ground lines, outfit/face layers and small samples |
| 5 | `dance-character-sheets/sprout-default.png` | 1200x2376 | All mood/facing rows, endpoints, ground lines, outfit/face layers and small samples |
| 6 | `dance-character-sheets/sprout-ink.png` | 1200x2376 | All mood/facing rows, endpoints, ground lines, outfit/face layers and small samples |
| 7 | `dance-native-v3-player/dance-mochi.png` | 1280x800 | Species in room, Dance focus, six controls and resident speech |
| 8 | `dance-native-v3-player/dance-bun.png` | 1280x800 | Species in room, Dance focus, six controls and resident speech |
| 9 | `dance-native-v3-player/dance-sprout.png` | 1280x800 | Species in room, Dance focus, six controls and resident speech |
| 10 | `dance-native-v3-layout/panel-320-100.png` | 320x640 | Player labels, row balance and Dance focus outline |
| 11 | `dance-native-v3-layout/panel-320-200.png` | 320x640 | Player labels, row balance and Dance focus outline |
| 12 | `dance-native-v3-layout/panel-375-100.png` | 375x664 | Player labels, row balance and Dance focus outline |
| 13 | `dance-native-v3-layout/panel-844-100.png` | 844x390 | Player labels, row balance and Dance focus outline |
| 14 | `dance-native-v3-layout/panel-844-200.png` | 844x390 | Player labels, row balance and Dance focus outline |
| 15 | `dance-native-v3-layout/panel-1280-100.png` | 1280x800 | Player labels, row balance and Dance focus outline |
| 16 | `dance-native-v3-layout/panel-1280-200.png` | 1280x800 | Player labels, row balance and Dance focus outline |
| 17 | `dance-native-v3-preview/wardrobe-320x568.png` | 320x568 | Wave/Pats frame, six movement controls, layered art and focus |
| 18 | `dance-native-v3-preview/wardrobe-pats-320x568.png` | 320x568 | Wave/Pats frame, six movement controls, layered art and focus |
| 19 | `dance-native-v3-preview/wardrobe-390x664.png` | 390x664 | Wave/Pats frame, six movement controls, layered art and focus |
| 20 | `dance-native-v3-preview/wardrobe-pats-390x664.png` | 390x664 | Wave/Pats frame, six movement controls, layered art and focus |
| 21 | `dance-native-v3-preview/wardrobe-640x360.png` | 640x360 | Wave/Pats frame, six movement controls, layered art and focus |
| 22 | `dance-native-v3-preview/wardrobe-pats-640x360.png` | 640x360 | Wave/Pats frame, six movement controls, layered art and focus |
| 23 | `dance-native-v3-preview/wardrobe-844x390.png` | 844x390 | Wave/Pats frame, six movement controls, layered art and focus |
| 24 | `dance-native-v3-preview/wardrobe-pats-844x390.png` | 844x390 | Wave/Pats frame, six movement controls, layered art and focus |
| 25 | `dance-native-v3-preview/wardrobe-1280x800.png` | 1280x800 | Wave/Pats frame, six movement controls, layered art and focus |
| 26 | `dance-native-v3-preview/wardrobe-pats-1280x800.png` | 1280x800 | Wave/Pats frame, six movement controls, layered art and focus |

All six sheets fit their final 2376 px height, including the bottom sample row. Each contains 5 moods x 2 facings x 6 phases = 60 large instances and 6 small instances. Totals are 360 large + 36 small = 396, across 6 sheets. The remaining images are 3 player Dance screens, 7 player layouts and 10 wardrobe layouts: 6 + 3 + 7 + 10 = 26 PNGs. The 10 wardrobe stills depict Wave/Pats rather than active Dance; Dance preview temporal/lifecycle claims come from source and recorded tests. No obvious clipping, detached feet, misplaced face/outfit layers or unreadable movement labels appeared in these final images.

## Findings and limits

PASS. No Critical, Important or Minor actionable finding identified within this frozen batch.

This review ran no browser, tests, build, renderer or new agent. It verified retained evidence and performed static inspection, hashes and arithmetic. Recorded passing results are not independent reruns. Hash bindings establish consistency of supplied bytes; they do not independently reproduce historical execution or authenticate an unretained production bundle.

Still images establish sampled appearance and geometry only. Numerical and native clock samples support bounded movement and deadlines but do not certify continuous-frame comfort, real-time delivery on hardware, every interruption combination, every outfit/color/face option, screen-reader announcements or assistive technology. Native evidence uses offline production Chromium 152.0.7977.82 with test clock control where declared; the enlarged offscreen Dance case uses the helper's reduced-motion default. It is not evidence of every normal-motion offscreen scenario. Native resume checks bracket delivery by 24 ms; exact deadline assertions are unit-level. Root-font 200% enlargement is not browser zoom. No physical-device testing occurred.

Set aside explicitly: the disjoint creator-layout investigation and unrelated working-tree changes, because this review is restricted to the frozen Dance batch; exhaustive wardrobe combinations and whole-app accessibility, because the supplied samples cover representative combinations and controls; human temporal comfort and physical-device performance, because this is a static review without those observations.

Only this report was written. Frozen sources, artifacts, Git state and external systems were not modified.
