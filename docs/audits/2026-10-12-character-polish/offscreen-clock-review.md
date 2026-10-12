Batch 19 independent static review, 2026-10-12

Changes required. One P2 correctness finding prevents approval of the frozen patch. No other actionable findings arose from the inspected code.

The change keeps observation inside the resident art subtree, gates both existing motion policies, and preserves the existing scheduler. Its source-ref-keyed state avoids an effect-driven visibility reset. Cleanup disables callbacks before disconnecting, and functional updates preserve the last matching entry in delivery order. No geometry, CSS, controls, persistence, polling, or additional animation clock changes appear in the six-file patch.

**P2: Default observer thresholds can leave a visible resident permanently paused after edge contact.** Location: [usePetVisibility.ts:10](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.ts:10), especially the positive-ratio predicate at line 14 and the constructor without options at line 18.

The observer uses the default thresholds `[0]`, but the callback requires `intersectionRatio > 0`. Native observation can deliver `isIntersecting: true, intersectionRatio: 0` when the target touches the viewport edge. This sets visibility false. If scrolling subsequently exposes positive area, even the whole pet, `isIntersecting` remains true and the threshold index remains 1. Neither notification condition changes, so native observation need not deliver another entry. Visibility stays false and both motion policies remain disabled until another qualifying intersection change. Offscreen reaction state also misses the intended return validation.

This follows directly from the [Intersection Observer processing algorithm, section 3.2.8, steps 8, 10 and 14](https://www.w3.org/TR/intersection-observer/#update-intersection-observations-algo), together with its [default thresholds](https://www.w3.org/TR/intersection-observer/#dom-intersectionobserver-thresholds). This is a static deduction from the platform algorithm, not a claimed browser reproduction.

| Sample | `isIntersecting` | Ratio | Default threshold index | Notification | Hook visibility |
| --- | --- | --- | --- | --- | --- |
| Completely outside | false | 0 | 1 | Initial or intersection change | false |
| Exactly edge-adjacent | true | 0 | 1 | Intersection change | false |
| Positive visible area | true | greater than 0 | 1 | None required | remains false |

Align notification thresholds with the zero-versus-positive-area predicate so entering positive area after edge contact produces a callback. Preserve the requirement that any positive visible area is active. Add a regression that models native notification conditions across outside, zero-area edge, and positive-area samples, plus a native boundary case in the executor's next browser run. Merely manually delivering all three entries would conceal the defect. The current [hook test:30](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.test.tsx:30) supplies entries directly and does not model threshold filtering. The [native scroll test:49](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-offscreen-clock.test.mjs:49) exposes a positive strip without requiring an intervening zero-area edge sample.

Other inspected behavior

- Actual node lifetime: [LivingRoom.tsx:203](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:203) owns the stable ref shared by observation and the positioned SVG group. [Room.tsx:224](/home/robert/.codex/worktrees/4511/chore-pet/src/room/Room.tsx:224) preserves that group with `key="__pet"` through depth reordering. The shell retains its SVG and child group structure. [App.tsx:737](/home/robert/.codex/worktrees/4511/chore-pet/src/App.tsx:737) keys the resident by home and room; travel removes it. Ref-object replacement starts optimistically visible and disconnects the former observer. Changing only `.current` would not resubscribe, but the inspected production path does not replace the group independently of the art mount. No finding was based on that hypothetical use.
- Scheduling and cleanup: [usePetMotion.ts:44](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetMotion.ts:44) retains one pending frame, refreshes tick and preference refs independently, guards disposed and cancelled callbacks, checks `document.hidden`, and removes its listener on deactivation or unmount. Visibility gating changes its existing `running` input. Observer cleanup guards queued delivery after unmount, ref replacement, and Strict Mode replay. Stable visibility updates return the previous observation object. No recurring render or scheduler leak was identified in these paths.
- Deadline joins: [LivingRoom.tsx:111](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:111) installs the current paint closure before the visibility-dependent layout effect calls `tick(performance.now(), reducedMotion)`. That call uses current world state and existing occupancy/suppression validation. An active reaction keeps its original start and deadline; an elapsed reaction or notice no longer satisfies finite scheduling. Normal suppression blends and reduced resting policies retain their existing behavior. This return path depends on receiving the visibility notification affected by the P2 above.
- Attention and offscreen input: the offscreen paint path clears stored pointer attention and resets its gaze sample. Document hiding also clears the pointer and marks attention for reset. Explicit responses and chore celebrations still update existing state and speech while both scheduling flags stay false offscreen. The existing speech timeout remains bounded and unchanged. On a notified return, the existing sampler uses elapsed time rather than restarting the response.
- Coverage inspected: six observer cases, six new resident visibility cases including the parameterized sick/away cases, and the existing `usePetMotion` regressions. These cover fallback, cleanup, Strict Mode, ref replacement, entry ordering, finite return phases, document hiding and scheduling isolation. Test source inspection does not establish execution results.

Exact review bindings

Workspace: `/home/robert/.codex/worktrees/4511/chore-pet`.

Base and checkout HEAD both resolved to `091d8c4b5215ce2234d5f209cee0d9fec69e4c15`. The reviewed head is the frozen working-tree postimage, not a separate commit. All six SHA-256 values below matched at review. Applying every unified-diff hunk to its base bytes in memory reproduced each current source byte-for-byte; the patch contains exactly these six paths.

| Frozen source | Verified SHA-256 |
| --- | --- |
| [src/pet/LivingRoom.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx) | `53ca9e6d54db83e58f036e093b2b3e130724d088e3579b0b4f90dba101c44b48` |
| [src/pet/PetIntegration.test.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetIntegration.test.tsx) | `cae725e35f0ccd909e96093611aa06c03afbb37a9f119a957611d758e6328a66` |
| [docs/ART.md](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md) | `447096f393048b7c60db3ecf70e20119bfdc36b87ea71a10fc4a217842d85f88` |
| [src/pet/usePetVisibility.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.ts) | `cfe222c7005341217e665b3fdb5434e3066f89cdca78757438bb1d15fb523ae6` |
| [src/pet/usePetVisibility.test.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.test.tsx) | `ac8f53e644b90a1b98ad3a0ad82f4d67d1814d632b2893adaf0a6f4580522570` |
| [scripts/browser/pet-offscreen-clock.test.mjs](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-offscreen-clock.test.mjs) | `3f234137affda50a17a2c716e7f4317d1078f9a26d51436fd6663d8b2f4912a8` |

- [offscreen-clock-freeze.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/offscreen-clock-freeze.json) SHA-256: `4e9a11fa9368e8298113bbcc7d880e2b1fb756c3c0ae71016f83b0e8c8ebdf90`.
- [offscreen-clock-source.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/offscreen-clock-source.diff) SHA-256: `63e04e154f4b2dc52f10b6cbce2f6fcf9c251722fead85b6c2c089c9e53f06e9`.
- [offscreen-clock-verification.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/offscreen-clock-verification.json) SHA-256: `d36def888057be8fcbf5b2975853a7c8c6ef6d3308f174eb2313432a5b0ee42b`. Its embedded freeze matched; all 15 referenced check-log hashes matched. These are evidence-integrity checks, not process-exit certification.

Relevant surrounding code and tests were inspected in `usePetMotion.ts`, `usePetMotion.test.tsx`, `behaviour.ts`, `activityMotion.ts`, `playerAttention.ts`, `Room.tsx`, `HomeScene.tsx`, `RoomShell.tsx`, `App.tsx`, and `scripts/browser/helpers.mjs`. All ten files matched the base commit byte-for-byte, binding the surrounding context to the same base.

Review limits and behaviors declined to judge

- Root command exits and full-suite completion remain the executor's responsibility. The supplied record reports 112 focused cases, TypeScript, warning-free lint and 23 native production cases with exit 0 separately; this review does not certify those exits or the running one-worker full suite. The manifest states that the production build/browser run predates only the added Strict Mode unit case.
- No tests, builds, browser sessions, captures, agents, Git mutations, or product changes were performed. The only written file is this review. Static inspection, read-only hash/base checks and the cited platform specification support the verdict. A native reproduction of the identified boundary sequence remains for the executor.
- CPU and battery savings were not judged. Pending-frame counts measure scheduling, not either resource.
- Physical-device behavior, other browser engines, human temporal acceptance, assistive-technology acceptance and fresh image quality were not judged because this assignment authorizes a static review with no images required. The patch changes no drawing geometry or layout.

Approval is withheld for the P2 threshold mismatch. After correction, bind the revised freeze and review the boundary regression separately from root execution evidence.

Final amendment, 2026-10-12

The original P2 is closed for the revised six-file freeze under the explicitly accepted conservative edge-active policy. Static approval is granted for this scope, with no remaining actionable findings. This amendment supersedes the original approval decision for the revised bytes only. The original finding and its original bindings remain intact above.

[usePetVisibility.ts:16](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.ts:16) now uses `entry.isIntersecting`. A native `true/0` edge entry therefore restores visibility immediately. When positive area appears without a second callback, visibility stays true rather than remaining paused. A native nonintersection still pauses the clock. The accepted policy deliberately keeps exact zero-area edge contact active; the earlier requirement to stop at that edge is superseded. [ART.md:164](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md:164), the hook comment and the revised freeze describe that tradeoff. This closes the original mismatch without adding thresholds, polling, geometry reads or another scheduler.

The new [notification-filtering regression:65](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.test.tsx:65) samples outside `false/0`, then edge `true/0`, then positive `true/.4`. Its observer model emits the first two entries and suppresses the third because neither native notification condition changes. The final visibility assertion distinguishes the old ratio predicate from the correction. This addresses the original test gap rather than supplying the positive-area callback that concealed it. The existing partial-visibility case now explicitly expects zero-area edge contact to remain active. There are seven observer cases and the same six new resident visibility cases.

The production integration code and resident tests are byte-identical to the original review. Rechecking the surrounding code confirms that the predicate correction preserves source-ref-keyed observation, matching-target filtering, last-entry ordering, stable-update bailouts and the cleanup `alive` guard. It changes neither the SVG node lifetime nor observer subscriptions. Ref replacement, keyed room changes, Strict Mode replay and unmount still disconnect the former observation and reject stale callbacks.

Both resident motion policies still join visibility with their existing finite/resting rules. The current paint closure is installed before the visibility-dependent layout effect samples current world state and elapsed deadlines. An active response resumes at its original elapsed phase; an expired response or notice no longer keeps reduced/resting scheduling alive. Pointer attention is cleared on nonintersection, document hiding still marks it for reset, and document visibility remains an independent scheduler condition. Unsupported observation retains the prior motion policy. Offscreen explicit state/speech updates still create no continuing frame loop. No new lifecycle, deadline, fallback or render/scheduler leak finding was identified.

Evidence boundaries for the correction

- The supplied, hash-verified unit red log records the old predicate's failed positive-area return assertion. The updated root record reports 113 focused cases and zero-warning lint after correction. Those are executor records; I did not run either command or certify its exit.
- [The native HTML contract case:81](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-offscreen-clock.test.mjs:81) uses a separate fixed 20-by-20 CSS-pixel rectangle, initially at `top:-20px`, then at `top:-12px`. It asserts an initial `true/0` entry, an exposed bottom of 8 pixels and no second entry during its 120 ms observation window. Its observer is test-only. This tests native threshold delivery independently of the production SVG and does not establish an exact native SVG edge alignment. Final execution of this case was pending in the manifest snapshot reviewed here.
- The existing real production SVG scroll case continues to check zero offscreen frames, one partially visible frame, accepted offscreen pats and expired-response mood restoration. The added [ancestor-clipping case:107](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-offscreen-clock.test.mjs:107) keeps the SVG bounding box inside the viewport, clips it through its ancestor, and requires a native false entry, zero pending frames and resumption after unclipping. The supplied partial-run log records that clipping case passing with `inside:false, ratio:0`. That evidence supports the conservative predicate's handling of actual ancestor clipping, without certifying the whole run.
- The preserved SVG exact-edge attempts timed out while aligning their fixtures. The executor attributes this to native rendering bounds differing from `getBoundingClientRect`; the inspected log shows sampled positive and negative boundary offsets without the required exact edge entry. These attempts establish neither a production red for the correction nor a successful exact-SVG boundary test. The separate HTML contract case does not fill that SVG geometry evidence gap, and no such claim is needed for the static closure above.
- Final build, browser and full-suite reruns were pending in the reviewed manifest snapshot. The earlier 2,105-test full run, 23-case browser run and type/build records predate the predicate correction. Any later completion and process-exit bindings remain root's responsibility. Frame counts establish scheduling behavior only. CPU/battery savings, other engines, physical devices, human playback and assistive-technology acceptance remain outside this review.

Revised exact bindings

Base and checkout HEAD still resolved to `091d8c4b5215ce2234d5f209cee0d9fec69e4c15`. All six revised source hashes matched, and applying the revised patch's hunks to base bytes in memory reproduced each source byte-for-byte. Exactly the six frozen paths were present.

| Revised frozen source | Verified SHA-256 |
| --- | --- |
| [src/pet/LivingRoom.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx) | `53ca9e6d54db83e58f036e093b2b3e130724d088e3579b0b4f90dba101c44b48` |
| [src/pet/PetIntegration.test.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetIntegration.test.tsx) | `cae725e35f0ccd909e96093611aa06c03afbb37a9f119a957611d758e6328a66` |
| [docs/ART.md](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md) | `bac617a950365ad08ba2c5d184a00991fb0a8e97102a1f83a8646d9a9209c633` |
| [src/pet/usePetVisibility.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.ts) | `d322342a8b624b9a534e268299f26c539a171e9511854c7cc45582f166729134` |
| [src/pet/usePetVisibility.test.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetVisibility.test.tsx) | `756e8a1dfd4e1962614dea252ea5253b7fc88c6ffa52ed53a168798923313c86` |
| [scripts/browser/pet-offscreen-clock.test.mjs](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-offscreen-clock.test.mjs) | `c97bb98767a77c40de3a7eedcd725adcc112e382981309916b8cc04bccbefdcf` |

- Revised [offscreen-clock-freeze.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/offscreen-clock-freeze.json) SHA-256: `82807c92b290db7145995eeefc462c365b0f71f522245473c5d7596280cd590a`.
- Revised [offscreen-clock-source.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/offscreen-clock-source.diff) SHA-256: `18c4d1c7cf0829a0e7d0278f7dcace40c339378a8116e9e40103369207ba462f`.
- [offscreen-clock-verification.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/offscreen-clock-verification.json) snapshot read for this amendment, SHA-256: `575890c83e3c7f4bb53671ca61ac08582a136b7372ca902b530aff9620b9a6e0`. Its embedded revised freeze and all 23 referenced check-log hashes matched. This binds the inspected record, not later executor updates or command exits.
- Preserved [offscreen-clock-freeze-initial.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/offscreen-clock-freeze-initial.json) and [offscreen-clock-source-initial.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/offscreen-clock-source-initial.diff) matched the original manifest and patch hashes recorded above. Before this append, the original review SHA-256 was `22997465383871aaf381853d9dbe643d3a84edd1b0db00152f857f19dbd8eff3`.

The ten surrounding files bound to the base in the original review still matched that base byte-for-byte. Next-wave artifacts and work are excluded. This amendment used only local static inspection and read-only integrity checks, with no network, tests, builds, browser execution, captures, agents or Git mutations. Only this report was changed.
