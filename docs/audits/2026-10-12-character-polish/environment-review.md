# Environment gaze static review

One low-priority finding. No other actionable issue found in the frozen change against base `727d4a99a8df91c8e71356e7451a48679de08d38`.

## Finding

### [P3] Include the upper plate's horizontal offset for the messy1 sink

Location: [interactions.ts:32](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.ts:32), with the matching expectation in [interactions.test.ts:107](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.test.ts:107).

The new sink profile says it follows the upper plate centres, but its `messy1` override projects to `(2.56, -21.22)`. In [sink.tsx:100](/home/robert/.codex/worktrees/4511/chore-pet/src/room/objects/sink.tsx:100), the upper plate is drawn with `plate(c.x + 1, c.y - 4.5, warmRed)`, where `c = iso(0.58, 0.5, 34) = (2.56, -16.72)`. The plate helper uses its arguments directly as the ellipse centre. The actual upper centre is therefore `(3.56, -21.22)`, or `(-3.56, -21.22)` when mirrored. The new test instead locks in `2.56` for this stage and consequently passes despite the missed offset.

Update just this override to project to the actual centre, for example `{ tx: 0.595625, ty: 0.484375, z: 38.5 }`, and change the independent screen-point expectation to `3.56`. This is a one-unit accuracy defect in object SVG coordinates. The current target still lies within the plate, so this finding does not imply a standing, contact, or action safety regression.

## Geometry and behavior checked

The renderer uses `x = 32(tx - ty)` and `y = 16(tx + ty) - z`. Subtracting `z / 32` from both tile axes preserves x and raises y by z. Swapping the local axes for odd rotations negates screen x and preserves y, matching `PlacedArt` in [Room.tsx:83](/home/robert/.codex/worktrees/4511/chore-pet/src/room/Room.tsx:83). Rotations 2 and 3 repeat the corresponding even and odd art, consistent with the existing footprint rules.

| Detail | Derived unmirrored screen point | Assessment |
| --- | --- | --- |
| Sink clean basin centre | `(2.56, -16.72)` | Matches the inner and outer basin polygons. |
| Sink messy1 upper plate centre | `(3.56, -21.22)` | Finding above. |
| Sink messy2 upper plate centre | `(2.56, -31.72)` | Matches the plate at `c.y - 15`; its rotation is about that centre. |
| Stove clean and messy1 lid knob | `(0, -39.04)` | Includes counter height 34, pot placement `+1`, and knob offset `-15`. |
| Stove messy2 lid knob | `(0, -42.04)` | Includes the additional lid shift of 3. |
| Fridge retained red magnet, all stages | `(22.4, -49.72)` | `rightFace(82)(0.3, 0.14)` gives height `70.52`; messy2 explicitly redraws this magnet. |
| Counter clean and messy1 tomato | `(-28.8, -1.76)` | Matches `iso(0.62, 1.52, 34 + 2)`; messy1 retains the board. |
| Counter messy2 takeout opening | `(-30.08, -14.04)` | Includes carton placement `+1` and opening offset `-14`, giving height 47. |

The optional override falls back to the ordinary gaze profile for stages without an override. `stage` already participates in the target signature. `LivingRoom` regenerates targets when stages change, and the behavior controller checks the signature during approach and interaction, so a stage change invalidates an old target even when its action remains `smell`.

The patch leaves perimeter generation, bounds checks, occupancy filtering, front preference, and path selection intact. All four profiles retain `inspect` when clean and use the existing `stink` condition action, `smell`, when messy. Every emitted target still has `contact: false`; no profile emits `reach`. The behavior controller continues to stand on the selected free tile, and `activityMotion` projects gaze separately with the existing half-tile standing offset and facing compensation. No chore completion path is added.

## Evidence and limits

Read `environment.diff`, `environment-verification.json`, `environment-captures.json`, their referenced logs, and the relevant production sources and tests. Read-only comparison against the base reproduces the supplied diff for both changed files. All 13 SHA-256 entries in the capture manifest match the files reviewed.

The saved logs support the recorded 12 initial screen-point failures, 169 focused passes, 1,899 full unit passes in 84 files, successful build, and eight production motion browser passes. Lint records the documented Wardrobe warning and the verification manifest records exit 0. These are existing execution results; this review did not rerun them.

Inspected the existing sheets containing 24 annotated detail stills and 24 behavior-derived Room stills. The capture script samples real behavior at 42% through an action for rotations 0 and 1; the new unit cases cover all four rotations. Stills support geometry and sampled placement only. Human temporal playback remains open and is outside this review.

Only this review file was written. No tests, build, browser, capture generation, or additional reviewer agents were run. Source and Git were not mutated.

## Final assessment after the P3 correction

Approved within the static review scope. The original P3 finding is resolved; its original text above is preserved. No new actionable finding in this bounded correction.

The final `messy1` override uses `{ tx: 0.58 + 1 / 64, ty: 0.5 - 1 / 64, z: 38.5 }`. This increases projected x by `32 * (2 / 64) = 1` and leaves the sum of the tile axes unchanged, so y remains `-21.22`. It now reaches the upper plate centre at `(3.56, -21.22)`. Odd rotations correctly mirror that point to `(-3.56, -21.22)`; rotations 2 and 3 retain the corresponding even and odd projection. The independent test expectation is now `3.56`, with the existing loop over all four rotations intact. This numeric correction does not change standing tiles, action selection, signatures, or `contact: false`.

Read the updated diff, verification manifest, capture manifest, relevant source lines, and saved correction logs. `environment-review-red.log` records the exact prior mismatch, actual x `2.56` against expected `3.56`. `environment-review-green.log` records 169 focused passes after correction. The regenerated manifest contains 24 samples, and its two `messy1` sink samples report the corrected mirrored points, unchanged standing tiles, `smell`, and `contact: false`. The current interaction profile and relevant sink, plate-helper, and capture-script hashes match the regenerated manifest. The reviewed profile SHA-256 is `da4417bf00df0d7d34358ee474067ae075435c13a03f600787defecd1f3ebaaa`.

Full-suite, build, and browser evidence predates this correction, as explicitly labeled in the updated verification manifest. This approval does not represent a rerun of those checks or human temporal playback. Re-review was static only, ignored the disjoint creator-preview batch, and wrote only this appended assessment. No tests, build, browser, captures, agents, or Git commands were run.
