# Frozen B61 fish greeting independent review

PASS within the requested frozen scope. No unresolved actionable findings. One independent reviewer applied the requesting-code-review criteria to the source, tests and bound evidence. No additional reviewer was dispatched.

Review date: 2026-10-13. Workspace: `/home/robert/.codex/worktrees/4511/chore-pet`.

| Binding | Required and observed value | Result |
| --- | --- | --- |
| Review input SHA256 | `19a4be02bebc1a9328c4ff67f306ce5808c59a2d89df00e48aa5daaad439ae73` | Exact |
| Base commit and current HEAD | `31338a439c4d84ddc55874ff977c2c6297b4ba33` | Exact |
| SHA256 of base commit content from `git cat-file commit HEAD` | `f4a0adfc96c0bfbde379281d5486fb36be2a35a13b3c8bb4493653cf027f5487` | Recomputed |
| Frozen patch SHA256 | `6a654a5058e9ebb80bc8681140ecd9762a7057b902011c0f72e9663ce6c53225` | Exact, 40,189 bytes |
| Artifact manifest SHA256 | `44683b3c52eb3ba9ca6158e5bbf118caa099ad46cf6bded8d3337382664a5656` | Exact |
| Frozen authored sources | 9 of 9 SHA256 bindings | Exact |
| Unchanged dependencies | 42 of 42 current hashes also equal their base-commit contents | Exact |
| Manifest artifacts | 108 of 108 file hashes | Exact |
| Raw check pairs | 18 of 18 log hashes and exit-file hashes, with exit contents equal declared results | Exact |

I reconstructed the patch in its recorded file order from the base and current files, obtaining the exact frozen patch bytes. I also applied its tracked hunks in memory to base contents and compared every result with current contents; new-file hunks reproduce the three test files and design document exactly. The patch covers four production files, three test files, ART documentation and the design document. Unrelated `PROGRESS.md` edits are outside this freeze.

Only reads, Git inspection, small single-thread calculations and direct `view_image` inspections were used. No build, browser, test job, installation, network request, commit or message was run. This report is the sole permitted write. Recorded build/test results below describe the archived runs, not newly executed jobs.

The production change has a narrow owner. `LivingRoom.tsx:239-254` records the semantic draw timestamp in `Shown` only when the existing render conditions publish that snapshot. `LivingRoom.tsx:398-399` exposes the response only for an eligible resident's existing interact/action/wave. `Room.tsx:201-207` additionally requires the chosen visible object to be a clean fish tank. The optional props default safely for existing Room callers; ghost drawing does not receive the response class.

The late-frame correction preserves the absolute action deadline. The unchanged behavior code starts action at the orient deadline, with `ACTION_MS.turn = 360` and `ACTION_MS.wave = 1400`. A first action draw at 1000 therefore sets a -640ms CSS delay and still exits action at 1760. Ordinary ticks update the live ref without replacing the held `Shown` snapshot. Repeated valid invitations return the current interaction and preserve that delay, wrapper identity and deadline. The late regression explicitly checks this sequence. There is no new JavaScript frame loop, timer, listener or persistence call in the production diff.

`Room.css:23-37` uses the existing tail path's fill-box right midpoint as its pivot, one 1400ms CSS iteration, and neutral endpoints. The path's rightmost point is its root at (-4, 0); rotating about that point leaves attachment fixed. Yellow amplitude is opposite at 65%. CSS disables the effect under OS reduction, while the existing motion preference subscription and state validation clear the interaction for device or OS reduction. The unchanged `targetValid` signature includes placement, rotation and stage, so changed or removed targets cancel. Player reactions replace the interaction; sick/away gating removes the response immediately. Hidden elapsed activities advance through absolute deadlines on the first visible tick. No queued fish-specific reply exists.

The source and tests support these behaviors without moving fish bodies, water, glass, furniture placement or memoized placed art. The new art nodes wrap only the two existing tail paths. Dirty art keeps its existing fish positions and layers. No route, contact anchor, speech, sound, chore, health or save schema change appears in the patch. Native tests compare saved tables after the fixture has been established; fixture writes and deliberate device preference writes are distinct from greeting behavior. The diff adds no application save call.

| Bound run | Exit | Observed archived result |
| --- | --- | --- |
| fish-greeting-room-red | 1 | 5 failed, 1 passed; missing response class |
| fish-greeting-resident-red | 1 | 10 failed; missing response |
| fish-greeting-static-compare | 0 | 24/24 candidate pixel and PNG comparisons exact |
| fish-greeting-focused | 0 | 244 tests, 7 files, 6.62s |
| fish-greeting-build | 0 | Typecheck, Vite build and PWA generation |
| fish-greeting-native-initial | 1 | 8 passed, 7 failed; historical harness failures |
| fish-greeting-native-diagnosis | 1 | 2 selected cases failed with diagnostic evidence |
| fish-greeting-late-red | 1 | Unsupported `--minWorkers`; CLI rejected before tests ran |
| fish-greeting-late-red-v2 | 1 | Intended missing -640ms delay assertion failed; 10 skipped |
| fish-greeting-final-focused | 0 | 245 tests, 7 files, 6.75s |
| fish-greeting-final-build | 0 | Typecheck, Vite build and PWA generation |
| fish-greeting-native-final | 0 | 33 passed, 0 failed/cancelled/skipped, 63.172788592s |
| fish-greeting-final-full | 0 | 2,520 tests, 134 files, 92.86s |
| fish-greeting-final-static | 0 | 24/24 current production static comparisons exact |
| fish-greeting-final-lint | 0 | Quiet strict lint result |
| fish-greeting-final-diff | 0 | 11 authored paths pass whitespace/newline checks |
| fish-greeting-final-lint-v2 | 0 | Quiet single-thread lint with zero-warning limit |
| fish-greeting-lint-control | 0 | Expected warning probe exits 1; exact eight final code paths exit 0 |

All six failed historical checks remain bound. The CLI failure is not a test-red result. The corrected late-red-v2 source snapshot equals the final resident test source, and its failure is at the intended missing delay. The Room red snapshot also equals the final Room test source. The resident red snapshot preserves its original immediate zero-RAF assertion; the final test allows the existing 120ms sick/away transition to finish before asserting zero RAF, while still requiring immediate fish-response removal.

The initial native failure is adequately diagnosed. Sampling the terminal frame removes the effect from `document.getAnimations()`, so the initial fresh queries could not restore the subsequent peak. The diagnosis logs show an empty effect inventory while the semantic response class remains active. The final harness retains test-only animation handles, verifies repeated invitations before terminal sampling, restores the peak, and explicitly requires two actual native effects before capture. It sets local animation time to requested elapsed time plus the measured negative delay, so `localTime - delay` equals the requested phase. Its separate completion test waits on two running native `finished` promises without deterministic sampling, verifies neutral computed transforms and no remaining effects, then expires the separate fake resident clock. Initial native captures are retained history and were not used as final peak evidence.

The landscape diagnosis records a 189.948181px room inside a 424x232px canvas at 844x390. That existing camera scale does not satisfy the initial arbitrary 200px room-width assertion. The final assertion measures the canvas, retains its 90px minimum height and requires a positive room size. The final layout metadata matches the diagnosis; no production camera change was introduced to satisfy the test.

Quiet oxlint success is supported by the explicit known-warning control. The archived probe is exactly `const unusedFishProbe = 1`. Its recorded single-thread `--deny-warnings` invocation exits 1 with the expected unused-variable diagnostic, while the same CLI accepts all eight authored code/script paths with exit 0 and empty stdout/stderr. The control's outer successful exit is not substituted for the probe's expected failure. I independently scanned all 11 authored source/document/script paths for trailing whitespace and final newlines, finding none missing or invalid. Build logs retain the existing large-chunk warning; they do not claim warning-free bundling.

I directly viewed these 12 final native PNGs at original resolution, each with its bound JSON metadata:

- `fish-bun-0-detail.png`, `fish-bun-1-detail.png`, `fish-bun-room.png`.
- `fish-mochi-0-detail.png`, `fish-mochi-1-detail.png`, `fish-mochi-room.png`.
- `fish-sprout-0-detail.png`, `fish-sprout-1-detail.png`, `fish-sprout-room.png`.
- `fish-responsive-320x640.png`, `fish-responsive-390x664.png`, `fish-responsive-844x390.png`.

All are under `fish-greeting-native-final/`, report Chromium 152.0.7977.82, and bind a 210ms peak with two finite effects. The species/rotation peak metadata exactly matches the corresponding six-phase sample record. The red and smaller opposite yellow poses remain attached inside the translucent glass in both mirrored orientations. Stand, water, fish bodies and pet clothing show no obvious regression. The nearby resident partially occludes the tank as expected from depth ordering; it does not detach the fish or alter the tank layers. Room stills show the second tank and readable speech above the room. Phone stills keep the scene and speech visible with the fixed bottom navigation; the landscape still keeps the smaller scene beside the controls. These are peak still observations, not a temporal comfort judgment.

I directly viewed all 12 unique baseline PNGs below and verified the other 12 as byte-for-byte duplicates, in addition to checking their SHA256 hashes:

| Stage | Directly viewed rotations and widths | Verified duplicate counterparts |
| --- | --- | --- |
| clean | 0-390, 0-780, 1-390, 1-780 | 2-390, 2-780, 3-390, 3-780 respectively |
| messy1 | 0-390, 0-780, 1-390, 1-780 | 2-390, 2-780, 3-390, 3-780 respectively |
| messy2 | 0-390, 0-780, 1-390, 1-780 | 2-390, 2-780, 3-390, 3-780 respectively |

These are `fish-greeting-static-baseline/<stage>-<rotation>-<width>.png`. Clean water and fish, dirty tint/smudges, and the messy2 algae, hungry fish, food bubble and fly remain distinct and readable. Mirroring changes the tank orientation while preserving room art. No static art regression is supported by the comparisons.

I decoded all 24 baseline PNGs and independently recomputed their file and pixel hashes. Decoded PNG channels use straight alpha; rounding each RGB channel multiplied by alpha back to premultiplied RGBA reproduces the Resvg pixel-buffer hashes. Every actual PNG hash and reconstructed pixel hash equals its pre-edit, candidate and final-current row. The 24 row identities and dimensions agree across both comparison artifacts. The static-before fish hash equals the base fish source; the candidate hash equals both the archived candidate and current fish source. Both final source hashes equal the current frozen Room and fish sources. Both comparison scripts themselves are hash-bound manifest artifacts and were inspected. Their recorded outputs are therefore consistent with the exact frozen sources and the independently decoded baseline. No renderer was rerun during this review, and separate final-current PNG files are not present; the final-current comparison relies on its bound output hashes and recorded run.

Independent calculations over the six sample files cover 36 phase cases and 72 tails at 0, 210, 420, 840, 1232 and 1400ms, across three species and two rotations:

| Recomputed quantity | Result |
| --- | --- |
| Recorded attachment error minimum / maximum | 0 / 8.038873388460929e-14 CSS px |
| Ideal root displacement reconstructed from the pivot | 0 at every sampled angle |
| Red sampled angle minimum / maximum | -9.999987517730313 / 7.999994819856548 degrees |
| Yellow sampled angle minimum / maximum | -5.200003199874048 / 6.499986894643382 degrees |
| Largest residual from intended sampled keyframe angles | 1.3105356617693076e-5 degrees |
| Minimum recorded glass stroke clearance | 0.30257398444881956 art units |
| Independent exact -10 degree red-tail clearance | 0.3025739844488331 art units |
| Minimum clearance reconstructed from serialized sample angles | 0.3025741809520093 art units |
| Largest reconstructed/recorded clearance discrepancy | 8.7226508327376e-7 art units |
| Minimum tail-to-tank bounding-box margin in the 72 samples | 3.123931884765625 CSS px |

For clearance I independently transformed the path's root, line endpoints and quadratic control point using the source fish placement, scale and tail pivot. I minimized signed distance to each edge of the projected glass silhouette, including the quadratic's interior extrema and the scaled one-unit stroke radius. The limiting pose is the red tail near -10 degrees. Reconstructing from serialized CSS angles loses the native CTM's precision, explaining the sub-micro-unit clearance discrepancy; the exact keyframe calculation agrees with the recorded minimum to floating-point precision. No sample breaches the silhouette or tank bounding box. All animation rows have duration 1400, one iteration, the chosen tank target, and correct delay-adjusted phase. Endpoints are neutral.

Attachment maxima were recomputed from the recorded native residuals. The artifacts do not preserve complete raw screen CTMs, so those residuals cannot be independently regenerated as native matrix measurements without a browser. The ideal pivot calculation, direct still inspections and inspected native measurement code provide separate support for attachment. This distinction limits the strength of the geometry claim.

Responsive metadata has `scrollWidth == width` at all three sizes. The two phone rooms are 240.466324x198.538864 CSS px inside 288x282 and 358x282 canvases; the landscape room is 189.948181x156.829025 inside 424x232. Their peak attachment residuals remain at or below 5.684341886080802e-14 CSS px with positive reconstructed glass clearance.

Resource-sidecar recomputation agrees with 18 runs and 279 sampled rows, minimum observed available RAM 2585.01953125 MiB and minimum observed temporary free space 4001.77734375 MiB. No sidecar records a reserve stop or launch rejection, and every cleanup reports no remaining live owned members. Commands record capped Node heaps, single workers or test concurrency, single-thread lint and nice 10. Treating sidecar UTC as the completion stamp, consistent with the test start times and durations, gives non-overlapping sampled run intervals. Host snapshots do not establish peak process memory or CPU usage.

| Finding severity | Unresolved actionable findings |
| --- | --- |
| Critical | None |
| Important | None |
| Minor | None |

The implementation matches the bounded design, and the historical failures are retained and explained rather than promoted to passing results. No corrective change is requested for this freeze.

Behaviors considered and declined to certify: continuous all-phase geometry, because six deterministic phase samples and one peak per capture do not prove every instant; physical-device behavior and other browser engines, because the bound native run is desktop Chromium; assistive technology behavior, because keyboard/ARIA source and browser tests are not AT sessions; human temporal comfort, because stills and completion checks do not replace human motion assessment; CPU or battery performance, because frame-owner assertions and host resource snapshots do not measure either. These are explicit evidence limits, not waived product defects. No other in-scope behavior was set aside.

Assessment: PASS for the exact frozen B61 patch and evidence identified above. This is a scoped review verdict, not certification of the excluded behaviors or an approval of unrelated workspace edits.
