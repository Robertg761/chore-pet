# Batch23 frozen visibility review

Request changes for one browser-fixture regression. No other supported actionable finding emerged from static review.

Independently recomputed SHA-256 for all six sources and the patch in `review-visibility-freeze.json`; all seven match. Patch SHA-256 is `57b1fc5ec531a02d2f5da4e692458cfa1355208b10bc77ebbbb8e975cc9267ec`. Applying every frozen hunk in memory to base `ab4735fa80660caa0188aae309a14bc340fe6e70` reproduces all six current files exactly, including the new native fixture. No applicable AGENTS.md was found.

## P2: Bring the previews into view in the existing gallery playback fixture

The new gate at [MotionReview.tsx:57](/home/robert/.codex/worktrees/4511/chore-pet/src/dev/MotionReview.tsx:57) invalidates the existing browser test at [gallery-motion.test.mjs:163](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/gallery-motion.test.mjs:163). That test uses the default 390×664 viewport, clicks Play, advances 128 ms, and requires elapsed time greater than zero. It never scrolls `.motion-review-previews` into view. The wrapping playback controls, scrubber, numeric input, overlays, and notes separate Play from the previews on this narrow layout. Bringing Play into view therefore leaves the observed previews offscreen, where the new implementation correctly schedules no review frames. The assertion now conflicts with the intended visibility policy and can fail in the existing native suite.

Update that fixture to scroll the previews into view and await visible playback before advancing its fake clock, following the new fixture's setup. Preserve its separate assertions that gallery examples remain still and Pause stops scheduling. This is a static finding; I did not execute the browser test.

## Inspected behavior

- `usePetMotion` still calls ticks with exactly `now, preference.current`. Its fourth callback changes neither absolute RAF timestamps nor existing resident, traveler, creator, or wardrobe deadlines. The media subscription remains active while scheduling is inactive.
- Resume resets happen immediately before the first delivered tick. Activity restart and document cancellation reset the flag; the hidden-before-event delivery branch also resets it. Pending-ID and disposal guards, listener removal, cancellation, and Strict Mode replay retain one live clock and reject stale deliveries.
- MotionReview observes the actual three-preview wrapper through one reused visibility hook. Unsupported observation retains manual playback. Resetting `previousTick` excludes paused intervals without changing `playTime`; seek, step, restart, speed, loop, and endpoint behavior remain intact. System reduced motion still overrides the local checkbox.
- The new native fixture uses the production preview, real IntersectionObserver and native scrolling, instruments pending RAFs after clock installation, and checks the 10-second gap and unsupported-observer fallback. Its structure supports those assertions; execution remains separate.

Root reported focused 137 tests across four files, build, and lint with exit 0. Those results were not independently rerun. No agents, builds, tests, browser sessions, or resource-heavy commands were started here. Only this report was written. Native/full-suite execution remains the root's separate work. Native motion quality and assistive-technology playback were declined for judgment because static inspection cannot certify them.
