# Batch34 dust hand review

Approved for the assigned static/source and still-image scope. No actionable Critical, Important, or Minor findings. This is the single independent review under requesting-code-review. The bounded review is complete.

The reviewer read all eight frozen files, inspected all nine PNGs, and checked the frozen evidence against the exact base commit `e95d61716c421e15fd6f6a658d049ba541a75e0e`. Review operations were read-only except for this report. No application runtime, tests, builds, browsers, agents, or messages to other chats were started. Previous audits were preserved.

## Frozen evidence identity

Execution metadata came from `dust-hand-review-input.json`, with SHA-256 `b08dc30a81e62c637b4987c357462f2d9b285b368aa234a8390d6e59782d5b7c`. Its embedded freeze matched `dust-hand-freeze.json` exactly. The freeze file's SHA-256 was `f62119727f54ee883422d1bffedb0fc59495340ee55badee250f1efd93634c8d`.

- All eight source hashes matched. Every frozen patch entry reconstructed its reviewed file byte-for-byte from the exact base, including the four new files. Patch SHA-256 was `c4cf4f65df8e55e7ea29d12c34d87a1a2fe7b7f322deda9a8e004d26ddcf2073`.
- `dust-hand-artifacts.json` matched its execution-metadata hash, `9cf58150256296ad949ce7c888c5c64c43f9dc55a79f9c4dd3e9d1c0d7ce0a6e`. All 13 listed artifact hashes matched: the baseline, six sampled PNGs, before/after JSON, differential JSON, and three room PNGs.
- All 15 raw log hashes and exit-file hashes matched, and each raw exit value agreed with the metadata. Their contents were inspected as retained evidence, without rerunning checks.
- `dust-hand-baseline.ts.txt` was byte-identical to `e95d617:src/character/motion.ts`, SHA-256 `27af4dbddb2f7ace9672447a9aa10040d755f10b17a0f3508eb27edd88a1d2db`.
- Both capture JSON files' eight nested source hashes and three nested PNG hashes matched. The six renderer dependencies were also byte-identical to the base. Each capture contained 48 distinct dressed pose samples and three curves of 701 points at 2 ms spacing. All 48 paired pose samples differed only in `rightArm`.
- The differential's nested baseline/current/runner hashes matched. Its 43,200 comparisons comprise three species, five moods, 16 actions, three duration factors, two motion policies, two facings, and 15 phases. The retained result was 42,390 exact frames and 810 normal dust `rightArm`-only changes, 270 per species. The comparison source checks duration-map equality, every other dust field, all 15 other actions, and reduced frames exactly. This reviewer verified the evidence and comparison logic, without executing the sampler.

The mutable `dust-hand-verification.json` was not used as frozen input. The execution metadata still describes the full suite as pending. Root subsequently reported 2,242 tests across 108 files passing; that separate result was not independently inspected or certified by this review.

## Source assessment

All eight frozen files were read in full:

| File | Assessment |
| --- | --- |
| [motion.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:100) | Species dust arcs of 6/7/5 and cycle factors of 2/3/2 affect only normal dust `rightArm`. The reduced return precedes this branch. The original envelope, amplitude scaling, neutral endpoints and 1,400 ms duration remain intact. |
| [LivingRoom.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:78) | The existing dirty-object chain now tries condition copy, then object/chore copy, then the existing calm observation, then existing content-mood copy. Invalid targets still return null. |
| [motion.dust.test.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.dust.test.ts:8) | Checks species speed/peak bounds, retained lift, finite endpoints, reversal counts over 700/1,400/2,800 ms and still reduced limbs. |
| [PetIntegration.test.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetIntegration.test.tsx:273) | Six new cases cover level 1/2/3 bookshelf dialogue under normal and reduced motion. Existing cases cover invitation coalescing, interruptions, copy priority, unavailable targets and clock lifecycle. |
| [pet-dust-hand.test.mjs](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-dust-hand.test.mjs:23) | Uses actual overdue data and rendered SVG transforms/timestamps. Covers three dressed normal species and one visible reduced Mochi invitation, including speech expiry and saved-table comparisons. |
| [ART.md](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md:191) | Documents the bounded hand change and fallback without introducing furniture contact or new timing. |
| [capture-dust-hand.mjs](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/capture-dust-hand.mjs:10) | Substitutes the exact baseline sampler for before captures; retains production rendering, wardrobe, mirrors and 200/60/25 px views. |
| [compare-dust-hand.mjs](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/compare-dust-hand.mjs:12) | Explicitly permits only the intended normal dust hand difference and records source identity and motion metrics. |

The fallback addresses a concrete gap. `messLine` supplies no level-1 line, and optional bookshelf decor has neither generic object copy nor catalog chore copy. The new short-circuit tail supplies an existing safe observation. Stronger dust-condition lines and existing chore/object lines retain priority. No copy tables changed.

The runtime patch changes only the sampler and this dialogue expression. Arrival announcement guards, held interaction seed, reduced response from the current position, `LINE_MS = 3600`, speech timeout, resident clock and state transitions remain unchanged. Interaction targets still use existing safe routes and `contact: false`. No persistence operations were added.

## Regression evidence

| Frozen check | Raw exit | Inspected result |
| --- | ---: | --- |
| red | 1 | Six sampler failures; reduced baseline case passed. |
| browser-red | 1 | Three minimum-lift failures from the initial clean fixture. |
| browser-policy-red | 1 | Corrected dusty fixture exposed three silent arrivals. |
| dialogue-red | 1 | Two level-1 normal/reduced failures; four new higher-condition cases passed within the 100 baseline passes. |
| dialogue | 0 | 102 integration cases passed after the dialogue fix. |
| dialogue-build | 0 | Intermediate type/build completed. |
| browser-hand-red | 1 | After the dialogue fix, all three actual hands still failed speed bounds before the sampler edit. |
| focused | 0 | 374 cases across eight files, 13.43 s. |
| browser | 0 | Ten native cases, 12.516850523 s: three normal dusty hands, one reduced dusty response and six existing Explore cases. |
| build | 0 | Final type/build completed; retained bundle-size advisory is present. |
| lint | 0 | No lint diagnostics in the retained log. |
| capture-before | 0 | 144 size views and three curves recorded. |
| capture-after | 0 | 144 size views and three curves recorded. |
| differential | 0 | 43,200 comparisons with the exact/change counts above. |
| diff | 0 | Empty diagnostic log. |

The corrected native fixture creates its daily task two calendar days earlier and waits for `1 day late`. Schedule source confirms the first occurrence receives one grace day, explaining why the created-yesterday fixture exercised clean inspection. The initial failure is retained as fixture history, not dusty-motion coverage.

The final native log records 71 actual SVG/timestamp samples per normal species. Mochi/Bun/Sprout peaks were 21.320/26.972/18.000 degrees and observed speeds were 98.825/132.159/85.251 degrees per second. Assertions cover one pending resident frame, stable reaction position, foot-centre drift below 0.01 local units, retained resident node and announcement, and unchanged saved tables. Reduced Mochi retains its visible body and position, requests zero resident frames, and clears speech after 2,000 + 1,600 ms.

## Still-image assessment

Inspected individually at original resolution:

- `dust-hand-before-light-sizes.png` and `dust-hand-after-light-sizes.png`.
- `dust-hand-before-dark-sizes.png` and `dust-hand-after-dark-sizes.png`.
- `dust-hand-before-curves.png` and `dust-hand-after-curves.png`.
- `dust-hand-room/dust-hand-room-mochi.png`, `dust-hand-room-bun.png` and `dust-hand-room-sprout.png`.

The size sheets cover happy/light and scruffy/dark dressed species, both facings, four phases, and 200/60/25 px views. The hand remains attached; no new visible clipping, wardrobe displacement, face regression, foot displacement or shadow regression appears. At 25 px the dressed hand is a small silhouette detail. The curves show one broad lift/return for Mochi and Sprout and a second beat for Bun, replacing the repeated baseline reversals. All three room stills show the selected bookshelf, visible dusty/late context, dressed resident and existing red-book observation without visible UI clipping. These observations support still-image approval.

## Declined to judge and uninspected limits

- Full-suite completion belongs to root. The full-suite log/exit and mutable verification file were not reviewed.
- Batch35 Room preview-outline depth behavior, its new artifacts and `Room.selection-output.test.tsx` were not inspected and have no bearing on this verdict.
- Human temporal playback, physical devices, assistive-technology announcements and CPU/battery acceptance were not inspected or certified. Stills, curves and controlled Chromium evidence do not establish them.
- Native dusty coverage uses one bookshelf placement/rotation, a 1280 x 800 viewport, one outfit and reduced Mochi only. The six existing Explore cases broaden invitation/layout coverage, not dusty-hand coverage to every device or furnishing.
- The differential samples defined phases and durations, not every possible input or rendered transition. It supplies no ground-path matrix. The size sheets cover two mood/colour combinations rather than all combinations. The source patch's isolation supports preservation beyond those fixtures.
- The new dialogue cases directly exercise bookshelf calm fallback and higher condition priority. They do not directly force the dirty branch's final content fallback by removing calm copy. Existing clean content-fallback coverage and the inspected short-circuit source support that tail; no additional execution was performed.
- Native persistence assertions compare saved tables, not every storage key or outbox field. The runtime patch adds no store access. Foot-centre checks do not certify physical paw-to-furniture contact, which remains disabled.

Source/still approval has no required fixes. It does not certify the separate full suite or the uninspected acceptance areas above.
