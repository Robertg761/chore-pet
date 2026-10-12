# Character animation review

Mochi, Bun, and Sprout now share deterministic motion and articulated SVG rendering in rooms, between rooms, and in the art review panel. Each species keeps its existing silhouette, colors, moods, face choices, and wardrobe. Environmental gestures use actual object footprints and rotation. Surface contact remains disabled because furniture has no verified paw anchors.

Integrated automated verification passed at the pre-wave snapshot `96b185d`. Whole-branch review requested a walk-arrival blink fix and recorded four minor observations. The combined fix wave addresses I1, M1, M3, and M4; root formally deferred M2's synthetic suppression-layer churn because no normal-use failure is demonstrated and arbitrary truncation risks contact continuity. Root's fresh final regression, capture regeneration, and one scoped re-review remain pending. Human playback acceptance remains open.

## Integrated checks

All results in this table predate the combined fix wave. They are historical evidence, not fresh verification of the amended source.

| Check | Result |
| --- | --- |
| Full unit suite | 1,848 tests in 82 files PASS |
| Lint | PASS |
| Typecheck and production/PWA build | PASS, with a main-chunk size advisory |
| Isolated production browser suite | 45 tests PASS on Chromium 152.0.7977.82 |
| Multiroom travel and retargeting | 16 checks PASS |
| Raster bounds | 42,660 renders, zero outside pixels |

Actual commands, exit statuses, relative log paths, evidence status, and remaining limits are in [verification.json](verification.json). The six named raw logs exist locally but remain ignored; root will force-add them after final verification. The first full run hit one 5,233ms raster-test timeout under concurrent capture/build work. Disabling unused system-font scans preserved all 60 bounds cases and assertions. Independent review approved that test-only change; the isolated full-suite replay above passed. No production motion or timeout setting changed for it.

The combined fix wave passed 247 covering tests in five files, both TypeScript configurations, and scoped lint. Its [fix report](../../../.superpowers/sdd/2026-10-11-character-animation/final-fix-report.md) records red/green evidence, self-review, geometry retention, and remaining limits. These focused results do not replace root's final integrated regression or the open human playback gate.

## Evidence collected

The baseline passed 1,564 tests in 75 files. The renderer and behavior received independent task reviews and focused regression fixes. The final character snapshot passed 73 character tests, typecheck, build, and scoped lint. Its capture source is recorded in the manifest.

The final character bounds scan passed with zero painted pixels above alpha 5/255 outside the 200-unit art box across 42,660 renders. It includes 25,740 action/wardrobe samples and 16,920 projected walking samples. The latter cover four cardinal directions, two corners, all species and moods, normal and faster travel cadence, and both outline scales. Happy and scruffy walking are sampled at 101 route phases; the other moods use 11. These checks establish bounds for the sampled matrix, not every possible configuration.

The capture tool generates 42 sheets containing 1,407 poses. They cover all 15 motion actions, all species and moods, six body colors, all 16 individual wardrobe items and a combined outfit, 60px and 25px art, sick/sleeping notice, and eight environmental families in both object rotations. Enlarged sheets use native 200px art. The 25px samples use the heavier production room outline. Nineteen representative PNG sheets and ten MP4 clips are saved alongside this record. The full matrix is reproducible; not all 42 sheets are committed. Source hashes and matrix counts are in [manifest.json](manifest.json), and video dimensions, frames, and durations are in [clips.json](clips.json).

These captures predate the fix wave. The sampler hash changes, so root must regenerate the 42 sheets and ten videos and update source provenance before treating them as current. The 42,660-render bounds scan remains historical evidence. The fix moves only the walking endpoint guard after lifetime eye sampling; torso, limb, ground-contact, facing, shadow, and wardrobe geometry remain unchanged. Focused checks cover the newly closed walking endpoints at both outline scales. The fix report records that evidence and the reason a second broad bounds scan is unnecessary for this change.

## Captures

| Sequence | Normal | Quarter speed |
| --- | --- | --- |
| Player reactions, all species with combined wardrobe | [Play](player-normal.mp4) | [Play](player-slow.mp4) |
| Environmental gesture families | [Play](environment-normal.mp4) | [Play](environment-slow.mp4) |
| Local gait with projected floor grid | [Play](walk-normal.mp4) | [Play](walk-slow.mp4) |
| Faster inter-room gait | [Play](travel-normal.mp4) | [Play](travel-slow.mp4) |
| Production rooms, approach/orient/action/settle | [Play](rooms-normal.mp4) | [Play](rooms-slow.mp4) |

| Species | Actions | Colors | Combined wardrobe | Small art | Actual rooms |
| --- | --- | --- | --- | --- | --- |
| Mochi | [Sheet](mochi-happy.png) | [Sheet](mochi-colors.png) | [Sheet](mochi-wardrobe-3.png) | [Sheet](mochi-small-1.png) | [Sheet](mochi-rooms.png) |
| Bun | [Sheet](bun-happy.png) | [Sheet](bun-colors.png) | [Sheet](bun-wardrobe-3.png) | [Sheet](bun-small-1.png) | [Sheet](bun-rooms.png) |
| Sprout | [Sheet](sprout-happy.png) | [Sheet](sprout-colors.png) | [Sheet](sprout-wardrobe-3.png) | [Sheet](sprout-small-1.png) | [Sheet](sprout-rooms.png) |

Fresh [phone home](phone-home.png) and [desktop home](desktop-home.png) captures show the pet at actual Fit home scale. The final App retarget probe measured zero world-position jump and approximately 4.02e-14 scene-unit torso joins across both reversals; [recorded geometry](app-retarget-joins.json) excludes page-layout movement.

## Defects found and corrected

| Finding | Correction and evidence |
| --- | --- |
| Walk arrival forced a closed lifetime blink open | Sample lifetime eye openness before returning neutral walk geometry. Regressions cover all-species sampler endpoints, actual local arrival blends, both rendered eye transforms, shared travel arrival, and 24 focused endpoint rasters. Finite gesture taper and neutral endpoints remain intact. Root's scoped re-review is pending. |
| Duplicate interaction validation and reserved-ID clean dialogue | Keep the pre-relocation target check and remove its duplicate. Dialogue now uses the target selector's own-property/default-clean stage lookup. Empty ordinary records and explicit owned stages are covered for `constructor`, `toString`, and `__proto__`. |
| Planted feet moved with world translation | Path-derived stance contacts cancel container travel, body sway, and facing. Regression checks measure rendered world contacts in both projected axes. |
| Uphill stance feet exceeded the art box | Quarter-stride landing/stance timing keeps contacts centered without fading their correction or shifting the sole baseline. Independent re-review approved it; the broad path bounds scan passed. |
| Dark body colors hid closed eyes and mouths | Shared cream face backings preserve ink contrast on low-contrast body fills, including static art. Body colors themselves remain unchanged. |
| Chef hat, Mochi landing paws, and Bun ear exceeded bounds | Narrow geometry refinements. The action/wardrobe bounds scan passed after correction. |
| Sick notice discarded its tiny eye stir | Only notice passes the gaze gate; sick face, bed, mouth, props, and hidden-slot rules remain. Reduced motion stays still. |
| Suppression skipped route validation; corners flipped abruptly; queued taps survived celebration | Validate before cancellation, blend the reflected outgoing pose, and discard stale queued input. Independently approved focused regressions. |
| Cancellation retained rejected foot positions | Validate captured route time and contact path, including retained turn layers and release references. Independently approved in scoped re-review. |
| Redirected travel remounted the character | Keep a stable home key and redirect the existing journey before paint. Production App checks preserve SVG/character identity and world position. |
| Reversal omitted static mood lean | Reflect the complete rendered torso angle using the existing pose anchor. Species/mood regressions check the actual SVG geometry. Local and travel geometry checks passed; local scoped review approved. |
| Browser probes sampled different clocks or before completion committed | Compare rendered pixel joins, observe actual completion announcements, and wait for native media-query change delivery. Product timing was not altered to satisfy the probes. |

## Review method and limits

Root inspected production SVG sheets, the final local/travel gait filmstrips, a final eight-room action frame and a plant approach/action/settle filmstrip for silhouette, face readability, wardrobe attachment, shadow placement, and room occlusion. Independent reviewers inspected source, regressions, and relevant supplied captures. Automated browser checks use disposable offline Chromium contexts and production builds, separate from the user's browser session.

Interactive browser reconnect was rejected by tool policy. No workaround was attempted. Normal and quarter-speed MP4 sequences are generated, but human temporal playback remains unverified. Filmstrip inspection does not establish perceived timing quality. Mobile Safari, Firefox, real touch hardware, and low-end device performance have not been checked.

Sick and away travelers transfer immediately through the existing arrival callbacks. This avoids moving the whole bed/sleeping silhouette through the house. Normal travel keeps its previous cadence and maximum duration. This is a documented timing tradeoff.

## Reproduce

Run the app with `npm run dev`, open `/?art`, and use Motion review to select species, mood, action, appearance, and wardrobe. Play, pause, restart, change speed, or scrub exact milliseconds. Compare keyframes and enable ground/anchor overlays. The local reduced-motion checkbox forces reduction; it cannot override the system preference.

Generate the full sample matrix and bounds with:

```sh
node scripts/render-pet-motion.mjs /tmp/pet-motion-review --bounds --ground-bounds
```

Add `--video` to generate normal and quarter-speed MP4s for player reactions, environmental gestures, local gait, faster travel gait, and production Room sequences. This uses the installed `ffmpeg` and production React/SVG modules. Bounds violations appear in the JSON manifest and produce an unsuccessful exit status.

Run `npm test`, `npm run lint`, `npm run build`, `CHROME=/usr/bin/chromium npm run test:browser`, and the multiroom command documented in README. Browser checks require permission to listen on loopback. Generated captures and automated checks supplement human playback review.
