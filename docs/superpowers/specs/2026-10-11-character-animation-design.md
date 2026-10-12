# Character design and interaction animation

## Intent and agreed direction

Make Chore Pet's characters feel alive when moving through their home and responding to the player. The user prioritizes meticulous execution and review over speed. They approved preserving the cozy SVG family, giving Mochi, Bun, and Sprout distinct movement personalities, and developing coordinated movement and interaction sequences.

Success means readable actions at actual room size, grounded movement, consistent wardrobe attachment, and transitions that remain believable when interrupted. Review must include animation playback, not only screenshots. This document defines the proposed implementation scope for review.

## Existing constraints

- Keep hand-authored SVG, palette tokens, rounded outlines, and the family resemblance in `docs/ART.md`.
- Preserve player colors, eye and cheek choices, all six wardrobe slots, mood states, and existing saved homes. No storage migration is needed.
- `CharacterArt` currently composes registered poses and clothing anchors. Individual poses include their own shadows. Breathing currently transforms the shadow with the body; the revised renderer must separate ground contact from body movement.
- `LivingRoom` owns the local behavior loop and tap reactions. `HomeTraveler` renders movement between rooms. Both must use the same character motion vocabulary.
- Furniture customization is being worked on in a separate chat. Keep this work in character, pet behavior, animation review tools, and narrowly scoped interaction metadata. Do not redesign furniture.

## Visual direction

Mochi moves with soft compression and a slight delay in its pinched knot. Bun has springier steps, readable paw gestures, and ears that settle after its body. Sprout leads with curiosity; its stem and leaves follow its turns and settle softly. Variation comes from cadence, weight, posture, and secondary motion, not different face styles or excessive distortion.

Preserve the existing silhouettes and glossy shared faces. Refine small-scale readability, limb separation, and expression timing. Avoid constant bouncing: quiet moments provide contrast for player reactions. Unwell characters retain tired posture and gentle responses rather than switching to energetic happy art.

## Motion architecture

Separate decisions, motion sampling, and rendering:

1. The pure behavior state machine chooses an activity and retains its target, start time, duration, and interruption information. Existing pathfinding remains authoritative for occupied tiles.
2. A pure motion sampler produces a deterministic frame from activity, elapsed time, species, mood, and route progress. It describes body compression and lift, limb articulation, gaze, secondary appendage motion, and shadow size/opacity. It has no DOM or random calls.
3. A shared animated character renderer composes those values with body art and wardrobe anchors. Room movement transforms the world-position container; character articulation happens inside it. The shadow remains in ground coordinates. Existing static `Character` consumers and share-image rendering retain a valid still pose.

Use one animation clock per living pet. Do not add a timer for every limb or rerender the home every frame. Dynamic SVG attributes may be updated through refs as the current position renderer does; semantic activity changes still go through React. Pause background work when the document is hidden and settle elapsed actions on return without a burst of queued reactions. Clean up frames, listeners, and timers on unmount.

Clothing clipping, body outline, and anchors must use the same body transform. Limb movement must not move clothing independently of the torso. Give appendages explicit pivots rather than relying on changing SVG bounding boxes. Use stable IDs for clips and stable keys so an unrelated render cannot restart an action.

## Movement and transitions

- Walking has alternating feet/paws, modest body weight transfer, and species-specific secondary motion. Cadence follows traveled distance rather than an independent bobbing loop. Contact feet must not visibly skate through the floor.
- Use a brief departure anticipation and arrival settle. Keep intermediate tile travel continuous; do not ease to a stop at every tile.
- Turns orient toward the next route segment. Use a short turn/compression transition to avoid a naked horizontal flip. World position remains continuous.
- Local wandering and inter-room travel share the gait, with faster cadence for travel. Preserve existing room routing and depth sorting.
- A player tap during movement samples the current fractional position before interrupting. Resume from that position or resolve a valid nearby route origin without a visible backward snap.
- Revalidate targets and upcoming route segments when furniture or rooms change. Never walk into newly occupied space or continue inspecting a removed object.

## Player interaction sequences

Player input has priority over ambient actions. Support the existing tap/click/keyboard activation without requiring hover or dragging.

- Greeting: approximately 1.2 seconds. Notice the player, orient gaze, raise a paw/arm, make a small wave, then settle. The character returns to its mood expression.
- Affection: approximately 1.6 seconds. A subsequent deliberate tap varies the response with a pleased lean, soft compression, closed happy eyes, and a small heart accent. Repeated input during a reaction must not remount the character, repeatedly teleport it, or stack effects. Coalesce rapid input and allow at most one pending response.
- Chore celebration: approximately 1.8 seconds, with a slightly larger 2.2-second version for an existing big celebration. Anticipate, lift, land, compress, and recover. Match shadow size to height. Do not hold the pet permanently above its shadow as the current cheering pose does.
- Sleeping or sick: brief notice/stir only. Preserve sleep or sick posture and the existing gentle dialogue. Do not wake a vacation pet into wandering or remove the sick bed for a cheer.

Reaction variants must be deterministic from the interaction count for tests. Existing speech and polite screen-reader announcements remain tied to player actions; ambient animation is silent to assistive technology.

## Environmental interaction sequences

Add interaction profiles keyed by catalog ID in the pet subsystem. Profiles describe safe approach sides, a visual target relative to the rotated footprint, and an action family. Furniture rendering and persisted catalog schemas remain unchanged.

An ambient sequence is approach, orient, inspect/gesture, and settle. Choose reachable adjacent tiles using occupancy and the object's rotation. Face and gaze point toward the actual target. Prefer front approaches where available; if no suitable contact point is reachable, perform a contact-free look from a safe tile or choose another activity.

Required action families:

- Plants: lean toward leaves, examine, and make a gentle paw gesture.
- Fish tank: attentive gaze and a small wave toward the glass.
- Bookshelf, teddy, and decor: curious look and restrained reach when a contact point is supported.
- Beds, couch, bean bag, and rugs: a nearby restful pause or stretch. Sitting on furniture is excluded because it needs separate seat anchors and occlusion rules.
- Appliances, kitchen, bathroom, and overdue objects: inspect or react to their condition. Dust produces a small recoil/brush gesture; smell produces a lean away; wilt produces a concerned lean. Keep reactions kind and readable.
- Unclassified objects: a safe look-and-tilt fallback.

Do not claim chores are completed by these animations, change chore state, or animate touching a surface whose contact geometry is unknown. Pet interaction with a plant does not imply watering; kitchen inspection does not imply washing dishes.

Initially allow one ambient interaction at a time, with a quiet idle interval between actions. Sick and away states suppress environmental actions. User input, room travel, and chore celebrations cancel ambient actions cleanly. Object removal, movement, rotation, or lost access cancels or replans the action.

## Accessibility and performance

Reduced motion removes continuous gait, breathing, bobbing, secondary sway, and animated particles. Preserve meaningful states through still poses, expression changes, and dialogue. Room travel keeps its existing immediate arrival behavior. Listen for preference changes during the session and settle an active motion without leaving a transformed body or displaced shadow.

Keep existing keyboard focus, accessible pet labels, and activation semantics. Decorative effects must not intercept pointer input. Test actual mobile room scale as well as the gallery's 200-pixel view. Animation must not create layout shifts, per-frame state updates across the entire room, or unbounded DOM growth under repeated taps.

## Review tools and acceptance evidence

Extend the dev art gallery with a deterministic motion review panel: select species, mood, action, wardrobe, and body color; play, pause, restart, scrub elapsed time, and compare key frames. Include ground line, contact target, shadow, and anchor overlays that can be hidden. This tool exercises the production sampler and renderer.

Review matrix:

- All three species at room size, 60 pixels, and enlarged size.
- Every mood; default species colors plus yellow, pink, sky, white, and a dark custom color.
- All existing wardrobe items across relevant motion extrema. Check hat/ear/leaf overlap, glasses and eyes, neck attachment, outfit clipping, backpack straps, and motion bounds.
- Every environmental action family, both object orientations, blocked approaches, moved/removed targets, sparse rooms, and crowded rooms.
- Tap during walking, turning, inspection, landing, sleep, and sickness; rapid taps; chore completion during an ambient action; room switches during a reaction; page visibility and reduced-motion changes.
- Check depth order when passing furniture and doorways, shadow contact, foot sliding, blink timing, gaze direction, clipping, first/last frame continuity, and return to the correct mood.

Automated evidence includes sampler boundary tests, finite transforms and bounded displacement, deterministic sequences, interruption position continuity, target invalidation, route collision cases, reaction coalescing, and reduced-motion behavior. Run existing tests, lint, typecheck/build, and relevant browser checks. Review captured sequences at normal and slowed playback, recording concrete defects and their resolutions. A passing build does not establish visual quality.

## Completion criteria

Every required action family and player sequence is implemented for every species, with no missing-pose fallback hiding incomplete work. Existing room travel, wardrobe, mood, and chore behavior still work. Review evidence documents the checked combinations and any limitations; unresolved defects affecting grounding, clipping, interruption, or accessibility prevent declaring completion. Deliver a concise change summary with runnable review instructions and representative captured animation evidence.

## Scope boundaries

No new species, player avatar, raster art, animation library, wardrobe inventory, chore rules, database migration, or furniture redesign. No eating, bathing, washing, or furniture sitting without the necessary dedicated art and attachment geometry. These boundaries keep the requested detail focused on interactions that can be made convincing with the current world.
