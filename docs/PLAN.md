# Build Plan

Build in phase order. Each phase ends usable, with its "Done when" met, before the next starts. The only exception is Phase 0 art, which runs alongside Phase 1 code.

## How work is split

- **[LEAD]**: the main Claude Code session. Architecture, anything taste-critical, integration, and reviewing every subagent result before it lands.
- **[SONNET: agent-name]**: a self-contained task handed to a project subagent in `.claude/agents/` running Sonnet 5.5. Each has clear inputs, outputs and a check, so it can run without the lead's context.
- Tasks inside the same **Parallel batch** don't touch the same files and can be dispatched together. Dispatch the whole batch at once, then review.

Already done in the scaffold: domain types, schedule logic, health and mood logic (19 passing tests), Supabase client with anonymous sign-in, initial schema with RLS, PWA config, placeholder character with layered slots.

---

## Phase 0: Art foundation (runs alongside Phase 1)

- [LEAD] Pick the final character with Robert from Mochi, Bun, Sprout. Draw the base idle pose and define its six anchors. This sets the bar for every other asset.
- [LEAD] Draw one reference object (the sink) in `clean`, `messy1`, `messy2`. This is the template every object task copies.

Parallel batch A (after the base pose and reference sink exist):

- [SONNET: svg-artist] Mood poses for the chosen character: content, meh, scruffy, sick, sleeping, cheering. Same anchors as the idle pose. Output: `src/character/poses/*.tsx`.
- [SONNET: svg-artist] Room shell: walls, floor tiles, window, in 3 floor styles and 3 wall styles. Output: `src/room/shell/*`.

**Done when:** all moods exist, anchors line up in every pose, and the reference sink is approved.

## Phase 1: Core loop

- [LEAD] Data layer: repository functions over Supabase for every table, plus an offline cache (IndexedDB) that syncs on reconnect. Define the sync and conflict rule (last write wins per row is fine).
- [LEAD] Wire `ensureSession()` into app start; create the home, pet and progress rows on first launch.

Parallel batch B:

- [SONNET: ui-builder] Chore list screen: today, overdue, upcoming, with the done action. Uses `petCondition()`.
- [SONNET: ui-builder] Chore editor: name and every schedule type, with validation.
- [SONNET: ui-builder] Vacation mode screen: set and clear date ranges on the home.
- [SONNET: test-writer] Extra tests for edge cases: month ends, leap years, chores created mid-week, vacations spanning due dates.
- [SONNET: ui-builder] PWA polish: app icons drawn as SVG and PNG exports, install prompt hook.

**Done when:** you can create chores, complete them, and watch the pet's mood change on the right days, with data surviving a reload and a new device sign-in.

## Phase 2: The room and build mode

- [LEAD] Isometric renderer core: tile maths, depth sorting, hit testing, the room component.
- [LEAD] Placement interaction: drag, snap, rotate, footprint validation (green fits, red overlaps).

Parallel batch C:

- [SONNET: catalog-curator] `src/catalog/objects.ts`: the 12 starting objects with footprint, wall placement rules and default chores (see the spec doc table).
- [SONNET: svg-artist] Objects batch 1: stove, fridge, dishwasher, trash can (clean, messy1, messy2 each), copying the reference sink.
- [SONNET: svg-artist] Objects batch 2: recycling, bed, washer, toilet.
- [SONNET: svg-artist] Objects batch 3: shower, couch, floor rug, table.
- [SONNET: ui-builder] Catalog tray and object sheet (edit chore frequency, add custom chore, move, remove), matching the build mode mockups.
- [SONNET: test-writer] Tests for footprint validation and tile maths.

**Done when:** a new user can build one room and get a working chore schedule without seeing a form.

## Phase 3: Mess and pet life

- [LEAD] Pet behaviour state machine: wander, idle, look at mess, react to tap, sick in bed.
- [LEAD] Connect overdue status to each object's mess stage.

Parallel batch D:

- [SONNET: svg-artist] Cleaned sparkle effect and cheer animation frames.
- [SONNET: catalog-curator] Pet reaction lines per mood and per worst chore ("the sink is getting to me"). Friendly, short, never guilt-trippy.
- [SONNET: ui-builder] Completion moment: object swaps to clean with sparkle, health bar ticks up.

**Done when:** you can see which chores are late just by looking at the room.

## Phase 4: Demo path for voters

Parallel batch E:

- [SONNET: catalog-curator] Sample home seed: a pre-built kitchen with two overdue chores.
- [SONNET: ui-builder] Landing choice: "Try a sample home" or "Build my home"; turning the sample into your own.
- [SONNET: ui-builder] Hidden time fast-forward dev panel (query param or long-press) for recording the demo.

- [LEAD] Review the first-minute experience end to end.

**Done when:** a first-time visitor sees a messy room, cleans something and gets an unlock within a minute.

## Phase 5: Rewards and unlocks

- [LEAD] Unlock engine: chore-count milestones and streaks (days with nothing overdue, vacation protects streaks). First unlock within the first few chores.

Parallel batch F:

- [SONNET: svg-artist] Decor set: rug, lamp, plant, poster, fish tank, wallpaper and floor variants.
- [SONNET: svg-artist] Accessories: beanie, bow, glasses, scarf, bow tie, backpack (one per slot at least), checked on every pose.
- [SONNET: ui-builder] Gift box unlock moment and rewards screen with progress to next unlock.
- [SONNET: ui-builder] Week view: chores completed per day and pet health over time.
- [SONNET: test-writer] Tests for streak and unlock rules.

**Done when:** completing chores visibly unlocks at least 4 decor items and 4 accessories, the first in the first session.

## Phase 6: Personalization

Parallel batch G:

- [SONNET: ui-builder] Character creator: name, body colour, eye and cheek variants.
- [SONNET: ui-builder] Wardrobe: equip per slot, live preview, saved outfits.
- [SONNET: svg-artist] Full outfits for the outfit slot (hoodie, overalls, dress, a seasonal set).

- [LEAD] Review every item on every pose.

**Done when:** a user can dress a character that feels like theirs, with every item wearable in every pose.

## Phase 7: Polish and ship

Parallel batch H:

- [SONNET: ui-builder] Onboarding: meet your pet, then build your first room.
- [SONNET: ui-builder] Reminders: notifications in the pet's voice; nudge iPhone users to add to home screen.
- [SONNET: ui-builder] Sounds generated with the Web Audio API (no audio files): click, sparkle, chirp.
- [SONNET: ui-builder] Shareable "my home" card image.

- [LEAD] Accessibility and performance pass, account linking flow (guest to email or Google), final QA on a real phone.
- [LEAD] Submission: live link, repo, write-up, in-app demo video.

**Done when:** a stranger can open the link on a phone, build a room, finish a chore and get an unlock with no help.

## Stretch

Photo proof, multiple rooms and templates, shared households, drawing your own floor plan.
