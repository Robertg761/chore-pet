# Batch23 frozen visibility review

Approve the final seven-path change for the static scope below. The original P2 fixture finding is resolved by the amendment; no supported actionable findings remain. Gallery rerun and full-suite execution remain separate from this approval.

Independently recomputed SHA-256 for all six sources and the patch in `review-visibility-freeze.json`; all seven match. Patch SHA-256 is `57b1fc5ec531a02d2f5da4e692458cfa1355208b10bc77ebbbb8e975cc9267ec`. Applying every frozen hunk in memory to base `ab4735fa80660caa0188aae309a14bc340fe6e70` reproduces all six current files exactly, including the new native fixture. No applicable AGENTS.md was found.

Independently verified [review-visibility-final-freeze.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/review-visibility-final-freeze.json) and [review-visibility-final-source.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/review-visibility-final-source.diff). All seven final source hashes and the final patch hash match. The original six source bindings are identical; the original manifest hashes to its recorded `priorFreezeSha256`. The final patch reconstructs all seven current sources exactly from the same base, entirely in memory.

- Preserved original manifest SHA-256: `7c8ab660f5a58080d9c76d6bb5cd7eb2036679e59b69663e17be4adb7cfbc090`.
- Final patch SHA-256: `925b72cac3d3e1283b48855b1525e8b9493061640585665336a52a7e4bb49786`.
- Amended `scripts/browser/gallery-motion.test.mjs` SHA-256: `f094343b1c636f59a68063c6d3b39528a447462d3b21bd27ebd2d9bff7dde91f`.

## Original P2 resolved by the fixture amendment

The old 390×664 gallery fixture clicked Play and expected elapsed time to advance without bringing the previews into view. The three added lines at [gallery-motion.test.mjs:164](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/gallery-motion.test.mjs:164) explain the phone layout, scroll `.motion-review-previews` into view, and await `Playing at` before advancing the fake clock. That status requires both requested playback and observed visibility. The amendment addresses the finding without weakening the existing elapsed-time, gallery-isolation, Pause, or scheduling assertions.

Root's [native log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/review-visibility-browser.log) records 41 passes and the single old-fixture failure. Root reports that the new offscreen/fallback and resident checks passed. Its [geometry diagnostic log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/review-visibility-gallery-diagnostic.log), inspected as evidence, records preview top 1081.875 against viewport height 664 and waiting at 0 ms after Play; scrolling yields top 92.875 and Playing at 112 ms. This supports the original diagnosis. These are root-produced execution results, not execution independently performed or certified by this reviewer. The six-case gallery rerun and full suite are pending at this review update.

## Inspected behavior

- `usePetMotion` still calls ticks with exactly `now, preference.current`. Its fourth callback changes neither absolute RAF timestamps nor existing resident, traveler, creator, or wardrobe deadlines. The media subscription remains active while scheduling is inactive.
- Resume resets happen immediately before the first delivered tick. Activity restart and document cancellation reset the flag; the hidden-before-event delivery branch also resets it. Pending-ID and disposal guards, listener removal, cancellation, and Strict Mode replay retain one live clock and reject stale deliveries.
- MotionReview observes the actual three-preview wrapper through one reused visibility hook. Unsupported observation retains manual playback. Resetting `previousTick` excludes paused intervals without changing `playTime`; seek, step, restart, speed, loop, and endpoint behavior remain intact. System reduced motion still overrides the local checkbox.
- The new native fixture uses the production preview, real IntersectionObserver and native scrolling, instruments pending RAFs after clock installation, and checks the 10-second gap and unsupported-observer fallback. Its structure supports those assertions; execution remains separate.

Root reported focused 137 tests across four files, build, and lint with exit 0. Those results were not independently rerun. No agents, builds, tests, browser sessions, or resource-heavy commands were started here. Only this report was written; source, frozen artifacts, and raw logs were left untouched. Native/full-suite execution remains root's separate work. Native motion quality and assistive-technology playback were declined for judgment because static inspection cannot certify them.
