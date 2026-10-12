# Batch 20 wave personality review

Approved for the bounded static/still review. No Critical, Important, or Minor findings; no source correction required. This approval covers the exact bindings below. It does not certify root's process exits, complete full/native regression gates, or establish human temporal acceptance.

Reviewed independently against HEAD `7612669bb71f15f0278eb07d80e4d78c292a0f21` on 2026-10-12. I read the freeze, patch, verification record, both evidence runners, sampler and focused tests, and relevant renderer/integration code. I used `view_image` at original detail for all four PNGs. Fresh checks were limited to hashing, patch reconstruction in memory, Git reads, and a small in-memory sampler/record comparison. The only file written by this review is this report.

## Findings and code assessment

- Critical findings: none.
- Important findings: none.
- Minor findings: none.
- Required correction: none.

The production change is confined to the species/action table and two `rightArm` assignments. [motion.ts:74](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:74) changes Mochi's greet/wave cycles from 4/5 to 3/4 and arcs from 12/10 to 10/8, keeping lifts 42/30. Sprout's cycles become 2/3, arcs 8/6, and lifts 34/26 rather than 42/30. These produce a slower held sweep and the requested smaller Sprout lift.

Bun retains lift/arc/cycles 42/12/4 for greet and 30/10/5 for wave. In [waveArm:87](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:87), `cycles * 2` evaluates to exactly the prior 8 or 10. Subtraction, multiplication, sine, negation, gesture multiplication and final species/mood multiplication retain their previous order. Bun's result therefore retains the prior arithmetic, beyond the sampled comparisons.

[motion.ts:187](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:187) preserves duration/time sanitization and finite-action neutral endpoints. The reduced-motion return at line 194 precedes the new helper calls. The shared anticipation, gesture, recovery and attention envelopes at [line 248](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:248) remain unchanged, including gesture rise/hold/fall phases 0.18/0.35/0.64/0.92. Both changed assignments at [line 264](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:264) and [line 302](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:302) still use that envelope. Species amplitude, mood energy, torso, feet, left arm, appendages, gaze, blink, shadow and expression calculations retain their previous code and inputs. `ACTION_MS` is unchanged, including greet 1200ms and wave 1400ms.

The downstream code is byte-identical to the base. [animatedBody.tsx:120](/home/robert/.codex/worktrees/4511/chore-pet/src/character/species/animatedBody.tsx:120) consumes the right-arm value only for the existing arm rotation/extension geometry. [Character.tsx:58](/home/robert/.codex/worktrees/4511/chore-pet/src/character/Character.tsx:58) retains wardrobe anchors, clips and front-strap ordering under the shared body transform. [AnimatedCharacter.tsx:14](/home/robert/.codex/worktrees/4511/chore-pet/src/character/AnimatedCharacter.tsx:14) and [animatedBody.tsx:96](/home/robert/.codex/worktrees/4511/chore-pet/src/character/species/animatedBody.tsx:96) preserve sleeping/sick geometry.

[activityMotion.ts:31](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts:31) retains action selection, durations and lifetime blink input. Its gaze override and snapshot/mirror/transition blending remain unchanged at [line 107](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts:107) and [line 134](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts:134). Existing blends can carry the intended changed arm sample through an interruption; this is not a claim that every integrated outgoing arm value stays identical. [usePetMotion.ts:44](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetMotion.ts:44), [behaviour.ts:431](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:431), and [PetPlay.tsx:32](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetPlay.tsx:32) retain clock scheduling, response queuing and the player's Wave-to-greet mapping. This establishes source preservation, not a fresh runtime integration result.

The focused tests at [wavePersonality.test.ts:10](/home/robert/.codex/worktrees/4511/chore-pet/src/character/wavePersonality.test.ts:10) measure finite-difference angular speed during the held gesture, with meaningful upper/lower bounds, and compare normalized held shapes with a nontrivial separation threshold at line 32. They test a numeric motion property; their word "calm" is not evidence of perceived playback feel. I independently recalculated their held-speed metric from both bound samplers without running Vitest.

| Action/species | Before, degrees/second | After, degrees/second |
| --- | ---: | ---: |
| greet/Mochi | 206.067 | 128.803 |
| greet/Bun | 251.301 | 251.301 |
| greet/Sprout | 180.937 | 60.317 |
| wave/Mochi | 183.977 | 117.752 |
| wave/Bun | 224.363 | 224.363 |
| wave/Sprout | 161.541 | 58.163 |

These are sampled held angular speeds for happy mood at default durations. They do not bound the rise/recovery speed or every custom duration.

## Differential checker meaning

[compare-wave-personality.mjs:14](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/compare-wave-personality.mjs:14) first asserts exact `ACTION_MS` equality. Lines 18-33 enumerate 3 species × 5 moods × 15 actions × 3 duration factors × 2 motion policies × 2 facings × 15 phases, giving 40,500 frame pairs. The factors are 0.5/1/2; the phases are 0, 0.1, 0.18, 0.3, 0.35, 0.4, 0.48, 0.5, 0.56, 0.64, 0.75, 0.9, 0.92, 1 and 2.

The checker removes only `rightArm` before comparing every remaining field for normal-motion Mochi/Sprout greet/wave. Every other case compares the entire frame with `assert.deepEqual`. It also requires changes in exactly the four permitted species/action groups. The bound result reports 39,480 unchanged pairs and 1,020 right-arm-only differences: Mochi/greet 240, Mochi/wave 240, Sprout/greet 270, Sprout/wave 270. The JSON binds baseline/current/runner hashes correctly, and the log agrees with its totals.

That is a discrete sampler differential. It does not itself enforce smaller lifts, slower speeds, renderer attachment, transition behavior or clock/player behavior. Facings are real input variants, but these nonwalking gestures do not use facing in the sampler. No `groundPath` is supplied, so this checker does not exercise world-space foot planting. It samples one blink-time construction rather than all blink phases. Source inspection, focused tests and still evidence supply the relevant additional support; the differential is not a temporal or native-browser acceptance test. I inspected its assertions and verified its bindings, but did not rerun the 40,500-frame runner or certify root's reported exit.

## Still and curve observations

I examined [before sizes](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-before-sizes.png), [after sizes](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-after-sizes.png), [before curves](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-before-curves.png) and [after curves](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-after-curves.png) using `view_image`, not playback.

Each size sheet contains 36 dressed samples, 108 views, covering all three species, greet/wave, both mirrors and phases 35%/50%/75%, each at 200/60/25px. [capture-wave-personality.mjs:20](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/capture-wave-personality.mjs:20) uses beanie-red, glasses, scarf, overalls and backpack. The 25px view uses the production `PET_STROKE_SCALE`; mirroring is applied to the rendered art group. The sheets are 1320×2070px, and the curve sheets are 1040×290px with six curves and 351 points per curve.

In the after sheet, Mochi's hand positions differ through the held/recovery samples, and Sprout's raised hand sits closer to the body. The raised hands remain discernible at the sampled small sizes. I see no introduced clipping, detached hand, wardrobe shift, changed foot placement or changed silhouette outside the intended arm. Beanies, glasses, scarf and front straps remain attached in both mirrors. Bun's sampled poses appear unchanged. The curve sheets show different Mochi/Sprout oscillation timing and a smaller Sprout angle range, while Bun's blue trace retains its prior shape. All curves retain neutral endpoints.

Fresh read-only checks imported the two exact sampler texts in memory and matched all 72 recorded frames and all 4,212 recorded curve points to their sources. The comparison applied normal JSON serialization, which converts signed zero to zero. Across the 36 corresponding before/after still records, 20 have the permitted right-arm change; every other frame field matches, and all Bun frames and both Bun curves match exactly. This corroborates the stored numeric data without regenerating PNGs or rerunning captures. PNG byte identity is bound by the hashes below, not by a fresh render.

## Exact verified bindings

All values below are SHA-256 of file bytes. Every listed freeze source, patch, verification artifact and check log matched its recorded hash. The verification record's embedded freeze exactly equals the standalone freeze. I reconstructed all five patched files in memory from HEAD and the stored patch and compared the results byte-for-byte to the current files. The patch contains exactly those five files. The only tracked production file changed under `src` at review time is `motion.ts`; the new focused test is included separately in the patch. The concurrent progress document is outside this review.

The baseline sampler is byte-identical to both `7612669bb71f15f0278eb07d80e4d78c292a0f21:src/character/motion.ts` and `091d8c4b5215ce2234d5f209cee0d9fec69e4c15:src/character/motion.ts`.

| Binding | SHA-256 |
| --- | --- |
| [wave-personality-freeze.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-freeze.json) | `75e49aba1bebdb72cce893c7220800dbc5344f430992e80d9dc6e0b91c44eaf1` |
| [wave-personality-verification.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-verification.json) | `9daa71afe6a2f265be8eb83ebd589458343db736df600dcad8890da5be221b5f` |
| [wave-personality-source.diff](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-source.diff) | `7bf87da8fc0fcb8960f7a6e0da9aa8758b91f22351a4a1d078164e1ba54cfde8` |
| [motion.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts) | `1492fa421fbfa88b8294305d1f17079cefa5403ea3f6ab3395cfca368f0721bd` |
| [wavePersonality.test.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/character/wavePersonality.test.ts) | `a2ea4dd3deb7c836576240f03d90b6038f1ce979f780b15ab7cb3c4dda1e5a67` |
| [ART.md](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md) | `981c09877e5c05b0ff1895b8cf245ffe90abb52f83aca5676a214325bc4b21ef` |
| [capture-wave-personality.mjs](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/capture-wave-personality.mjs) | `ad0f83336ded655664aa818bb40b201488bf48e9ed82f1d2b70a33dfb2cf343a` |
| [compare-wave-personality.mjs](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/compare-wave-personality.mjs) | `c89b03250eb4f191c24af9d4e536101dad057184a5bd390dbc9c0fe60e9c706e` |
| [wave-personality-baseline.ts.txt](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-baseline.ts.txt) | `c5728645139ddfdf5c73296fc07dc1fbca12ae6a98e3640d269862166c240091` |
| [wave-personality-differential.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-differential.json) | `8e9e15ca6829025f179ea03f4d95ecac00b173eadcbc51ce2a1cbab2b19df66b` |
| [wave-personality-before.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-before.json) | `963c4ffe23411afa5a7b1da9bf341061517cf7f40aec6e34dc75c164a1e9317e` |
| [wave-personality-after.json](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-after.json) | `a51e55f31b1dc1fff631851fc5bf44c10ecc2e3c197d7bbd519281e97728bec8` |
| [wave-personality-before-sizes.png](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-before-sizes.png) | `4e923ac39d2dfcef29c5c38dfd0a9085496ea932b0d21f4e55eb4938b292a2d1` |
| [wave-personality-after-sizes.png](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-after-sizes.png) | `72d2f97286facc8445b427b00212ba3fca591cf4dfd7400a42ec7e985a8fbe0c` |
| [wave-personality-before-curves.png](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-before-curves.png) | `9ddbcdaa476ffbdd093ac0f127a28cef45fa453785198ebd60eb2061b0cd5b91` |
| [wave-personality-after-curves.png](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-after-curves.png) | `3ad5f857873847d3c8e3aecddfc197f2786fa805e6877051c892abc443bd39da` |

The before/after JSON source maps also match the following unchanged current files. Fresh Git byte comparisons establish preservation against `7612669` for all nine files in this table; the first three are explicitly bound by both capture records.

| Surrounding source | SHA-256 |
| --- | --- |
| [AnimatedCharacter.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/AnimatedCharacter.tsx) | `8c9451af5b412428f72edaec05960222093c9ded356bec26d89ad07ffe6bda67` |
| [animatedBody.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/species/animatedBody.tsx) | `524d6bd0f87b4851520743cb598c04b5077924a421dbb3cc61ab639a7185cbcb` |
| [parts.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/parts.tsx) | `7f7f027722f54a96e79a49b3accca9863b68250c090c3bd4c1a889456c19d3a7` |
| [Character.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/character/Character.tsx) | `c68132c611f0fd59cc147f048365de229cb4d12431993c83cf67c888ab686dca` |
| [activityMotion.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts) | `bc05961f19363d693378e1fd01cc04f9eec312f3b8000bd01e3ccd0c5762583b` |
| [usePetMotion.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/usePetMotion.ts) | `03ea73bb227214e99a5100174e8a754d70799da24e587f7cac9c2d6c091adefb` |
| [behaviour.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts) | `c9eafc68f5c898f4a68573c2a44169ea7a54c01a27f8ec83a3852e435a5fed4f` |
| [playerAttention.ts](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/playerAttention.ts) | `06b7d8559968218fb3770743c7cc0d007af021bc60ded0da9088cfde673c5536` |
| [PetPlay.tsx](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/PetPlay.tsx) | `8d7bc1ea01a9db27652f431283102776bb277e817555f48dfc071b38923a9275` |

## Root verification evidence and limits

The following logs match the verification manifest. Exit codes are root's recorded observations, not exits witnessed or certified by this reviewer.

The initial verification manifest, SHA-256 `4eaca9a2c225e5a358db71320cbca273be3994fb1f9b77f7dbcf1d9cbd6811a3`, listed full/native runs as pending. During final report validation root updated it to the manifest bound above, adding full/native results. All original source, patch, artifact and log bindings stayed unchanged. I verified the two added log hashes only; their reported success remains root's evidence and does not expand this review.

| Log | Recorded exit/result | SHA-256 |
| --- | --- | --- |
| [capture before](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-capture-before.log) | 0; 108 still views, six curves | `be1061c4178ee781e3d8bd88dabd4e09e71e75d57947317bd8633c368160d70d` |
| [red](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-red.log) | 1; six failures, two passes on prior sampler | `f6b38b3ae623b425947cfa832a672e21298498468fa381487991c6e600ed0489` |
| [focused](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-focused.log) | 0; 103 passes in four files, 9.86s | `42e9421841a660f7129d9dddf6c6f9dbdf7a9e54dbe0a610cdb8ede041fbdde4` |
| [differential](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-differential.log) | 0; 40,500 pairs, 39,480 unchanged, 1,020 permitted differences | `b14c2f34bd39abb9572a2b28019287a44f01fc68e284ee6a098817dce6d6561c` |
| [capture after](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-capture-after.log) | 0; 108 still views, six curves | `cb557901a3fc55e67278545c692c1e2e476790882186f80c31362be566c88287` |
| [lint](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-lint.log) | 0; root reports zero warnings; no lint diagnostics in log | `857d0b72320525e19e457cae16f3e92811847f8f54e642083ff0962bcc5e8a68` |
| [build](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-build.log) | 0; TypeScript/production build reported | `00d20e4c1e72bf2581b54baa526479235f13741d4736596a1b11f06e1f7d93fb` |
| [full](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-full.log) | 0; root later reports 2,114 passes in 98 files, 60.67s; hash-only check here | `24cc8943bd8fda8ca023aaf9ff61cb760c79e842e5a289b2c8383157ce6cf62f` |
| [browser](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-12-character-polish/wave-personality-browser.log) | 0; root later reports 12 native player/wardrobe regressions, 22.6950s; hash-only check here | `ee9ca593715b743930d4a81eccf90c6e7ae5041006c928141e6c2f803d8997f8` |

The focused log names wave personality, motion, AnimatedCharacter and idle motion suites and reports 103 passes. The red log shows the four prior speed failures and two prior shared-shape failures, with Bun's two lively-speed cases passing. The build log includes a bundle chunk-size advisory; the zero-warning statement belongs to lint. No test suite, build, browser, capture runner, network operation or Git mutation was performed by this reviewer.

## Declined to judge and remaining action

- Human temporal feel and comfort remain unjudged because the requested evidence is static/numeric and there was no human playback review.
- Full unit/native-browser regression correctness and actual process exit certification remain with root. The concurrent completion reports above are acknowledged as metadata and hash bindings only, not independently reviewed test outcomes.
- Exhaustive wardrobes, every mood rendered at every size, every phase, every custom duration and invalid-input combinations remain outside this still sample. The sampler guards and non-arm source preservation were inspected; that is not exhaustive runtime coverage.
- Assistive technology, physical-device behavior, CPU and battery behavior remain unjudged because this review supplies no such measurements.
- Next-batch design, concurrent progress updates and unrelated product changes remain outside this bounded patch review.

Root can accept this static/still review without a source correction and make the final gate decision using its own sequential check evidence. Merge/release readiness remains root's decision. Any change to a bound source, patch or evidence artifact requires checking the new bindings before reusing this approval.
