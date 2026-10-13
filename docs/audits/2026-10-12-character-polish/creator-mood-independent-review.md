# Independent review of the frozen creator mood batch

Verdict: **PASS** for the frozen batch. No actionable regression found in the reviewed change. This is one independent review of source and archived evidence, with direct inspection of every final PNG. It is not a new execution of the checks.

Frozen input: `docs/audits/2026-10-12-character-polish/creator-mood-review-input.json`

Input SHA256: `3933a4645beeb9141709f6845fc4adb4f2211153705d2228964c48a4f24e1ff6`

Base commit: `89a99c09fe4b483ba959fff9b47fb37211f5b21b`

## Integrity and review scope

Independently recomputed the input hash, all eight changed-source hashes, all 27 unchanged-dependency hashes, the patch hash, the artifacts-manifest hash, every one of its 190 file hashes, and all 14 raw log/exit hashes. All matched. Reconstructed each changed file in memory from its base contents and the exact patch. All eight reconstructed files equal the frozen files. All 27 unchanged dependencies equal their base-commit contents. The patch hash is `f3f9345e98824dcdd59099cd6a6b5990c6ae5b7794a0dce93b77b59cb5eef8aa`.

Read the four production changes, both test files, the design, and the ART change in context. Reviewed the listed dependencies for rendering, sampling, clothing, motion scheduling/preferences, creator/model tests, layout/controls, application integration, persistence, and browser helpers/regressions. In the large application and store modules, inspection followed the relevant condition, creator, save, and persistence paths rather than auditing unrelated application features. Also checked the existing health calculation, pet update action, articulated renderer, and three sick-pose occlusion definitions against the base commit.

Read all 14 logs and raw exits, all resource sidecars and their sample rows, the resource supervisor/freeze/whitespace scripts, both historical red-test versions, the initial native test, the pre-lint production snapshots, and both earlier visual-review manifests. Compared historical sources with the final sources. Directly inspected the five original control captures and the original Bun Tired capture in addition to the 27 final images.

This review ran only local reads, hash/arithmetic checks, in-memory patch reconstruction, and image viewing before writing this report. No tests, builds, browser sessions, agents, messages, staging, or commits were run. This report is the only file written by this review. Concurrent work in new files is excluded.

## Behavior and test assessment

- `CharacterCreator.tsx:101` keeps mood in component state outside `CreatorDraft`. The native selector has an associated label and description. Its change handler at line 198 settles the existing preview before updating mood. No new effect, timer, frame owner, or persistence path was added.
- `CreatorPreview.tsx:22` gates scheduling on an active Happy cheer. Its imperative cheer guard rejects other moods; its static sampling uses idle, elapsed zero, and reduction. Mood chooses the production pose and face, and the SVG name includes the friendly label. Returning to Happy after cancellation has no surviving start time to replay. Subsequent eligible species/colour edits can start the original 1800 ms cheer.
- The 23 mood unit cases comprise 15 species/mood cases, four active-cheer cancellation cases, and four lifecycle/save cases. They use real components and art with mocked clock/media/visibility inputs. Each cancellation case explicitly delivers a stale cancelled callback and checks unchanged art. Happy restoration, the next cheer, hidden absolute expiry, reduced motion, remount reset, tab persistence, mood-only Save, and an exact look-only save patch have meaningful assertions. The hidden-expiry example starts at 756 ms and resumes at 3000 ms, beyond its 2556 ms deadline.
- The native mood file contributes ten tests. It checks all 15 species/mood combinations, real End/Home selection, slot lists, accessible names, tracked pending frames, cancellation followed by elapsed time, live system reduction, mood-only Save, reopening, four enlarged-text layouts, and settled wrapped tabs. Existing layout/motion files contribute 11 and four tests. Native table comparisons include chores, completions, progress, and pets; fixture writes happen before the baselines. The production save path accepts only the look patch. Health and actual mood remain derived from chores/history, not preview state.
- Clothing stays equipped in the draft/save model. For Unwell, all three existing sick poses hide outfit, back, and neck under the bed covers while retaining head and face items. The corrected unit expectation matches those unchanged definitions, the native slot assertions, and the visible bed art. Returning to a healthy preview uses the original equipped map.
- Existing keyboard choice handling and reflow remain intact. New native tests assert focused, focus-visible selectors, text fit, viewport bounds, no horizontal overflow, 44 px minimum targets, and a 120 px preview floor at 200% root text. Existing tests focus every visible species/colour/eye/cheek choice across five viewports at 100% and 200%, and preserve the name/caret through resizing. These are useful native focus/keyboard checks, not a complete Tab-order or assistive-technology audit. Mood persistence specifically across resize is supported by state placement, not by a dedicated resize assertion.

## Recorded checks and resources

All exit sidecars agree with their logs and resource sidecars. Final claims use the final runs, not the earlier effect implementation.

| Recorded run | Exit | Evidence |
| --- | ---: | --- |
| creator-mood-red | 1 | 23 failures at the missing native mood label |
| creator-mood-red-v2 | 1 | Same 23 missing-label failures after helper/stale-callback improvements |
| creator-mood-focused | 0 | 63 tests, five files, 4.23 s |
| creator-mood-build | 0 | Typecheck, production build, PWA output |
| creator-mood-native | 0 | 24 native tests, initial capture policy |
| creator-mood-full | 0 | 2485 tests, 131 files, 87.55 s |
| creator-mood-final-native | 0 | 25 tests, settled capture policy, before lint refactor |
| creator-mood-lint | 1 | Effect setState warning rejected by zero-warning policy |
| creator-mood-final-lint | 0 | Empty log; five specified paths, max warnings zero |
| creator-mood-final-focused | 0 | 63 tests, five files, 4.20 s |
| creator-mood-final-build | 0 | Typecheck, production build, PWA output |
| creator-mood-final-full | 0 | 2485 tests, 131 files, 86.76 s |
| creator-mood-final-native-v2 | 0 | 25 pass, zero fail/cancel/skip, 55.268328539 s |
| creator-mood-final-diff | 0 | Eight authored paths pass whitespace checks |

Focused arithmetic is 23 + 7 + 8 + 20 + 5 = 63. Native arithmetic is 10 + 11 + 4 = 25. The full-suite totals are supported by the archived runner summary, not by independently recounting or rerunning all 2485 tests. Both builds retain a large-chunk warning; neither is a warning-free build claim. Independently checked added patch lines for trailing whitespace.

Recomputed all per-run resource-summary rows and aggregate values: 14 runs, 409 samples, minimum observed available RAM 2666.67578125 MiB, minimum observed `/tmp` free space 3997.80859375 MiB, zero reserve stops, and zero launch rejections. Every recorded sample remains above the 2048 MiB reserves. Initial samples satisfy launch thresholds. Sample times are monotonic; recorded completion UTC minus elapsed time yields nonoverlapping run intervals. Cleanup records contain no live remaining, TERM, or KILL members, and leader exits match raw exits. Heavy-job commands specify nice 10, heap caps, one Vitest worker or Node test concurrency one. These are sampled host values and configured limits, not peak RSS/CPU measurements or independent process-concurrency telemetry.

## Direct final image inspection

Every filename below is under `docs/audits/2026-10-12-character-polish/creator-mood-native-final-v2/`. Each was opened directly with `view_image`; this review did not substitute prior-image identities for viewing.

| PNG | Observation |
| --- | --- |
| expression-bun-happy.png | Upright ears, open smile, attached clothing |
| expression-bun-content.png | Relaxed lean, small smile, attached clothing |
| expression-bun-meh.png | Drooped ear, tired mouth, attached clothing |
| expression-bun-scruffy.png | Low ears, worried face and tint, attached clothing |
| expression-bun-sick.png | Bed, thermometer, head/face items retained |
| expression-mochi-happy.png | Upright body, open smile, attached clothing |
| expression-mochi-content.png | Relaxed body and smile, attached clothing |
| expression-mochi-meh.png | Lower posture and tired mouth, attached clothing |
| expression-mochi-scruffy.png | Worried face, smudges/tint, attached clothing |
| expression-mochi-sick.png | Bed and ice pack, head/face items retained |
| expression-sprout-happy.png | Raised leaves, open smile, attached clothing |
| expression-sprout-content.png | Relaxed leaves and smile, attached clothing |
| expression-sprout-meh.png | Lower leaves and tired mouth, attached clothing |
| expression-sprout-scruffy.png | Wilted leaves and worried face, attached clothing |
| expression-sprout-sick.png | Bed and wilted leaves, head/face items retained |
| expression-desktop-controls.png | Label, selected Unwell, focus ring, readable art/options |
| expression-layout-320-control.png | Wrapped Face selected; readable focused selector |
| expression-layout-320-preview.png | Readable bed art after page scrolling |
| expression-layout-390-control.png | Readable art, wrapped tabs, focused selector |
| expression-layout-390-preview.png | Same readable state, independently viewed |
| expression-layout-640-control.png | Readable selector/helper in scrolled landscape page |
| expression-layout-640-preview.png | Readable bed art after landscape page scrolling |
| expression-layout-1280-control.png | Readable art and selector at enlarged text |
| expression-layout-1280-preview.png | Same readable state, independently viewed |
| expression-tabs-face.png | Settled ink highlight exactly behind Face |
| expression-tabs-colour.png | Settled ink highlight exactly behind Colour |
| expression-tabs-who.png | Settled ink highlight exactly behind Who; species rows fit |

No visible clipping of character parts or unexpected clothing overlap found in the 15 art samples. Scroll-position captures intentionally show different portions of the page/panel; offscreen choices in these stills are covered separately by the native focus assertions.

Recomputed the visual manifest's complete, disjoint three-direct plus 24-carried partition and every previous/origin hash chain, including the earlier 13-direct plus 14-carried partition. Those identities match. The final directory has exactly 27 PNGs: 15 art, one desktop control, eight layout captures, and three tab captures. All 15 art records equal their aggregate sidecar entries, have expected labels/slots and zero tracked frames, and their 402 by 624 PNG dimensions match their recorded clips.

The four selector rectangles independently satisfy the recorded inequalities. Their sizes are 292 by 51, 362 by 51, 456 by 51, and 540 by 51 px. Corresponding preview heights are 160, 160, 160, and 597 px. All four record text fit, focus-visible, and zero horizontal overflow. All three real-clock tab records have exactly zero error between selected and thumb x/y/width/height, white selected text, and zero tracked frames. Sidecars identify Chromium 152.0.7977.82.

## Evidence limits and declined judgments

- Zero tracked JS RAF supports the main preview's scheduling claim. Instrumentation begins after creator setup. Species thumbnails use `Character`, face crops use `CharacterArt`, and their existing `.ch-breathe`/`.ch-eye` CSS animations are outside the sampled preview's CSS suppression. Zero RAF does not establish zero CSS motion or effective device-local reduction for thumbnails. The separate thumbnail investigation and its new files are outside this frozen verdict.
- Final screenshots explicitly disable animations, fast-forwarding finite CSS transitions and cancelling infinite CSS animations for capture. They establish settled appearance. The initial 320/390 controls visibly captured the tab highlight in transit; the final real-clock test waits for native tab animations to finish before measuring matching rectangles. That establishes the endpoint, not continuous transition legibility, frame-by-frame cancellation timing, or human temporal comfort. The historical captures are not discarded as passing settled evidence.
- Unit stale-callback/visibility tests and native fake-clock cancellation assertions support lifecycle behavior; still images cannot prove it. Hidden expiry and device-local preference integration rely on the unit/source evidence. Native coverage includes live system preference changes, not a native hidden-tab expiry experiment or a native device-setting toggle in this batch.
- Native tests compare saved tables rather than instrument every storage call, outbox change, or remote request. Source inspection supplies the complementary save/health argument. Offline Chromium fixtures do not certify cloud synchronization, physical devices, other engines, assistive technology, complete keyboard traversal, or whole-browser zoom. Root font size 200% is the tested text-enlargement condition.
- Archived logs and sidecars provide recorded execution evidence. Their hashes preserve the supplied bytes; they are not independent execution attestation or a new rerun against the frozen files. No broader application audit or performance certification is implied.

No Critical, Important, or Minor actionable finding in the frozen patch. The scoped implementation, assertions, historical corrections, integrity checks, resource math, and directly viewed final images support PASS within these limits.
