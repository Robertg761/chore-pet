# Character animation review

Mochi, Bun, and Sprout now share deterministic motion and articulated SVG rendering in rooms, between rooms, and in the art review panel. Each species keeps its existing silhouette, colors, moods, face choices, and wardrobe. Environmental gestures use actual object footprints and rotation. Surface contact remains disabled because furniture has no verified paw anchors.

The final animation corrections are committed in `6b1ab20`. Independent whole-branch review found one walk-arrival blink snap and four minor observations. The single combined fix wave addressed I1, M1, M3, and M4. The exactly one scoped re-review approved spec and quality, with no new source breakage. Fresh integrated checks passed on that source. Human normal/slow playback acceptance remains open.

## Integrated checks

Unit, lint, build, browser, and multiroom results below are fresh after the combined fix wave. The broad raster scan is explicitly historical, supplemented by the new endpoint checks.

| Check | Result |
| --- | --- |
| Full unit suite | 1,863 tests in 82 files PASS |
| Lint | PASS |
| Typecheck and production/PWA build | PASS, with a main-chunk size advisory |
| Isolated production browser suite | 45 tests PASS on Chromium 152.0.7977.82 |
| Multiroom travel and retargeting | 16 checks PASS |
| Historical raster bounds | 42,660 renders, zero outside pixels; retained pre-wave source hashes |
| New closed walk-endpoint bounds | 24 renders, zero outside pixels, included in the passing unit suite |

Actual commands, exit statuses, relative log paths, evidence status, and remaining limits are in [verification.json](verification.json). All six named raw logs and the fix-wave evidence are preserved in Git. The first full run hit one 5,233ms raster-test timeout under concurrent capture/build work. Disabling unused system-font scans preserved all 60 bounds cases and assertions. Independent review approved that test-only change; the isolated full-suite replay above passed. No production motion or timeout setting changed for it.

The combined fix wave passed 247 covering tests in five files, both TypeScript configurations, and scoped lint. Its [fix report](final-fix-report.md) records red/green evidence, self-review, geometry retention, and remaining limits. These focused results do not replace root's final integrated regression or the open human playback gate.

## Evidence collected

The baseline passed 1,564 tests in 75 files. The renderer and behavior received independent task reviews and focused regression fixes. The reviewed character snapshot before the blink fix passed 73 character tests, typecheck, build, and scoped lint. Its capture source is recorded in the manifest.

The historical character bounds scan passed with zero painted pixels above alpha 5/255 outside the 200-unit art box across 42,660 renders. It includes 25,740 action/wardrobe samples and 16,920 projected walking samples. The latter cover four cardinal directions, two corners, all species and moods, normal and faster travel cadence, and both outline scales. Happy and scruffy walking are sampled at 101 route phases; the other moods use 11. These checks establish bounds for the sampled matrix, not every possible configuration.

The capture tool generates 42 sheets containing 1,407 poses. They cover all 15 motion actions, all species and moods, six body colors, all 16 individual wardrobe items and a combined outfit, 60px and 25px art, sick/sleeping notice, and eight environmental families in both object rotations. Enlarged sheets use native 200px art. The 25px samples use the heavier production room outline. Nineteen representative PNG sheets and ten MP4 clips are saved alongside this record. The full matrix is reproducible; not all 42 sheets are committed. Source hashes and matrix counts are in [manifest.json](manifest.json), and video dimensions, frames, and durations are in [clips.json](clips.json).

All 42 sheets and ten clips were regenerated after the fix wave. All eight capture source hashes match the reviewed production source. The 42,660-render bounds scan retains its historical label and source hashes. The fix changes only walking endpoint eye openness; 480 before/after comparisons preserve every other frame field. Twenty-four new padded renders cover the closed endpoint with combined wardrobe and both outline scales. The [fix report](final-fix-report.md) and [scoped re-review](final-fix-re-review.md) explain why this supplements the historical scan without repeating it.

The actual local arrival [eight-frame sheet](arrival-blink.png) and [numeric samples](arrival-blink.json) show Bun keeping `eyeOpen` at 0.1 across 3069.999ms, the first idle frame at 3070ms, and 3086ms. The existing handoff then reopens the eyes smoothly to 1 by 3190ms. The [capture source](arrival-blink-source.mjs) uses production `step`, `motionFor`, and `AnimatedCharacterArt`. Stills do not establish perceived playback quality.

The first post-wave production browser run passed 44/45 tests; Chromium closed during the existing skip Undo case. The isolated case passed 1/1, and the complete replay with process-exit logging passed 45/45 on unchanged source and assertions. The cause of the original closure remains unknown. The [original log](browser-first-run.log), [isolated replay](browser-focused-replay.log), and [complete replay](browser-tests.log) preserve the evidence.

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

Fresh [phone home](phone-home.png) and [desktop home](desktop-home.png) captures show the pet at actual Fit home scale. The final App retarget probe measured zero world-position jump and at most 8.04e-14 scene-unit torso joins across both reversals; [recorded geometry](app-retarget-joins.json) excludes page-layout movement.

## Defects found and corrected

| Finding | Correction and evidence |
| --- | --- |
| Walk arrival forced a closed lifetime blink open | Sample lifetime eye openness before returning neutral walk geometry. Regressions cover all-species sampler endpoints, actual local arrival blends, both rendered eye transforms, shared travel arrival, and 24 focused endpoint rasters. Finite gesture taper and neutral endpoints remain intact. Independent scoped re-review approved the correction. |
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

Root inspected the corrected arrival sheet, fresh final phone/desktop views, production SVG sheets, the final local/travel gait filmstrips, a final eight-room action frame and a plant approach/action/settle filmstrip for silhouette, face readability, wardrobe attachment, shadow placement, and room occlusion. Independent reviewers inspected source, regressions, and relevant supplied captures. Automated browser checks use disposable offline Chromium contexts and production builds, separate from the user's browser session.

Interactive browser reconnect was rejected by tool policy. No workaround was attempted. Normal and quarter-speed MP4 sequences are generated, but human temporal playback remains unverified. Filmstrip inspection does not establish perceived timing quality. Mobile Safari, Firefox, real touch hardware, and low-end device performance have not been checked.

Two minor robustness observations are deferred in [decisions.md](decisions.md). Synthetic 16ms suppression churn can retain many transition layers; no normal-use failure is established, and arbitrary truncation risks contact continuity. Separately, pre-existing room-summary code can crash for an externally supplied `__proto__` object ID with positive neglect. Normal object creation uses UUIDs; that name-map change is outside this animation wave. The [whole-branch review](final-review.md), [fix report](final-fix-report.md), and [scoped re-review](final-fix-re-review.md) retain the full dispositions.

Sick and away travelers transfer immediately through the existing arrival callbacks. This avoids moving the whole bed/sleeping silhouette through the house. Normal travel keeps its previous cadence and maximum duration. This is a documented timing tradeoff.

## Reproduce

Run the app with `npm run dev`, open `/?art`, and use Motion review to select species, mood, action, appearance, and wardrobe. Play, pause, restart, change speed, or scrub exact milliseconds. Compare keyframes and enable ground/anchor overlays. The local reduced-motion checkbox forces reduction; it cannot override the system preference.

Generate the full sample matrix and bounds with:

```sh
node scripts/render-pet-motion.mjs /tmp/pet-motion-review --bounds --ground-bounds
```

Add `--video` to generate normal and quarter-speed MP4s for player reactions, environmental gestures, local gait, faster travel gait, and production Room sequences. This uses the installed `ffmpeg` and production React/SVG modules. Bounds violations appear in the JSON manifest and produce an unsuccessful exit status.

Run `npm test`, `npm run lint`, `npm run build`, `CHROME=/usr/bin/chromium npm run test:browser`, and the multiroom command documented in README. Browser checks require permission to listen on loopback. Generated captures and automated checks supplement human playback review.
