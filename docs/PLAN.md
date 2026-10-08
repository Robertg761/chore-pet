# Build Plan

Build in phase order. Each phase ends usable, with its "Done when" met, before the next starts. The only exception is Phase 0 art, which runs alongside Phase 1 code.

## How work is split

- **[LEAD]**: the main Claude Code session. Architecture, anything taste-critical, integration, and reviewing every subagent result before it lands.
- **[SONNET: agent-name]**: a self-contained task handed to a project subagent in `.claude/agents/` running Sonnet 5.5. Each has clear inputs, outputs and a check, so it can run without the lead's context.
- Tasks inside the same **Parallel batch** don't touch the same files and can be dispatched together. Dispatch the whole batch at once, then review.

Already done in the scaffold: domain types, schedule logic, health and mood logic (19 passing tests), Supabase client with anonymous sign-in, initial schema with RLS, PWA config, placeholder character with layered slots.

---

## Phase 0: Art foundation (runs alongside Phase 1)

- [LEAD] ~~Pick the final character with Robert~~ Decision: all three ship and the player picks. Draw the base idle pose for Mochi, Bun and Sprout with their six anchors. This sets the bar for every other asset. **Done**, see `src/character/species/` and `/?art`.
- [LEAD] Draw one reference object (the sink) in `clean`, `messy1`, `messy2`. This is the template every object task copies. **Done** (`src/room/objects/sink.tsx`), approved by Robert.

Parallel batch A (after the base poses and reference sink exist):

- [SONNET: svg-artist] Mochi mood poses: content, meh, scruffy, sick (in bed, thermometer), sleeping, cheering. Same anchors as the idle pose and the shared parts in `src/character/parts.tsx`. Output: `src/character/species/mochi-poses.tsx` (already registered in `src/character/poses.ts`). **Done**
- [SONNET: svg-artist] Bun mood poses: same list, output `src/character/species/bun-poses.tsx`. Ears keep doing the mood work (`EAR_DROOP`). **Done**
- [SONNET: svg-artist] Sprout mood poses: same list, output `src/character/species/sprout-poses.tsx`. Leaves keep doing the mood work (`WILT`). **Done**
- [SONNET: svg-artist] Room shell: walls, floor tiles, window, in 3 floor styles and 3 wall styles. Output: `src/room/shell/*`. **Done**

**Done when:** all moods exist for all three species, anchors line up in every pose (check the beanie on each in `/?art`), and the reference sink is approved. **Met.** The sick pose uses one shared bed, thermometer and ice pack from `src/character/parts.tsx`.

The three pose files are pre-registered in `src/character/poses.ts`, so the pose tasks share no files.

## Phase 1: Core loop

- [LEAD] Data layer: repository functions over Supabase for every table, plus an offline cache (IndexedDB) that syncs on reconnect. Define the sync and conflict rule (last write wins per row is fine). **Done** (`src/data/`): the local copy is what the UI reads; changes queue in an outbox (latest per row) and flush parents-first; after a flush we pull and re-apply anything still queued. UI code calls the pure functions in `src/data/actions.ts` and passes the result to `appStore.apply(...)`.
- [LEAD] Wire `ensureSession()` into app start; create the home, pet and progress rows on first launch. The pet row gets the species from the picker below. **Done** (`src/App.tsx`); screens are placeholders with fixed props in `src/screens/`.

Parallel batch B:

- [SONNET: ui-builder] Pet picker: first-launch screen showing Mochi, Bun and Sprout side by side (happy pose, tap to choose, then name it). Returns `{ species, name }`; the lead wires it to pet creation. **Done**
- [SONNET: ui-builder] Chore list screen: today, overdue, upcoming, with the done action. Uses `petCondition()`. **Done**
- [SONNET: ui-builder] Chore editor: name and every schedule type, with validation. **Done**
- [SONNET: ui-builder] Vacation mode screen: set and clear date ranges on the home. **Done**
- [SONNET: test-writer] Extra tests for edge cases: month ends, leap years, chores created mid-week, vacations spanning due dates. **Done** (found and fixed: everyNDays could be due before the chore was created)
- [SONNET: ui-builder] PWA polish: app icons drawn as SVG and PNG exports, install prompt hook. **Done** (`npm run icons` regenerates the PNGs; hook in `src/pwa/useInstallPrompt.ts`)

**Done when:** you can create chores, complete them, and watch the pet's mood change on the right days, with data surviving a reload and a new device sign-in. **Met.** The new-device check landed with Phase 7 account linking: in a two-browser run against a mocked Supabase, a second device that signs in to the first device's account drops its guest home and shows the first home with its chores, completions and rewards (see also `src/data/store.test.ts`).

## Phase 2: The room and build mode

- [LEAD] Isometric renderer core: tile maths, depth sorting, hit testing, the room component. **Done** (`src/room/grid.ts`, `src/room/Room.tsx`).
- [LEAD] Placement interaction: drag, snap, rotate, footprint validation (green fits, red overlaps). **Done** (`src/room/BuildRoom.tsx`); placing an object creates its default chores.

Parallel batch C:

- [SONNET: catalog-curator] `src/catalog/objects.ts`: the 12 starting objects with footprint, wall placement rules and default chores. The lead fixed footprints, placement and layer (art depends on them); the curator writes names, rooms and default chores. **Done**
- [SONNET: svg-artist] Objects batch 1: stove, fridge, dishwasher, trash can (clean, messy1, messy2 each), copying the reference sink. **Done**
- [SONNET: svg-artist] Objects batch 2: recycling, bed, washer, toilet. **Done**
- [SONNET: svg-artist] Objects batch 3: shower, couch, floor rug, table. **Done**
- [SONNET: ui-builder] Catalog tray and object sheet (edit chore frequency, add custom chore, move, remove). There are no build mode mockups in the repo; the task brief describes the design. **Done**
- [SONNET: test-writer] Tests for footprint validation and tile maths. **Done** (found and fixed: turning a floor object near the edge could push it outside the room)

**Done when:** a new user can build one room and get a working chore schedule without seeing a form. **Met:** five taps on the tray build a kitchen with nine scheduled chores; placing a thing opens its sheet to show the chores it brought.

## Phase 3: Mess and pet life

- [LEAD] Pet behaviour state machine: wander, idle, look at mess, react to tap, sick in bed. **Done** (`src/pet/behaviour.ts`, `src/pet/LivingRoom.tsx`).
- [LEAD] Connect overdue status to each object's mess stage. **Done** (`src/domain/mess.ts`: due today is clean, 1 day late messy1, 3+ days messy2; vacation days don't count).

Parallel batch D:

- [SONNET: svg-artist] Cleaned sparkle effect and cheer animation frames. **Done** (`src/effects/`)
- [SONNET: catalog-curator] Pet reaction lines per mood and per worst chore ("the sink is getting to me"). Friendly, short, never guilt-trippy. **Done**
- [SONNET: ui-builder] Completion moment: object swaps to clean with sparkle, health bar ticks up. **Done**

**Done when:** you can see which chores are late just by looking at the room. **Met:** late objects show messy1/messy2 art, the pet walks over to the worst one and comments kindly, and finishing a chore sparkles it clean.

## Phase 4: Demo path for voters

Parallel batch E:

- [SONNET: catalog-curator] Sample home seed: a pre-built kitchen with two overdue chores. **Done** (`src/content/sampleHome.ts`)
- [SONNET: ui-builder] Landing choice: "Try a sample home" or "Build my home"; turning the sample into your own. **Done**
- [SONNET: ui-builder] Hidden time fast-forward dev panel (query param or long-press) for recording the demo. **Done** (open with `?dev` or a long-press on the top-left corner)

- [LEAD] Review the first-minute experience end to end.

**Done when:** a first-time visitor sees a messy room, cleans something and gets an unlock within a minute. **Met:** "Try a sample home" opens a kitchen with dirty dishes; washing them sparkles the sink clean and opens a gift with the red beanie.

## Phase 5: Rewards and unlocks

- [LEAD] Unlock engine: chore-count milestones and streaks (days with nothing overdue, vacation protects streaks). First unlock within the first few chores. **Done** (`src/domain/unlocks.ts`; the first chore unlocks the red beanie; the sample home's history doesn't count toward milestones).

Parallel batch F:

- [SONNET: svg-artist] Decor set: rug, lamp, plant, poster, fish tank, wallpaper and floor variants. **Done** (plant, lamp, poster, fish tank; wall and floor variants come from the room shell styles)
- [SONNET: svg-artist] Accessories: beanie, bow, glasses, scarf, bow tie, backpack (one per slot at least), checked on every pose of every species. Bun's ears and Sprout's leaves stick up through head items; draw hats so that looks intentional. **Done**
- [SONNET: ui-builder] Gift box unlock moment and rewards screen with progress to next unlock. **Done**
- [SONNET: ui-builder] Week view: chores completed per day and pet health over time. **Done** (`src/screens/WeekView.tsx`, under More)
- [SONNET: test-writer] Tests for streak and unlock rules. **Done** (found and fixed: a vacation longer than the lookback hid the streak before it)

**Done when:** completing chores visibly unlocks at least 4 decor items and 4 accessories, the first in the first session. **Met:** 4 decor and 6 accessories unlock through chore milestones and streaks (plus 4 room styles); in the sample home, chore 1 gives the beanie, chore 3 the plant (which then appears in Build), chore 5 the bow.

## Phase 6: Personalization

Parallel batch G:

- [SONNET: ui-builder] Character creator: species (switching keeps the outfit), name, body colour, eye and cheek variants. **Done**
- [SONNET: ui-builder] Wardrobe: equip per slot, live preview, saved outfits. **Done**
- [SONNET: svg-artist] Full outfits for the outfit slot (hoodie, overalls, dress, a seasonal set). **Done** (autumn set: knit sweater and leaf crown)

- [LEAD] Review every item on every pose of every species. **Done:** all 11 items on all 7 poses of all 3 pets, alone and combined. In bed the outfit, backpack and neck items are tucked under the covers; Mochi's outfits are drawn 10% bigger for its wider body.

**Done when:** a user can dress a character that feels like theirs, with every item wearable in every pose. **Met.**

## Phase 7: Polish and ship

Parallel batch H:

- [SONNET: ui-builder] Onboarding: meet your pet (polish the Phase 1 picker into the first moment), then build your first room. **Done** (`src/screens/Onboarding.tsx`: welcome beat, three-step build coach, first-chore hint)
- [SONNET: ui-builder] Reminders: notifications in the pet's voice; nudge iPhone users to add to home screen. **Done** (`src/reminders/`; opt-in daily nudge while the app is open or backgrounded; no push server)
- [SONNET: ui-builder] Sounds generated with the Web Audio API (no audio files): click, sparkle, chirp. **Done** (`src/audio/`)
- [SONNET: ui-builder] Shareable "my home" card image. **Done** (`src/screens/ShareCard.tsx`: PNG save and native share)

- [LEAD] Accessibility and performance pass, account linking flow (guest to email or Google), final QA on a real phone.
  - Accessibility: **Done.** axe (WCAG 2.1 AA and best practice) reports nothing on all 20 screens and states checked, including onboarding, the object sheet and the gift. Every keyboard stop has a visible focus ring, and the pet is a real button.
  - Performance: **Done.** Supabase loads after first paint, so first-load JS in a configured build drops from 197 to 142 kB gzipped.
  - Account linking: **Done** (`src/lib/account.ts`, `src/screens/AccountSection.tsx`). A guest saves with email (confirmation link) or Google, linking the same user id so nothing moves. "Sign in" on another device switches accounts and syncs to follow.
  - Final QA: run against the live site (https://robertg761.github.io/chore-pet/) in Pixel 7 emulation at 390 px. Still to do on a physical phone, which this environment doesn't have.
  - Progress across devices: **Done.**
    - The chore count comes from completions that counted when they were recorded, one per chore per day (`choreCountOf`). Completion rows are never edited, so devices can't overwrite each other's count, and schedule edits don't rewrite history.
    - Deleting a chore banks its count in `progress.retired`, so progress never goes backwards.
    - The `progress_merge` trigger (migration 0004) merges unlocks, the best streak and retired counts atomically.
    - `supabase/migrations.test.ts` runs every migration on PGlite.
- [LEAD] Submission: live link, repo, write-up, in-app demo video.
  - **Write-up drafted** (`docs/SUBMISSION.md`).
  - **Demo video recorded** in the app (`npm run demo:record`; about 85 s, sample home and time skip).
  - **Hosting: Live** at https://robertg761.github.io/chore-pet/ on GitHub Pages. `.github/workflows/pages.yml` lints, tests and builds every PR, and deploys every push to main. The video is served at `/chore-pet/chore-pet-demo.mp4`, and the links are in the write-up.

**Done when:** a stranger can open the link on a phone, build a room, finish a chore and get an unlock with no help. **Met in phone emulation** (Pixel 7 profile, touch only, production build): landing to picking Sprout, building a kitchen, finishing a chore and putting on the red beanie, with no help and no errors. It also reloads offline from the service worker. Re-checked on the live URL after launch: the same flow passes with no errors, and the sample home's seeded history doesn't count. Not yet tried on a physical phone.

## Phase 8: Deep polish

Feedback from the first real use: the red beanie didn't sit on the pet properly, outfits read as thin bands, and the home screen scrolled about four phone-heights. Goal: every item fits every pet, and every screen fits one viewport on a phone and lays out well on desktop.

- [LEAD] Item fit infrastructure: each pose carries its body silhouette, outfits are clipped to it and the outline is re-inked on top, and each item's render gets the species so it can be cut per pet. `items.tsx` split into `items/hats.tsx`, `items/outfits.tsx` and `items/extras.tsx` so each can be redrawn on its own. **Done**

Parallel batch I:

- [SONNET: svg-artist] Hats (`src/character/items/hats.tsx`): a beanie that hugs each head (Mochi's dome, between Bun's ears, around Sprout's stem); review bow and leaf crown. **Done**
- [SONNET: svg-artist] Outfits (`src/character/items/outfits.tsx`): hoodie with hood, overalls with bib and straps, dress and knit sweater as full garments with necklines, relying on the silhouette clip. **Done** (second pass after review: necklines climb the sides, flat fills, and the dress skirt flares past the body as an unclipped front part)
- [SONNET: svg-artist] Extras (`src/character/items/extras.tsx`): backpack with front straps; neck items sit over every outfit; glasses per species. **Done** (after review: a smaller pack, and the straps drawn in front via a new `Item.front`)
- [SONNET: ui-builder] Secondary screens (Rewards, Wardrobe, Week, Settings, Creator, Share, Vacation) fit one phone viewport and use the width on desktop. **Done** (split across two ui-builders)

- [LEAD] Single-screen home: top bar, the room as the hero, an "Up next" card with a sheet for the full list, and a tab bar (bottom on phones, side rail on desktop). Build mode fits one screen. **Done** (`src/shell/`: AppNav, Sheet, useViewport; build mode has a tabbed panel)
- [LEAD] Review: the wardrobe check in `/?art` for every item, species and pose; no page scroll at 390 x 664 and a balanced layout at 1280 x 800; axe clean. **Done:** all 11 items on 3 pets x 7 poses, alone and in combos. Every screen (landing, home, the chores sheet, More, build, wardrobe, rewards, week, change look, share, vacation, settings, editor, gift) fits 390 x 664 and 1280 x 800 with no page scroll, and axe reports nothing at either size.

- [LEAD] Rewards are purely cosmetic (user feedback: an unlocked plant came with chores). The plant and fish tank move to the starting catalog with their chores; a teddy bear and fairy lights replace them as chore-free decor rewards. Tests pin the rule: decor never has chores and nothing in the starting catalog sits behind an unlock. Players who already passed those milestones get the new decor on their next chore. **Done**
- [SONNET: svg-artist] Teddy bear (floor) and fairy lights (wall) decor art, with gentle mess stages like the lamp's. **Done** (after review the fairy lights became a two-tile garland so they read at room scale)

**Done when:** every item looks made for every pet in every pose, and the home and every screen fit one viewport on a phone and a desktop browser. **Met.**

## Phase 9: Chore audit and escalating neglect

User feedback: players set their own frequency, chores should be real ones, neglect should be easy to spot, and it should get worse over time ("one day missed cleaning the toilet isn't the worst, but a few days it should start to get progressively more stinky").

Audit findings, all fixed:
- Mess had two stages and maxed out at 3 days late, whatever the chore: a monthly oven clean 3 days late looked as bad as dishes 3 days late, and cost the same health.
- Chores added from the home screen were tied to no object, so neglecting them never showed in the room.
- Two defaults weren't realistic (watering a plant and fluffing cushions every 3 days).
- Rewards were already cosmetic (Phase 8); frequency was already editable per chore (every day, every 2 to 60 days, chosen weekdays, weekly, monthly).

- [LEAD] Neglect levels (`src/domain/neglect.ts`): 0 to 3, scaled to each chore's cadence. Mess stages, the pet's health and the pet's grumbles follow the level; the chore list's late tags get louder with it. Every catalog object gets a mess kind (stink, dust or wilt). Plant and cushions become weekly. **Done**
- [SONNET: svg-artist] Neglect cues (`src/room/neglect.tsx`): stink, dust and wilt at levels 1 to 3, floating over the object, gently animated. **Done**
- [SONNET: ui-builder] "Where is it?" in the chore editor, so any chore can be tied to an object. **Done**
- [SONNET: test-writer] Tests for cadence, thresholds, levels, health and mess. **Done** (no bugs found; noted that monthly chores reach level 3 at 14 days by design)

- [LEAD] Roomier room (user feedback: the default room felt claustrophobic). The floor grows from 6x6 to 8x8 tiles, 78% more space. Walls, window, pet, neglect cues and sparkles scale with `TILE_SCALE` so every proportion holds; existing rooms keep their layout with open floor in front. **Done**
- [SONNET: test-writer] Room and geometry tests written in terms of the room size. **Done**

**Done when:** a late chore shows on its object and visibly gets worse day by day at a pace that fits the chore, the pet's health matches what the room shows, and any chore can be tied to an object. **Met.**

## Phase 10: Motion and feel

User feedback: "I want it to feel fluid. Nice animations, good design elements, perfected." Recorded every interaction on video and stepped through the frames first. The static design held up; the motion didn't. Rows vanished and the room jumped when a chore was done, tabs swapped instantly, sheets snapped shut, the gift faded in see-through, and the pet stood stock still.

- [LEAD] Motion tokens in `src/index.css` (`--ease-out`, `--ease-in`, `--ease-spring`, `--ease-bounce`, `--dur-*`): things arrive with a soft spring and leave quickly. Every button gives under a press (individual `scale`, so it composes with existing transforms; shadowed buttons press onto their shadow). One reduced-motion rule. **Done**
- [LEAD] Screen changes slide in from the side the screen lives on (`src/shell/viewTransition.ts`, the View Transitions API, so taps go straight through); the tab bar stays put and a pill glides from tab to tab, with a hop on the chosen icon. **Done**
- [LEAD] Chore done on the home screen: the row folds away, the others glide up, the next one eases in and the room resizes smoothly (a `chores` view transition); a light haptic tick. **Done**
- [LEAD] Sheets spring up, fade their backdrop, play an exit on every close path and can be dragged down by a handle. The gift card pops in solid; the undo toast slides away. Placed objects drop into the room with a squash. The landing arrives in order. **Done**
- [SONNET: svg-artist] The pet breathes (slower asleep) and blinks, out of step with other pets on screen (`src/character/Character.css`). **Done**
- [SONNET: ui-builder] Segmented controls get an ink thumb that glides (`src/shell/SegThumb.tsx`); the week's bars grow and its health line draws; rewards bars fill and tiles rise in. **Done**

**Done when:** every interaction has motion that explains what changed, nothing jumps, and nothing moves for players who ask for less. **Met** in phone and desktop emulation (video frames reviewed for each); axe clean with motion on and off.

## Phase 11: Managing chores and starting over

User feedback: "I don't see any way to manage my chores", and a way to start from scratch, because "someone could move or come up with all new chores", and clearing is easier than removing everything by hand.

- [LEAD] A pencil after each chore's name on the list, so tapping it to edit reads as possible; the button reads "Edit <chore>" aloud. **Done**
- [LEAD] Start over in Settings: "Clear room and chores" (keeps the pet, its look, rewards and history; `clearHome` in `src/data/actions.ts`) or "Erase everything". Each asks twice, focus lands on the safe choice, and the sample home keeps its own Start fresh instead. **Done**
- [LEAD] The Chores screen (`src/screens/ManageChores.tsx`, model in `manageModel.ts`): chores grouped by object, edit returns here, remove several at once with a confirm, and removed chores can be added back. Reached from More and from Manage on the full list. **Done**
- [LEAD] Tests: model unit tests; clearing, adding back and erasing synced against the real migrations (`supabase/migrations.test.ts`); browser tests for every path. **Done**

**Done when:** a player can find, edit and remove any chore, clear the room and chores after a move without losing the pet or rewards, and erase everything, with nothing lost by a stray tap. **Met** in phone and desktop emulation.

Follow-up from review of PR #17:

- [LEAD] Clear reaches rows another device added that this one hadn't pulled: migration 0008's `clear_home` RPC, sent after the per-row changes and limited to rows stored before the clear, corrected for the device clock's error (a late sync never takes newer ones, even on newer chores on cleared furniture). Kept queued without blocking until the migration is applied. **Done**
- [LEAD] End dates settle on the earliest (device and server), so Clear also ends a chore a clock set ahead had ended later. **Done**
- [LEAD] Adding a chore back resumes its round exactly (`Schedule.resume`): every-N-days chores keep their due date, early completions count as before, and future-dated completions are ignored. **Done**
- [LEAD] Erase everything says when other homes in the account stay. **Done**
- [LEAD] The clear's cutoff leans a minute earlier so request latency is never taken for clock error (migration 0009, from Codex review of PR #18). **Done**

## Stretch

Photo proof, multiple rooms and templates, shared households, drawing your own floor plan.
