Independent Batch47 review, 2026-10-12.

This review covers the frozen healthy upright notice appendage change against base `5839d16f06533818f679f5499be6dfc8ce916c13`. I used source, Git, file hashes, saved numeric data and all 12 saved PNGs. I ran no application code, builds, tests, captures, browsers, agents or message tools. Read-only Python calculations checked saved data and reconstructed the patch in memory. This report is the only file written.

Declined to judge:

- Live playback quality, human temporal acceptance, physical devices and assistive technology. The evidence is static imagery and paused SVG sampling.
- New resident notice motion. The frozen resident routes notice through sleeping/sick states, whose renderers already bypass articulated appendages.
- Peak resource use. The resource JSON is an availability snapshot and stated execution policy.
- Concurrent next-batch files `PetPlay.checkIn.test.tsx`, `PetCheckIn.test.tsx`, `pet-check-in.test.mjs` and `check-in-*`. They are outside the frozen review set.

**PASS for the bounded change. No actionable findings.** The patch implements the requested single half-sine deflection with strengths `.15/.20/.15`, preserves the existing 600 ms lifetime and other sampler behavior, and adds no clock. This verdict accepts the frozen source/static evidence within the limits above.

The immutable [review input](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/notice-follow-review-input.json) hashes to `069755d93fa5ed4a889598160d76b2c19b4134c747570fb12bb9ef4d03fb05a2`. HEAD equals the full base commit. All six changed-source hashes match: `motion.ts`, `motion.notice.test.ts`, `pet-notice-follow.test.mjs`, `ART.md`, `capture-notice-follow.mjs` and `compare-notice-follow.mjs`. All 18 unchanged-source hashes match, and each file is byte-identical to its Git blob at the base.

The frozen patch SHA256 is `d9e121eac78448e75684a090ab5bd07c90e34c041e5cca158e3868fab87fee27`. I parsed every hunk, checked base context and line counts, and reconstructed all six current files exactly without applying the patch to disk. The four added files are absent at the base. The manifest SHA256 is `9879ffee020b5a57bd003ae711e2784e509c4a08512d392470f1792ad71cb181`; all 23 listed artifact hashes match. All 14 raw logs and 14 exit files match their recorded hashes, and every exit-file value matches its recorded code. The verification JSON equals the frozen input plus its review-input reference.

All nested provenance checks match: eight source hashes and three PNG hashes in each before/prototype/after capture JSON, and the baseline/current/runner hashes in both differential JSONs. The archived baseline is byte-identical to base `motion.ts`; the archived prototype is byte-identical to production `motion.ts`. All three final static PNGs are byte-identical to their prototype counterparts, and their sample/curve arrays are identical too.

The production change is limited to the new species table at [motion.ts:81](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:81) and the healthy notice branch at [motion.ts:402](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:402). For normalized time `t`, the left appendage is `sin(pi*t) * envelope(t, .1, .42, .8, 1) * personality.follow * NOTICE_FOLLOW[species] * energy`. The existing right multiplier remains `.8`, or `-.75` for Sprout. The nonnegative envelope and half-sine produce one outward deflection and return, with no displacement sign crossing. The envelope smooths its onset and the return to neutral. The finite-action guard still returns exact neutral frames at both endpoints, and reduced motion still returns before this branch. Sick notice retains the original fallback formula.

`ACTION_MS.notice` remains 600. The primary notice switch, torso, arms, gaze, expression, blink, feet, shadow and all other actions are unchanged by the exact patch. Both saved differential stages report 43,200 combinations, 42,408 exact frames and 792 appendage-only differences, 264 per species. Their runner checks all remaining fields exactly, and checks whole-frame equality for other actions, sick and reduced motion. I inspected that runner and verified its hashes and logs; I did not execute it. The counts agree with its 3 species, 5 moods, 16 actions, 3 durations, 2 motion policies, 2 facings and 15 phases.

I independently recalculated every saved appendage angle in the 48 static frames and 2,103 curve points per stage. Maximum formula error is below `1.8e-15` degrees. Comparing the 48 before/final frame records shows changes only in `leftAppendage` and `rightAppendage`. The dense final curves have the following metrics; speed is the maximum finite difference at approximately 0.857 ms spacing.

| Species | Before peak, degrees | Final peak, degrees | Final sampled speed, degrees/s | Before/final displacement sign crossings |
| --- | ---: | ---: | ---: | ---: |
| Mochi | 4.999931 | 0.750000 | 6.162234 | 3 / 0 |
| Bun | 11.999741 | 2.400000 | 19.719150 | 3 / 0 |
| Sprout left appendage | 8.999926 | 1.350000 | 11.092022 | 3 / 0 |

I also recomputed the native JSON metrics from all 42 paused SVG samples per species, 126 total. Each species has exactly 21 times from 0 through 600 ms at 30 ms intervals for each facing. Every pose is `idle`; every facing marker is correct. Both mirrors have exact zero endpoint angles, zero displacement sign crossings and one sampled peak. The recomputed peak, speed and maximum foot-center drift equal the stored summaries exactly.

| Native measurement, both mirrors checked | Peak, degrees | Sampled speed, degrees/s | Maximum foot-center drift, SVG units |
| --- | ---: | ---: | ---: |
| Mochi knot | 0.750000000 | 5.814701319 | 0.000006135281 |
| Bun left ear | 2.400000095 | 18.607044220 | 0.000004641050 |
| Sprout stem | 0.539999962 | 4.186585049 | 0.000004460615 |

Local appendage angles agree exactly between mirrors. Foot coordinates reflect about `x=100` within `2.85e-14` units and retain their endpoint centers. Native angle values agree with the independent formula within `1.49e-7` degrees. These measurements meet the authored excursion, speed and `.0001` foot-drift limits. The 30 ms speeds are lower than the dense-curve speeds because they average over longer intervals. Sprout's native measurement is the stem's `.4 * leftAppendage` rotation, not the complete leaf motion. Native coverage measures one appendage transform per species and ellipse centers, not every rendered part or every animation frame.

I opened all 12 PNGs at original resolution: light/dark size sheets and curves for before, prototype and after, plus the three native MotionReview screenshots. Each stage's sheets show all species, both mirrors and four phases at 200/60/25 px with beanie, glasses, scarf, overalls and backpack. The smaller deflections preserve the sampled silhouettes and equipment placement; I found no new visible clipping, detached appendages or displaced feet. The curve plots show the original three sign crossings replaced by one small positive lobe. The native screenshots show the correct species, happy mood, left facing, notice, 600 ms duration and pause at 300 ms. The 25 px views support legibility inspection, not a claim that the subtle motion is perceptually detectable during playback. Light is paired with happy and dark with scruffy, so these sheets do not cover every color/mood/equipment combination.

The frozen history records that the root directly inspected six before/prototype PNGs and three native PNGs, then verified final static copies by bytes. This independent review opened the final copies as well as the originals.

The following are verified historical results from the raw logs and exit files, not fresh executions by this reviewer.

| Check or stage | Recorded outcome |
| --- | --- |
| Full unit suite | Exit 0; 2,322 tests, 118 files; 75.52 s |
| Focused suite | Exit 0; 233 tests, 8 files; 6.45 s |
| Native suite | Exit 0; 11 tests; 53.150875731 s, rounded 53.151 s |
| Production build | Exit 0; TypeScript/Vite/PWA output completes; nonfatal chunk-size warning |
| Lint | Exit 0 |
| Authored whitespace | Exit 0; empty diagnostic log |
| Capture before/prototype/after | Three exit-0 pairs; 144 size views and three curves per stage |
| Differential prototype/final | Two exit-0 pairs; 43,200 frames each |
| Unit red, initial and healthy-scoped | Two exit-1 pairs; 7 tests each, 6 failed and 1 passed; 185 ms each |
| Native red | Exit 1; 3 cases, all fail at three displacement sign crossings versus zero |

The unit reds fail three excursion checks at the same `.76/2.41/1.36` degree bounds present in the frozen final source, and three zero-sign-crossing checks. The one remaining reduced-motion case passes. The frozen history identifies an initial loop including sick, followed by healthy-only scope; angle criteria were not relaxed. The initial test file was not separately archived, so that exact historical mood-scope edit cannot be reconstructed independently from source. The preserved logs do establish the matching reported angle/sign criteria. Unit red speed checks follow the failing excursion assertions and are not demonstrated failures.

The native red failure is at [pet-notice-follow.test.mjs:61](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-notice-follow.test.mjs:61). Both facing traces were collected after successful per-sample pose/mirror/zero-RAF checks. The first facing's endpoint and foot-drift assertions precede the failure; the second facing's aggregate assertions were not reached. The later peak/speed assertions at lines 64 and 65, reduced-motion restoration and saved-table checks were also not reached in red. I do not count any of those later assertions as demonstrated red failures. The green native log records all three cases passing, plus three resting-clock, two prior MotionReview and three furnishing-turn regressions. Its clock assertions are supported by the frozen test sources, not by a RAF field in the saved JSON.

The renderer boundary is explicit in [animatedBody.tsx:97](/home/robert/.codex/worktrees/4511/chore-pet/src/character/species/animatedBody.tsx:97) and [AnimatedCharacter.tsx:15](/home/robert/.codex/worktrees/4511/chore-pet/src/character/AnimatedCharacter.tsx:15). Sleeping/sick poses use existing static body/appendage art, omit articulated body transforms, and receive only the existing restrained notice gaze. [activityMotion.ts:75](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts:75) selects resident notice for sick/sleep states. These files and the shared clock are unchanged at base. The production sampler remains pure, and the paused review requests no playback clock. Existing resident clock cases demonstrate finite response lifetimes; they establish no new appendage motion in the resident. The added ART paragraph states that boundary accurately.

The frozen whitespace history also records a wrapper parse error before any check ran, followed by the successful empty-log check. Retained older broad-whitespace diagnostics include raw log/patch formatting and are not represented here as new authored-source failures. Resource data records available memory/disk and a single-job/worker/browser policy with a 768 MB Node cap and nice 10; it does not certify peak RSS, CPU or battery use.

No critical, important or minor actionable issue was found in the frozen change. The scoped source/static review is complete; temporal or resident-path acceptance would require separate evidence outside this authorization.
