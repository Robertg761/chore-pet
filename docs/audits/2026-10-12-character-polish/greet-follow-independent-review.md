# Batch53 player greeting follow-through independent review

The greeting change meets its bounded motion requirements. One important finding remains in the supporting resource supervisor, so the combined review requires a fix before acceptance. No critical or minor findings. No product-motion defect found.

This was one independent static/source/recorded-evidence/still review using the requesting-code-review criteria: plan alignment, correctness, maintainability, integration, meaningful regression evidence and readiness. I ran only read-only source, hash and arithmetic inspection. I did not run tests, builds, captures, comparison runners or a browser, spawn agents, send messages, or change frozen evidence. This report is the only authored file.

| Input identity | Independently verified value |
| --- | --- |
| Frozen input | `docs/audits/2026-10-12-character-polish/greet-follow-review-input.json` |
| Input SHA256 | `de59ff1573495ca1e9e7a98311f176202dff16577b9534388e43a2682840f6e3` |
| Base and current HEAD | `d4e6f2098939d86945dbc424d615bf829315df35` |
| Source patch SHA256 | `5e22c78d22a6f581da3ca890e1f89ff6238ffbcef2841b0bf1fa1c9c73f1f4e3` |
| Artifact manifest SHA256 | `2e66698b1bfc38c2999c1b5032a8feb13bf707f7767e2ee9287d5b52aa09c2a3` |
| Scope bindings | All 7 authored source hashes, all 36 unchanged source hashes, all 72 artifact hashes and all 20 log/exit bindings match |

All 36 unchanged sources also match their base Git bytes. Reconstructing the seven patch entries in memory from the base produces the exact frozen authored files, including five new files. The archived `43a88eb` sampler is byte-identical to the base/current HEAD sampler. The archived prototype equals the current sampler, SHA256 `155194546e3c9e68df5f7e4ccb129e27627998361aa503d9c7035439a2015e3b`. The verification record equals the review input apart from its additional matching input-identity reference.

The implementation is small and fits the existing pure sampler. [motion.ts:401](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:401) retains the delayed `envelope(t, .1, .42, .8, 1)` and adds healthy `greet` to the existing calm-sway branch. The phase is `2πt - personality.lag + .5`, with species gains Mochi `.55`, Bun `.6`, Sprout `.5`. The species follow amplitude, mood energy and right-appendage relationship remain intact. The reduced-motion return precedes this branch; sick greetings retain the old branch. Existing finite start/end guards still return neutral frames. The greeting stays at 1200ms, with unchanged hand arcs/cycles, lean, gaze, expression, torso, feet and shadow calculations. There is no new clock, renderer state, persistence operation or schema change.

Both recorded sampler differentials bind to the verified baseline, prototype/current sampler and comparison-runner hashes. Each grid contains `3 × 5 × 16 × 3 × 2 × 2 × 15 = 43,200` frames. Each reports 42,408 exact frames and 792 healthy normal-motion greeting frames with appendage-only differences, 264 per species. Every other primary field, every other action, sick output, reduced output and action-duration table remains exact at those sampled inputs. These are two recorded comparisons, 86,400 total frame evaluations, not comparisons rerun during this review. The source branch isolation supports the reported preservation beyond the sampled grid.

The new unit cases measure excursion, visibility, speed, endpoint settling and primary geometry across four healthy moods. They check one sign change at 600/1200/2400/4200ms durations and still reduced appendages across all five moods. The browser fixture uses actual keyboard Enter on Wave, samples delivered SVG transforms and RAF timestamps, measures actual foot contacts, and checks resident identity, announcement stability and saved tables. [LivingRoom.tsx:114](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:114), `activityMotion.ts`, `behaviour.ts` and `usePetMotion.ts` retain the existing resident owner, finite deadline, 120ms join and one pending RAF policy. The healthy resident continues its ordinary idle clock after greeting. The corrected fixture expects 1, checks neutral arms, delivers native reduced motion and then expects 0. No product source changed to accommodate the correction.

The important finding concerns [greet-follow-resource-runner.py.txt:67](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/greet-follow-resource-runner.py.txt:67), through line 76. **P2: cleanup can finish while a descendant in the owned process group remains alive.** Cleanup runs only while the direct child is alive, sends SIGTERM to the group, and then uses `child.wait(timeout=3)` to decide whether SIGKILL is needed. That wait observes only the group leader. If the leader exits promptly while a worker ignores SIGTERM or remains alive longer, the wait succeeds and group escalation never runs. Cleanup also skips the group if the leader has already exited. The supervisor can therefore write a completed signal/cleanup record while an owned worker survives. This matters for the npm/Vitest worker tree that motivated the interruption repair. It is a static control-flow finding; no escape was observed in the recorded successful suite or sleeper probe.

Track the launched group's live members independently of the leader during bounded cleanup, retain the same owned PGID, escalate that group if members remain after the deadline, and reap the direct child separately. Extend the disposable probe to include a descendant that survives the leader and ignores SIGTERM. The current single-sleeper probe establishes the simple case only. Any repair and new evidence should be a separate revision; this review leaves the frozen files intact.

The retained command history is internally bound and distinguishes intended failures from successful completion. Every row below has a matching log digest, exit-file digest and exit-file value.

| Recorded check | Exit | Observed result |
| --- | ---: | --- |
| red | 1 | 7 unit cases: 6 failed, 1 reduced-motion case passed |
| capture-before | 0 | 144 size views and 3 curves |
| native-red | 1 | 3 species failed the new excursion limit |
| prototype-unit | 0 | 7 cases passed, 1 file, 581ms |
| capture-prototype | 0 | 144 size views and 3 curves |
| prototype-compare | 0 | 43,200 frames, 42,408 exact, 792 appendage-only |
| prototype-build | 0 | Isolated candidate Vite bundle; no TypeScript check in this command |
| prototype-native | 1 | 3 failures at the incorrect post-greeting idle expectation, actual 1 versus expected 0 |
| prototype-native-revised | 0 | 3 passed; 0 failed/cancelled/skipped/todo; 6079.747731ms |
| focused | 0 | 335 tests in 15 files passed, 8.02s, `--maxWorkers=1` |
| build | 0 | Production `tsc -b && vite build`; existing chunk-size advisory retained |
| native | 0 | 32 passed; 0 failed/cancelled/skipped/todo; 89042.814619ms, concurrency 1 |
| full-interrupted | 143 | Incomplete log and tool-observed exit; no completed suite result or resource sidecar |
| full | 0 | 2395 tests in 125 files passed, 82.95s, `--maxWorkers=1` |
| capture-after | 0 | 144 size views and 3 curves |
| compare | 0 | 43,200 frames, 42,408 exact, 792 appendage-only |
| supervisor-stop-probe | 143 | Intentional nested SIGTERM cleanup of disposable sleeper; sidecars retained |
| supervisor-probe | 0 | Outer driver verified nested exit 143 and sleeper no longer running |
| lint | 0 | Scoped sampler/unit lint, `--max-warnings=0` |
| diff | 0 | Recorded whitespace checks for all 7 authored sources |

The baseline unit failures are substantive: approximately 5/12/9-degree excursions exceed the new 2.75/7.2/4.5-degree budgets, and the old profile changes sign three times. Native baseline peaks likewise exceed the new limits. The initial prototype then passes the assertions before the idle-clock check, including appendage limits, primary movement, identity, speech and saved tables, and fails only at the erroneous zero expectation. Assertions after that failure were not reached in that run. Archived initial and final fixtures differ only in the idle expectation and added native reduction checks/import. The archived red unit fixture equals the final unit fixture. The revised run and final native run pass the corrected checks. The virtual prototype bundle was not typechecked by its Vite-only build; the later production build ran `tsc -b` successfully.

I directly opened all six static PNGs: before/prototype light size sheets, dark size sheets and appendage curves. Each stage records 48 dressed species/facing/phase/colour-mood combinations, 144 views at 200/60/25px and three 701-point curves. The four sheet phases are 24/42/60/76%, in both facings. Light uses happy species colours; dark uses scruffy posture with ink body colour on the same cream background. The prototype visibly reduces ear/leaf/knot deflections while preserving readable waving poses, faces and clothing. I found no new clipping or lost silhouette in these selected views. The curve image shows one smaller positive/negative sway rather than the former repeated oscillations.

The root static-comparison record and the capture JSON source/image bindings verify. Its three final PNGs are byte-exact copies of the inspected prototype PNGs:

| Final/prototype static pair | Shared SHA256 |
| --- | --- |
| light-sizes | `fe789d410b2132844fb2977ad6edc040f7a7b763303c38f80ab3fb02797ce499` |
| dark-sizes | `0aa881508dccedbcbd88585a8281633d538ae9e0dccb9dd44ace4dc5ceb275e0` |
| curves | `aae55b92699a625fa0b991adf00bcc9da3c0bc00cb15c269f02fdc5a492cacc2` |

I also directly opened all twelve native greeting PNGs, Mochi/Bun/Sprout in `greet-follow-native-before`, `greet-follow-prototype-native`, `greet-follow-prototype-native-revised` and `greet-follow-native`. Each shows the dressed resident in the room during the keyboard Wave response, near the fixture's 480ms label, with the same room arrangement, focused Wave control and greeting bubble. The room-sized stills support visible pose/integration inspection; the transform records provide the small-angle measurements.

I recomputed the following from all twelve native JSON sample arrays. Values below are rounded; the root comparison arithmetic agrees within floating-point rounding of 1e-12. Its `prototype` references correctly bind to the revised prototype JSONs. All referenced native JSON hashes match.

| Run | Species | Peak, degrees | Maximum sampled speed, degrees/s | Maximum foot drift, SVG units | Waving arm minimum, degrees |
| --- | --- | ---: | ---: | ---: | ---: |
| before | Mochi | 4.999686 | 52.296177 | 4.388507e-6 | -42.590480 |
| initial prototype | Mochi | 2.749736 | 18.742025 | 5.866932e-6 | -42.603608 |
| revised prototype | Mochi | 2.749186 | 18.704884 | 4.987087e-6 | -42.623819 |
| final | Mochi | 2.749736 | 18.742025 | 5.866932e-6 | -42.603608 |
| before | Bun | 11.983182 | 125.174244 | 5.325776e-6 | -53.989474 |
| initial prototype | Bun | 7.170159 | 49.535513 | 4.844174e-6 | -54.000000 |
| revised prototype | Bun | 7.170159 | 49.535513 | 4.844174e-6 | -54.000000 |
| final | Bun | 7.170159 | 49.535513 | 4.844174e-6 | -54.000000 |
| before | Sprout | 3.596909 | 37.581769 | 5.449530e-6 | -30.232106 |
| initial prototype | Sprout | 1.742235 | 12.181342 | 5.289119e-6 | -30.234948 |
| revised prototype | Sprout | 1.741762 | 12.208030 | 5.194176e-6 | -30.239684 |
| final | Sprout | 1.741680 | 12.168746 | 5.449530e-6 | -30.232106 |

Every species/run has exactly 61 samples, 732 total, with recorded RAF timestamps 160 through 1120ms and 60 intervals of 16ms. Every sample reports one pending RAF. Every recorded world transform is exactly `translate(162 229.32) scale(0.33)`. The lean ranges are exactly Mochi `[-2.46, 0]`, Bun `[-3, 0]`, Sprout `[-2.16, 0]`; low-arm ranges are `[0, 4.1]`, `[0, 5]`, `[0, 3.5999999999999996]`, respectively, in every run. Maximum measured foot drift stays below 0.00001 SVG unit. Appendage sign changes drop from three in each baseline sample series to one in every candidate/final series. Sprout's native measurement is the actual stem rotation, 0.4 times the sampler's left appendage value, not the complete leaf transform.

Actual keyboard request timing varies with page load. Matching sample labels/RAF timestamps and equal primary ranges do not establish exact paired-frame primary equality. The small waving-arm minima differences are compatible with that timing variation. Exact sampled primary-field preservation comes from the separate sampler differentials, not from native phase pairing.

The original full execution session 24190 is incomplete. Its observation records tool exit 143 without wrapper-written final sidecars. The cause of supervisor termination remains unknown. The observation's SHA256 `929cc863607ae0010e3de7884e3a3e12466e2d043131bf691404467235599602` matches the first 875 bytes of the retained 8920-byte interrupted log. The final frozen input separately binds the complete log at `82c562c76e16d04730f6902764bd421c6fca06f1fa7e6e23c1b0b5f780a6b695`. Thus the earlier observation is a partial-log snapshot, not a matching digest of the later complete retained partial run. No suite outcome or memory/tmp minimum is inferred from this run.

The interruption history records checkout/command/process-group verification before SIGTERM to owned group 4168298, with members 4168298, 4168337 and 4170745 at cleanup, followed by confirmation that the previously observed processes exited. This is recorded historical evidence, not a fresh process inspection. The later wrapper adds SIGTERM/SIGINT handling, starts a separate child session, directs signals only to that child's group and preserves final sidecars on the demonstrated signal path. The disposable probe confirms nested 143, outer 0 and cleanup of its single sleeper. The descendant-cleanup finding above limits the broader guarantee.

All 19 resource-record digests and summary arithmetic verify, covering 271 snapshot rows including the nested probe. The recorded totals are zero reserve stops, zero launch rejections, one intentional signal probe and one unobserved interrupted run. Minimum observed host available memory is 3079.08984375 MiB, from the completed full run; minimum observed `/tmp` free space across recorded runs is 4007.99609375 MiB, from native. The full run has 86 snapshots, a 4096 MiB launch minimum, a 2048 MiB reserve, recorded `NODE_OPTIONS=--max-old-space-size=512`, minimum `/tmp` free space 4079.59375 MiB and exit 0. Its command allows one concurrent Vitest worker; the log's 125 isolated workers are per-file sequential instances. Other recorded commands use low-priority execution, and native uses `--test-concurrency=1`. Older resource records do not record `nodeOptions`; their absence establishes no heap-setting claim.

These roughly once-per-second host snapshots are not peak or continuous resource-safety certification, per-process RSS/CPU measurements, or proof that a supplied heap option enforces a whole-job memory bound. They provide no minima for the interrupted run. The sleeper probe does not exercise reserve-stop, SIGINT, stubborn descendant or repeated-signal paths. Stills and numeric samples do not establish human temporal comfort, every transition/phase, arbitrary outfits, browsers or devices. Recorded native evidence is Chromium 152.0.7977.82. These limits do not undermine the supported greeting measurements.

I declined to judge current wardrobe-rename design/tests because they belong to the disjoint next batch, were added after the recorded full suite and are explicitly excluded. The 2395-test result applies to the recorded Batch53 suite, not those new tests. I also declined to certify human playback comfort, unrecorded browser/device/outfit coverage and continuous resource safety because this review is bounded to source, records, arithmetic and stills. I did not infer a termination cause from exit 143 or reclassify it as a resource stop.

Ready to accept: with fixes. The greeting implementation and its frozen evidence are supported. Correct the supervisor's descendant cleanup and retain a corresponding disposable-tree probe before accepting the supporting cleanup guarantee. No frozen source or evidence was edited during this review.

CHANGES REQUESTED
