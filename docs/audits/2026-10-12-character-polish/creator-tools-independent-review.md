# Creator tools independent review

PASS. No actionable Critical, Important, or Minor findings in the frozen creator-tools change. Ready to integrate within the evidence limits below. This is one bounded independent review under the requesting-code-review skill authorization.

Input: `docs/audits/2026-10-12-character-polish/creator-tools-review-input.json`

Input SHA256: `472769ecb6c41dcbebf4cb48e4584e5cf20e946bdfd9e4a669ee1856d4ff97e5`

Base commit: `ba6cc7467743f540d6a565e42e33b135a7b01ca4`.

Review used source inspection, read-only Git blob reads, independent hashing and arithmetic, and direct viewing of all 16 original PNG files. No tests, build, browser, agent dispatch/message, staging, or commit was performed. Only this report was written. Separate room-animation design and red-test work is outside this freeze and verdict.

## Binding verification

- All 7 changed-source SHA256 values match current bytes. All 33 unchanged-dependency SHA256 values match both current bytes and the base commit's blobs.
- The exact patch hashes to `e64a402f0315ab72d0cf27f22f914567b110eb435edd1a13daf41290a75557ec`. I reconstructed its seven outputs in memory from the base blobs, checked every hunk's context and line counts, and compared every output byte with the frozen source. All match. The patch's old/new abbreviated Git blob IDs also match independently calculated blob hashes, including the three new files.
- The archived prepared-production diff independently reconstructs the exact current bytes of CharacterCreator.tsx, CreatorPreview.tsx, and CharacterCreator.css from the same base.
- The artifact manifest hashes to `a61ecfeea1ff3ec3cde782d3619a8a607f120cb915aee931e6b0e009e2131513`; all 54 entries match their files. This includes the resource records, raw capture JSON/PNGs, historical harnesses, prepared diff, supervisor/freezer/whitespace source archives, visual/resource summaries, and incomplete-attempt records.
- All nine raw log hashes and nine exit-sidecar hashes match the input. Each numeric exit agrees with its resource record and recorded leader return code. The two empty lint logs are correctly bound as empty files.
- `creator-tools-verification.json` equals the input after removing its additional `reviewInput` property. That property points to this input and the specified input SHA256. The visual summary's 16 PNG hashes equal the actual PNG set and the manifest entries. Capture JSON and summary values agree with the raw geometry files.

## Source and integration review

`CharacterCreator.tsx:102` keeps facing in local state, separate from the look draft and preview mood. The buttons at line 203 have native button semantics, explicit `type="button"`, a named group, and a boolean pressed state. Neither handler submits, saves, changes mood, or invokes cheer/settle. The preview retains its position in the React tree across tabs and narrow/wide layouts. State persists through draft edits and resize, and resets on remount.

`CreatorPreview.tsx:43` applies `translate(200 0) scale(-1 1)` once around the entire AnimatedCharacterArt subtree. Its matrix maps x to 200-x and preserves y. Ground, torso, clothes, front straps, face, head items, and decorative accents share this outer reflection. Internal slot/clipping/pose transforms remain intact; text labels remain outside it. There is no conditional replacement or key on the art subtree. The frozen unit and native harnesses assert the original art node and unchanged delivered markup through mirror/show operations. Existing sick clothing occlusion remains face/head only.

`CreatorPreview.tsx:25` scrolls the actual SVG with instant/center/nearest arguments before focusing it with `preventScroll: true`. The SVG has role img, a current name/species/mood label with mirrored state, `tabIndex=-1`, and `focusable="true"`. `CharacterCreator.css:21` supplies an inset focus-visible ring. The shared choice styles distinguish the pressed accent ring from the dark keyboard outline. The two-button row wraps, with normal text wrapping and a 44px height floor.

The existing start timestamp, 1800ms celebrate duration, sampled frame, and usePetMotion owner remain unchanged. Mirror/show do not alter the hook's running boolean or reset start/elapsed. The hook retains one pending RAF, uses the latest committed callback, cancels hidden/unmounted work, and includes hidden time in the original absolute deadline. Unit coverage checks a delivered frame at 756ms, one pending frame at 1799ms, and none at 1800ms after mirror/show. Native coverage checks Space/Enter activation during an active cheer and expiry without saving. Initial/live system or device reduction settles the existing owner without replay; static tools require no new frame. No clock, timer, listener, observer, or saved field is introduced by this patch.

The save boundary remains `changesFrom` in creatorModel.ts, then the existing App creator callback at App.tsx:650 and Store.apply. Only changed name/species/bodyColour/eyes/cheeks reach Save. The added tests cover mirror/mood-only no-ops, Cancel, actual saved tables, look edits across resize, retained equipment, and remount reset. Existing layout/name-caret, mood, thumbnail, reduction, hidden-deadline, and stale-callback tests remain relevant and unchanged.

All 33 dependency bindings were verified. Integration review covered these paths, with large shared files inspected at the relevant art, focus/layout, clock, and persistence sections:

- CharacterCreator.test.tsx, CharacterCreator.mood.test.tsx, creatorModel.ts, creatorModel.test.ts.
- AnimatedCharacter.tsx, Character.tsx, Character.css, parts.tsx, motion.ts, poses.ts, items.tsx, items/extras.tsx, domain/types.ts, art/palette.ts.
- usePetMotion.ts, motionPreference.ts, usePetMotion.test.tsx, usePetMotion.preference.test.tsx.
- useViewport.ts, ScreenHeader.tsx, ScreenHeader.css, SegThumb.tsx, controls.css, index.css.
- App.tsx, data/store.ts, WardrobePreview.tsx, Wardrobe.css.
- Browser helpers.mjs, creator-motion.test.mjs, creator-layout.test.mjs, creator-mood.test.mjs, creator-thumbnail.test.mjs.

## Recorded checks and resources

These are reviewed historical results, not fresh executions by this reviewer.

| Complete run | Exit | Raw evidence |
| --- | ---: | --- |
| creator-tools-red | 1 | 18/18 unit cases fail for missing facing group or Mirror control |
| creator-tools-red-native | 1 | One filtered native case fails waiting for absent Mirror preview |
| creator-tools-harness-lint | 0 | Two harness paths, max warnings 0 |
| creator-tools-focused | 0 | 81 tests, 6 files, 6.34s |
| creator-tools-build | 0 | Typecheck, production build, PWA generation; existing large-chunk warning recorded |
| creator-tools-native | 0 | 45/45 pass, no failures/cancellations/skips, 100.776923597s |
| creator-tools-final-full | 0 | 2503 tests, 132 files, 88.89s |
| creator-tools-final-lint | 0 | Four current code paths, max warnings 0 |
| creator-tools-final-diff | 0 | Seven authored files pass whitespace inspection |

The archived red unit file is byte-identical to the frozen unit file. The historical native harness differs only by the later explicit Tab modality setup and added resize/edit/save case. Its filtered red failure is not represented as execution of the strengthened final harness. The final native log includes all 11 tool cases and 34 existing creator cases.

I read and recomputed all nine resource records: 239 sample rows, minimum observed available RAM 3191.30078125 MiB, minimum observed free /tmp 4009.953125 MiB, zero reserve stops and zero launch rejections. Every per-run sample count/minimum and the aggregate summary match the input and manifest. All sampled values are finite and nonnegative, elapsed values are ordered, launch samples meet their recorded launch thresholds, and all RAM/tmp samples exceed the 2048 MiB running reserve. Every completed cleanup record reports empty term/kill/remaining-live-member lists. Approximate completed-run intervals derived from each record's timestamp and final elapsed value do not overlap.

Recorded commands retain nice 10 for the heavy Node jobs, one Vitest worker, native test concurrency 1, 384 MiB heaps for focused/full/native work, 256 MiB for unit red, 192 MiB for lint, and the explicit 512 MiB build environment. The full retry has a 3840 MiB launch threshold. The archived supervisor samples host available memory and /tmp about once per second and owns only its launched process group. These records do not measure process peak RSS, CPU, battery, or another device.

The first restricted full attempt is explicitly incomplete. Its preserved log is only the Vitest runner banner and hashes to `f0f8a88d2f7dc01c3745afdcfebff2cfe48c08970f574a1e1bf1e3bb53f2a373`. `creator-tools-full-interruption.json` records tool-reported exit 143, no exit/resource sidecars, an unknown cause, and a subsequent host inventory reporting zero matching live workspace Vitest/supervisor processes. The incomplete sidecars are also absent now. This is not a test result, a resource-minimum measurement, or proof of the interruption/cleanup mechanism. I did not infer OOM, reserve crossing, test failure, or successful completion. The separate capped host retry supplies the 2503-test result above; its resource data is not assigned to the incomplete attempt. The historical process inventory is reported evidence, not an inventory rerun by this reviewer.

## Direct visual and arithmetic review

All 16 PNGs were individually opened through the local image viewer. `creator-tools-native-initial` is the current final production evidence directory despite its name. The six species stills preserve recognizable species, layered clothing, readable expressions, and ground shadows. The ten layout stills show the wrapped controls and revealed preview focus ring without clipping those targets in the recorded states.

Directly viewed filenames in that directory:

- tools-mochi-happy.png
- tools-mochi-sick.png
- tools-bun-happy.png
- tools-bun-sick.png
- tools-sprout-happy.png
- tools-sprout-sick.png
- tools-layout-320-controls.png
- tools-layout-320-preview.png
- tools-layout-390-controls.png
- tools-layout-390-preview.png
- tools-layout-640-controls.png
- tools-layout-640-preview.png
- tools-layout-844-controls.png
- tools-layout-844-preview.png
- tools-layout-1280-controls.png
- tools-layout-1280-preview.png

I independently recomputed all 15 species/mood samples, using four SVG-coordinate probes on each body and ground transform: 15 x 2 x 4 = 120 point comparisons. For every probe, reflected x equals 2*centerX-normalX and reflected y equals normalY within the claimed maximum `1.1368683772161603e-13` CSS pixels. Normal/reflected centers agree and match the SVG bounding-box center. Slot inventories remain unchanged, with five worn slots in upright moods and face/head in sick. All samples record zero pending frames. The six art capture JSON files agree with their corresponding matrix samples. These are transform probes, not 120 independently measured foot contacts or contour samples.

I also recomputed all 10 button and 5 focused SVG bounding-box claims at 200% root text. Edges agree with origin plus size; targets lie within the recorded viewport; every button is at least 44px in both dimensions and records fitting text and focus-visible; every revealed SVG records actual focus, focus-visible, mirrored facing, and zero pending frames. PNG dimensions match the layout viewports. All capture metadata reports Chromium 152.0.7977.82.

| Viewport | Each button, width x height | Revealed SVG, width x height | SVG x / y |
| --- | --- | --- | --- |
| 320 x 568 | 292 x 49 | 278 x 160 | 21 / 176.375 |
| 390 x 664 | 362 x 49 | 348 x 160 | 21 / 135.1875 |
| 640 x 360 | 456 x 49 | 442 x 160 | 171 / 100.1875 |
| 844 x 390 | 327 x 49 | 646 x 160 | 171 / 115.1875 |
| 1280 x 800 | 267 x 49 | 402 x 597 | 259 / 111 |

Button positions are measured after each separate native focus operation. At 320px the identical recorded y coordinates reflect scrolling between those operations, not overlapping controls or a claim that both were simultaneously at that position. The still shows two distinct vertically stacked buttons. Layout control screenshots are taken after mirror activation; Show-focus geometry comes from its preceding separate focus measurement. The harness uses native focus with explicit keyboard modality and Space/Enter activation; it does not exhaustively prove every ordinary Tab sequence.

## Evidence limits and declined judgments

- No new test, build, or browser result is claimed. Hashes establish consistency of the supplied frozen files and records. They do not independently attest historical process execution. The manifest does not include production bundle bytes or per-run source snapshots, so build-to-native provenance cannot be independently reconstructed from hashes alone.
- Stills settle finite CSS transitions. They do not certify human temporal comfort, assistive-technology announcements, physical devices, full browser zoom, or other browser engines. Source semantics, native focus records, fake-clock tests, and direct still inspection support the narrower claims stated above.
- Recorded host snapshots and cleanup records support only their sampled intervals and reported process groups. The incomplete attempt has no per-run minima or cleanup telemetry.
- New room-animation/interaction design and red tests were set aside because they are explicitly disjoint and outside this freeze. Unrelated shared-file functionality was not audited beyond the listed integration paths. No creator-tools requirement was otherwise set aside.

The local-state boundary, one enclosing art reflection, unchanged finite owner, and real SVG focus target satisfy the frozen design. No correction is requested for this frozen patch.
