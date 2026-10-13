# Batch52 Wardrobe Pause/Resume independent review

2026-10-13. One bounded independent static, source, recorded-evidence and existing-still review, using the requesting-code-review criteria. No tests, builds, browsers, capture/comparison runners, agents or external messages were run. This report is the only file written by this review.

The implementation is acceptable within the frozen Batch52 scope. No actionable critical, important or minor findings were identified. The local state change preserves the delivered frame, the existing clock owner supplies cancellation, and the retained failures have specific instrumentation explanations supported by full-string diagnostics.

The reviewed input is [wardrobe-pause-review-input.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wardrobe-pause-review-input.json), SHA256 `ad0d3ba29038fcd56aa2dcc74ca5143b6c9bf4e157cc58a3108b232a61124aa5`. Base and current HEAD both resolve to `43a88eb5a25a998d40235cfa6750c71e775e7b62`. The candidate consists of working-tree changes over that base, so the empty base-to-HEAD commit range alone would not describe it.

Integrity checks independently matched all seven authored-source hashes, all thirty unchanged-source hashes, all one hundred artifact hashes, and all thirteen raw-log/exit pairs, including four retained exit-1 checks. Each unchanged source also matches its Git-base bytes. This includes the renderer, motion sampler, owner hook, preference plumbing, schema, wardrobe owner/model, shared controls and earlier regressions. Both current product files match their archived isolated candidate byte for byte; both archived baseline hashes match Git base. The archived old Mirror fixture also equals its complete Git-base source.

The seven-path patch was reconstructed from the four tracked diffs and three new-file diffs and matched the archived bytes exactly, SHA256 `0f75e4d88ae814493f00f6abf641fb7635a614e14db974019910c19f5562ec27`. The tracked index content equals Git base. Explicit commit diffs differ only in Git's mnemonic source prefix. The artifact manifest matches SHA256 `7cc9b262c60b26f7b9cfc532c58f9e26e0098b61b4e3368147ea80e345b050c3`. [wardrobe-pause-verification.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wardrobe-pause-verification.json) reproduces the frozen input fields exactly and adds the correct input path/hash binding. Authored-source and motion hashes were rechecked after inspection.

The source behavior meets the design:

| Requirement | Source and evidence assessment |
| --- | --- |
| Local pause state and exact delivered-frame hold | [WardrobePreview.tsx:11](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/WardrobePreview.tsx:11) adds only `paused` to the local run. Pause preserves `elapsed`, action and start. It does not resample wall time on click. The same art node receives the same deterministic frame. Unit and native assertions compare complete art markup and retain art/grid identity. |
| Zero RAF while paused | [WardrobePreview.tsx:20](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/WardrobePreview.tsx:20) guards the callback and passes activity only for an unpaused run. The unchanged hook cancels its pending RAF and removes its visibility listener when activity stops. Recorded holds advance 60,000 simulated ms without a pending RAF. |
| Remaining duration on resume | [WardrobePreview.tsx:37](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/WardrobePreview.tsx:37) sets `start = performance.now() - elapsed`. If the delivered elapsed time is E, duration D and resume time R, expiry is R + D - E. Resume initially retains the held art and then uses one existing owner clock. |
| No save, new timer or schema change | The added handlers only update component state. There is no added timer or persistence call. Unit checks assert no `onChange` or storage writes; native checks compare saved tables. Outfit edits still use the existing explicit outfit-change path. |
| Stop, poses, reduction and no replay | The active movement remains its Stop button while paused. Every pose clears the run. The preference callback remains subscribed while inactive and clears a paused run on either reduction policy. Restoring motion leaves no run to replay. Repeated toggles and unmount cleanup are covered. |
| Hidden behavior | Manual pause leaves elapsed unchanged across hidden/visible events. Resume rebases only the manual hold. An unpaused or subsequently resumed run still uses absolute timestamps, so hidden time can exhaust it on the next visible frame. The unchanged hook and the new hidden/outfit unit case support this distinction. |
| Mirror and outfit compatibility | Mirror transforms the enclosing facing group while child art stays exact. Recorded contacts reflect as x' = 200 - x with unchanged y. Outfit rerender keeps the paused body transform and art node. The preview remains separate from the item grid. |
| Native controls and layout | [WardrobePreview.tsx:51](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/WardrobePreview.tsx:51) uses a native button, native disabled state, Pause/Resume labels naming the pet, hidden decorative SVG, pause bars and a play triangle. Enter and Space, focus retention and visible outlines are checked. [Wardrobe.css:25](/home/robert/.codex/worktrees/4511/chore-pet/src/screens/Wardrobe.css:25) places a 48 by 48 px overlay opposite Mirror, outside flex layout, without a new row or reduced character allocation. |

The new unit file contains 21 expanded cases: one inactive case, fifteen species/action cases, one Stop/pose case, two live-reduction cases, one outfit/hidden case and one repeated-toggle/unmount case. The species/action cases check the remaining deadline at one millisecond before and exactly at expiry. The new native file expands to sixteen cases: one initial view, three species cases, ten layout/text cases and two reduction cases. The final native log contains those sixteen plus forty existing cases, consisting of eighteen Mirror, nine movement, six Rest and seven Show-preview cases.

The geometry correction is justified. The archived failing helper assigned `accents.style.pointerEvents` and then attempted to restore/remove the SVG style attribute. The diagnostic's full `actual` and `held` strings independently differ only by the nine-character insertion ` style=""` at offset 11661. Their lengths are 12166 and 12157; recorded pending RAF is zero. The sampled product frame is unchanged. This evidence identifies a fixture serialization side effect and does not support a runtime queued-render issue.

The old Mirror and failing Pause geometry functions are byte-identical after normalizing `__mirrorFrames` to `__pauseFrames`. Both current helpers instead save/set/restore the SVG `pointer-events` presentation attribute. They reset the button's CSS declaration and restore its exact original style attribute or absence. Both add immediate whole-art equality checks around geometry sampling. The corrected functions also match after that global-name normalization. Native painted-geometry checks remain active; the assertions were not replaced with source or screenshot equivalence.

The original 320 by 568, 200-percent tilted Rest record has a 60.502691054251045 px² body/control rectangle intersection and zero painted hits. The mirrored corner reports about 60.50257 px² and zero hits. Direct inspection of the retained failed still shows the empty corner and clear controls. Held movement layouts appropriately use the existing 1 px native painted-geometry sampling inside intersecting bounds. The initial static Head case retains strict zero body/accent rectangle overlap, zero RAF and a 92.40625 px preview height.

Independent arithmetic over the three final clearance JSON files gives 45 separate runs, three species by five actions by three delivered phases. Both controls in both facings give 180 geometry views. All record zero painted hits and zero paused RAF, 48 px minimum button dimensions, a 1 px hit grid and 60,000 ms holds. Four views have nonzero body rectangle overlap, which is compatible with empty rotated corners. Every `remaining` value equals `duration - activeElapsed`; maximum requested-phase versus delivered-frame discrepancy is 14 ms. Maximum contact reflection error is approximately 8.53e-14 SVG units in x and zero in y. Native source assertions observe the action at remaining minus 24 ms and its expiry by remaining plus 24 ms. They do not prove an exact native millisecond deadline; the unit cases establish that separately. All ten layout records satisfy their sampled hit, RAF, focus-ring containment, horizontal-overflow, button-size and preview-height conditions.

I directly opened all sixteen final PNGs, independently of the root review, plus the original failed compact Rest and Bun Hop diagnostic PNGs. Dressed species, held Rest, the two corner controls and focus outlines are clear in these stills. Enlarged compact views use the existing vertical overflow behavior; a screenshot does not show every offscreen control simultaneously. The new overlay consumes no layout row.

| Final PNGs directly inspected in `wardrobe-pause-native` | Count |
| --- | ---: |
| `wardrobe-pause-bun.png`, `wardrobe-pause-mochi.png`, `wardrobe-pause-sprout.png` | 3 |
| `wardrobe-pause-initial-head.png` | 1 |
| `wardrobe-pause-layout-320-100.png`, `wardrobe-pause-layout-320-200.png` | 2 |
| `wardrobe-pause-layout-390-100.png`, `wardrobe-pause-layout-390-200.png` | 2 |
| `wardrobe-pause-layout-640-100.png`, `wardrobe-pause-layout-640-200.png` | 2 |
| `wardrobe-pause-layout-844-100.png`, `wardrobe-pause-layout-844-200.png` | 2 |
| `wardrobe-pause-layout-1280-100.png`, `wardrobe-pause-layout-1280-200.png` | 2 |
| `wardrobe-pause-reduced-device.png`, `wardrobe-pause-reduced-system.png` | 2 |

The two additional directly inspected files are [original compact Rest](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wardrobe-pause-prototype-native/wardrobe-pause-layout-320-200.png) and [Bun Hop diagnostic](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wardrobe-pause-geometry-probe-native/wardrobe-pause-diagnostic-bun-Hop-0.5.png). All sixteen [final-comparison bindings](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wardrobe-pause-final-comparison.json) match both actual PNG hashes, their byte-equality flags and the selected-candidate inspection manifest. Ten final PNGs differ and are listed as root-direct inspections. Six are byte-exact selected candidates: initial Head, 390/100, 844/100, 844/200 and both reduction stills. These bindings establish byte identity where asserted, without inferring perceptual equivalence for different PNGs.

All thirteen raw logs and exit files were hashed and read for their relevant results. These are recorded prior runs, not tests executed by this reviewer:

| Check | Exit | Raw evidence |
| --- | ---: | --- |
| red | 1 | All 21 unit cases fail on the missing control. Archived red unit source equals the final unit source. |
| native-red | 1 | One initial native case times out waiting for the missing control. |
| prototype-unit | 0 | 21 tests in one file pass. |
| prototype-build | 0 | Isolated two-source virtual Vite build passes; it does not invoke TypeScript checking. |
| prototype-native | 1 | 14 of 16 pass. Bun Hop markup serialization and compact tilted Rest rectangle assertion are retained failures. |
| geometry-probe | 1 | Targeted Bun Hop diagnostic reproduces the full-string style-attribute difference. |
| native-revised | 0 | Both corrected cases pass. Product candidate bytes remain exact. |
| focused | 0 | 121 tests, 10 files, 8.92 seconds, one worker. |
| full | 0 | 2388 tests, 124 files, 82.36 seconds, one worker. |
| native | 0 | 56 pass, zero fail/skipped/cancelled, 149.449890703 seconds, concurrency 1. |
| build | 0 | Final production `tsc -b && vite build` succeeds. The chunk-size advisory remains in the log. |
| lint | 0 | Scoped oxlint with maximum warnings zero succeeds for the two authored TSX files. |
| diff | 0 | Whitespace checks cover all seven authored paths. |

The twelve resource JSON records reproduce the summary minima and sample counts. Commands use nice 10; unit commands select one worker and native commands select concurrency 1. The unchanged browser helper creates and closes one browser per case. Recorded run intervals do not overlap. There are zero guard stops and zero launch rejections. Minimum observed host available RAM is 3056.03125 MiB and minimum observed `/tmp` free space is 4005.1640625 MiB. The full-suite launch threshold is 4096 MiB and its observed minimum is 4348.375 MiB, about 4348.4 MiB, above the 2048 MiB reserve. The archived runner samples host RAM and `/tmp` about once per second and limits any stop to its own process group. The reported inherited 512 MB Node heap cap is not independently bound by the recorded command/environment evidence. These records are snapshots, not continuous resource monitoring or peak CPU/RSS/physical-memory certification.

Behaviors considered and declined to judge:

- Human temporal comfort or perceived smoothness, because this review permits source and existing stills only.
- Every animation phase, exhaustive vector/pixel clearance, arbitrary outfits and untested browsers/devices, because the evidence samples three phases, a dressed fixture, a 1 px native hit grid and Chromium 152.0.7977.82.
- Browser zoom and physical-device behavior, because 200-percent text here changes root font size.
- Peak or continuously safe resource use and independent heap-cap enforcement, because the evidence records approximate one-second host snapshots and does not bind the inherited cap.
- Batch53 greet-follow drafts, tests and artifacts, because the user explicitly excludes that later work. No Batch53 behavior is included in this verdict.

No change is required for the reviewed candidate. Preserve the four failure records and their diagnostics, the exact candidate/baseline bindings and the stated evidence limits. Ready to proceed within the frozen Batch52 scope.

PASS
