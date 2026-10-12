> Final update: review COMPLETE, verdict CHANGES REQUESTED. The earlier in-progress note held the verdict pending while scope, evidence, and report-accuracy checks finished. One P2 walk-arrival blink snap is confirmed; four P3 observations are nonblocking, including all three deferred minors. Human temporal playback remains UNVERIFIED. This is not final approval of the overhaul.

# Final whole-branch review

Reviewed on 2026-10-12 against `16bc0e6ef1c99b5b93b47466eaaf1097630df212..96b185d55b2759088f90be20d9f06084b4095959`.

**Verdict: changes requested for one P2 blink-continuity defect.** Four P3 observations are nonblocking, including all three explicitly deferred items. Human normal/slow playback acceptance remains open independently of the code finding.

## Scope and evidence

I reviewed the complete 74-file, 12-commit range myself using the supplied senior reviewer template, the approved [design](/home/robert/.codex/worktrees/4511/chore-pet/docs/superpowers/specs/2026-10-11-character-animation-design.md), [plan](/home/robert/.codex/worktrees/4511/chore-pet/docs/superpowers/plans/2026-10-11-character-animation.md), and [art rules](/home/robert/.codex/worktrees/4511/chore-pet/docs/ART.md). I read the 8,342-line package in manageable passes, including every source, test, script, and documentation hunk. Its 458,228 bytes have SHA-256 `6ba6320fd9d6c3717e0f6b2e642867aea1a3f66fa59264f331c7a82c992b0bc0`. Its diff body exactly matches `git diff --no-ext-diff --unified=10` for the requested range.

I also read the gate ledger, audit records, relevant task reviews, and final local logs. Concrete integration doubts led to reading the actual Room renderer, projection/grid geometry, home routing/controller, ID generation/backend ID type, health derivation, face renderer, and sampled CSS. I inspected all 21 saved PNGs, including the phone/desktop captures and uphill correction sheet. The ten MP4s' dimensions, frame rates, frame counts, and durations match `clips.json`. The eight capture-source hashes and three bounds-source hashes match the checkout. These checks establish provenance and sampled still-image evidence, not temporal playback acceptance.

The supplied final logs support 1,848 tests in 82 files passing, lint passing, typecheck/build passing with the main-chunk advisory, 45 production browser checks passing on Chromium 152.0.7977.82, and 16 multiroom checks passing. The bounds/capture records support 42,660 raster renders with zero outside pixels, 42 generated sheets containing 1,407 poses, and ten normal/quarter-speed clips. I did not rerun these covering suites.

I ran only narrow, in-memory TypeScript/React server-render probes for the concrete blink question and the resulting walk-arrival doubt. They used the actual sampler, behavior transition, motion adapter, and SVG components. An initial probe omitted required `bodyColour` and failed in color parsing; supplying that required prop corrected the probe. That setup failure is not a product finding. No browser/UI access or subagents were used. This report is my only checkout write; source, index, HEAD, and branch state were left unchanged.

## Strengths

- The sampler, articulated SVG, behavioral sequencing, browser clock, and room integration have clear ownership. Shared wardrobe composition preserves slot order and clipping for static and animated art. Ground shadow placement stays separate from torso transforms; appendages have explicit pivots.
- The grounding fixes address world coordinates, including projected vertical movement, fractional interruptions, retained collision snapshots, release references, and full mood lean under reflection. Tests reconstruct rendered contacts rather than checking only that numbers change. The broad bounds evidence and correction sheet support the final geometry.
- Player priority, one pending tap, bounded celebration upgrades, stale-input expiry, target invalidation, and suppression ordering have meaningful regressions. Stable traveler identity and route retargeting preserve the existing routing callbacks and world position. Per-frame character updates do not force the whole room to render each frame.
- Live reduced-motion and visibility handling use one clock with cleanup and stale-callback protection. Sampled CSS disables competing breathing/blink animations. Resting sick/sleep art preserves its posture, wardrobe hiding rules, and gentle notice; decorative accents remain noninteractive and ambient speech stays out of the live region.
- The implementation retains hand-authored SVG, palette tokens, rounded ink, species resemblance, player colors, eye/cheek choices, all six wardrobe slots, moods, and saved-home compatibility. There are no persistence/schema/dependency or furniture-rendering changes. The audit explicitly distinguishes generated clips and inspected filmstrips from unverified human playback.

## Issues

### Critical, must fix

None found.

### Important, should fix

#### I1. [P2] Walk arrival forces a closed lifetime blink fully open

Location: [motion.ts:172](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:172), with the untapered walking blink at [motion.ts:186](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:186).

Walking uses full blink strength because it is classified as looping. At `elapsed >= duration`, its early return supplies `eyeOpen: 1` before blink sampling. Unlike finite gestures, there is no approach to that value. A normal local walk ending during the closed portion of its lifetime blink therefore snaps its eyes open on arrival. Capturing an outgoing endpoint does not repair it: [activityMotion.ts:122](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/activityMotion.ts:122) resamples the snapshot at its frozen time, so the arrival blend starts from the already-open endpoint.

Concrete reproduction uses happy Bun walking from `(2,2)` to `(3,2)`, starting at 2650ms and arriving at 3070ms, with free tiles and no interactions. The actual `step` transition and `motionFor` produce the following values. Both rendered `data-eye-open` transforms equal the listed values; [parts.tsx:175](/home/robert/.codex/worktrees/4511/chore-pet/src/character/parts.tsx:175) applies them directly, and sampled CSS supplies no competing blink.

| Lifetime time | Walk/arrival SVG eye height multiplier |
| --- | --- |
| 3054ms | 0.100000 |
| 3069.999ms | 0.100000 |
| 3070ms, first idle frame | 1.000000 |
| 3086ms | 0.956267 |
| 3100ms | 0.874000 |
| 3110ms | 0.848800 |
| 3140ms | 1.000000 |

The effect is a full opening during what should still be a closed blink, followed by a shallow second closure as the idle blend resumes. This violates the specified blink timing and first/last-frame continuity under ordinary valid input. It is a visual P2, with no data, routing, or security impact. The shared walk sampler also has the endpoint discontinuity when called by travel; the demonstrated production consequence here is local arrival.

Preserve continuous eye sampling across the walking endpoint while settling body/feet, or introduce an explicit continuous walk-blink endpoint policy. Keep the intentionally neutral finite-gesture contract intact. Add focused regressions around a walk endpoint during a closed lifetime blink, including the actual local arrival blend and rendered eye transforms. Existing walk fade/stride tests explicitly use `blinkMs: 0`, so their passing evidence does not cover this case. Check the shared travel use when choosing the correction.

### Minor, nice to have

#### M1. [P3] Interaction target validation runs twice per step

Locations: [behaviour.ts:336](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:336) and [behaviour.ts:351](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:351).

The pre-switch check and the `interact` branch both perform the same free-tile/signature search on an unchanged world. This duplicates work on animation ticks and creates two maintenance sites. It does not change the current result. Retain the pre-relocation check and remove the redundant branch check. This remains the previously deferred, nonblocking maintainability item.

#### M2. [P3] Rapid externally driven suppression changes retain many blend layers

Location: [behaviour.ts:105](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:105), including release retention at [behaviour.ts:116](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/behaviour.ts:116).

Interrupted layers and ground-release references use epsilon pruning without a small fixed representation bound. The prior task review records up to 357 layers under synthetic 16ms sick/sleep alternation. The current retention/resampling mechanism still admits that cost. I did not repeat the stress probe or promote its reported count to a new measurement.

This increases allocation and sampling work under sustained external churn. Normal rapid taps coalesce, celebration upgrades are bounded, and real moods derive from chore health; no normal-use performance failure is demonstrated. Keep this as optional hardening. If activities gain frequent external state changes, consolidate weighted frozen pose/release data into a bounded representation and verify contact continuity. Simply truncating the current layer list would risk the continuity fixes. This explicitly retains the earlier deferred observation at P3.

#### M3. [P3] Reserved object IDs can select incorrect ambient condition wording

Location: [LivingRoom.tsx:230](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/LivingRoom.tsx:230).

An ordinary empty `stages` object inherits values for `constructor`, `toString`, and `__proto__`. Direct indexing therefore marks an otherwise clean target as messy. A clean plant can perform its healthy wave while receiving overdue/thirsty dialogue through the fallback at the next line. Target generation already uses an own-property lookup, so the action and wording disagree.

This is admitted by the string-ID component API. Actual placement generates UUIDs in [actions.ts:14](/home/robert/.codex/worktrees/4511/chore-pet/src/data/actions.ts:14), and the backend uses a UUID object ID in [0001_init.sql:22](/home/robert/.codex/worktrees/4511/chore-pet/supabase/migrations/0001_init.sql:22). The effect is limited to unusual supplied/local fixtures; there is no demonstrated ordinary-home or security consequence. Use the same own-property/default-clean lookup as [interactions.ts:64](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.ts:64) and cover reserved IDs in dialogue tests. This confirms the explicitly deferred Task 5 P3 at its original severity.

#### M4. [P3] Audit link promises commands and logs absent from its target

Location: [REVIEW.md:18](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-11-character-animation/REVIEW.md:18).

The sentence directs readers to `verification.json` for commands and logs. That JSON contains results, exit codes, counts, and limitations, but no commands or log paths. The reproduce section supplies runnable commands, and local raw logs substantiate the results, so this does not invalidate the passing evidence. It does make the published provenance harder to follow, especially because the ledger says the copied logs remain ignored pending a final documentation commit.

Point to a persisted evidence index/logs, or add the promised command and log references to the JSON. At minimum, change the sentence to describe its actual contents. This is documentation polish, not a product or verification failure.

## Additional boundary assessment

The user's finite-action blink question is resolved separately from I1. [motion.ts:171](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:171) does return neutral before applying lifetime blink, but [motion.ts:185](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.ts:185) explicitly defines that policy. Finite actions taper blink strength to zero over the first/last tenth of the action. [motion.test.ts:312](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.test.ts:312) explicitly requires open finite endpoints even with `blinkMs: 3070`; this is consistent with the planned neutral non-looping endpoints.

For an actual happy Bun `inspect` ending at 3070ms after 1800ms, the SVG eye multiplier is 0.999916975 at 3069ms and 1 at 3070ms. The outgoing snapshot freezes that same neutral endpoint. The resulting idle blend has the 3086/3100/3110/3140ms values shown in I1, but without the preceding 0.1-to-1 jump. It attenuates the remaining blink rather than restarting its lifetime clock. Starting a finite action during a blink likewise preserves the outgoing idle value at blend progress zero, as the nested-interruption regression verifies. Pleased faces use closed happy-eye art when the underlying mood allows that expression; sick/sleep art retains its dedicated closed eyes, so `eyeOpen` is not applied to those shapes. Expression selection remains categorical, including the alert eye's 1.06 size returning to mood size at the endpoint. The probe specifically measures the sampled blink transform.

I accept finite-gesture neutral endpoints as implemented. Exact idle blink amplitude throughout every finite gesture is not the chosen contract, and I found no numeric endpoint discontinuity caused by that guard. Whether the attenuated handoff looks natural remains part of human playback acceptance. Walking differs because its untapered blink reaches the same early return discontinuously.

## Earlier minor resolutions

| Earlier item | Whole-branch disposition |
| --- | --- |
| Task 1 walk fade joins and changing-distance stride boundaries | Addressed by [motion.test.ts:233](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.test.ts:233) and [motion.test.ts:246](/home/robert/.codex/worktrees/4511/chore-pet/src/character/motion.test.ts:246), including all species/moods, overlapping short-route fades, alternating feet, and stride wraps. I1 is a distinct lifetime-blink combination. |
| Task 3 own-stage target lookup | Addressed at [interactions.ts:64](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.ts:64), with absent-owned and explicit-owned reserved-ID cases at [interactions.test.ts:213](/home/robert/.codex/worktrees/4511/chore-pet/src/pet/interactions.test.ts:213). M3 is the separate new dialogue lookup. |
| Task 6 force-reduced label and live preference | Addressed at [MotionReview.tsx:145](/home/robert/.codex/worktrees/4511/chore-pet/src/dev/MotionReview.tsx:145) and [MotionReview.test.tsx:155](/home/robert/.codex/worktrees/4511/chore-pet/src/dev/MotionReview.test.tsx:155). The unchecked override cannot defeat OS reduction; toggling the live system preference updates the sampled body at the retained scrub time. |

## Recommendations

Root should use one combined fix wave for I1 and whichever P3 items it elects to address. Explicitly record any P3 deferrals. Follow it with exactly one scoped re-review of the fix diff and its focused evidence. Update affected capture hashes/records after source changes; distinguish pre-fix covering results from new validation.

Keep human normal/slow playback as a separate open acceptance gate. [REVIEW.md:65](/home/robert/.codex/worktrees/4511/chore-pet/docs/audits/2026-10-11-character-animation/REVIEW.md:65) accurately records the policy rejection and absence of a bypass. The [specification's acceptance requirement](/home/robert/.codex/worktrees/4511/chore-pet/docs/superpowers/specs/2026-10-11-character-animation-design.md:93) still applies. A permitted human review must assess timing, contact, turns, interruption joins, blink/expression handoffs, wardrobe overlap, and actual room scale. Existing stills, metadata, and automated checks cannot close that gate.

## Declined to judge

These are the behaviors or quality claims I considered but did not adjudicate. They remain visible for root's disposition.

- Perceived animation timing, naturalness, and normal/quarter-speed playback quality, including the finite-blink attenuation described above: no human temporal playback occurred; the explicit acceptance gate remains open.
- Mobile Safari/Firefox rendering, real touch behavior, and low-end-device frame pacing/battery cost: the supplied browser evidence covers isolated Chromium, and hardware/browser access was excluded. Source accessibility and clock behavior were reviewed; cross-device quality is unverified.
- Convincing physical contact with furniture, sitting/eating/bathing/washing, or new seat/paw occlusion rules: the approved scope excludes these without verified attachment geometry. Current gestures are explicitly contact-free; the unavailable contact-target control is honest about that boundary.
- Redesign or customization quality of furniture: owned by the other chat and explicitly excluded. I checked that this range does not modify furniture art or its persisted schema.
- A performance regression inferred solely from the build's main-chunk advisory: the build succeeds and no device measurement or attributable regression establishes a user effect. The advisory remains recorded; runtime performance is not certified.
- Exhaustive bounds or appearance quality for every arbitrary color, wardrobe/time/path combination: the recorded matrix and inspected artifacts are finite samples. I reviewed their coverage and implementation, without converting zero sampled failures into an exhaustive claim.

The documented immediate sick/away travel transfer was judged and accepted, not silently excluded. It retains arrival callbacks/routing and prevents a resting bed or sleeping silhouette from sliding through the home. Reduced-motion suppression and the review panel's disabled contact overlay are also consistent with the stated constraints. The panel keeps the production shadow visible with ground/pivot overlays; its lack of a separate shadow overlay toggle does not obstruct the required grounding review, so I accept that small tooling deviation. None of M1, M2, M3, or M4 is omitted by the declined list.

## Assessment

**Code ready? No, with fixes required for I1.** The architecture and existing regression evidence support the overhaul, but a normal walk arrival has a demonstrated rendered blink discontinuity. No other P0/P1/P2 source finding was identified; M1 through M4 may be explicitly deferred.

**Ready to merge as the accepted overhaul? No.** Resolve I1, complete the one scoped re-review, and obtain the outstanding human playback acceptance before declaring the approved work complete. Automated readiness and visual acceptance must retain separate statuses.
