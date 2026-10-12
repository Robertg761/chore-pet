# Batch 15 resident idle scheduling review

Decision: approve the frozen six-file change with the verification limits below. No actionable implementation findings were found in this independent static review.

Reviewed on 2026-10-12 against base and HEAD `20c825f5f91f2ee5adfe180f2aa362b4b2d49a05`. Inspection was sequential, bounded and read-only. The only reviewer write is this report. No tests, builds, browser sessions, Git mutations or agents were run.

## Source binding

Frozen artifact: `motion-scheduling.diff` in this directory.

SHA-256: `7865ed8c1b0c3ac7521e8e416c67b5fbb4cd914709b616f9ff851820eef2bea1`.

The artifact contains exactly the six requested files. A read-only Python inspection reconstructed every complete postimage in memory from the base blobs, checked every hunk's context and line counts, checked the old/new Git blob-ID prefixes, and compared the resulting bytes with the working files. All six matched. The new browser test is absent from the base and its complete addition also matched. No patch was applied to disk or to the index. Artifact and source hashes remained stable across review checks.

| File | Postimage SHA-256 |
| --- | --- |
| `src/pet/usePetMotion.ts` | `03ea73bb227214e99a5100174e8a754d70799da24e587f7cac9c2d6c091adefb` |
| `src/pet/usePetMotion.test.tsx` | `9daeb9594648ffef0dc69555f223cac97ba1771a95d3e5db83dd564077972713` |
| `src/pet/LivingRoom.tsx` | `a6d243023139e86f5f18eb0308d71e2c19f2fe1f9091058e5bf4d0ae34e9970f` |
| `src/pet/PetIntegration.test.tsx` | `1fca47b74b99e133e3336134324d9216895c04e81fbfd1fabe3dee43c9b6a3f6` |
| `scripts/browser/pet-explore.test.mjs` | `130074fb84ee57c34c3aefa71025b67ba7109cf244a33056cb4a35cddb7b1e0e` |
| `scripts/browser/pet-idle-clock.test.mjs` | `367d4b77c6395e5bd4eaab3e481db40312500209b2f774440b91d6324fddf6a5` |

Supporting inspection covered `behaviour.ts`, `activityMotion.ts`, `HomeTraveler.tsx`, the character sampler and renderer, all other `usePetMotion` callers, and browser helpers. These are context for the six-file review, not additional approved edits. Existing changes to `docs/ART.md` and `PROGRESS.md` were outside the implementation review.

## Scheduling and lifecycle assessment

- **Policy and callback stability.** `usePetMotion.ts:15-28,44-74` preserves the Boolean API and derives a Boolean `running` value for the new policy object. The scheduling effect depends only on that value. A fresh object on each character render therefore does not cancel and replace an equivalent pending callback. The latest committed tick and preference handler still use layout-updated refs.
- **Races and stale callbacks.** The existing `disposed`, pending-ID and hidden-document checks remain in place. Cleanup marks the old effect disposed, removes its visibility listener, and cancels its pending request. A canceled callback delivered after hide/resume fails the ID check; one delivered after deactivation, reactivation or unmount fails the old effect's disposal check. A tick that synchronously unmounts the consumer cannot rearm it. The new gate adds no second scheduler.
- **Hidden tabs and preferences.** Visibility cancellation remains synchronous in the visibility handler, and delivery checks `document.hidden` again. The media subscription remains mounted while scheduling is inactive and updates `preference.current` before requesting the React state update. A callback delivered before that update commits reads the new preference. Policy cancellation itself follows effect cleanup; this review does not claim synchronous cancellation inside the media-change handler. Inactive residents do not acquire a frame merely from hide/show.
- **Resident policy.** `LivingRoom.tsx:94-102` keeps ordinary healthy normal-motion residents active. Sick/away residents retain frames only for an unexpired reaction/notice or unfinished transition. Reduced-motion residents retain frames only for an unexpired reaction/notice. These conditions use the same sampled state/time as the rendered motion. They do not use object identity as the activity signal.
- **Before-paint validation.** `LivingRoom.tsx:103-115,124-134,171-179,214-233` retains the imperative paint handle and layout tick independently of scheduler activity. World changes replace `tick` through its `world` dependency, and preference changes are explicit layout-effect dependencies. Occupancy, suppression, route cancellation, position reporting and art sampling therefore still run on those commits while rAF is paused. The added reduced-idle occupancy regression checks a changed transform and reported position without delivering a frame. Existing suppression/blocked-route ordering is unchanged.
- **Finite completion.** Reaction expiry still passes through `step`; notice expiry still passes through the sampler's `ACTION_MS.notice` check. Each tick paints a new sample, so the gate becomes false after a reduced response or resting notice ends. A normal suppression transition stays active until `blendProgress` reaches one at 120 ms. Old retained transition/notice metadata cannot keep scheduling active after its deadline. Cleanup cancels any successor requested before the terminating React update commits. Hidden finite work settles against elapsed monotonic time on a subsequent visible tick rather than adding a timer.
- **First mount.** `LivingRoom.tsx:175-180` initializes only away/sick residents directly as sleep/sick, with away taking the existing behavioral precedence. It does not fabricate an outgoing idle transition for a pose never shown. Tile selection, facing, beat and healthy first mounts retain `initialPet` behavior. Later suppression still uses the real outgoing state and its existing 120 ms blend.
- **Bounds and other callers.** Repeated-tap coalescing, reaction priority and stale hidden-tap rejection remain in unchanged behavior code. The change adds no production timers, persistence, listeners per sample, or motion layers. Creator/Wardrobe previews, HomeTraveler, MotionReview, GalleryMotion and EffectReview still pass Boolean activity and retain their prior scheduling/preference semantics. Existing tests cover Boolean reduced ticking, Strict Mode cleanup, callback replacement, hidden delivery and unmount during a tick.

The changed Explore assertion correctly expects zero pending frames after reduction and an observation from the current position. The new production test instruments both pending requests and delivered callbacks, checks a settled idle interval, activates the resident by keyboard, then checks a finite response returns to zero. It uses the existing offline production helper. Its IndexedDB writes are isolated test-fixture setup, not production persistence changes.

## Recorded evidence and limits

These are observations of existing log bytes, not independently executed checks or witnessed process exits. The logs contain no source-hash manifest tying their execution to these exact postimages. Hashing them records what was read; it does not establish that missing provenance.

| Existing log | Observed result |
| --- | --- |
| `motion-scheduling-red.log` | Seven expected failures: five resident cases and two policy cases; 88 passed. |
| `motion-scheduling-green.log` | Three remaining failures: two unshown initial resting blends and the obsolete reduced-idle expectation; 92 passed. |
| `motion-scheduling-focused.log` | 96 passed across the hook/integration files. Current source contains the direct resting initializer, corrected assertion and added paused-occupancy case. |
| `motion-scheduling-browser-red.log` | Three cases fail at the initial pending-frame assertion, actual 1 versus expected 0. Per the supplied handoff, this was the older production artifact. It is baseline evidence, not a browser result for the reviewed source. |
| `motion-scheduling-browser.log` | Completed footer records 17 passed, 0 failed, no cancellations/skips, 22,086.586692 ms. Diagnostics identify Chromium `152.0.7977.82`. This includes three static-idle/finite-response cases, six Explore cases and eight resident regressions, with live preference changes. The owner identifies this as the completed batch 15 production run. |
| `motion-scheduling-build.log` | The log now includes `tsc -b && vite build`, completed Vite output and generated service-worker output. It also contains the chunk-size warning. This reviewer did not run the command or witness its exit. |

Observed log SHA-256 values:

```text
motion-scheduling-red.log         ffa0d1b3929910f803f4ce59fb531fbc15fd5c75b5a801b7132110e773b496b5
motion-scheduling-green.log       7cf5672fc5e6df9e5249bd03131ab89f6dbb4b08e2cdb2810195ff5daa26ca81
motion-scheduling-focused.log     644d0982381eb3cd2f6e1202542ae04b2a11bbcc668157ceba56590aee386f37
motion-scheduling-browser-red.log fe9c434108cade0485ae78075468b953c921fc1ce5b5de41bd3e2a2447fb4973
motion-scheduling-browser.log     b94c6df76f2deea224d9287f7e6beaaa8c8cc42101fb4940dec3a7b15a61f880
motion-scheduling-build.log       2a9dcc26e6c31e9edcec6f8c1644af60ab18a10d1e6226f50597ece247f4cc42
```

The completed browser log supports the owner's reported zero-idle/finite-response behavior in that production run. The frozen artifact and all six postimage hashes were rechecked unchanged after reading it. The owner reports that original build/browser process-exit metadata was lost after compaction and will be recorded as `null`; a successful-looking footer does not recover that metadata. This reviewer certifies neither exit. The full unit suite is still running with one worker per the latest handoff; no full-suite result is included in this approval.

Approval covers the inspected implementation and test design, with the recorded execution evidence attributed above. The owner must bind the full-suite result and exact source/build provenance separately. This review certifies no root exits, human temporal playback, assistive-technology playback, or measured CPU/battery savings. It does not independently reproduce browser scheduling or React commit timing. Any change to the frozen artifact or listed postimages requires another review of the changed bytes.
