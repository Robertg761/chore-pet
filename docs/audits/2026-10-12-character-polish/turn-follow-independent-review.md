# Batch46 independent turn follow review

PASS. No critical, important, or minor findings in the frozen Batch46 scope. The healthy turn appendage change matches the requested small, single deflection and preserves the primary orientation. The scoped patch is ready to proceed on the evidence reviewed below.

This review used source inspection, read-only Git inspection, hash verification, arithmetic on archived numeric data, and direct inspection of all 15 PNGs. I ran no builds, tests, capture scripts, browsers, agents, or message tools. The only file written by this review is this report.

## Verified bindings and scope

| Binding | Verified value |
| --- | --- |
| Immutable review input SHA256 | `66172a74b75b970b7a00f854ed0893b64236515b4d814c5b7689e35db8c7b4a1` |
| Base and current HEAD | `6a130a31e21a50dc080a079a3bf7ee1d4c401740` |
| Source diff SHA256 | `7acd0dffd98056c35d454263d4efc0e5a81765a710e1d290fbf4ad513cbd6de3` |
| Artifact manifest SHA256 | `2e763274cc15c74b5a025320379e202be7ed491c3f6ddbfefb3797f031468f78` |
| Archived before sampler SHA256 | `6bbf647a8391e103951474c70438138dd3599cc28f56aeacbaa2ea1dc686284f` |
| Prototype and production sampler SHA256 | `2242e3fdb9dacb58ecaf779183916ecbba2124862f6f5083d9e3ac8a5bb95d10` |

All six source hashes match the input: `src/character/motion.ts`, `src/character/motion.turn.test.ts`, `scripts/browser/pet-turn-follow.test.mjs`, `docs/ART.md`, and the audit's `capture-turn-follow.mjs` and `compare-turn-follow.mjs`. I reconstructed each unified-diff target in memory against the exact base, including the four new files. All six reconstructed targets match the frozen files byte for byte.

All seventeen unchanged-source hashes match, and every one of those files is byte-identical to its version at the base commit. This includes the renderer, palette, room geometry, activity composition, controller, interactions, preview consumers, and four neighboring native test files. The before sampler archived from `5092be0` is byte-identical to both that revision and the exact `6a130a3` base. Production is byte-identical to the archived prototype.

All 29 manifest artifacts match their hashes, including 15 PNGs. All fourteen raw log/exit pairs match both their hashes and declared exit values. The twelve completed green checks have exit 0; the two intentional red checks have exit 1. I also verified every nested source and PNG hash in the before, prototype, and after capture JSONs, and the baseline/current/runner hashes in both differential JSONs. Each capture has 48 dressed species/mirror/phase/mood samples, 144 size views, and three curves with 701 points each. All prototype/after frame samples and curves are equal. Each of the three final static PNGs is byte-identical to its prototype counterpart.

## Source and behavior assessment

The production change is confined to the species strength table at `src/character/motion.ts:81` and the healthy-turn branch at line 400. It multiplies `sin(pi * t)` by the existing settling envelope, species follow amplitude, strength, and mood energy. The strengths are 0.10, 0.12, and 0.10 for Mochi, Bun, and Sprout. The positive half-sine and envelope give one deflection without a displacement sign crossing. The envelope rises before the half-sine maximum and falls afterward, so there is one maximum followed by a return to neutral. The clamped smoothstep envelope also retains zero endpoint velocity.

The reduced-motion early return, finite-action endpoint guards, sick fallback, `ACTION_MS.turn = 360`, torso compression, lean, gaze, arms, ground fields, shadow, expression, blink, and accents are unchanged. Other actions retain their existing branch expressions. The before/after sheet data independently confirms equality of every non-appendage field in all 48 paired frames.

Walking corner composition at `src/pet/activityMotion.ts:101` copies only turn scale, lean, and horizontal gaze. It does not copy turn appendages. Those consumed fields are unchanged, so the corner overlay and walking appendages retain their previous values. The unchanged behavior code still sequences a 360 ms orientation into the target's finite action and then settlement. The new unit cases cover both appendages, excursion, speed, visibility, grounded primary fields, endpoints, 180/360/720 ms sign preservation, and reduced sampling across all five moods. The native runner measures actual SVG transforms and foot centers rather than substituting sampler values.

Both archived differential runs report 43,200 comparisons, with 42,408 exact frames and 792 healthy-turn appendage-only differences, 264 per species. The inspected runner restricts differences to normal healthy turn appendages and compares every remaining field exactly. It also compares all action durations. Its matrix covers three species, five moods, sixteen actions, three durations, two motion policies, two facings, and fifteen phases. I inspected this evidence without rerunning it.

## Independent numeric and image inspection

Recomputed full-duration happy left-appendage values from the saved 701-point curves:

| Species | Before absolute peak, degrees | Final peak, degrees | Before sampled max speed, degrees/s | Final sampled max speed, degrees/s |
| --- | ---: | ---: | ---: | ---: |
| Mochi | 4.999931 | 0.500000 | 174.528180 | 6.846927 |
| Bun | 11.999741 | 1.440000 | 418.864345 | 19.719150 |
| Sprout sampler | 8.999926 | 0.900000 | 314.152476 | 12.324469 |

The final peaks occur at 180 ms. Every full curve starts and ends at zero, increases to one maximum, then decreases to zero. The before curves have three displacement sign crossings; the final curves have none. The right appendage uses the unchanged 0.8 multiplier for Mochi/Bun and -0.75 for Sprout, so its excursion and speed are smaller. I independently evaluated the inspected equations against the saved curve and sheet values; the largest residual was below `2e-15` degrees. These speeds are finite differences over the archived grid, not continuous derivative measurements.

I inspected all thirteen final SVG/RAF samples for each species, and the three initial traces. Initial and final timestamps, angles, lean, arms, RAF counts, and common top-level values are identical. Final artifacts add per-sample position/feet and maximum foot drift. Recomputed final values agree with their stored metrics:

| Actual native part | Sampled peak, degrees | Sampled max speed, degrees/s | Maximum foot drift, local SVG units |
| --- | ---: | ---: | ---: |
| Mochi knot | 0.499695420 | 6.588425487 | 0.000005789 |
| Bun left ear | 1.439122796 | 18.974678591 | 0.000008322 |
| Sprout stem | 0.359780699 | 4.743666388 | 0.000004043 |

All final traces have thirteen samples at strictly increasing RAF timestamps 992 through 1184 ms, spaced by 16 ms. They retain one pending RAF, zero arm rotations, no appendage displacement sign crossing, and the same world transform, `translate(204.5 208.07) scale(0.33)`. Earlier samples retain the original torso lean of -4.92/-6/-4.32 degrees. Both actual foot centers remain within the drift values above.

The runner samples 128 through 320 ms after detecting arrival, with at most 16 ms polling overshoot. This excludes the 120 ms outgoing walk blend and remains before the 360 ms orientation deadline. As a consistency check, fitting the inspected equation to the recorded angles places these captures at action-relative 144 through 336 ms, within that bound. This phase alignment is inferred, since the trace records RAF time rather than the action start. Sprout's native selector measures the stem rotation, exactly 0.4 times the left sampler appendage; it does not measure the complete leaf transform.

Directly viewed all nine static PNGs: before, prototype, and after light-size sheets, dark-size sheets, and curves. The sheets cover both mirrors, four phases, dressed 200/60/25 px art, light/happy and dark/scruffy variants. The smaller appendage change preserves the primary torso pose, feet, outfit placement, readable eyes, and silhouette in these captures. The curve images agree with the numeric reduction. I also directly viewed all three initial and all three final native PNGs. They show the invited rug scene, dressed resident, observation text, and grounded placement without a visible regression. These native stills are near the orientation's end, where the trace's torso lean is already zero and appendage displacement is small. They are not evidence of the primary peak; earlier trace samples and the static phase sheets supply that evidence.

## Archived checks and limits

The bound final logs report 2,315 full tests across 117 files in 74.47 s, and 297 focused tests across eight files in 13.30 s. The build log completes the production type/build command; lint uses a zero-warning limit; the authored whitespace log is empty with exit 0. The build retains a chunk-size advisory, which does not indicate a turn-follow defect.

The initial native log has twenty passing cases in 31.127 s. The strengthened final log repeats the three turn cases successfully in 4.489 s. Their union is twenty distinct cases, not twenty-three. The other seventeen cases comprise four concern, six eye-targeting, three rest, and four smell cases. Their source files remain frozen, and their initial results remain applicable under the supplied chronology that only turn trace recording changed afterward. The red logs show six unit failures and one reduced pass, plus three native excursion failures. Native red speed values are diagnostics emitted before the failing excursion assertion; they do not prove that the later speed assertion ran.

The historical initial/red runner versions are not separately archived. I can verify the final runner, raw results, unchanged neighboring files, and exact common initial/final trace data, but cannot independently byte-prove every intermediate runner edit or assertion-history claim. Hashes bind the supplied files; they do not independently attest to their execution history or every transitive capture dependency.

Native coverage uses deterministic frozen-clock Chromium 152 and thirteen samples per species. It does not cover every rendered frame, the excluded initial walk blend, every interruption, or complete leaf motion. Full sampler curves and archived unit checks supplement that window, but do not replace human temporal review. Static light and happy, and dark and scruffy, are coupled; the sheets do not cover every color, mood, or equipment combination. The resource JSON is a bound host-memory/tmp snapshot, not peak RSS, CPU, battery, physical-device, or assistive-technology certification.

Declined to judge: concurrent `motion.notice.test.ts`, `pet-notice-follow.test.mjs`, and `notice-follow-*` work, explicitly excluded by the review request. Human playback quality, physical-device/accessibility behavior, resource performance, and combinations outside the supplied captures remain unassessed because this was a bounded static/file/image review. None of these limits changes the scoped PASS verdict.
