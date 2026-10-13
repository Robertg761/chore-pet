Independent review of Chore Pet batch38 scene readability

Verdict: PASS for this bounded CSS-only batch, with two non-blocking test-evidence findings below. No critical or important implementation defect was identified in the frozen patch, measured layouts, or six inspected stills. This verdict covers the supplied batch38 snapshot, not subsequent work in this checkout.

The review used the requesting-code-review reviewer criteria and verification-before-completion evidence discipline, within the user's report-only constraints. I ran only read-only source, hash, patch-reconstruction, and evidence inspection commands. I inspected all six final PNGs individually through `view_image`. I ran no build, test, or browser, spawned no agent, sent no inter-chat message, and made no commit. This report is the only file written.

The immutable input is [scene-readability-review-input.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/scene-readability-review-input.json), SHA256 `1255cc88a5c3245f448fc815b7dcdb0428a0c24a0b467ab02a47bfc5664d9644`. All 28 referenced/checkpoint SHA256 comparisons matched: the input itself, three sources, patch, artifact manifest, eight artifacts, twelve current raw log/exit files, and two historical full-suite files. All eight artifact byte counts matched. All six current exit files contained the declared numeric code.

| Frozen source | Verified SHA256 |
| --- | --- |
| `src/index.css` | `beb2718dcfa019a1eded9ed62139f6aae435dc25d41a71916c5641077a2ad9e8` |
| `scripts/browser/scene-readability.test.mjs` | `a35b486b512008528fe405c5cba5d536ac38fcdbab25b8d41ff3410ba74aaa08` |
| `docs/ART.md` | `feebe4827e339012e6da2eadd6bc0923e83d58da7cd8b1e2431d2be58543e333` |

I also replayed the frozen unified patch in memory against base commit `7164d7125175a83d61aa535447b0ad4e87902da6`. Its three resulting files matched the frozen sources byte for byte. The sole runtime change is the six-line block in [index.css](/home/robert/.codex/worktrees/4511/chore-pet/src/index.css:298). The other changes add the native test and the ART contract. There is no runtime JavaScript change in this patch. Supporting unchanged component/helper/regression code was read from the stated base where relevant.

The six raw pairs record the following results. These are supplied execution records, not fresh runs by this reviewer.

| Check | Exit | Raw evidence |
| --- | --- | --- |
| Red | 1 | Two layout tests, default passes, 200% fails the 250px canvas assertion, 2.346s. |
| Build | 0 | TypeScript/Vite production build and PWA generation complete. A bundle-size warning remains. |
| Native | 0 | Three new checks pass, none skipped or cancelled, 6.629s, Chromium 152.0.7977.82. |
| Regressions | 0 | Seventeen navigation, player-layout, Show room, and observer checks pass, none skipped or cancelled, 28.808s. |
| Lint | 0 | Recorded oxlint invocation completes without reported errors. |
| Diff | 0 | Empty raw log with a separate zero exit file. The log does not itself name the command. |

The historical full-suite pair also matches its hashes and records 2,262 tests across 110 files in 71.70s. It predates this CSS change. It provides no post-change full-suite assurance, and this review makes no such claim.

The CSS addresses the parent flow as well as the canvas floor. Below 640px, the stage keeps its existing 420px minimum, uses an automatic content-based flex basis and cannot shrink. Its scene receives a min-content minimum; its canvas receives the 250px minimum. Together these rules let enlarged picker/tools/status content increase the stage's height and push chores down. The more specific `.home .home-scene*` selectors override the unchanged component minimums without relying on stylesheet import order. The new media query does not intersect the existing wide/landscape layout condition, whose minimum width is 640px. Build mode has no matching home-stage override. The patch adds no scheduling, observer, persistence, or interaction logic.

Both geometry JSONs contain four samples. Their measured dimensions are internally consistent with the CSS and the native assertions.

| Root text | Width | Stage height | Canvas height | Actual body width × height |
| --- | --- | --- | --- | --- |
| 100% | 320 | 420 | 282 | 32.56 × 28.97 |
| 100% | 375 | 420 | 282 | 32.56 × 28.97 |
| 100% | 390 | 420 | 282 | 32.56 × 28.97 |
| 100% | 600 | 420 | 282 | 32.56 × 28.97 |
| 200% | 320 | 510 | 250 | 28.19 × 25.07 |
| 200% | 375 | 451 | 250 | 28.19 × 25.07 |
| 200% | 390 | 451 | 250 | 28.19 × 25.07 |
| 200% | 600 | 423 | 250 | 28.19 × 25.07 |

Every sample has a 10px gap from the lowest measured scene/canvas/status bottom to chores. Scene, canvas, tools, and status bottoms stay within the stage; maximum measured protrusion is zero. Document scroll width equals viewport width in every sample. Measuring the actual canvas/tools/status boxes avoids the earlier scene-wrapper-only blind spot described in the input. The input's rejected-probe figures of 50px protrusion and 40px overlap are historical narrative here; that probe's raw artifacts are not part of the frozen eight-artifact bundle.

I inspected `scene-320-100.png`, `scene-375-100.png`, `scene-390-100.png`, `scene-320-200.png`, `scene-375-200.png`, and `scene-390-200.png`. All show the complete room, a distinguishable Mochi body and face, and a room label separated from the pet. At 200%, the hint and Fit home text wrap, but the controls do not visibly collide and the room stays usable in the shown state. The resident is smaller than at default text, as the dimensions above confirm, but remains readable at this captured scale. No scene content visibly overlaps the following Explore together/Up next area. Earlier content is clipped above the viewport in several images, especially 320px/200%, because these captures follow Show room scrolling. That clipping is consistent with the capture procedure, not evidence of hidden page content. Geometry was collected before opening the player panel and activating Show room; screenshots were collected afterward, so their absolute vertical positions must not be compared directly.

The new layout checks use real production DOM geometry, actual SVG body bounds, keyboard activation, clipping-ancestor intersection calculations, and saved-table comparisons. They establish at least 95% body visibility after Show room in the eight sampled states. The enlarged-text clock check wraps native request/cancelAnimationFrame without replacing timestamps or freezing time. It scrolls the real resident fully above the viewport, observes zero pending frames, triggers Stretch while offscreen, returns with one pending frame and unchanged speech, then observes zero frames and the content expression. This is useful real finite-clock evidence under the helper's reduced-motion preference. The existing recorded regressions additionally exercise default-text normal-motion observation, ancestor clipping, missing observation support, edge contact, expired return, camera preservation, and resting-room availability. Some existing Show room cases use a frozen clock; they should not all be described as real-clock checks.

Two minor findings are actionable in a later bounded test batch; neither requires changing this CSS before acceptance.

1. **P3: Guard the default geometry explicitly.** [scene-readability.test.mjs:28](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/scene-readability.test.mjs:28) only requires canvas height ≥250 and body size ≥25 × 22 for both text settings. A default canvas shrinking from the recorded 282px to 250px, with a correspondingly smaller body, could still pass. The final default geometry is sound, and the pre-CSS default checks passed, but the supplied bundle has no paired pre-CSS geometry artifact that independently establishes exact equality. Add toleranced default-sample assertions for the intended stage/canvas/body dimensions, or retain a verified before/after comparison. This would make the ART requirement to preserve default geometry enforceable.

2. **P3: Distinguish finite expiry from original-deadline expiry.** [scene-readability.test.mjs:74](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/scene-readability.test.mjs:74) waits up to 3500ms after Show room for zero frames. A restarted 2400ms stretch could satisfy that assertion too. The new test proves finite completion, not independently that Show room preserved the original start/deadline. Unchanged runtime code and the existing expired-return regression support the intended behavior, so this is an evidence-strength issue. For a precise enlarged-text guard, hold the offscreen response for a known part of its lifetime and verify completion near the original deadline, with a bound that excludes a fresh full lifetime after return. Until then, describe this new check as finite completion rather than exact original-deadline proof.

Behaviors considered and set aside from acceptance are listed explicitly:

- Browser zoom, operating-system text scaling, physical assistive technology, and whole-app enlargement: the fixture changes only the root font size and the ART contract expressly limits acceptance to this scene.
- Other engines, every species/outfit/mood, populated multi-room homes, long custom room names, active travel copy, and empty-room build controls: the eight layouts use one bare sample Mochi home. These states are not established by the six stills or the new geometry assertions.
- Enlarged-text normal-motion clocks and continuous motion quality: the new checks inherit reduced motion, and still PNGs do not establish animated behavior. The default-text normal-motion regressions provide narrower supporting evidence.
- Exact default equality, exact enlarged-text original deadline, arbitrary tall/short layouts, and breakpoint-edge geometry: the two findings above and the fixed sample matrix bound those claims. No 600px still is supplied, although both 600px geometry samples are present.
- General bundle optimization and unrelated product polish: the build warning and other screens are outside this CSS batch.
- A fresh full suite, new browser validation, or later local changes: prohibited or outside the immutable review snapshot. Hash matches bind the supplied evidence files; they do not independently attest the historical invocation environment or bind an unlisted build artifact.

Accept batch38 within these limits. Carry the two P3 assertion improvements into a subsequent bounded batch and retain the historical-only label on the 2,262-test reference.
