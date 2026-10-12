# Combined final-review fix wave

2026-10-12. Base `96b185d55b2759088f90be20d9f06084b4095959`, review `finalreview96b185d`. I1, M1, M3, and M4 are addressed in the one combined wave. Covering checks PASS. Ready for root's exactly one scoped re-review. No further source edits are pending.

Read the complete final branch review, approved design and plan, constraints, ledger ruling, Task 1/2/4/5 integration/7 reports, and Task 2 ground contract. Edited the shared workspace directly. No agents, Git commands, browser access, full-suite/build/multiroom runs, broad bounds scans, or capture reruns were used. No dependencies, schema, or furniture changes. Root owns final regression, capture regeneration, publication of ignored raw logs, commits, and the scoped independent re-review.

## Changes and finding dispositions

- I1: moved only the walking boundary guard below lifetime blink sampling in `motion.ts`. Walking start/completion returns neutral geometry with the current lifetime eye openness. Reduced motion still returns a still frame before blink sampling. Finite actions retain their original early neutral guard and their blink taper. There is no new clock or endpoint resampling policy in callers.
- The exact Bun happy `(2,2) -> (3,2)` repro starts at 2650ms and arrives at 3070ms. Tests now require eye openness 0.1 immediately before arrival, at the first actual `step`/`motionFor` idle frame, and at 3086ms, including both actual SVG `data-eye-open` values and their scale transforms. The existing 120ms snapshot blend reopens monotonically to 1 by 3190ms. It no longer fully opens and partially closes again. This preserves continuity; it does not claim full idle blink amplitude during the frozen-pose handoff.
- All-species regressions cover closed lifetime walking endpoints, the actual arrival snapshot and blend, unchanged facing/full route history, neutral feet, malformed/completed walking times, zero duration, and reduced motion. The real-renderer local test checks body and sole joins in projected world coordinates with a 0.001 scene-unit bound across the 0.001ms interval.
- Shared travel already passes lifetime `blinkMs` to the same sampler. Its actual renderer test ends a one-tile journey at 3070ms, retains both closed eye transforms, settles body/feet, preserves character identity, and calls arrival once with no outstanding frame. `HomeTraveler.tsx` and `activityMotion.ts` needed no production changes.
- M1: removed the redundant `interact` switch-branch validation. The earlier check still runs before stationary relocation. Walk-target validation remains. Existing behavior tests cover target removal/movement/rotation through approach, orient, action, and settle. No new behavior/API was introduced.
- M3: dialogue uses the same own-property/default-clean stage lookup as `interactionTargets`. Six actual LivingRoom cases cover `constructor`, `toString`, and `__proto__` with empty ordinary stage/neglect records, clean wording and healthy wave behavior, then explicitly owned messy stages with appropriate condition wording and concern behavior. Existing ordinary-ID positive-neglect and clean-neighbor regressions remain passing.
- M4: `verification.json` now indexes the actual integrated commands and relative paths to `unit-tests.log`, `lint.log`, `build.log`, `browser-tests.log`, `multiroom-tests.log`, and `bounds.log`. Existing integrated counts/results/captures are explicitly pre-wave at 96b185d. Fresh focused evidence has its own entry. REVIEW.md describes these statuses and the raw logs' pending force-add accurately. No fresh integrated gates or counts were invented.
- M2: formally deferred by root's existing ledger ruling. No layer cap, truncation, consolidation, or blend/release refactor. No normal-use failure is demonstrated; arbitrary truncation risks the reviewed contact continuity.

## Exact covering commands and observed results

All commands ran from `/home/robert/.codex/worktrees/4511/chore-pet`. Log paths below are relative to this report's directory, `.superpowers/sdd/2026-10-11-character-animation/`. The test command used for every red/green run was:

```sh
npm test -- src/character/motion.test.ts src/pet/activityMotion.test.ts src/pet/behaviour.test.ts src/pet/PetIntegration.test.tsx src/character/AnimatedCharacter.test.tsx
```

Each run redirected stdout/stderr with `> LOG 2>&1` to the named path.

| Run | Exit and exact summary | Log |
| --- | --- | --- |
| Initial red before production changes | Exit 1; 13 failed, 237 passed, 250 total; four failed files, one passed | `final-fix-red.log` |
| Scoped red before production changes | Exit 1; 12 failed, 235 passed, 247 total; four failed files, one passed | `final-fix-red-scoped.log` |
| First implementation run | Exit 1; 7 failed, 240 passed, 247 total; two failed files, three passed | `final-fix-green-initial.log` |
| Green after fixture corrections | Exit 0; 247 passed in five files; 11.49s | `final-fix-green.log` |
| Final covering run after the type annotation and condition-phase assertion | Exit 0; 247 passed in five files; start 14:50:42, duration 11.65s | `final-fix-green-final.log` |

Final observed Vitest output:

```text
Test Files  5 passed (5)
     Tests  247 passed (247)
```

The red runs reproduce the old 1-versus-0.1 sampler/local/travel endpoint snap and all three reserved-ID clean-dialogue failures. The focused raster test also rejects the old open-eyed walking endpoints. Explicit owned-stage condition cases already passed. M1 is redundant-code removal covered by existing target-invalidation regressions, and M4 is evidence indexing; no fabricated red failures are claimed for them.

The initial red additionally exposed `TypeError: names[o.id].toLowerCase is not a function` in existing `src/room/roomSummary.ts:36` for `__proto__` with an explicitly positive neglect value. This is outside the authorized source scope and predates this wave. Removed only the extra positive-neglect reserved-ID fixture variants, retained all three requested empty-record cases and all three explicitly owned-stage condition cases, and reran red before production edits. The crash remains disclosed below.

The first implementation run's seven failures were test-fixture mistakes. Three numeric arrival comparisons used a 0.00005 tolerance below the ordinary 0.0001533 SVG-unit travel over the sampled interval. One renderer-body comparison similarly differed by 0.000050595 scene units. The joins now use a still-strict 0.001 bound while eye transforms retain 12-digit assertions. Three healthy-wave assertions sampled the initial orient-to-action blend at progress zero; they now sample at 2600ms after that blend. No production geometry, expression timing, or routing changed for these corrections.

Typecheck initially found a test-only TS2345 error because the default blink parameter inferred the fixture's literal union. Annotated that parameter as `number`; runtime expectations did not change. Initial diagnostic is preserved in `final-fix-typecheck-app-initial.log`.

Final typecheck and scoped lint commands, each with `> LOG 2>&1`:

```sh
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit --incremental false
./node_modules/.bin/tsc -p tsconfig.node.json --noEmit --incremental false
./node_modules/.bin/oxlint src/character/motion.ts src/character/motion.test.ts src/character/AnimatedCharacter.test.tsx src/pet/activityMotion.test.ts src/pet/behaviour.ts src/pet/LivingRoom.tsx src/pet/PetIntegration.test.tsx
```

All exit 0 with no diagnostics. Logs are `final-fix-typecheck-app.log`, `final-fix-typecheck-node.log`, and `final-fix-lint.log`. These empty files reflect silent successful commands. Both compiler configurations were checked without a production build or incremental-cache writes.

## Geometry, bounds, and captures

A focused in-memory before/after sampler comparison ran with `node --input-type=module`, reading the saved pre-wave sampler at `/tmp/chore-pet-final-fix-base/motion.ts` and current `src/character/motion.ts`. It compared 480 walking samples: all three species/five moods, eight start/interior/end/completed times, durations 0/420, normal/reduced motion, a mirrored uphill path, and each species' closed lifetime phase. Every MotionFrame field except `eyeOpen`, including expression, was exactly equal. Eye openness changed in 195 expected boundary cases. Exit 0; output in `final-fix-geometry.log`:

```json
{"compared":480,"unchangedFields":"all MotionFrame fields except eyeOpen, including expression","changedEyes":195}
```

The added renderer test performs 24 padded Resvg renders. Matrix: three species, happy/scruffy, start/end walking boundaries during a closed lifetime blink, combined beanie/glasses/scarf/overalls/backpack, and outline scales 1/1.6. All have zero painted pixels above alpha 5/255 outside the unchanged 200-unit art box. This is part of the passing 247-test covering run, not a separately claimed broad scan. Existing uphill, handoff, partial-arrival, and reaction bounds tests also remain in that covering file.

Retain the historical 42,660-render scan with its pre-wave label. The only altered output is bounded eye height, contracted about the existing eye centers; all torso, limb, contact, gaze, shadow, facing, and wardrobe geometry remains unchanged. Renderer/face source hashes match the historical manifest. The focused endpoint matrix checks the new closed endpoint combination explicitly. This supports retaining the historical scan plus focused checks without repeating 42,660 bounds renders. It does not turn the sampled matrix into an exhaustive appearance claim.

Sampler SHA-256 changed from `5ccdcc29b4aa5b22223be52593c82e93bb3cab751a5ebf7be54fb97aff96ec44` to `5e1f316efcb2612a6b0a2d53009785892ee3ad999580bf910fea5c39a67e4e8b`. `behaviour.ts` is now `4bed9fcf40912fba2733ed5cdb17d302af59a1e42f7ebfeca78e7c17f5fbd472`. Capture provenance must therefore change even though geometry does not. Root regenerates the 42 sheets and ten videos and updates manifest/clip provenance. This wave did not run captures or certify root's in-progress render.

`final-fix-audit-index.log` verifies that all six indexed historical raw logs exist and are nonempty, historical counts remain pre-wave, and source hashes match the old manifest except the two expected amended files. The animated renderer, articulated body, Character composition, face renderer, activity adapter, and capture script are unchanged.

## Exact changed files and self-review

Production files:

- `src/character/motion.ts`
- `src/pet/behaviour.ts`
- `src/pet/LivingRoom.tsx`

Tests:

- `src/character/motion.test.ts`
- `src/character/AnimatedCharacter.test.tsx`
- `src/pet/activityMotion.test.ts`
- `src/pet/PetIntegration.test.tsx`

Audit documents:

- `docs/audits/2026-10-11-character-animation/verification.json`
- `docs/audits/2026-10-11-character-animation/REVIEW.md`

This report and `final-fix-*.log`/`final-fix-self-review.diff` are scratch evidence. `behaviour.test.ts` was run unchanged; `activityMotion.ts` and `HomeTraveler.tsx` were inspected and exercised unchanged.

Self-review compared every amended source/test/audit file against pre-edit copies without Git. Checked the finite guard and blink taper, reduced-motion early return, walking start/end/infinite/zero-duration behavior, snapshot lifetime sampling and monotonic reopening, local world/body/sole joins, shared travel's endpoint/callback/clock cleanup, target validation before relocation, unchanged walk-target validation, owned versus inherited stage lookup, ordinary condition/player/live-region behavior, exact audit commands/log paths, historical/fresh status separation, and captured-source hashes. Production changes are limited to moving one guard, deleting one duplicate condition, and replacing one stage lookup. Ground math, facing/history, release retention, priorities, one-clock ownership, static art, finite gesture endpoints, and furniture are preserved.

## Remaining limits and root handoff

- Ready for exactly one scoped independent re-review of this combined wave. No independent approval is claimed by this author report.
- Root owns fresh integrated regression counts/logs, source-bound capture regeneration, force-adding the six ignored raw logs, and commits. The JSON/REVIEW integrated counts remain pre-wave until root updates them.
- M2 remains formally deferred. No stress rerun or hardening was added.
- Existing `__proto__` plus positive-neglect room-summary crash remains outside this wave. Requested M3 empty ordinary records and explicitly owned-stage condition paths pass; support for positive-neglect reserved IDs across the whole Room is not claimed. Evidence is preserved in `final-fix-red.log`; relevant existing functions are `objectNames` and `neglectSummary` in `src/room/roomSummary.ts`.
- Human normal/slow temporal playback remains OPEN under the existing tool-policy block. No bypass was attempted. Passing focused checks, still rasters, and regenerated clips cannot close this acceptance gate. No merge/full visual acceptance claim.

## Preserved evidence

This report is copied from the implementation scratch workspace. Its named `final-fix-*.log` files are preserved in [fix-wave](fix-wave/). Root final results and regenerated capture provenance are recorded separately in verification.json.
