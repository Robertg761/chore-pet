# Batch 39 Rest together review

Verdict: ready to merge within the frozen scope. No actionable P1, P2, or P3 findings. Both previous B38 P3 findings are addressed. This is an independent review of source and recorded evidence, with individual visual inspection of all eight final accepted PNGs.

The review used the requesting-code-review reviewer criteria and verification-before-completion evidence discipline. No tests, builds, lint runs, browser sessions, agents, messages, commits, or source edits were performed. This report is the only file written. Concurrent environmental-concern measurements in `/tmp` are outside this review.

The review input SHA-256 matches `ccfffbc83c4d9c3958af54bee1170b2881e5430d0df67288e1dd613edb6181ad`. The base is `0b85b891d80f6e955c766518cfc4c0cd03a31f74`.

| Integrity check | Independently verified result |
| --- | --- |
| Frozen changed sources | All 14 SHA-256 values match: five production files, eight test files, and `docs/ART.md`. |
| Reconstructed patch | Rebuilt the 12 tracked-file diffs against the base, with the frozen `i/` and `w/` prefixes, then appended both new-file diffs. All 32,465 bytes match `quiet-rest-source.diff`; SHA-256 `5ee5f296ffd33de29d18fd7fc28aea917e613218ae18d0f29e720a1f2a0ade46`. |
| Unchanged implementation | All seven listed sampler, renderer, activity adapter, clock, visibility, and preference files match their frozen hashes and the base bytes. |
| Artifact manifest | SHA-256 matches `f81d174b31e3008e025483c8b9b31e7951e20e46901a0a4839a5ed5306a50de9`. All 11 final and 31 historical files match their hashes and byte lengths. |
| Raw check evidence | All 21 raw logs and all 21 exit files match their hashes. Every exit file contains exactly its declared integer followed by a newline. |

Source review covered `src/pet/behaviour.ts`, `src/pet/LivingRoom.tsx`, `src/pet/PetPlay.tsx`, `src/pet/PetPlay.css`, and `src/content/petLines.ts`; the changed portions of all eight frozen test files; the ART addition; and the existing response, sampling, preference, and visibility paths they use.

| Requirement | Assessment |
| --- | --- |
| Optional player choice | `PetPlay.tsx:51` adds Rest together inside the existing collapsed panel. It delegates `rest` through the same callback, disabled rules, description, and feedback path. Successful speech still belongs to the resident. |
| Existing 2400ms response | `behaviour.ts:11` extends the gesture union. The unchanged `react` path at line 429 takes the duration from `ACTION_MS.rest`, freezes a fractional walking position, coalesces busy choices, and allows higher-priority chore cheers to preempt it. The existing sampler and activity adapter already accept rest. |
| One resident clock and deadline | `LivingRoom.tsx:255` uses the existing response path and absolute deadline. The panel adds no scheduling. Unit and integration additions cover busy retries, interruption position, chore priority, reduced motion, and hidden expiry. The native normal-rest case verifies the original deadline after a retry; the real native reduced-motion case verifies offscreen expiry without replay. |
| Three calm lines | `petLines.ts:213` contains exactly three lines, and `LivingRoom.tsx:76` maps rest to that list. The list joins existing length/content checks and has a completion/reward/sleep-claim exclusion. The wording makes no furniture-contact or chore-completion promise. |
| Responsive layout and controls | `PetPlay.css:9` retains a 48px minimum action height and the normal font size while reducing vertical padding. The 15rem container threshold uses six tracks for 3+2; the 24rem threshold uses four tracks with a full-width rest row. Smaller containers use one column. The final specificity at line 31 preserves the wide row. All ten recorded layout samples have fitting text and zero panel overflow; measured action heights are 48px or 50px. |
| Existing phone visibility and focus | The original actual-body visibility threshold remains 0.95 in `pet-play.test.mjs:49`. Original label-fit and focus-clipping assertions remain intact. The row assertions account for five choices, and the detailed layout test adds Rest together to the keyboard/focus matrix plus a 640px sample. Historical visibility failures prompted CSS fixes, rather than lower visibility thresholds. |
| B38 P3 default geometry | `scene-readability.test.mjs:28` now checks the recorded 420px stage and 282px canvas within 0.5px, and the 32.56494 by 28.96980px actual body within 0.1px. These checks run at all four default-text portrait widths. |
| B38 P3 hidden lifetime | `scene-readability.test.mjs:74` holds Stretch offscreen for 1400ms, then requires its visible finite clock to stop within 1600ms after return. This excludes a fresh 2400ms restart while retaining the real native observer and clock. |
| Persistence and scope | The production diff adds the choice, union member, line mapping, dialogue, and CSS. It adds no schema, reward, saved-state, sampler, hook, or renderer change. Recorded native cases compare saved tables before and after. |

I opened each of the following final files separately through `view_image`. Historical images were hash-checked only. The observations describe the saved viewport at its captured scroll position.

| Final accepted PNG | Individual observation |
| --- | --- |
| `panel-1280-100.png` | Four choices above a full-width rest row. All labels fit, the rest focus ring is clear, and the resident is visible. |
| `panel-1280-200.png` | Five single-column choices. Rest text and focus ring fit. The resident remains visible beside the scrolled controls. |
| `panel-320-100.png` | Three choices above two equal-width choices. Wrapped labels fit; rest focus clears the bottom navigation. The small resident body remains visible at the top. |
| `panel-320-200.png` | Single-column enlarged labels fit. The complete rest control and ring clear the bottom navigation. The room is outside this scrolled viewport; the real-clock Show room case supplies the return/expiry evidence. |
| `panel-375-100.png` | Balanced 3+2 rows, readable labels, and an intact rest ring above navigation. The resident is visible. |
| `panel-844-100.png` | The narrow landscape panel keeps 3+2 rows. Rest text and focus fit, and the resident is visible beside the panel. |
| `panel-844-200.png` | The scrolled single-column panel shows the complete rest control and ring. Earlier choices are above the scroll area. Rest text fits and the resident remains visible. |
| `rest-held.png` | Bare Mochi holds the restrained rest pose with visible ground contacts, readable calm speech, and an intact focused rest control. No sitting or furniture-contact claim is implied. |

`panel-1280-200.png`, `panel-320-100.png`, and `panel-844-200.png` are byte-exact matches to revised captures. Each final file was still opened and inspected independently here. The final `rest-held.json` records one pending frame, a left-arm angle of -10.332 degrees, and a maximum actual foot-contact drift of approximately `1.7573e-7` screen pixels. That is numerical noise within the native test's 0.005px contact tolerance; the still alone does not prove animation timing.

The following results come from the authenticated raw log/exit pairs. They were read, not rerun.

| Recorded check | Exit | Recorded result |
| --- | --- | --- |
| `red` | 1 | 9 failed, 115 passed, 4.21s. Includes the incorrect idle expectation after fractional-route expiry. |
| `red-corrected` | 1 | 8 failed, 116 passed, 4.00s. Remaining failures expose the absent rest button/dialogue. |
| `focused` | 0 | 131 tests in four files passed, 4.10s. |
| `full` | 0 | 2270 tests in 111 files passed, 75.81s. Covers final TypeScript and predates subsequent CSS-only refinements. |
| `native` | 0 | 7 passed, 15.659s. Historical initial coverage. |
| `regressions` | 1 | 19 passed, 4 failed, 40.830s. Actual-body visibility failures at 320, 361, 375, and 390px. |
| `native-final` | 1 | 28 passed, 2 failed, 64.041s. Wide rest-row specificity and 320px body visibility at 0.684 failed. |
| `native-revised` | 1 | 29 passed, 1 failed, 63.150s. The 16rem threshold stacked the 254px panel at 640px. |
| `native-accepted` | 0 | All 30 passed, 59.244s, with no skipped or cancelled tests. Includes the final 640px layout sample and strengthened scene cases. |
| `build` | 0 | Historical build completed. |
| `build-final` | 0 | Historical build completed. |
| `build-revised` | 0 | Historical build completed. |
| `build-accepted` | 0 | Final accepted TypeScript/build completed. The log retains a non-failing large-chunk warning. |
| `lint` | 0 | Historical lint invocation completed. |
| `lint-final` | 0 | Historical lint invocation completed. |
| `lint-revised` | 0 | Historical lint invocation completed. |
| `lint-accepted` | 0 | Final accepted lint invocation completed. |
| `diff` | 0 | Empty raw log, successful recorded exit. |
| `diff-final` | 0 | Empty raw log, successful recorded exit. |
| `diff-revised` | 0 | Empty raw log, successful recorded exit. |
| `diff-accepted` | 0 | Empty raw log, successful recorded exit for final accepted sources. |

The full-suite result is not a post-CSS full pass. Final CSS is covered by the accepted native, build, lint, and diff records. The initial third action row, later selector-specificity problem, and threshold revisions remain visible in the preserved failure history. Comparison with the reconstructed base diff shows no weakening of the original visibility, text-fit, or focus assertions.

No actionable findings require a fix before integration. The source additions are small, reuse the established response machinery, and have evidence for the regressions that the extra choice initially caused.

Behaviors considered but not judged here: animated native acceptance for every species/outfit combination, because new native held-rest evidence covers bare Mochi/content while unit/integration checks cover three species; browsers other than Chromium 152, because none are represented; whole-app zoom, physical-device assistive technology, and whole-app enlarged-text acceptance, because these captures change root text size and test the named controls/scene; new sitting/contact animation and completion rewards, because this change exposes the existing environmental rest response. Environmental-concern polish under measurement in `/tmp` is outside the frozen patch.
