# Batch44 independent review

PASS. No Critical, Important, or Minor findings in the frozen Batch44 scope. The finite Rest preview reuses the existing scheduler and renderer, and the CSS addresses the recorded five-control layout failures. This is a static source, file, and still-image verdict. No builds, tests, browser sessions, agents, or messages were run by this reviewer.

The only file written by this review is `docs/audits/2026-10-12-character-polish/wardrobe-rest-independent-review.md`. Concurrent next-batch files, including `Wardrobe.show.test.tsx` and `wardrobe-show-*`, are outside this verdict.

## Verified identity and scope

HEAD is exactly `72e84aec9a4f50ab34cca9c478c470226d1bb539`, matching the input's baseline. All seven source hashes, twelve unchanged dependency hashes, the source diff, 68 artifact hashes, and fifteen raw log/exit pairs match their bindings. There are 119 unique bound files. Exit-file contents also match all fifteen declared exit codes. The final read-only binding check found zero mismatches.

| Binding | Verified SHA-256 |
| --- | --- |
| `wardrobe-rest-review-input.json` | `f9a0259af5e3686757044c425885faa4b56c69bc1048dab67e1544e3b5cdcbf5` |
| `wardrobe-rest-source.diff` | `c41a3668f6b7099c2d6e4916b9f6a7008d824eebcaceb4767d2a24da70536e6b` |
| `wardrobe-rest-artifacts.json` | `5403c289b1e14f88a98bd056feeb12e56306b1d97035657c5ce6dd96e1eb72a7` |
| `wardrobe-rest-comparison.json` | `fe98c91b39cb00662d3b2dda8a0b972ff93faeb4bf77d7c778e5fe10fb0e0ed6` |
| Accepted and final `wardrobe-rest-layouts.json`, each | `7bc439a56f2bb7010b757f0770f6b6bd6e906546fc9cb01d34e58f4a62108741` |
| `wardrobe-rest-resources.json` | `9c9c44d8b197b5391a8fde3cd5065f081c191402377bd0d2b201d481515ade1a` |

Paths in this binding table are under `docs/audits/2026-10-12-character-polish/`. The accepted aggregate is in `wardrobe-rest-flow-revised-prototype/`; the final aggregate is in `wardrobe-rest-native/`. The verification document's review-input hash matches the actual input, and its remaining fields equal the immutable input. Every nested source/artifact hash in the comparison document also matches.

| Frozen source | Verified SHA-256 |
| --- | --- |
| `src/screens/WardrobePreview.tsx` | `f45be3f0e88d9f0220a60b54d8f02b0ba9fdab1200e57b2257a23e18524b5f40` |
| `src/screens/Wardrobe.css` | `20f255b55a8b3c004bf57fbef9112ab0f0a9053928dd80fb4e5864a076d2b0af` |
| `src/screens/Wardrobe.rest.test.tsx` | `f5216a4894ef2dfa01ca68567f5c7c7800a6e02b8de9826b3f3421476919958b` |
| `scripts/browser/wardrobe-rest.test.mjs` | `8926976d76b47d8597001305da60cb8dcf9003af46d21f0278621992f005cd96` |
| `scripts/browser/wardrobe-motion.test.mjs` | `572a222f53a43fdc4c8df29d5a6a6864b61222e4892bdad47e57697033e95195` |
| `docs/ART.md` | `5f2786126950bca4725e7067b63931a954843ac11b853861b7b954067ccf31a0` |
| `docs/audits/2026-10-12-character-polish/compare-wardrobe-rest.mjs` | `e01d100f93a55f0bdb812e255a2e5e085540a0d356fad87fa125fc9f1415d281` |

I reconstructed each unified-diff section in memory using the exact baseline contents, checking every context/deletion line. All seven resulting files equal the frozen working files byte for byte. The patch contains exactly these seven sources. The archived baseline CSS also equals baseline `Wardrobe.css` byte for byte.

| Unchanged dependency | Verified SHA-256, also equal to baseline |
| --- | --- |
| `src/screens/Wardrobe.tsx` | `97a3e3da1d1f3451f937a74aed619f67c9703f0895d46494fc73809ab274ed5c` |
| `src/screens/wardrobeModel.ts` | `54a214a753fd87347ae0b4b2089ff5829be5c4f24b369ed6b0d52560ead86ddd` |
| `src/character/motion.ts` | `6bbf647a8391e103951474c70438138dd3599cc28f56aeacbaa2ea1dc686284f` |
| `src/character/AnimatedCharacter.tsx` | `aaa5f8b8691b461a0a8074825dd2806b9d86a87e8b0fe2a69f83bde1badff0a2` |
| `src/character/species/animatedBody.tsx` | `21615edf42cce64642daf4fd2fe3932e7ed106a12c9f215815fe8baae8717d48` |
| `src/pet/usePetMotion.ts` | `db30f455d66d10671032f8ebd0017c7a95c3bed5542a0094e8a6abb3b5b19267` |
| `src/pet/motionPreference.ts` | `3534b30a71d00023552a6c6e8180af1f6c6a188e421def9fa44495210f52ed59` |
| `src/shell/SegThumb.tsx` | `9c35f972813c2270237ca025a0bf07250eaf1b2f5b79cf49c1de7e79c3134eea` |
| `src/shell/ScreenHeader.css` | `6f080e585b434cef33665cd58c627389010b3ec0e3c9a0b3fd15cfb56ded1e65` |
| `src/index.css` | `28b09b668da92e49c2a13554af34e56408dcc677d21e954fbc8145262b592418` |
| `src/pet/LivingRoom.tsx` | `ef72fe47fe14dd67bb78e512dd237f046730d68ebd3209ebc4c16060a380294f` |
| `src/App.tsx` | `63958a74abb6ac16e890728c20eabfc7296b4c0b2a361ba68b2337f7d805a181` |

## Source and behavior assessment

`WardrobePreview.tsx:10` and `:59` add the Rest action and its toggle button. Scheduling, sampling, and cancellation code are unchanged. The preview remains local to the preview subtree, with no save callback or persistence operation. `motion.ts:63` supplies the existing 2400ms duration; `WardrobePreview.tsx:18-27` uses the original monotonic start time and finite sampler. Starting Rest resets the selected pose to Happy. The active button becomes Stop rest on the same DOM node, and competing actions are disabled and rejected by the existing guard.

Stop and pose selection clear the run. Outfit prop changes redraw the equipped slots without replacing the run's start or extending its deadline. System and device reduction clear the run in the preference event batch and disable the controls; restoring the preference does not create another run. `usePetMotion.ts:52-85` keeps one pending frame, cancels while hidden, includes hidden elapsed time on the first visible tick, and rejects disposed or superseded callbacks. Its cleanup removes listeners and cancels the outstanding frame on unmount. The existing renderer retains the shared outfit layers, fixed ground contacts, and quiet Rest sampling with no reward accent.

The eight new unit cases cover three dressed species, 2399/2400ms boundaries, stable art and item computation, no preview writes, Stop/focus, competing actions, pose cancellation, both live reductions, hidden expiry, unmount cancellation, and outfit updates. The new native source checks actual transformed foot contacts and keyboard focus, stable SVG/grid nodes and saved tables, one pending frame, finite completion, both reductions, and ten layouts. Existing native coverage still exercises Wave, Gentle pats, Hop, Stretch, outfit retention, and their relevant reductions. The ordinary-row assertion changes from four controls to five balanced controls; it does not remove the existing bounds checks.

`Wardrobe.css:26-33` uses six grid tracks with the first three buttons spanning two tracks each and the last two spanning three. Below the text-aware 12rem stage threshold, it uses one column. The 19rem app-shell rule and the 34rem wide/landscape rule release the fixed screen height, preserve a 160px preview, wrap pose/category controls, and put the item panel into vertical page flow. The outer app view already supports vertical scrolling, and `SegThumb` measures both x and y after wrapping. These overrides are scoped to wardrobe elements. The item-grid implementation, model, renderer, store integration, and shared hook remain unchanged, although the enlarged item grid intentionally changes to two CSS columns.

The initial enlarged-flow fixture demanded one column even when the wider stacked stage safely fit 3+2. The final assertion accepts either balanced 3+2 or a single column at 200% text while retaining the art, target, horizontal label, horizontal bound, stage containment, and actual focus-clearance assertions. That change is supported by the geometry and direct still inspection.

## Direct still and geometry review

I directly opened all ten final PNGs in `wardrobe-rest-native/`:

- `wardrobe-rest-mochi.png`, `wardrobe-rest-bun.png`, and `wardrobe-rest-sprout.png`.
- `wardrobe-rest-layout-320-100.png`, `wardrobe-rest-layout-390-100.png`, `wardrobe-rest-layout-640-100.png`, `wardrobe-rest-layout-844-100.png`, and `wardrobe-rest-layout-1280-100.png`.
- `wardrobe-rest-layout-320-200.png` and `wardrobe-rest-layout-844-200.png`.

The species captures show retained beanie, glasses, scarf, overalls, and backpack, relaxed arms, visible feet and ground shadow, and a clear Stop rest focus outline. Ordinary captures show the 3+2 controls within the stage; narrow Gentle pats labels wrap legibly. The enlarged captures show readable movement labels, wrapped categories, and an intact focused Stop rest outline at the scrolled position.

I also directly opened all seven accepted `wardrobe-rest-flow-revised-prototype` PNGs and these historical captures: both `wardrobe-rest-rows-prototype` stills at 320/390 and 100% text, `wardrobe-rest-revised-rows-prototype/wardrobe-rest-layout-640-100.png`, and `wardrobe-rest-flow-prototype/wardrobe-rest-layout-320-200.png`. I inspected the retained prototype CSS, layout JSON sidecars, and raw failure logs. The sidecars agree with the corresponding final aggregate samples. The failed 640px art collapse and failed 200% art collapse are recorded in the failure logs; those failing states have no separately captured PNG in the bound bundle.

| Viewport | Root text | Recorded art height, px | Movement rows |
| --- | --- | --- | --- |
| 320 x 568 | 100% | 116.015625 | 3+2 |
| 390 x 664 | 100% | 210.015625 | 3+2 |
| 640 x 360 | 100% | 109.40625 | 3+2 |
| 844 x 390 | 100% | 139.40625 | 3+2 |
| 1280 x 800 | 100% | 485 | 3+2 |
| 320 x 568 | 200% | 160 | Five single rows |
| 390 x 664 | 200% | 160 | Five single rows |
| 640 x 360 | 200% | 160 | 3+2 |
| 844 x 390 | 200% | 160 | 3+2 |
| 1280 x 800 | 200% | 422.8125 | 3+2 |

All ten recorded samples have movement targets at least 44px in each dimension, fitting horizontal labels, horizontal bounds, and actual keyboard focus with a 6px ring extent and recorded clearance. I independently compared the parsed accepted and final samples; all ten are exactly equal. All seven final layout sidecars equal their aggregate samples.

The seven PNG byte comparisons are exact only at 844px and 100% text, and 844px and 200% text. The other five pairs differ in bytes. I verified both the actual bytes and the comparison document's boolean claims. I make no pixel-equivalence claim for those five pairs. Exact recorded geometry does not imply identical pixels.

The enlarged focused controls and character are separated by vertical scroll in several samples. At 320/390px and 200% text the recorded art bottom is -41.625px; at 640/844px and 200% it is -96.8125px. A positive art height therefore proves retained layout space, not current viewport visibility. The immutable input explicitly disclaims co-visibility and assigns explicit Show preview to the next batch. This review preserves that limit.

## Recorded checks and evidence limits

I read all fifteen raw logs and exit files. These are archived execution results, not fresh runs by this reviewer.

| Check | Exit | Recorded result |
| --- | --- | --- |
| build | 0 | Production type build and Vite/PWA build complete; chunk-size warning remains |
| comparison | 0 | Ten exact geometry samples; 2/7 byte-exact stills |
| diff | 0 | Empty recorded whitespace-check log |
| flow-prototype | 1 | Enlarged-row fixture expected five single rows; actual was 3+2 |
| flow-revised-prototype | 0 | Revised ten-layout probe completes |
| focused | 0 | 53 tests in five files |
| full | 0 | 2303 tests in 115 files |
| initial-build | 0 | Initial production build completes, with chunk-size warning |
| layout-red | 1 | Five controls with old CSS leave 64.015625px art at 320px |
| lint | 0 | Zero-warning lint command completes |
| native-red | 1 | Missing Rest control |
| native | 0 | Fifteen native cases, no failures, cancellations, skips, or todos |
| red | 1 | All eight new unit cases fail at the missing Rest control |
| revised-rows-prototype | 1 | 12rem rows still leave zero-height art at 320px and 200% text |
| rows-prototype | 1 | 14rem rows leave zero-height art at 640px and 100% text |

The hashes of all thirty raw log/exit files match the immutable input. Each exit-0 file hashes to `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa`; each exit-1 file hashes to `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`. The log hashes are individually verified against `checks[].logSha256` in the input identified above.

Native evidence uses deterministic Chromium `152.0.7977.82`. Rest foot positions are sampled before motion and at 1200ms for each species. Recomputed maximum displacement is approximately 0.00000352px, within the asserted 0.05px bound. This does not measure every rendered frame. Unit checks exercise the exact 2399/2400ms boundary; native completion permits the 16ms frame grid through its 2384ms and 2416ms observations.

The new Rest unmount case captures its stale callback from an earlier hidden/cancelled run, then checks active-frame cancellation on a later run's unmount. It does not itself invoke that later run's queued callback. The unchanged baseline `usePetMotion.test.tsx`, read through `git show` for context, separately checks a callback queued immediately before unmount. The baseline `motion.rest.test.ts`, also read for context, samples appendage motion across 2401 milliseconds and alternate durations. Those two existing test sources are outside the nineteen-file freeze; their presence in the recorded focused command supports context, not a new hash binding or an independent rerun.

Historical test-source revisions were not separately archived. Their logs establish the recorded failures and assertions, but do not permit reconstruction of every earlier fixture revision. Hash agreement establishes consistency of the supplied files; it does not independently prove execution provenance or bind a rebuilt production binary.

The resource artifact records 6,174,328KiB available memory and 4,303,839,232 free tmpfs bytes at its snapshot. It describes sequential heavy work, one worker/browser, a 768MB Node cap, and nice10. The snapshot cannot independently establish enforcement across every command, peak RSS, CPU use, or battery cost. No human temporal, physical-device, or assistive-technology acceptance is claimed.

## Declined to judge

- Explicit Show preview behavior and its independently added next-batch files, because the user and immutable input assign that work to the next batch.
- Enlarged control/character co-visibility as an acceptance requirement, because the frozen input explicitly disclaims it. The actual separation is documented above.
- Pixel equivalence for the five byte-different PNG pairs, because the bundle does not establish it.
- Human motion quality, physical-device and assistive-technology behavior, runtime resource costs, and unsampled layouts, because this review is restricted to static inspection of the bounded evidence.

Ready to proceed for the frozen Batch44 scope with these evidence limits. This verdict does not accept or review the concurrent next batch.
