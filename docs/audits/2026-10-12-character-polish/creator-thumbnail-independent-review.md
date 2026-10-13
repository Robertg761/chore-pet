# Creator thumbnail independent review

Verdict: PASS for the frozen creator-thumbnail patch. No actionable correctness or regression finding remains within this scope.

Review date: 2026-10-13. Workspace: `/home/robert/.codex/worktrees/4511/chore-pet`. Repository paths below refer to that workspace.

Input: `docs/audits/2026-10-12-character-polish/creator-thumbnail-review-input.json`.

Input SHA256: `7e0b54ea2b71e99362526c90b3f6bf1c977792a33b663093229c43a12cc00c51`.

Base commit: `16da293103ead4fd0c63b78f54def9d13c2fbf30`.

Patch: `docs/audits/2026-10-12-character-polish/creator-thumbnail-source.diff`, 13,131 bytes, SHA256 `8dec23587df7401660ad90006b0e3ae0f53f7239d1a5c08d530e307b8ada7d25`.

I performed this bounded review directly under the requesting-code-review workflow. I ran no tests, builds, or browsers, dispatched or messaged no agents, and did not stage, commit, or edit frozen files. This report is the only file I wrote. Results below distinguish recorded execution evidence from my static inspection and independent calculations.

## Integrity and inspected sources

I recomputed the input, patch, manifest, all 36 source hashes, all 47 manifest artifact hashes, and every raw log and exit-file hash. They match the frozen declarations. The manifest SHA256 is `1a828378f58a7e83778b37e7956bba6a234d6fb05c08190af02a207b30f63009`. All 32 unchanged dependencies also match their base-commit blobs. The index copies of the two previously tracked changed files match the base. Regenerating the patch in the frozen source order reproduces its exact bytes. Separately applying its four file sections to the base contents in memory reconstructs all four final sources.

I read the four changed sources in full: `src/screens/CharacterCreator.css`, `scripts/browser/creator-thumbnail.test.mjs`, `docs/ART.md`, and `docs/audits/2026-10-12-character-polish/creator-thumbnail-design.md`.

I also read these 32 unchanged dependencies in full:

| Area | Files |
| --- | --- |
| Creator, 6 | `src/screens/CharacterCreator.tsx`, `src/screens/CreatorPreview.tsx`, `src/screens/creatorModel.ts`, `src/screens/CharacterCreator.test.tsx`, `src/screens/creatorModel.test.ts`, `src/screens/CharacterCreator.mood.test.tsx` |
| Character rendering, 8 | `src/character/AnimatedCharacter.tsx`, `src/character/Character.tsx`, `src/character/Character.css`, `src/character/parts.tsx`, `src/character/motion.ts`, `src/character/items.tsx`, `src/character/items/extras.tsx`, `src/character/poses.ts` |
| Types and colours, 2 | `src/domain/types.ts`, `src/art/palette.ts` |
| Motion policy and evidence, 4 | `src/pet/usePetMotion.ts`, `src/pet/motionPreference.ts`, `src/pet/usePetMotion.test.tsx`, `src/pet/usePetMotion.preference.test.tsx` |
| Shell and shared styles, 6 | `src/shell/useViewport.ts`, `src/shell/ScreenHeader.tsx`, `src/shell/ScreenHeader.css`, `src/shell/SegThumb.tsx`, `src/shell/controls.css`, `src/index.css` |
| Integration and persistence, 2 | `src/App.tsx`, `src/data/store.ts` |
| Existing browser evidence, 4 | `scripts/browser/helpers.mjs`, `scripts/browser/creator-motion.test.mjs`, `scripts/browser/creator-layout.test.mjs`, `scripts/browser/creator-mood.test.mjs` |

Evidence inspection included the exact patch, all nine raw logs/exits/resource sidecars, the baseline probe and six inventory JSONs, both retained red harness versions, all 12 final JSON sidecars and PNGs, the resource summary, root visual-review manifest, and retained supervisor/freeze/whitespace scripts. I inspected those scripts without executing them.

## Production behavior and actual assertion scope

The only production change is `CharacterCreator.css:50-52`, adding `animation: none` to `.cc-choice .ch-breathe` and `.cc-choice .ch-eye`. These selectors have greater specificity than the legacy character animation rules. The comparison bodies and eyes have no resting transform to restore, which agrees with the computed styles. The rule creates no timer, listener, observer, state, or frame owner.

`CharacterCreator.tsx:49` assigns `.cc-choice` to the option buttons. Species art and the happy face crops are their descendants. The main `CreatorPreview` at line 267 sits in the separate stage, outside those buttons. Resident art is also outside them. The rule therefore removes the existing comparison breath/blink loops without matching either main preview or resident art. The shared renderer, SVG geometry, clothes, and motion sampler remain byte-identical to the base.

The existing radio transition and hover rules at `CharacterCreator.css:41-48`, OS reduction overrides at lines 124-126, selection styles, and `controls.css:108-110` focus ring are unchanged. The new declaration changes descendant animation, not button transform, transition, outline, or checked state. Existing native layout cases focus every visible choice across all groups and check reachability, text fit, and 44px targets. Existing motion cases activate a face choice by keyboard and check focus and immediate expression changes. There is no dedicated native computed-hover comparison in this batch; preservation of hover follows directly from the unchanged rules and selector scope.

`CreatorPreview.tsx:20-31` retains its 1800ms celebration cutoff, coalescing guard, mood gate, and reduction cancellation. The two new native cheer cases observe zero pending wrapped rAF callbacks at rest, one at 756ms after choosing Bun, and zero after another 1200ms, with happy art restored. They also compare comparison SVG markup across the cheer. Their endpoint is 1956ms, not an exact native 1800ms boundary assertion. The unchanged focused creator tests explicitly sample 1800ms and test rapid choices retaining the original deadline, hidden expiry, live reduction, and cleanup.

The six new matrix cases inspect Who, Colour, and Face at 390px and 1280px under normal, device-local, and OS reduction. They assert actual perpetual animation inventories, computed group animation names and transforms, expected SVG counts, all eight existing eye/cheek radio names, and unchanged saved tables after Cancel. The remaining new case checks live OS reduce/restore and reopening. Device-local reduction is initialized through its scoped local-storage key and reload; this harness does not itself exercise a live device toggle in the creator. The unchanged preference tests cover the shared OR policy, live device updates, and cleanup.

Persistence code and creator save construction are unchanged. New checks compare the complete saved `tables` object through draft changes and Cancel. Existing native creator cases also Save species/eyes while preserving equipped clothes; mood-only Save leaves tables unchanged and reopening resets Happy. These snapshots do not certify every outbox field, storage key, remote sync path, or account behavior.

The return-to-room assertion at `creator-thumbnail.test.mjs:117` waits for `.room-pet .ch-animated`. It proves sampled resident art remounts, not that its motion progresses over time. Resident preservation is supported here by the selector boundary and unchanged code; I do not promote that locator assertion into temporal evidence.

## Recorded checks and failure history

All filenames in this table have the `creator-thumbnail-` prefix under `docs/audits/2026-10-12-character-polish/`; each run has its raw `.log`, `.exit`, and `-resources.json` file. I checked all three forms of exit evidence agree.

| Run suffix | Exit | Resource sample rows | Recorded outcome |
| --- | --- | --- | --- |
| `baseline` | 0 | 14 | Six read-only inventory probes; no still-thumbnail acceptance assertion |
| `red` | 1 | 20 | Nine failures, including two nonexistent-label failures under OS reduction |
| `red-v2` | 1 | 20 | Two passes and seven perpetual-animation assertion failures |
| `harness-lint` | 1 | 3 | Missing ESLint module; no lint result |
| `final-harness-lint` | 0 | 3 | One-file oxlint command with `--max-warnings=0`; empty output |
| `build` | 0 | 12 | TypeScript build, Vite production build, and PWA generation; includes a chunk-size warning |
| `final-native` | 0 | 78 | 34 passed, zero failed/cancelled/skipped; 74.992324611 seconds |
| `focused` | 0 | 7 | 63 passed across five files; 4.30 seconds |
| `final-diff` | 0 | 3 | Whitespace checks for the four authored sources |

I counted 34 successful native test entries. They comprise 9 new thumbnail cases plus 11 layout, 4 motion, and 10 mood cases. The focused source cases expand to 7 creator, 8 model, 23 mood, 20 motion-hook, and 5 preference cases, totaling 63, consistent with the raw summary. These are scoped checks, not a full-suite pass.

The exact initial red source requests Sleepy, Happy, Stripes, and Stars instead of Button, Lashes, Hearts, and Freckles. Its system-reduced cases pass the stillness checks and then fail the radio-name assertion. The initial seven other failures occur at the perpetual-animation assertion. The corrected retained source differs only in those four names and is byte-identical to the final harness. Its raw red-v2 log has two system-reduced passes and seven failures at that same animation assertion. No stillness bound was weakened. The failed ESLint launch and successful repository oxlint invocation remain separately recorded.

## Animation and resource calculations

I recomputed the baseline counts from each raw inventory, filtering `iterations == "Infinity"` rather than counting every animation object.

| Comparison layout | SVGs | Normal/device perpetual animations | OS-reduced baseline | Final perpetual animations under each preference |
| --- | --- | --- | --- | --- |
| Desktop, Who and Face samples | 11 each | 33 each: 11 breaths and 22 blinks | 0 | 0 |
| Phone Who | 3 | 9: 3 breaths and 6 blinks | 0 | 0 |
| Phone Face | 8 | 24: 8 breaths and 16 blinks | 0 | 0 |

Phone normal/device Who inventories contain ten animation objects, including one finite choice transition with one iteration. That transition is correctly excluded from the nine perpetual loops. The baseline main-preview count of zero concerns CSS animations only; it does not count JavaScript frame owners.

The 12 final JSONs contain 99 sampled SVG instances and 297 computed group entries: `6 * 33 + 3 * (9 + 24) = 297`. Every entry reports animation `none` and transform `none`, and every perpetual inventory is empty. Desktop captures repeat the same mounted 11 choices; these totals describe sampled entries, not 297 distinct groups mounted at once. `expectStill` obtains and asserts the inventory/styles before `capture` disables animations for the screenshot. The screenshots cannot independently establish that loops stopped.

I independently recomputed each resource sidecar's sample count, minimum RAM and `/tmp` values, exit code, and the aggregate summary. Counts sum to `14 + 12 + 3 + 3 + 78 + 7 + 3 + 20 + 20 = 160` across nine runs. Minimum observed available RAM is 3,242,782,720 bytes, or 3092.55859375 MiB. Minimum observed `/tmp` free space is 4,199,600,128 bytes, or 4005.05078125 MiB. Every run begins above its 3200 MiB RAM launch threshold and remains above the 2048 MiB RAM/tmp reserve in the recorded samples. There are zero recorded reserve stops or launch rejections, and every cleanup records no remaining live owned members. Recorded time intervals do not overlap.

The heavy-job commands specify nice 10, one test concurrency/worker, and capped Node heaps: 384 MiB for native/focused execution, 512 MiB for build, and 192 MiB for lint launch. Host snapshots occur approximately once per second, including initial/final rows. They establish sampled headroom during this batch, not peak process RSS, CPU use, battery consumption, or exclusive activity elsewhere on the host. Removing measured animation loops provides no quantified CPU or battery saving in this evidence.

## Direct visual inspection

I directly opened and viewed every one of these 12 PNG files under `docs/audits/2026-10-12-character-polish/creator-thumbnail-native-final/`, including all byte-identical duplicates.

| Width and preference | Who file directly viewed | Face file directly viewed |
| --- | --- | --- |
| 1280 normal | `thumbnail-1280-normal-who.png` | `thumbnail-1280-normal-face.png` |
| 1280 device | `thumbnail-1280-device-who.png` | `thumbnail-1280-device-face.png` |
| 1280 system | `thumbnail-1280-system-who.png` | `thumbnail-1280-system-face.png` |
| 390 normal | `thumbnail-390-normal-who.png` | `thumbnail-390-normal-face.png` |
| 390 device | `thumbnail-390-device-who.png` | `thumbnail-390-device-face.png` |
| 390 system | `thumbnail-390-system-who.png` | `thumbnail-390-system-face.png` |

The visible species silhouettes and eye choices have open eyes, readable labels, and intact selection rings. The main resting character stays within its preview. Desktop captures show all three species and four eye choices; lower cheek controls require the existing panel scroll. Phone Face captures show the mood selector and eye row, with cheeks below the captured panel area. I do not treat those partially visible or uncaptured controls as visually inspected in full. The recorded layout assertions provide separate focus/reachability evidence.

PNG headers confirm six 1280x800 and six 390x800 captures. Hashes give six unique byte identities and six duplicate files. All six desktop files share `54dd31d057b1046e68159aa624dd0b8c973f379ba5d9f26de61e3895d1e67887`; phone normal/device Face share `870162c0b8f8646e525452a8cfc6c55c42a5f4dbb71eca99b578e895cf3fde72`. I verified every PNG against its manifest entry rather than inferring identity from filenames.

## Limits and behaviors set aside

- New preview-tools red tests, design, and native WIP are explicitly outside this freeze. I did not review or certify that work, and this PASS makes no full-suite-pass claim for it.
- The historical 2485-test pass belongs to the preceding mood checkpoint. This batch records no full-suite rerun for the CSS change; I did not independently verify that historical result.
- The retained native evidence uses offline production fixtures in Chromium 152.0.7977.82. It does not certify other browser engines, physical devices, assistive technology, whole-app zoom, or subjective temporal comfort.
- Final thumbnail stills use default root text and the default pink character. Enlarged-text and dressed species/mood coverage comes from other scoped native assertions in the 34-case log, not from those 12 stills. This is not an exhaustive art review of every colour, outfit, or application screen.
- Screenshots explicitly disable animations. Animation inventories/computed styles and finite-clock assertions supply the relevant behavioral evidence; still images and host memory samples supply no runtime CPU/battery measurement.

These exclusions and assertion limits do not expose a defect in the frozen rule. The patch meets its bounded goal, preserves the existing finite preview and controls by construction, and has matching recorded native/focused evidence.
