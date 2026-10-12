# Character animation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Track completed steps with the checkboxes below.

**Goal:** Give all three pets grounded, expressive movement and coordinated environmental and player interactions, verified in playback and automated tests.

**Architecture:** Keep behavior decisions pure. Add a deterministic motion sampler and a shared articulated SVG renderer used by local room activity, inter-room travel, and a review panel. Store environmental action profiles in the pet subsystem without modifying furniture rendering or persistence.

**Tech stack:** TypeScript, React 19, SVG, requestAnimationFrame, Vitest, existing Playwright browser harness. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-11-character-animation-design.md`.

## Global constraints

- Keep hand-authored SVG, palette tokens, rounded outlines, and the family resemblance in `docs/ART.md`.
- Preserve player colors, eye and cheek choices, all six wardrobe slots, mood states, and existing saved homes. No storage migration is needed.
- Local wandering and inter-room travel share the gait, with faster cadence for travel. Preserve existing room routing and depth sorting.
- Player input has priority over ambient actions.
- Sick and away states suppress environmental actions.
- Reduced motion removes continuous gait, breathing, bobbing, secondary sway, and animated particles.
- Do not redesign furniture or modify work belonging to the furniture customization chat.

## Review focus

1. Mid-step input must retain the visible fractional position, including retargeting across room boundaries. Tasks 4 and 5 test this.
2. Removing or rotating a target during approach must cancel or replan before contact. Tasks 3 and 4 test this.
3. Wardrobe items at motion extrema must follow the same body geometry without clipping drift. Tasks 2 and 7 review every item.
4. Rapid activation and celebration overlap must not restart the clock indefinitely or accumulate DOM effects. Tasks 4 and 7 test this.
5. Visibility and reduced-motion changes during landing must leave a grounded, valid still character. Tasks 5 and 7 test this.

## File ownership and dependency order

New `src/character/motion.ts` owns frame sampling; new `AnimatedCharacter.tsx` owns motion composition; new `species/animatedBody.tsx` owns articulated species geometry. Existing `Character.tsx` keeps static rendering and shares wardrobe composition with the animated renderer. New `src/pet/interactions.ts` owns catalog action profiles and target selection. Existing `behaviour.ts` owns sequencing. New `usePetMotion.ts` owns the browser clock and motion preferences. Existing `LivingRoom.tsx` and `HomeTraveler.tsx` integrate the system. New `src/dev/MotionReview.tsx` provides review controls.

Tasks 1 and 3 can be developed independently. Task 2 consumes Task 1. Task 4 consumes Tasks 1 and 3. Task 5 integrates Tasks 2 and 4. Task 6 consumes the sampler and renderer. Task 7 verifies the integrated result. Give workers disjoint files; the integration owner makes edits to shared entry points after receiving reviewed outputs.

## Task 1: Deterministic motion vocabulary

**Files:** Create `src/character/motion.ts`, `src/character/motion.test.ts`.

**Interfaces:** Export `MotionAction = 'idle' | 'walk' | 'turn' | 'greet' | 'affection' | 'celebrate' | 'celebrate-big' | 'notice' | 'inspect' | 'wave' | 'reach' | 'rest' | 'dust' | 'smell' | 'concern'`. Export `MotionInput { species: Species; mood: Mood; action: MotionAction; elapsedMs: number; distance: number; durationMs: number; reducedMotion: boolean }`. Export `MotionFrame` with numeric `bodyX`, `bodyY`, `scaleX`, `scaleY`, `lean`, `leftFoot`, `rightFoot`, `leftArm`, `rightArm`, `leftAppendage`, `rightAppendage`, `gazeX`, `gazeY`, `shadowScale`, `shadowOpacity`, `accentOpacity`, and expression `'mood' | 'pleased' | 'alert'`. Export `sampleMotion(input: MotionInput): MotionFrame` and `ACTION_MS: Record<MotionAction, number>`.

- [x] Write tests for finite frame values, identical input producing identical output, neutral non-looping endpoints, nonnegative shadow opacity, opposite gait feet, and distance-driven gait phase. Assert greeting 1200ms, affection 1600ms, celebration 1800ms, and big celebration 2200ms.
- [x] Run `npm test -- src/character/motion.test.ts`; confirm the missing module fails before implementation.
- [x] Implement smooth piecewise anticipation/action/recovery envelopes. Ground body transforms at `(100,181)`. Set species-specific amplitude and follow-through constants. Clamp negative time and completed finite actions. Reduced motion returns no displacement or accent animation while preserving a useful still expression.
- [x] Run the new tests; require PASS. Sample every action/species/mood at start, phase boundaries, end, and 16ms intervals. Assert body lift no greater than 24 SVG units, positive scales in `[0.85,1.15]`, and no NaN even for zero duration or nonfinite elapsed input.
- [x] Commit the sampler and tests as `feat: add deterministic pet motion sampling`.

## Task 2: Articulated character and wardrobe composition

**Files:** Create `src/character/AnimatedCharacter.tsx`, `src/character/species/animatedBody.tsx`, `src/character/AnimatedCharacter.test.tsx`; modify `Character.tsx`, `parts.tsx`, and `Character.css` only as needed to share composition.

**Interfaces:** Export `AnimatedCharacterArt(props: Omit<CharacterProps, 'size' | 'title'> & { frame: MotionFrame }): ReactNode`. Export `articulatedPose(species: Species, frame: MotionFrame): Pose` from `animatedBody.tsx`. Extend shared face rendering with optional gaze and expression inputs without changing existing default callers. Retain `CharacterArt` and `Character` signatures.

- [x] Write rendering tests using the existing React test helpers: all species render with every motion expression; SVG clip IDs stay unique; a full equipped outfit has all expected slot layers; sick/sleeping art retains its existing hidden-slot rules. Confirm failures before implementation.
- [x] Implement body/limb geometry using existing silhouette constants and shared `Body`, `Face`, `Cheeks`, `Nub`, and mood tint helpers. Keep shadow outside body transforms. Animate Bun ears at their bases, Mochi knot at its pinch, and Sprout stem/leaves at their existing pivots.
- [x] Share wardrobe layer composition instead of duplicating slot order. Derive anchors and silhouette from the same pose transform. Preserve static rendering for gallery, picker, loading pet, and share serialization. Disable existing breathing/blink CSS on sampled animated art to avoid competing clocks.
- [x] Run `npm test -- src/character` and `npm run build`; require PASS. Inspect each species at frame extrema with hat, face, neck, outfit, and back slots together; record defects for Task 7.
- [x] Commit as `feat: articulate pet bodies and keep wardrobe attached`.

## Task 3: Rotation-aware environmental targets

**Files:** Create `src/pet/interactions.ts`, `src/pet/interactions.test.ts`. Consume existing catalog lookup, footprint geometry, and pathfinding; do not edit furniture art.

**Interfaces:** Export `InteractionTarget { objectId: string; signature: string; tile: Tile; gaze: Tile; action: MotionAction; contact: boolean }`. Export `interactionTargets(objects: readonly PlacedObject[], free: (tile: Tile) => boolean, stages: Readonly<Record<string, MessStage>>): InteractionTarget[]`. Signature includes catalog ID, position, rotation, and action-relevant stage. Export `chooseInteraction(from: Tile, targets: readonly InteractionTarget[], free: (tile: Tile) => boolean, choice: number): { target: InteractionTarget; path: Tile[] } | null`.

- [x] Write tests for plant, tank, decor, rest, dusty, smelly, wilted, and unknown object profiles; test both rendered rotations, blocked fronts, enclosed targets, already-adjacent pets, and removed objects. Assert all returned standing tiles are in bounds and free, and every route step is free. Confirm missing implementation fails.
- [x] Implement profiles using actual catalog IDs. Front preference follows rotation parity used by the room renderer. Include visual gaze targets; permit contact only for profiles with explicit reachable contact geometry. Otherwise use a contact-free gesture. Unknown objects get inspect. Choose deterministically from reachable candidates; return null when none exist.
- [x] Run `npm test -- src/pet/interactions.test.ts src/pet/behaviour.test.ts`; require PASS. Test stage/rotation changes alter signatures and invalid IDs are ignored safely.
- [x] Commit as `feat: select safe environmental interaction targets`.

## Task 4: Interruptible activity sequencing

**Files:** Modify `src/pet/behaviour.ts`, `src/pet/behaviour.test.ts`; create `src/pet/activityMotion.ts`, `src/pet/activityMotion.test.ts`.

**Interfaces:** Preserve existing exported helpers where possible. Extend `World` with `interactions: readonly InteractionTarget[]`. Export `react(state: PetState, now: number, kind: 'tap' | 'celebrate' | 'celebrate-big'): PetState`; keep `tap` as a compatibility wrapper. Add reaction start time, pending tap flag, variant count, and saved fractional position to state as needed. Export `motionFor(state: PetState, now: number, species: Species, mood: Mood, reducedMotion: boolean): MotionInput` from `activityMotion.ts`.

- [x] Write failing tests for tap halfway through a tile preserving `positionAt` exactly, one pending response under 20 rapid taps, alternating greeting/affection, completion priority, sick/sleep notice, target rotation/removal invalidation, blocked next step, and mood/away interruption.
- [x] Implement explicit approach/orient/action/settle timing. Use sampler durations. Keep random choice injection in `step`; never randomize rendering. Revalidate current target signatures and upcoming route tiles. Preserve fractional interruption origin and connect it safely to the next valid grid route; do not round the drawn position abruptly.
- [x] Implement `motionFor` mapping activity phase to action/time/distance. Increase activity beat when a visible phase starts. End finite actions in correct mood and retain existing dialogue selection semantics. Ambient interactions have an idle interval between them.
- [x] Run `npm test -- src/pet/behaviour.test.ts src/pet/activityMotion.test.ts src/pet/interactions.test.ts`; require PASS. Update legacy tests only where intended behavior changes; retain pathfinding and depth-sort assertions.
- [x] Commit as `feat: sequence pet actions with continuous interruptions`.

## Task 5: Shared browser clock and room integration

**Files:** Create `src/pet/usePetMotion.ts`, `src/pet/usePetMotion.test.tsx`; modify `LivingRoom.tsx`, `LivingRoom.css`, `HomeTraveler.tsx`, `HomeTraveler.css`, and minimal call sites affected by new state inputs.

**Interfaces:** Export `usePetMotion(tick: (now: number, reducedMotion: boolean) => void, active: boolean): { reducedMotion: boolean }`. Clock uses a latest-callback ref, document visibility, and a live media-query subscription. Both room renderers consume `AnimatedCharacterArt` and Task 4 motion inputs; travel maps its accumulated screen distance to equivalent tile distance for gait sampling.

- [x] Write hook tests for one outstanding frame, latest callbacks, cleanup, hidden-tab suspension, and changing reduced motion while active. Add integration tests for chore completion replacing ambient activity and a reaction returning to mood art. Confirm failures.
- [x] Integrate target profiles into the world ref and shared animation sampling into `LivingRoom`. Remove keyed hop wrappers and old CSS motion. Keep world-position updates and depth sorting; avoid React updates for unchanged semantic activity. Preserve accessible pet activation and dialogue announcements.
- [x] Integrate the same gait into `HomeTraveler`; retain route retargeting callbacks, waypoint reporting, immediate reduced-motion arrival, and existing maximum route duration. Departure and settle apply to the journey endpoints rather than every tile.
- [x] Run `npm test -- src/pet src/room` and `npm run test:multiroom`; require PASS. Check retargeting mid-travel retains the rendered position and that reduced-motion changes finish cleanly.
- [x] Commit as `feat: integrate shared pet animation across the home`.

## Task 6: Deterministic visual review panel

**Files:** Create `src/dev/MotionReview.tsx`, `src/dev/MotionReview.css`, `src/dev/MotionReview.test.tsx`; modify `src/dev/ArtGallery.tsx`.

**Interfaces:** Export default `MotionReview(): ReactNode`. Use production `sampleMotion` and `AnimatedCharacterArt`; do not create alternate animation art. Provide labeled species/mood/action/color controls, wardrobe item selection per slot, play/pause/restart, time scrubber, and ground/anchor/contact overlays.

- [x] Write tests that pausing and scrubbing selects exact sampler time, restart resets time, action changes clamp the scrubber, and controls have accessible labels. Confirm failures.
- [x] Implement close-up and 60px previews plus key-frame comparisons for anticipation, action, landing/contact, and recovery. Show action duration. Keep overlay markers separate from character art and disable them in normal app scenes.
- [x] Run `npm test -- src/dev/MotionReview.test.tsx` and `npm run build`; require PASS. Manually check keyboard operation and that running the panel does not alter persisted pet data.
- [x] Commit as `dev: add deterministic pet motion review controls`.

## Task 7: Visual refinement and regression evidence

**Files:** Create `scripts/browser/pet-motion.test.mjs`; save review notes to `docs/audits/2026-10-11-character-animation/REVIEW.md` and representative captures beside it. Modify production files only to resolve documented defects; update `docs/ART.md` with final motion/anchor rules and `README.md` with review-panel instructions.

- [x] Add production browser checks for keyboard pet activation, repeated taps with bounded effect nodes, interruption continuity, no collisions during ambient actions, dynamic reduced motion, and existing multiroom travel. Use isolated offline contexts and explicitly enable motion for motion tests; the current browser helper defaults to reduced motion.
- [x] Run `npm test`, `npm run lint`, `npm run build`, `npm run test:browser`, and `npm run test:multiroom`. Record actual results, commands, browser version, and any environmental limitations.
- [ ] Review all species/actions/moods at normal and slow playback. Sweep default colors plus yellow/pink/sky/white/dark. Review every wardrobe item at motion extrema, including combined slots. Inspect mobile room size, 60px, and enlarged previews. Capture representative sequences and report measured continuity/contact defects rather than general impressions.
- [x] Review actual rooms with both object orientations and all action families: plants, fish tank, decor, restful pause, dust, smell, wilt, and fallback. Exercise blocked/moved/removed targets, tap during each phase, celebrations during interactions, travel retargeting, hiding the page, and preference changes during landing.
- [x] Fix every grounding, clipping, timing, interruption, accessibility, or routing defect found. Add a regression test when the defect is programmatically observable; repeat the affected visual sequence and appropriate automated checks.
- [x] Obtain independent final review against the approved spec. Resolve actionable findings and rerun affected checks. Mark checked combinations and evidence paths in `REVIEW.md`; explicitly disclose untested environments.
- [x] Commit as `test: verify and refine character interaction animations`. Deliver final change summary, review instructions, test results, and representative animation captures. Do not claim perfect or exhaustive quality beyond the recorded evidence.

Playback acceptance remains open: the normal/slow clips and frame matrix were generated and sampled as documented in the audit, but interactive browser reconnect was rejected by tool policy. Human temporal playback was not verified. Automated and sampled-art checks do not replace it.

Final code/evidence delivery: 1,863 unit tests, 45 production browser tests, and 16 multiroom checks pass after the final correction wave. Lint and build pass. Independent scoped re-review approves all four requested fixes. Minor out-of-scope observations and their deferrals remain explicit in the audit. Human playback is the unchecked acceptance item above.

## Plan self-review

Spec sections map to Tasks 1–2 for visual/motion architecture, Tasks 3–4 for environment/player sequencing, Task 5 for integration/accessibility/performance, and Tasks 6–7 for review tools and completion evidence. All five review-focus cases have named test owners. Shared signatures use `Tile`, `Species`, `Mood`, `Pose`, `MotionInput`, and `MotionFrame` consistently. No furniture changes, dependency additions, or persistence changes are required.
