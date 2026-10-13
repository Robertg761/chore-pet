# B63 creator Face detail independent review

PASS for the frozen source, recorded evidence and final stills. No actionable P0, P1, P2 or P3 findings. This is one bounded independent review using the requesting-code-review reviewer requirements. No additional reviewer was dispatched.

Review performed on 2026-10-13 in `/home/robert/.codex/worktrees/4511/chore-pet`. The only authored file is this report. No source edits, commits, browser or network use, builds, tests or heavy jobs were performed. The checks below are fresh local hash comparisons, patch reconstruction, recorded-data arithmetic, log/source inspection and direct local image viewing. Test/build results are recorded results, not newly executed results.

## Exact bindings

| Binding | Verified value |
| --- | --- |
| Immutable input | `docs/audits/2026-10-12-character-polish/creator-detail-review-input.json` |
| Input SHA256 | `041f00f885c2445e6d5e256749bc60bb1065465ef3206ed3bd41ad3bf7a43fe1` |
| Base commit | `d05e1ab2cd58a1d4c95dd8c58924d84cce21a848` |
| Patch SHA256 | `19c53df7d67107a57b625fd4e9586e2afbef7f90dcf396a2c545acafe2560b36` |
| Artifact manifest SHA256 | `9705c021db190154913e8219328e3ef46570cd921ce0dc545674a544b67d8c1a` |
| Frozen source bindings | 6 of 6 match |
| Unchanged source bindings | 42 of 42 match their input hashes and the base commit bytes |
| Artifact bindings | 167 of 167 match |
| Raw log/exit/resource pairs | 15 of 15 agree; 10 exit 0 and 5 exit 1 |

| Frozen path | SHA256 |
| --- | --- |
| `src/screens/CharacterCreator.tsx` | `b0a9e5829b5eeb4c2bd92c4987857d52b345fbdf521873c598fd3b40f81cd233` |
| `src/screens/CreatorPreview.tsx` | `64a5509adc18d658cfa29cd72c5d24e56f495b304da70dc454280d80dc9a1bb9` |
| `src/screens/CharacterCreator.detail.test.tsx` | `9b52bb2b34194e77e1affa2ebcb8b27e2cb68ba5cba0f610f8347070630a8462` |
| `scripts/browser/creator-detail.test.mjs` | `d2c4ee3679e0e4a1cb365fb2b9ea432c89c220a4d757871e85e48d006e26a2d2` |
| `docs/ART.md` | `bbf13976da7bae8270119b9961f45f00acaf220e4f2de0a7fa071e788de4d9e8` |
| `docs/audits/2026-10-12-character-polish/creator-detail-design.md` | `bc031bf1f4548f7df5cfb5e22cd1a9a7e48e944670230946e98d6c81435563c0` |

The 42 unchanged bindings are exactly the `freeze.unchangedSources` map in the hash-bound input, including creator CSS/model, rendering/art/species, motion/reduction, store/types, shell and existing creator tests/harnesses. All were compared individually. Every patch hunk was applied in memory to the base file bytes, using empty input for the three added files. All six reconstructed outputs equal the frozen current files exactly, and the patch path set equals the six source bindings. There are no additional production changes in this patch beyond `CharacterCreator.tsx` and `CreatorPreview.tsx`.

## Source and behavior review

`CharacterCreator.tsx:103`, `:207` and `:276` add one local boolean, a native `type="button"` pressed toggle and its preview prop. The handler only changes that boolean. It cannot submit, cheer, settle, save or invoke Show preview. State persists through tab/viewport/draft changes and resets on editor remount.

`CreatorPreview.tsx:11` and `:42` default detail to false and change only the SVG viewBox and accessible image label. Full view remains exactly `0 0 200 200`. Detail is `36 75 128 110`, spanning x36 through x164, with midpoint x100. The existing `translate(200 0) scale(-1 1)` wrapper at `:43` reflects the complete art and ground once. No nested mirror or alternate artwork was added.

The SVG/art nodes, component placement and art props remain stable. Cheer start, elapsed sampling, 1800 ms deadline, Show preview instant scroll/focus and reduction behavior are untouched. The change adds no clock, timer, listener, CSS, store field, saved preference or look-model field. `changesFrom` and the Save boundary remain unchanged. Source and the recorded assertions agree on initial/live system reduction, device reduction and actual peer-tab StorageEvent cancellation without replay. The native save/remount case checks that preview state does not enter saved pet fields. The existing sick pose deliberately retains face/head items while hiding other outfit slots; detail and mirroring preserve that rule.

## Recorded runs and failure history

All listed log and exit sidecar hashes were checked against the immutable input. Each resource record is covered by the 167-file artifact manifest and agrees with its run's exit code.

| Run stem, all prefixed `creator-detail-` | Exit | Raw result | Resource samples |
| --- | --- | --- | --- |
| `build` | 0 | Build/PWA passed | 13 |
| `final-build` | 0 | Typecheck/build/PWA passed | 12 |
| `final-diff` | 0 | 6 authored paths, no trailing whitespace or tracked diff errors | 3 |
| `final-focused-v2` | 0 | 69 tests / 4 files, 7.93 s | 11 |
| `final-focused` | 0 | 69 tests / 4 files, 8.03 s, historical narrow crop | 11 |
| `final-full` | 0 | 2558 tests / 137 files, 95.43 s | 98 |
| `final-lint` | 0 | 4 paths, strict zero-warning command, empty log | 3 |
| `focused-v2` | 0 | 66 tests / 4 files, 7.85 s | 11 |
| `focused` | 1 | 65 passed, 1 failed / 4 files, 7.68 s | 11 |
| `native-clock` | 0 | 2 passed, 5.545122913 s | 8 |
| `native-diagnosis` | 1 | 1 passed, 1 failed, 5.433364502 s | 8 |
| `native-final-v2` | 0 | 40 passed, 0 failed/cancelled/skipped, 91.395900715 s | 94 |
| `native-final` | 1 | 39 passed, 1 failed, 88.893857498 s | 91 |
| `native-initial` | 1 | 31 passed, 6 failed, 82.88713837 s | 85 |
| `red` | 1 | 18 failed at missing Face detail control, 2.04 s | 5 |

The five exit-1 runs remain failed. The first focused failure attempted to click the narrow-only Face tab after the fixture had switched to wide layout. The archived source comparison shows removal of that unnecessary click while retaining reset assertions. Final unit coverage has 21 new detail cases; the final native log contains 14 new cases and 26 existing cases, all 40 with individual pass records.

The initial native run's five enlarged-layout failures followed mouse selection without entering keyboard focus mode. The distinct diagnostic run preserved a fitting 292 by 49 px focused Mirror button with `focusVisible=false`, and still exited 1. The final harness enters keyboard mode with Tab before measuring focus-visible. It retains the size, fit, viewport and focus assertions.

The initial pre-click fixed-clock deadline case failed once, then passed in the distinct diagnostic run. The final harness records the actual native click and delivered RAF timestamps. It does not extend the production deadline. The strict unit assertions at elapsed 1799 and 1800 ms remain present.

The stronger expression-plus-face-accessory stroke bounds check exposed the scruffy Bun narrow-crop failure in the 39/40 run. Recomputing its raw failure object gives a physical edge excess of 4.20621573710298 CSS px, plus the separate 1 px required reserve. Archived versus final product source differs only from `40 75 120 110` to `36 75 128 110`. The final harness retains the same stroke expansion and 1 px bounds tolerance. Its magnification lower bound correctly changes from 5/3 to 25/16 to account for the wider crop. Final focused-v2, native-final-v2, full and build records support the widened source.

The build log includes a nonfatal chunk-size warning and successful PWA generation with 19 precache entries. The scoped strict-lint result does not imply a warning-free build.

## Independent geometry and deadline recomputation

All three final species geometry files were read directly. Each contains happy, content, meh, scruffy and sick samples, for 15 distinct cases. I recomputed reflection and y invariance for all four recorded body points and four ground points per case, totaling 120 point pairs. Maximum error is `1.1368683772161603e-13` CSS px. Independently recovering affine matrices from the four local test points also gives one reflection about the SVG center; maximum affine reconstruction/residual error is `2.2737367544323206e-13`. Slot lists, SVG bounds and static zero-pending-frame records agree before and after reflection.

I recomputed bounds margins for 240 recorded expression/glasses group corners across normal and mirrored detail samples. The minimum conservative stroke-expanded margin is `8.61917274646596` CSS px, at the Bun scruffy expression. This exceeds the unchanged 1 px reserve. Full-to-detail point positions and stroke expansion scale consistently with the viewBox change. All 15 desktop samples have recorded magnification `1.5625000000000002`, matching 25/16. Default SVG aspect fitting mathematically permits ratios from 25/16 through 20/11; the report does not imply that all layouts show the same scale.

The five enlarged layouts are 320x568, 390x664, 640x360, 844x390 and 1280x800 at 200% root font size. All 15 independently inspected control records show fitting text, visible keyboard focus, dimensions at least 44 by 44 px and bounds inside their viewport when focused. Every recorded button is 49 px high. Individual measurements occur after each control receives focus and can scroll, so they do not assert simultaneous visibility. All five Show preview records have focused/focus-visible art, zero pending frames and complete visible SVG height of at least 160 px. Recomputed minimum conservative face stroke margin across these five previews is `22.181253989993728` CSS px.

The final deadline trace records click start 1049 ms, original deadline 2849 ms, preceding delivered RAF 2848 ms and first crossing RAF 2864 ms. The preceding frame is at elapsed 1799 ms; crossing is at elapsed 1815 ms. Advancing 16 one-ms steps reaches that first crossing, with zero pending frames and no delayed restart. This is expiry on the first delivered frame after the original deadline, backed by the unchanged strict 1800 ms unit check. It is not a claim of a native callback at exactly 1800 ms.

## Direct final still review

`creator-detail-native-final-v2` is the sole final still set. All 29 PNGs passed local PNG signature, chunk CRC, decompression, dimensions and scanline-structure checks. Each was then opened directly at original resolution with `view_image`. The root review's 29 listed paths, hashes and dimensions independently match this directory and the artifact manifest. Captured metadata names Chromium `152.0.7977.82`.

| Directly viewed filenames within the final directory | Count | Observations |
| --- | --- | --- |
| `detail-bun-happy-full.png`, `detail-bun-happy-close.png` | 2 | Larger face/glasses, expected ear cropping |
| `detail-bun-scruffy-full.png`, `detail-bun-scruffy-close.png` | 2 | Tilted face/glasses intact; peripheral ear/strap/body clipping visible |
| `detail-bun-sick-full.png`, `detail-bun-sick-close.png` | 2 | Face, glasses and thermometer readable; bed edges crop |
| `detail-mochi-happy-full.png`, `detail-mochi-happy-close.png` | 2 | Same shapes and look, enlarged face |
| `detail-mochi-scruffy-full.png`, `detail-mochi-scruffy-close.png` | 2 | Tilted expression/glasses intact; outer clothing crops |
| `detail-mochi-sick-full.png`, `detail-mochi-sick-close.png` | 2 | Existing sick props and face readable; bed edges crop |
| `detail-sprout-happy-full.png`, `detail-sprout-happy-close.png` | 2 | Face/glasses intact; upper leaf tips crop |
| `detail-sprout-scruffy-full.png`, `detail-sprout-scruffy-close.png` | 2 | Drooping leaf pose and face retain their shapes |
| `detail-sprout-sick-full.png`, `detail-sprout-sick-close.png` | 2 | Face and sick props readable; bed edges crop |
| `detail-active-cheer.png` | 1 | Enlarged cheerful face and glasses visible, focused preview ring |
| `detail-layout-320-controls.png`, `detail-layout-320-preview.png` | 2 | Readable wrapped controls and focused visible preview through scrolling |
| `detail-layout-390-controls.png`, `detail-layout-390-preview.png` | 2 | Readable controls and focused visible preview through scrolling |
| `detail-layout-640-controls.png`, `detail-layout-640-preview.png` | 2 | Landscape controls fit; revealed preview visible with header partly scrolled away |
| `detail-layout-844-controls.png`, `detail-layout-844-preview.png` | 2 | Two tool columns plus Show preview row; focused art visible after scrolling |
| `detail-layout-1280-controls.png`, `detail-layout-1280-preview.png` | 2 | Readable wide controls and visible focused art |

Full stills are normal-facing; close species stills are mirrored. Their asymmetric clothes/props change sides consistently with the recorded single reflection. The stills support deliberate peripheral cropping, not a promise that ears, feet, clothing, bed edges or every head/back accessory remain fully in frame. Five moods have geometry evidence; happy, scruffy and sick have paired stills. Content and meh do not have separate final stills.

## Resource review and limits

Recomputed totals are 15 runs and 464 host sample rows. Minimum observed available RAM is `3525.83984375` MiB and minimum observed `/tmp` free space is `4005.22265625` MiB. No recorded reserve stop or launch rejection occurred; all resource records have no stop reason and no remaining live owned cleanup members. Commands record nice 10, capped Node heaps and single-worker/test-concurrency controls. These approximately one-second host samples support only observed headroom, not peak process RSS, CPU/battery savings or physical-device capacity.

Behaviors considered and set aside from certification are listed explicitly:

- Exact painted geometry for every path, phase, eye/cheek style and accessory combination. The requested evidence covers conservative expression/glasses group bounds, recorded matrices and sampled stills.
- Human temporal comfort, physical-device and assistive-technology behavior. Static native stills and deterministic clock samples cannot establish these.
- Whole-browser zoom and other browser engines. The enlarged layouts change root font size in the recorded Chromium session.
- Simultaneous visibility of all editor controls on small/landscape screens. The implemented and recorded contract uses page scrolling and Show preview.
- CPU, battery, peak process usage and continuous animation performance. No relevant profiling or certification was performed.
- The parent's distinct outfit-toggle test/design work. It is outside this immutable B63 patch and was not edited or reviewed.

The source/evidence/still review supports PASS within these limits. No fixes are requested for the frozen B63 change.
