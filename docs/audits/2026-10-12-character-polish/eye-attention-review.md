# Independent eye-attention review

Reviewed on 2026-10-12 under `superpowers:requesting-code-review`. Static and image review found no critical or important defects in the frozen eight-file patch. Product changes are acceptable from this review; the root retains the full-unit-suite gate and certifies runtime process exits. Two minor evidence qualifications below should carry into the final audit.

Review used sequential, small read-only inspections and viewed the four final PNG sheets. No reviewer tests, builds, browsers, agents, Git mutations, or product edits were performed. This report is the only reviewer-written file.

## Artifact and source binding

Workspace: `/home/robert/.codex/worktrees/4511/chore-pet`.

Base `9b5b4f8` resolves to `9b5b4f895b9fcba809329b7c60c5385b297701ec`.

Frozen [eye-attention.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention.diff) SHA-256:

`516b4de4a18038fb3bb189a790c8c7bd6b62675f4b8ee119f1d97fd55b0717c8`

All eight current files match the diff's resulting Git blob IDs. Each existing file's old blob also matches the stated base. The three added files have the expected absent-base entries. Current SHA-256 bindings are:

| Reviewed file | SHA-256 |
| --- | --- |
| [AnimatedCharacter.test.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/AnimatedCharacter.test.tsx) | `9f088e42cb654ec6cc261331198777f5a893dbcd89a2f527c2fb7abf3b902bee` |
| [parts.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/parts.tsx) | `a8b8c317d402d6a264fddc5df6b2d8a7fb0f4c9c79c8c1ffe16e00701f67cb0b` |
| [animatedBody.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/species/animatedBody.tsx) | `49b859fb69c5ecc456d310751108071c3a109038d40e76c1cd099d2f7bbd74ae` |
| [activityMotion.test.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.test.ts) | `434f36f6c70abac2435f8a318306bca8d818b3919bce7a03e4b878ff85e4d834` |
| [activityMotion.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts) | `bc05961f19363d693378e1fd01cc04f9eec312f3b8000bd01e3ccd0c5762583b` |
| [environmentAttention.test.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/environmentAttention.test.ts) | `d2a608675b48e951eb9340ea4f99d709f0b75a968012474e1c098a88234005c1` |
| [pet-environment-attention.test.mjs](/home/robert/.codex/worktrees/4511/chore-pet/scripts/browser/pet-environment-attention.test.mjs) | `201cba338f3eab4941da0e023bf302c2bed13e33f204b77d6b205bcc338c68e2` |
| [capture-eye-attention.mjs](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/capture-eye-attention.mjs) | `8ffe185b07782b07fc7aefab50b6cc203509aebf1e5c6fdf5e3cc502bb31d232` |

Both manifests' ten listed source hashes and both image hashes match the files inspected. The seven sources shared between before and after, including the capture helper, have identical bindings. The before manifest lists exactly three overrides; the after manifest lists none.

| Stored before override | Exact base Git blob | SHA-256 |
| --- | --- | --- |
| activityMotion.ts | `25199673af514c5783aff16d29e12cf4edf8efe6` | `6401e236e3a3d71d6cba8d30f66986f3e40a0ba05f35c26b057d59139518452a` |
| animatedBody.tsx | `20db8b93cf7b7a3582ce0f20672754a3265c6ab6` | `e338788eeb57e5c7f651d198f8ecfd85925ce33c9e0cd7528f45575cf8b79212` |
| parts.tsx | `3842d09ea8b4f24d0851a5785dd26e6721a63013` | `de2ccd72ba68d5ededd87f89d99e7d4275608b138c6ae04fadaac2dd9ccc399d` |

Read-only `git show` comparison confirmed all three stored `.txt` files are byte-identical to the base blobs. The helper reads those files and substitutes their content through Vite's pre-transform hook only for `before`; it does not overwrite source or invoke Git. This verifies the supplied baseline contents and declared overrides. It does not turn a manifest into an execution trace or bind every transitive asset dependency.

| Inspected artifact | SHA-256 |
| --- | --- |
| [Before manifest](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-before.json) | `b6c72864455bd5d860787e48ab30991548f2cd24f66d91d02a4e47a8a66fe836` |
| [After manifest](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-after.json) | `3c4f363e3c3ad3e17f86c68422bd9612e46c012a68908fc33a9fd18b5b34fe16` |
| [Before rooms](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-before-rooms.png) | `295f9064ed7b70c35aeed417627879cec9780d59b8f160a9dd6fff4bd1cc7d1f` |
| [After rooms](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-after-rooms.png) | `75b5aaebf545c01a1046a60477b1507c201c4d1c7d841ddc64912f76edd96f92` |
| [Before sizes](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-before-sizes.png) | `f2a2d9b81fd5cf5108ec891edb795aae89abc8a28c512e6138c987199ef17de4` |
| [After sizes](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-after-sizes.png) | `c1bb5ec584e0c9a2064095615f0233d5a8ae15b52ee425e5c5ad5d59e316ae43` |

## Static assessment

- [articulatedFaceDelta](/home/robert/.codex/worktrees/4511/chore-pet/src/character/species/animatedBody.tsx:58) reverses the actual translation, rotation about `100,181`, and anisotropic torso scale in the correct order. Subtracting the shared eye height and tired-eye offsets matches the raw drawn ellipse centres. The renderer and inverse use the same finite-frame guard, keeping scale divisors positive. Sick and sleeping poses retain their existing separate static path.
- [frameFor](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts:107) converts absolute room gaze into the character container using the standing half-tile offset, `PET_SCALE`, foot reference `182`, and facing sign exactly once. A single elliptical normalization bounds gaze to the renderer's three-by-two limits and preserves direction through scale, rotation, and mirroring. Container rounding remains the documented small approximation.
- Inspection lean changes only during the `inspect` action phase. The upward fraction is bounded from zero to one, so the multiplier is between `-.25` and `1`; overhead inspection softens or reverses lean while low inspection keeps its original lean. No route, foot-contact, shadow, action deadline, blink clock, or other action's lean calculation changes.
- The zero-attention return preserves neutral endpoints, including the prior signed-zero concern. Reduced motion and settling return before target adjustment. Snapshot replay still calls the same frame function at the frozen snapshot time, and outgoing mirroring/blending remains intact. No new retained state, listener, timer, requestAnimationFrame loop, persistence write, or transition-tree retention is introduced. The exported helpers are additive; existing call signatures remain intact. Added per-frame work is bounded arithmetic and small temporary objects.
- Rendered tests use raw ellipse centres and an independent transform evaluator across all three species, four upright moods, and both facings. The direct inverse test keeps its strict accuracy assertion. Direction tests use physical perpendicular distance with a `.005` room-unit tolerance for the existing `.01` placement rounding. The browser test independently uses native SVG screen matrices and its own documented object target points; its `.005` tolerance is in CSS pixels. It waits for open eyes, so exact direction while a blink compresses eye ink is outside that assertion.
- The invitation code clears the previous audible observation before the next route, so the browser test's second arrival wait does not reuse the first furnishing's announcement. Its final table comparison checks saved-state preservation.

## Image assessment

Viewed every cell of the final before/after sheets: 12 Room views and 36 dressed size views per side, spanning three species, valid poster/teddy placements, both mirrors, and 200/60/25-unit character views. These are SSR-rendered production components rasterized with Resvg, sampled at 42% of inspection, rather than browser screenshots or playback.

The final poster samples look upward with a restrained backward tilt. Teddy samples look downward while keeping the forward inspection. Both facings agree. Feet remain grounded, clothing follows the torso, and no new clipping or detached accessories are visible. The 25-unit views support a small-scale silhouette check; precise eye direction is better established by the geometry assertions and larger views.

Manifest comparison confirms all sample metadata is unchanged. Only `gazeX`, `gazeY`, and poster `lean` differ between before and after. Other sampled frame fields, standing positions, targets, facings, and `contact: false` remain identical.

The preserved [interior-sample README](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-interior-samples/README.md) correctly disclaims invalid wall placement and the older eye limits. Those samples are historical geometry evidence, not acceptance evidence for placement or final rendering.

## Findings and evidence qualifications

Critical: none. Important: none. No product-source fix is requested.

1. Minor audit wording correction. [eye-attention-eye-offset-red.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-eye-offset-red.log) reports six failed tests, but they are mixed evidence. Three direction checks fail an old near-zero cross-product tolerance with differences around `.00127`; three direct inverse checks expose incorrect eye-centre placement, with x errors around `.062` to `.090` character units. Describe the run as six failures including rounding/tolerance failures and three inverse-centre failures. Do not attribute all six solely to tired-eye offsets. This does not undermine the corrected final raw-centre tests.
2. Minor lint evidence mismatch. At the final reviewer read, [eye-attention-lint.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-lint.log) still contains a `react(only-export-components)` warning for the new helper export at [parts.tsx:127](/home/robert/.codex/worktrees/4511/chore-pet/src/character/parts.tsx:127). Root reports a later warning-free lint exit. Bind that claim to its corresponding clean log, or retain the narrower claim of exit zero with this warning. The warning concerns the development refresh boundary and is not a blocking production defect. Observed log SHA-256: `85f9c5fc18aba6a95c87ec35e51f0442cf3ea938814308bd73ea0121c6a828c3`.

## Runtime evidence and limits

Read the retained initial red summary of 12 failures/51 passes and the initial 127-pass focused summary. The initial red includes missing-helper and signed-zero failures, so it is not 12 independent demonstrations of the visual defect. The corrected focused log reports 207 passes across four files in 11.74 seconds. Root supplies exit-zero certification for that run.

The final [browser log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-browser.log) reports 23/23 passes in 31.97 seconds, including all six new species/rotation tests covering both low and high targets, plus 17 existing resident/resource/exploration checks. Root separately certifies process exit zero. Observed log SHA-256: `852f1d2453b12557c78ef1b490176e4e96d7072e5239902b88942905e1cbb9dc`. The older browser red records six failures with low-target direction error around `.42` pixels.

Root reports final TypeScript/build exit zero and validated before/after capture exits zero. The retained failed baseline capture attempt is historical failure evidence: `spawnSync` Git returned `EPERM` despite stdout. The final helper uses the three stored exact blobs exported through ordinary successful `git show`, so that failed attempt is not claimed as a successful capture and no security workaround is part of the reviewed helper.

The full unit suite was still running with one worker at the root's last update. This review does not certify its eventual result. No new runtime execution was performed by the reviewer, and the source/image bindings above apply only to the frozen artifact inspected here.

## Declined to judge

- Human-perceived timing and motion comfort over full playback. Stills and automated sampling cannot establish that experience.
- Exhaustive transitive asset/build reproducibility. The manifests explicitly bind selected direct sources, not every imported renderer, asset, dependency, or tool version.
- Exact gaze direction during partially closed blinks or interruption blends. Existing eye compression and transitional blending intentionally affect the instantaneous displacement; final direction tests sample open-eye settled attention.
- Eventual full-suite completion and deployment readiness. Root owns the ongoing suite and release decision.

Static verdict: acceptable with no blocking product findings. Carry the two audit qualifications forward and require the root's final full-suite result before declaring all validation complete.

## Final amendment: helper relocation and nine-file freeze

Appended on 2026-10-12. The original review and findings above are preserved as history. This amendment covers only the moved eye-offset helper, its imports, the capture helper's added source binding, and revised artifact hashes. It introduces no reviewer runtime certification. No tests, builds, browsers, agents, Git commands, or source changes were performed for this amendment.

[eyeGeometry.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/character/eyeGeometry.ts:1) contains the identical pure `eyeCentreOffset` formula: `meh` returns `1`, `scruffy` returns `1.5`, and all other expressions return `0`. Its explicit `Mood | 'sleeping' | 'cheering'` argument is equivalent to the prior `Expression` alias. The module has only a type import and introduces no React dependency, mutable state, effect, or import cycle. Both [parts.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/parts.tsx:1) and [animatedBody.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/species/animatedBody.tsx:5) now import this shared helper directly.

Read-only text reconstruction confirmed that undoing just the helper relocation and import changes restores the exact SHA-256 of both previously reviewed product files. Removing just the new after-only source-list line restores the previously reviewed capture helper's SHA-256. The other five originally reviewed files retain their original hashes. No gaze, posture, timing, transform, or rendering formula changed.

The revised [eye-attention.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention.diff) contains exactly nine files. All nine current files match its resulting Git blob IDs, calculated directly from file bytes without invoking Git. Revised diff SHA-256:

`74f38c6fd712deb1e6737581a0c5f1763ca43000640c3f59dd48a8db300dcb68`

These four bindings supersede or extend the original source table; the other five rows remain unchanged:

| Revised or added file | SHA-256 |
| --- | --- |
| [eyeGeometry.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/character/eyeGeometry.ts) | `b0a106858c8c8c88a2a27d0d85470a33fdffa8377b4c918943b2d40ea774b2ae` |
| [parts.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/parts.tsx) | `7f7f027722f54a96e79a49b3accca9863b68250c090c3bd4c1a889456c19d3a7` |
| [animatedBody.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/species/animatedBody.tsx) | `524d6bd0f87b4851520743cb598c04b5077924a421dbb3cc61ab639a7185cbcb` |
| [capture-eye-attention.mjs](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/capture-eye-attention.mjs) | `5e51c4934f36dca72f8f1c85680ca442f9f0bec400491bde6d1f750ede30abbe` |

Both revised manifests bind the current capture helper. Before still has ten listed sources and exactly the original three stored base overrides. After has eleven listed sources, including `eyeGeometry.ts`, and no overrides. Every listed source hash matches its corresponding current file or stored baseline file. The three baseline file hashes also retain their original reviewed values. The helper's after-only addition correctly omits an unused new module from the before source list.

| Revised manifest | SHA-256 |
| --- | --- |
| [Before manifest](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-before.json) | `56f814b19c09379d3a32be361a8bfc8de93df2975d52085a14b67d65db108345` |
| [After manifest](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-after.json) | `3309a94e24a1faf23dbab66f8067b0a2eff0664e11dec2529985f20e7ca150a9` |

All four actual PNG hashes equal both the revised manifests' image bindings and the original review's image hashes. The previously inspected images are therefore byte-identical after relocation; the original visual assessment carries forward without another image pass.

Root accepted both original evidence findings. Moving the non-component export out of `parts.tsx` addresses the source of its refresh-boundary warning. The new [eye-attention-lint-module.log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-lint-module.log) contains no warning text, SHA-256 `857d0b72320525e19e457cae16f3e92811847f8f54e642083ff0962bcc5e8a68`. The original warning-bearing log and mixed six-failure attribution remain historical evidence. The root's next verification-manifest refresh should preserve those corrections and bind this nine-file freeze.

Runtime results are attributed to root only. Root reports the earlier full suite as 2069 passes across 93 files in 58.80 seconds, and the earlier production run as 23 passes; both predate this helper relocation. Root reports final relocation-focused 207 passes across four files in 12.17 seconds, TypeScript/build, lint, and both captures with exit zero. During this read-only amendment, the new targeted [browser log](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-browser-module.log) contained a six-pass, zero-failure summary in 10.35 seconds, SHA-256 `563f577ae1fac82cb69280912d5d6f863659e4d1487f4db8af37b4bfc29a47e5`. That observation is not independent certification of process exits or a rerun of the historical full suites. The refreshed root verification manifest was not part of this amendment's acceptance boundary.

At the subsequent final read, the refreshed [eye-attention-verification.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/eye-attention-verification.json) had SHA-256 `ed23bfa5601e2ffd2ddbfb2c489d137c391150c61d6bc704abf093dbee546533`. Its nine source hashes, revised diff hash, and both capture-manifest hashes all match the final files. Its historical labels now explicitly record the original lint warning and distinguish the three direct eye-centre failures from the three placement-tolerance failures. This resolves the two audit wording findings while preserving their history above. Root reports the final fresh-build six-case browser exit separately; this report does not certify runtime exits.

Final source/visual verdict: no actionable product defect and no blocking finding. The shared helper move preserves the reviewed formulas and images. The final nine-file artifact and corrected verification-record bindings are recorded here; root owns all runtime exit certification.
