Batch40 concern appendage polish, independent report-only review

Disposition: accept the frozen Batch40 change within the source, numeric evidence and still-image scope. No actionable findings at P0 through P3 severity. This disposition applies to the immutable input below, not to subsequent shared-workspace changes or Batch41.

The reviewed [concern-follow-review-input.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-review-input.json) has exact SHA-256 `cef26201e98b113ff49ebda83663b4c173ae09af66b3407380e97f656e550015`. Review date: 2026-10-12. Workspace: `/home/robert/.codex/worktrees/4511/chore-pet`.

Scope covered the six frozen source files, the eight declared unchanged dependencies, the frozen patch, all 16 manifested artifacts and all 12 raw log/exit pairs. I reviewed the production sampler, unit and native assertion code, capture and differential scripts, and relevant unchanged rendering, interaction, blending and clock code. I inspected all nine PNGs through `view_image`. I used the requesting-code-review criteria and performed the review myself. No builds, test runners, project scripts, browsers, installs, network, Git mutations, extra agents or external messages were used. Lightweight checks read files, hashes, stored numbers and Git objects. This report is the only written file.

Integrity verification found no mismatches:

| Binding | Independent verification |
| --- | --- |
| Freeze | Standalone `concern-follow-freeze.json` equals the input's entire `freeze` object. |
| Six sources | All SHA-256 values match for `motion.ts`, `motion.concern.test.ts`, `pet-concern-follow.test.mjs`, `ART.md`, `capture-concern-follow.mjs` and `compare-concern-follow.mjs`. |
| Eight unchanged sources | All hashes match both the workspace and baseline Git blobs for `AnimatedCharacter.tsx`, `species/animatedBody.tsx`, `parts.tsx`, `activityMotion.ts`, `LivingRoom.tsx`, `usePetMotion.ts`, `behaviour.ts` and `interactions.ts`. |
| Baseline | Git resolves `906aedcc8b752d7e2e391b158a8262a437feb8cf` exactly. The saved baseline sampler equals that commit's `src/character/motion.ts` byte for byte, SHA-256 `b551fa03994d7689c27e3076e136c8457af29c5b30aa9a1dbd6b730191f077af`. |
| Patch | `concern-follow-source.diff` matches SHA-256 `d6fb2a5c5e954fcbe72f404b4bf0ede5d8b5c2c6e4e9b9068191223bdf638b22`. Reconstructing its six resulting files in memory from baseline content yields the exact six frozen workspace files. |
| Manifest | `concern-follow-artifacts.json` matches SHA-256 `96ca587c05f1c2ae862070a116f8a6ff041f8c9fb5c6a5a50bf2eb56eaa334e9`. All 16 listed files match their hashes: baseline, three numeric JSONs, six static PNGs and three native JSON/PNG pairs. |
| Nested captures | Both before/after JSONs bind eight source entries and three PNG entries correctly. Before uses the exact baseline sampler; after uses the frozen current sampler. Additional nested bindings for `Character.tsx`, `palette.ts` and `geometry.ts` also match current bytes. |
| Nested differential | Baseline, current sampler and runner hashes match their actual files and the corresponding freeze/manifest entries. Counts reconcile to 43,200 frames, 42,408 exact and 792 allowed appendage-only changes, 264 per species. |
| Raw checks | All 12 log hashes and 12 exit-file hashes match. Every exit-file value agrees with its input entry. |

The stored check evidence reads as follows. These are root's recorded runs, not fresh test executions by this reviewer.

| Check | Exit | Evidence |
| --- | ---: | --- |
| build | 0 | TypeScript and production build complete; the log includes a bundle-size advisory. |
| capture-before | 0 | 144 size views and three appendage curves written. |
| capture-after | 0 | 144 size views and three appendage curves written. |
| diff | 0 | Empty raw log, consistent with the recorded whitespace check; the command itself is not printed. |
| differential | 0 | 43,200 compared; 42,408 exact; 792 appendage-only differences. |
| focused | 0 | 255 tests across eight files, 4.97 seconds. |
| full | 0 | 2,277 tests across 112 files, 74.91 seconds. |
| lint | 0 | Recorded `oxlint` run, no diagnostics. |
| native-red | 1 | Four fixture timeouts waiting for `Feeling content`; these do not establish a motion failure. |
| native-red-corrected | 1 | Three actual appendage-speed failures and one reduced-motion pass, 5.760 seconds. |
| native | 0 | 13 passes: three normal concern, one reduced concern, six attention cases across two rotations, and three rest cases; 21.258 seconds. |
| red | 1 | Six failures out of seven: three excursion bounds and three sign-change counts; reduced-motion case passed. |

The production change is confined to [motion.ts:79](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:79) and [motion.ts:390](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:390). Healthy concern now uses one sine cycle with species gains of 0.35, 0.4 and 0.35. The phase advance puts the first zero crossing before the follow envelope becomes active for every species, removing the small initial counter-movement. The existing smoothstep envelope and finite-action guards preserve zero endpoint position and velocity. Happy mood has the largest energy factor, so the other healthy moods reduce the same gesture. Sick concern retains the original two-cycle expression, and reduced motion returns before the changed calculation. Other actions retain their original arithmetic. Duration, torso, arms, gaze, lifetime blink, feet, shadow and expression calculations remain unchanged.

I checked the numeric capture data against that formula without executing project code. All 701 points per species in each before/after curve agree within floating-point rounding, maximum error below `2e-15` degrees. Before curves have three sign changes; after curves have one. All 48 paired sheet samples retain identical non-appendage fields. The [differential script:18](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/compare-concern-follow.mjs:18) checks every frame field outside the allowed healthy concern appendages over three species, five moods, 16 actions, three durations, two motion preferences, two facings and 15 phases. It separately checks exact action-duration constants.

The [unit assertions:14](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.concern.test.ts:14) examine both appendages at every millisecond of the normal 1,800 ms gesture. They check upper and lower excursions, speed, neutral endpoints, final settling speed, fixed body translation, planted feet, absent accents and unchanged shadow. Further assertions check one sign change at 900, 1,800 and 3,600 ms, and zero appendages under reduced motion across all species and moods. The source and differential cover the preserved torso and other fields beyond the unit file's explicit assertions.

The [native assertions:102](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-concern-follow.test.mjs:102) sample real appendage SVG matrices and RAF timestamps after the orientation blend. The fixture uses a genuinely late linked plant chore, happy mood and a complete five-slot outfit. It checks one pending RAF, stable idle pose and container position, local foot contact, retained resident DOM identity, unchanged announcement and saved tables. The reduced-motion branch separately checks a visible body, unchanged body markup/position, zero pending RAFs and the existing 3,600 ms speech lifetime.

I independently recomputed each native JSON's peak, adjacent-sample speed and sign-change count. Each has 96 samples, all 16 ms apart, one pending RAF per sample, one position and idle pose throughout. Maximum local foot drift is below `0.000013` units, well within the asserted `0.01`.

| Species | Peak degrees | Maximum degrees/second | Sign changes | Native evidence inspected |
| --- | ---: | ---: | ---: | --- |
| Mochi | 1.749473 | 7.956505 | 1 | [JSON](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-native-captures/concern-follow-room-mochi.json), [PNG](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-native-captures/concern-follow-room-mochi.png) |
| Bun | 4.784958 | 22.013947 | 1 | [JSON](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-native-captures/concern-follow-room-bun.json), [PNG](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-native-captures/concern-follow-room-bun.png) |
| Sprout stem | 1.218638 | 5.694602 | 1 | [JSON](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-native-captures/concern-follow-room-sprout.json), [PNG](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-native-captures/concern-follow-room-sprout.png) |

The other six PNG inspections were [before light sizes](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-before-light-sizes.png), [after light sizes](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-after-light-sizes.png), [before dark sizes](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-before-dark-sizes.png), [after dark sizes](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-after-dark-sizes.png), [before curves](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-before-curves.png) and [after curves](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/concern-follow-after-curves.png). The sheets cover both facings at four phases and 200/60/25 px, with light happy and dark-bodied scruffy variants. The after art preserves recognizable species, outfit placement, face and ground contact with no new visible clipping. Bun retains the largest appendage movement; Mochi and Sprout settle more quietly. All three native room stills show the dressed resident beside the plant, the late chore, happy status and the existing invited observation. These observations agree with the scoped [ART.md claim:201](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md:201).

Findings: none. No production correction, assertion correction or evidence correction is required for this scoped disposition. The initial native fixture failure is correctly disclosed as a fixture failure, while the corrected red log supplies the relevant old-motion failure evidence.

Limits and behaviors set aside are explicit:

- Batch41 App, PetExplore, CSS and new tests were excluded as instructed and were not reviewed or modified. This report makes no integration or merge-readiness claim for that work or the whole current checkout.
- No human motion playback, physical-device, assistive-technology, CPU, battery or broad accessibility acceptance was performed. The native evidence uses deterministic Chromium 152 with a frozen clock. Pending RAF counts support the fixture's single-clock assertion, not a general resource measurement.
- Native normal concern covers happy mood and one sampled appendage per species. Sprout's measured matrix is the stem at `0.4 * leftAppendage`, not a full leaf transform. Other healthy moods have numeric coverage and scruffy has still coverage; reduced native concern covers Mochi only. The dark sheets vary body color and mood, not application theme.
- Native motion samples span an interior 1,520 ms interval after orientation and before recovery. Full sampler endpoints have unit/source coverage. The short/long duration assertions check sway topology; the stated speed bounds apply to the normal 1,800 ms gesture.
- Sign-change assertions count zero crossings of appendage displacement, not changes in velocity direction. The input accurately calls this one sign change; the native JSON field named `directionChanges` records that same count.
- Hashes bind the supplied files and nested declared dependencies. Recorded logs do not independently attest a running process or bind every built bundle and transitive renderer dependency. Historical fixture revisions, capture setup corrections and root resource measurements remain recorded history. No such limits contradict the narrow source/still claims accepted here.
