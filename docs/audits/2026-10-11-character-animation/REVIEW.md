# Character animation review

Mochi, Bun, and Sprout now share deterministic motion and articulated SVG rendering in rooms, between rooms, and in the art review panel. Each species keeps its existing silhouette, colors, moods, face choices, and wardrobe. Environmental gestures use actual object footprints and rotation. Surface contact remains disabled because furniture has no verified paw anchors.

Integrated automated verification passed. Independent whole-branch review is in progress. Counts below describe completed evidence, not planned checks.

## Integrated checks

| Check | Result |
| --- | --- |
| Full unit suite | 1,848 tests in 82 files PASS |
| Lint | PASS |
| Typecheck and production/PWA build | PASS, with a main-chunk size advisory |
| Isolated production browser suite | 45 tests PASS on Chromium 152.0.7977.82 |
| Multiroom travel and retargeting | 16 checks PASS |
| Raster bounds | 42,660 renders, zero outside pixels |

Commands, exit statuses, logs, and remaining limits are in [verification.json](verification.json). The first full run hit one 5,233ms raster-test timeout under concurrent capture/build work. Disabling unused system-font scans preserved all 60 bounds cases and assertions. Independent review approved that test-only change; the isolated full-suite replay above passed. No production motion or timeout setting changed for it.

## Evidence collected

The baseline passed 1,564 tests in 75 files. The renderer and behavior received independent task reviews and focused regression fixes. The final character snapshot passed 73 character tests, typecheck, build, and scoped lint. Its capture source is recorded in the manifest.

The final character bounds scan passed with zero painted pixels above alpha 5/255 outside the 200-unit art box across 42,660 renders. It includes 25,740 action/wardrobe samples and 16,920 projected walking samples. The latter cover four cardinal directions, two corners, all species and moods, normal and faster travel cadence, and both outline scales. Happy and scruffy walking are sampled at 101 route phases; the other moods use 11. These checks establish bounds for the sampled matrix, not every possible configuration.

The capture tool generates 42 sheets containing 1,407 poses. They cover all 15 motion actions, all species and moods, six body colors, all 16 individual wardrobe items and a combined outfit, 60px and 25px art, sick/sleeping notice, and eight environmental families in both object rotations. Enlarged sheets use native 200px art. The 25px samples use the heavier production room outline. Nineteen representative PNG sheets and ten MP4 clips are saved alongside this record. The full matrix is reproducible; not all 42 sheets are committed. Source hashes and matrix counts are in [manifest.json](manifest.json), and video dimensions, frames, and durations are in [clips.json](clips.json).

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
