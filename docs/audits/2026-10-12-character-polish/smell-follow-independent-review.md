# Batch43 independent review

PASS. No actionable findings in the frozen Batch43 scope. No critical, important, or minor issues found. The healthy sniff damping and horizontal foot compensation agree with the sampler, renderer, tests, and supplied evidence. Batch43 is ready for the parent to proceed within the evidence limits below.

Reviewed on 2026-10-12 in `/home/robert/.codex/worktrees/4511/chore-pet`. All paths below are relative to that checkout. This was an independent static/file/image review. I did not run builds, tests, capture/comparison scripts, a browser, agents, or messaging tools. The only file I wrote is this report.

## Correctness assessment

- `src/character/motion.ts:79` adds species-specific sniff strengths. At line 398, only normal-motion `smell` with a non-sick mood selects the new three-pi sway and smooth damping multiplier. The existing follow envelope still controls emergence and recovery. The multiplier remains positive, the envelope settles with zero endpoint slope, and Bun retains the largest movement. The right appendage retains its existing species relationship, including Sprout's opposite sign.
- At `src/character/motion.ts:382`, both horizontal ground offsets become the negative of the already species/mood-scaled `bodyX`. This placement matters. In `src/character/species/animatedBody.tsx:82`, the foot group cancels the complete torso transform. At line 118, the foot centre is `rig.feet[i] + bodyX + GroundX`, so the new offset restores the fixed rig centre. Mood posture, squash, and lean cancel through the existing inverse transform. The outer facing mirror then reflects a fixed contact. `bodyY`, foot lift, and vertical offsets stay zero for sniff, so the `groundContact` branch does not introduce a vertical change.
- The only production edits are the sniff strength constant and those two healthy-sniff branches. The primary sniff switch, action duration, energy, torso, arms, gaze, blink, expression, scale, and shadow logic are unchanged. The reduced-motion return precedes both edits. Sick sniff continues through its original sway branch. Every other action follows the original code. The eight declared dependencies are byte-identical to the base commit, including the controller, interaction mapping, dialogue integration, and clock.
- The existing activity blend remains compatible with the compensation. At a common stationary origin, interpolation of `bodyX` and its negative preserves a fixed contact; mirroring/rebasing and intentional contact release remain owned by the unchanged helpers. This review does not claim native coverage of every possible interruption.
- The new unit file contains ten cases. It checks excursion and speed limits, a visible lower bound, neutral endpoints, final settling speed, preserved held torso/hand geometry, zero foot lift/body height/accents, unchanged shadow, two displacement zero crossings at three durations, horizontal cancellation for all four non-sick moods, and still reduced-motion appendages for all five moods.
- The four new native cases use actual condition-level2 trash with a linked overdue chore, all five wardrobe slots, real rendered appendage matrices, both foot centres, and native frame timestamps. They also assert stable placement, pose, node, announcement, saved tables, and pending frame count. Reduced motion checks visible art, zero pending frames, unchanged body/position/tables, and the existing 3600ms spoken-line lifetime. Sprout's native measurement is explicitly the stem rotation, `0.4 * leftAppendage`, rather than the full leaf angle.
- The differential script restricts permissible differences to four fields in non-reduced, non-sick sniff. It compares all remaining fields exactly, compares every other action/sick/reduced frame exactly, and separately compares `ACTION_MS`. Its loop dimensions account for 43,200 frames. The recorded 792 changes, 264 per species, and 42,408 exact frames are consistent with its phases and neutral guards. I inspected this script without executing it.

## Artifact and visual assessment

I opened all nine original PNGs individually. These are the six before/after sheets and curves plus all three native room stills listed in the artifact table below.

The four size sheets cover 48 dressed samples and 144 views per stage. Each species has both facings, phases 24/42/60/76%, and 200/60/25px views. Light uses happy art and the species colour; dark uses scruffy art and ink-coloured bodies. The after sheets retain the lean, hand gesture, wardrobe attachment, readable faces, and recognizable species silhouettes. I found no new clipping or detached contact in the inspected views. The smaller ear/leaf movements are visible in the before/after comparison. Mochi's knot is partly covered by the hat, so its curve and DOM samples provide useful additional evidence.

The two curve images use the same angle/time scale. Their stored data contains 701 points per species over 0–1600ms, with neutral endpoints. Reading the stored points gives three displacement zero crossings before and two after. Approximate full-curve peak magnitudes decrease from 5.000 to 1.614 degrees for Mochi, 12.000 to 4.173 for Bun, and 9.000 to 2.442 for Sprout's sampler appendage. All 48 paired capture frames differ only in the four permitted fields, and every after frame has exact horizontal cancellation at both feet.

The three native stills show the dressed resident beside the visibly stinky trash, the overdue chore, and the same invited observation. The art and speech remain visible. A still cannot establish timing, speed, or grounding throughout a reaction; those claims are supported separately by the stored samples and code.

I recalculated the following summaries from all stored native samples without running the product or its tests. Every trace has 83 samples, 16ms timestamp increments from 1776 through 3088, one pending frame at each sample, one unchanged position, an idle pose, and two displacement zero crossings.

| Native trace | Peak degrees | Maximum degrees/s | Maximum foot drift, local SVG units |
| --- | ---: | ---: | ---: |
| Mochi knot | 1.613393545 | 10.434333235 | 0.000009728102267 |
| Bun left ear | 4.169381618 | 28.053039685 | 0.000009859189846 |
| Sprout stem | 0.975663245 | 6.756061921 | 0.000013579811910 |

These agree with the JSON summaries and rounded log diagnostics. Cross-runtime `hypot` rounding differs by at most about `2e-21` SVG units. All drift values are below `0.000015`.

## Independently verified bindings and exact scope

I recomputed SHA256 from file bytes for every binding in the immutable input, artifact manifest, both capture JSONs, and differential JSON. There were 64 distinct current-file bindings, all matching. The capture baseline binding was checked against the exact committed sampler rather than the changed working file. The baseline and all eleven declared/nested unchanged dependencies also match their base-commit bytes.

HEAD resolves exactly to `3602bf3b0a93341268aee94dad4cdf473ae437b4`. The saved baseline is byte-for-byte `git show 3602bf3b0a93341268aee94dad4cdf473ae437b4:src/character/motion.ts`. I regenerated the six-file source diff in memory, including new-file diffs, and obtained the exact frozen diff bytes and hash. The recorded `i/`, `w/`, `1/`, and `2/` path prefixes were preserved for that comparison.

| Binding | Independently matched SHA256 |
| --- | --- |
| `docs/audits/2026-10-12-character-polish/smell-follow-review-input.json` | `a2900ead521d899e1bc278b40d12600d969684b09f7d981b12a53637927709ed` |
| `docs/audits/2026-10-12-character-polish/smell-follow-source.diff` | `c1b6ca8839ef7a5a48453217cf4ef03f882411c1cf6287810fb01c7f3ee71642` |
| `docs/audits/2026-10-12-character-polish/smell-follow-artifacts.json` | `190f153fca7da2a2f941f950194a3eff2b2ceafa7e894877a869ca572a0500f7` |

The six changed sources were read in full, with the diff checked against the baseline.

| Changed source | Independently matched SHA256 |
| --- | --- |
| `src/character/motion.ts` | `6bbf647a8391e103951474c70438138dd3599cc28f56aeacbaa2ea1dc686284f` |
| `src/character/motion.smell.test.ts` | `071aa1c4e10e9a78568cabb1b8a1ee519cde84f4c8e02dea7a45047e51bd2a56` |
| `scripts/browser/pet-smell-follow.test.mjs` | `05cffa0e6f80e3d28b004f9c6506300c490f7ec17bce84943b599d6338bf84d5` |
| `docs/ART.md` | `932596613e7cfc34a3afb0ff166603c091ff1108ed2e8cb80a33730d3782b1ac` |
| `docs/audits/2026-10-12-character-polish/capture-smell-follow.mjs` | `1cbc401ec01550ffb7b41259492d0d811c9b0f58ee39aba744c4837583759f10` |
| `docs/audits/2026-10-12-character-polish/compare-smell-follow.mjs` | `886a4ab1f13380c954ddbfbb29a724244b73f086ece0584b30a649c8d030bd88` |

The eight declared unchanged dependencies were read in full and checked against both their frozen SHA256 and base-commit bytes.

| Unchanged dependency | Independently matched SHA256 |
| --- | --- |
| `src/character/AnimatedCharacter.tsx` | `aaa5f8b8691b461a0a8074825dd2806b9d86a87e8b0fe2a69f83bde1badff0a2` |
| `src/character/species/animatedBody.tsx` | `21615edf42cce64642daf4fd2fe3932e7ed106a12c9f215815fe8baae8717d48` |
| `src/character/parts.tsx` | `ddf741cbf57d6045d7b6abc5d3963560b67beb45807cc699614e46d5806f09dc` |
| `src/pet/activityMotion.ts` | `2cb998b662674f18da251afa5562a44cf7092305c3e06c7e6f9a9bce4b2b97e7` |
| `src/pet/LivingRoom.tsx` | `ef72fe47fe14dd67bb78e512dd237f046730d68ebd3209ebc4c16060a380294f` |
| `src/pet/usePetMotion.ts` | `db30f455d66d10671032f8ebd0017c7a95c3bed5542a0094e8a6abb3b5b19267` |
| `src/pet/behaviour.ts` | `7e4b850de2aa14c42cbd6bafac23420e428b5564350aa1c8a7b17db9b2a915af` |
| `src/pet/interactions.ts` | `39b14d894763531a1cc058f65ddac70bb0118c818bd6ede82c1143fe02e059f7` |

Both capture JSONs additionally bind the following three unchanged dependencies. I read them and verified their current hashes and exact base-commit bytes. Their other five nested source bindings match the appropriate baseline/current sampler, three declared art dependencies, and capture script above. Each capture's three nested PNG hashes also matches the artifact manifest and actual PNG bytes. The differential's nested baseline/current/runner hashes match the corresponding files above and below.

| Additional nested dependency | Independently matched SHA256 |
| --- | --- |
| `src/character/Character.tsx` | `c68132c611f0fd59cc147f048365de229cb4d12431993c83cf67c888ab686dca` |
| `src/art/palette.ts` | `ffce4f626bdd81b1641a711233b1c959d2704828cc6fb9bd13a995fd739a2a47` |
| `src/room/shell/geometry.ts` | `967f73de056add3298520e580aa172a720132b49b11dd5bcab4a8f1a4b4fd027` |

The sixteen artifacts below were hashed and inspected. JSON inspection included every stored capture frame/curve point and native sample. Paths in this table share `docs/audits/2026-10-12-character-polish/`.

| Artifact | Independently matched SHA256 |
| --- | --- |
| `smell-follow-baseline.ts.txt` | `a912e37fb61319129245da227a7dc1e9cda10390596c68089440f307a7762b15` |
| `smell-follow-differential.json` | `a2555cb4e848e82bee44bf086e0197b206c79d31398fbba7c99319d8831d2054` |
| `smell-follow-before.json` | `8ee666e5a48d3d297ce5d5e6b8186fa8f7a53f7fdcedecd04c437009f94a1bba` |
| `smell-follow-before-light-sizes.png` | `eedd8e89d8d2140013fe50ff54982a41214900d54c4549f1cb57ae3f870428ba` |
| `smell-follow-before-dark-sizes.png` | `c9fca9df23289976306ad25a08e6898b46b3f33f1369dcbb7d37e787ae01e579` |
| `smell-follow-before-curves.png` | `c7408def39f969c312bfe1c9ed58636c389894e38f3abbfa35227deeec2e0b39` |
| `smell-follow-after.json` | `a88ab6db463165f4d69b8bed76424b3df50a5c0f6fa08db2dba934473e803917` |
| `smell-follow-after-light-sizes.png` | `95d704aa66672e5eed732cfad80554d8fae446da35288bbaf14c8261269d26d0` |
| `smell-follow-after-dark-sizes.png` | `b76a9f266ec3e3a8d3cc25ce61f8c20ec203e04f658a681d2b2cb56d13db558a` |
| `smell-follow-after-curves.png` | `a4a1f1a0634bef67b78f07764a54acc426cc7383933a4f09fe746bb2c5d13e3c` |
| `smell-follow-native/smell-follow-room-bun.json` | `526e0c98a4411495aaab9f924ad0b6169e3313d2f7c93cd7d8be29fbe20d121b` |
| `smell-follow-native/smell-follow-room-bun.png` | `00332dd8d6e95d9f0ce449d136e24d048e4fc49f5e73d3bc8618caf830325eee` |
| `smell-follow-native/smell-follow-room-mochi.json` | `db7cd0d82ddacdd62fa1fd06bff00cafe33d71e6026281972d24f120b68df03d` |
| `smell-follow-native/smell-follow-room-mochi.png` | `46a7b9a50ead458858766870a43f5b7e26aeac35dbc0528a553b0d1027ca03fa` |
| `smell-follow-native/smell-follow-room-sprout.json` | `b63f7b5600a5235e32fc155a6d4e811dc980404cb1c9ebed3f20b11f01dcfc33` |
| `smell-follow-native/smell-follow-room-sprout.png` | `eec9c4f7661247742304256e8b676627550d8936e0fa196f0a07ed36e942f36f` |

## Completed raw evidence

I read all fourteen raw logs and corresponding exit files. Each log hash matches the immutable input, each exit-file hash matches its binding, and each exit value matches `exitCode`. Paths share `docs/audits/2026-10-12-character-polish/smell-follow-`; the named pair has `.log` and `.exit` suffixes.

| Pair | Recorded exit | Independently matched log SHA256 |
| --- | ---: | --- |
| `build` | 0 | `c8fd3e763c707c490a00ef19a17d6ec11564d9bffc5c9da4b5c647467c1fce65` |
| `capture-after` | 0 | `01dfc17d039231e775a397845db899169e952fd10ff97d1877be4809e12304a1` |
| `capture-before` | 0 | `940a98b1ee851594177e6fea55137e4bd3e8877ad7baad9586bec1a0a1c08736` |
| `diff-initial-wrapper` | 1 | `1579f878459677a48adfbcf7161659ea4d2c4a77d9aacf658915aa893209acdc` |
| `diff` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `differential` | 0 | `168d79b8aa47581a11ca5352d81ef4cc734c5cb0deb61501aff8973e1b4de43c` |
| `focused` | 0 | `5462a2ba18d4321ae436c37fb75ac10898313b68d5ca9c9364fe847d71cb0fbf` |
| `full` | 0 | `3d93f5c37ec0c5c49cc49ca3b7194d765c40ae11818a60aaf35bbedf548b66eb` |
| `lint` | 0 | `7568e933113f36eafac388fc93fe6b8a426352caab529479f6baf94d26446fff` |
| `native-grounding-red` | 1 | `77a8ffd0909eabcd10c9843c96703c50d7c5cfd71799e51d91a96674909c8870` |
| `native-red` | 1 | `4d1b18bd0a9b5c208613979c37dfbe6b30a4a7febe5714cfce4f9a4018d1cc6e` |
| `native` | 0 | `1cfcd76ae8d828dcc55055b4810b6a706baeafaa2976cb5d91c5e939fe18b479` |
| `red-grounding` | 1 | `fcda08c2b213bacba236c59cb56ac310c763fde86f6ac21da710460dc2b30b8e` |
| `red` | 1 | `3e26e7133bfc1d066cd9e0a9f8d78e5200979f220f2e1240e6a73a6ee6500286` |

All nine zero-exit files have SHA256 `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa`. All five one-exit files have SHA256 `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`. Their exact bytes are respectively `0\n` and `1\n`.

The recorded focused run reports 390 passing tests in eleven files. The recorded full run reports 2,295 passing tests in 114 files. The native log reports seventeen passing cases with zero failures, including four sniff cases, four concern cases, six environmental attention cases, and three rest cases. Direct test-source review covers the new sniff cases; the thirteen adjacent native cases were inspected as log evidence. The build log records `tsc -b` and a completed production build. It also contains Vite's large-chunk warning. The lint invocation uses `--max-warnings=0` and exits zero.

The historical unit logs substantiate six failures/one pass before stance checks, then nine failures/one pass with stance checks. The historical native logs substantiate three foot-drift failures/one reduced pass. The diagnostic baseline records drift of 1.640000, 2.000003, and 1.440010 local SVG units. The first native red run fails at the foot assertion before reaching the speed assertion; its earlier wording differs from the final test, as the input discloses. These are preserved historical failures, not failures of the frozen final run.

The initial whitespace wrapper log contains a Python exception for clean new-file `git diff --no-index --check` status 1. The final `diff` log is empty with exit zero. The source diff matches the frozen files; the corrected wrapper's source is not itself included, so its reported interpretation is supported by those logs rather than independently executed here.

## Evidence limits and declined scope

- No fresh runtime execution occurred in this review. The pass counts describe the bound completed logs. Static code reasoning, byte comparisons, stored-data calculations, and image inspection are independently verified here; the 43,200-frame sampler differential was not rerun.
- Native evidence is deterministic Chromium `152.0.7977.82`, with dressed happy residents at one desktop fixture and a visible reduced-motion Mochi case. Its stored sample window is 1,312ms, rather than every instant of the 1,600ms reaction. Unit checks and full-duration stored curves supplement that window. Sick/reduced preservation beyond that native fixture is established by branch inspection and the recorded differential.
- Sheets couple light colour with happy mood and dark colour with scruffy mood. They cover the stated 48 samples per stage, not every colour/mood/item combination. Curves measure the sampler's left appendage; native Sprout measures only its stem. No human temporal playback, physical-device, assistive-technology, CPU, or battery certification is implied.
- The manifests bind the supplied final files, logs, and artifacts. They do not attest the historical runtime or all transitive inputs. Historical red-stage test versions are not separately archived as source snapshots. The verification JSON was read as a non-authoritative mirror and matches the immutable review input plus its input reference; it supplies no additional independent result.
- The author's concurrency, Node-cap, niceness, available-RAM, and free-space statements have no resource telemetry among these fourteen pairs. I did not independently certify those operational claims.
- `src/screens/Wardrobe.rest.test.tsx`, `wardrobe-rest` evidence, `PROGRESS.md`, and other batches are outside the frozen Batch43 review. The unrelated next-batch red test running in the parent does not alter the meaning of the earlier bound full-suite log. I did not review its behavior or results.

No in-scope behavior was otherwise set aside. All frozen bindings remained unchanged at the closing read-only verification.
