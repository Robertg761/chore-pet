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
- [SONNET: ui-builder] Week view: chores completed per day and pet health over time.
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

- [SONNET: svg-artist] Hats (`src/character/items/hats.tsx`): a beanie that hugs each head (Mochi's dome, between Bun's ears, around Sprout's stem); review bow and leaf crown.
- [SONNET: svg-artist] Outfits (`src/character/items/outfits.tsx`): hoodie with hood, overalls with bib and straps, dress and knit sweater as full garments with necklines, relying on the silhouette clip.
- [SONNET: svg-artist] Extras (`src/character/items/extras.tsx`): backpack with front straps; neck items sit over every outfit; glasses per species.
- [SONNET: ui-builder] Secondary screens (Rewards, Wardrobe, Week, Settings, Creator, Share, Vacation) fit one phone viewport and use the width on desktop.

- [LEAD] Single-screen home: top bar, the room as the hero, an "Up next" card with a sheet for the full list, and a tab bar (bottom on phones, side rail on desktop). Build mode fits one screen.
- [LEAD] Review: the wardrobe check in `/?art` for every item, species and pose; no page scroll at 390 x 664 and a balanced layout at 1280 x 800; axe clean.

**Done when:** every item looks made for every pet in every pose, and the home and every screen fit one viewport on a phone and a desktop browser.

## Stretch

Photo proof, multiple rooms and templates, shared households, drawing your own floor plan.
