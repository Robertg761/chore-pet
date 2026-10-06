# Chore Pet: Hackyard Yard #4 write-up

**Theme:** Gamification. **Rule:** the real task has to get done.

- **Live link:** https://robertg761.github.io/chore-pet/
- **Repo:** https://github.com/Robertg761/chore-pet
- **Demo video:** https://robertg761.github.io/chore-pet/chore-pet-demo.mp4 (85 s, recorded in the app with `npm run demo:record`)

## What it is

Chore Pet is a tiny pet that lives in a home you build to look like yours.

- **Your home sets up your chores.** Place a sink and you get "Wash the dishes". Place a bed and you get "Make the bed". You never fill in a form: the building is the setup.
- **Late chores show as mess.** Mess appears on the object itself, so you can tell what's late just by looking at the room. A day late is a little messy. Three days late is properly messy. The pet wanders over to the worst spot and says something kind about it.
- **The pet feels it.** Health drops with each late chore, and its mood goes from happy to content, meh and scruffy, down to sick in bed. It never dies, and catching up always brings it back.
- **Rewards only come from real chores.** Your first chore earns a gift on the spot. After that, chore milestones and streaks unlock 16 rewards: outfits, hats, glasses, decor, wall colours and floors. Vacation mode pauses everything, so a holiday never costs you a streak.

## Why the real task gets done

The game loop is the chore loop:
- You tap **Done** after doing the chore in real life.
- The object sparkles clean, the health bar ticks up and the pet cheers.
- Nothing in the game can be earned any other way: no currency, no ads, no grinding.

The pet is a reason to come back, not a guilt trip. It never dies, and its lines stay kind ("When you have a moment: wash the dishes").

## Try it in 30 seconds

1. Open the link and tap **Try a sample home**. You get a furnished kitchen with two late chores: the sink and the bin are messy.
2. Tap **Done** on "Wash the dishes". The sink sparkles clean and you unwrap your first gift, a red beanie.
3. Tap **Build my home** to start your own: pick Mochi, Bun or Sprout, name them, and build a room.

## What's in it

- **Three pets, every item fits every pet:**
  - Mochi the dumpling, Bun the bunny and Sprout the seedling.
  - Each has six moods.
  - There are 4 eye styles and 4 cheek styles, and ten soft body colours.
  - A wardrobe holds 11 items across head, face, neck, outfit and back, plus saved outfits.
- **The room:**
  - An isometric room with drag-and-snap building and rotation.
  - Footprint checks: things can't overlap, and posters can't cover the window.
  - 13 objects that bring chores, and 4 unlockable decor pieces.
  - Every chore object is drawn clean, a little messy and very messy.
- **Schedules:**
  - Daily, every N days, chosen weekdays, weekly and monthly.
  - Each chore can be edited on its object.
  - A week view shows the last seven days.
- **Progress is never lost:**
  - It works offline first, from IndexedDB, and syncs to Supabase.
  - Everyone starts as a guest with no sign-up.
  - In Settings, a guest saves their home to email or Google. That links the same account, so nothing moves, and the home then opens on any device.
- **Phone-first PWA:**
  - Installable and works offline.
  - An opt-in daily nudge in the pet's voice.
  - Soft synthesised sounds, made with the Web Audio API.
  - A shareable picture of your home.
- **Accessibility:**
  - axe reports no WCAG 2.1 AA issues on any screen.
  - Full keyboard use with visible focus; the pet is a real button with a spoken mood.
  - Reduced-motion support and 44 px touch targets.

All art is hand-drawn SVG written as code, from scratch: no asset packs, no images and no emoji in the UI.

## How it was built

All code was written fresh during the Yard, solo, with Claude Code:
- **One lead agent** owned the architecture and domain rules, plus anything where consistency mattered: the isometric engine, sync, health and streak rules, the character system, and review.
- **Project subagents** took self-contained tasks in parallel batches:
  - an SVG artist for the pets, objects, outfits and effects;
  - a UI builder for the screens;
  - a catalog curator for content and pet lines;
  - a test writer.
- **Review:** each result was checked against the art contract (`docs/ART.md`) in a live gallery (`/?art`) and by tests before it landed.
- **Plan:** `docs/PLAN.md` holds the phase-by-phase plan and who did what.
- **Tests:** 669 unit tests cover schedules, health, mess, streaks, unlocks, sync, tile maths and placement.

## Honest limits

- **Reminders:** nudges arrive only while the app is open or in the background, because there is no push server. On iPhone they need the app added to the home screen first, and the app explains this.
- **Testing:** final QA ran in phone emulation (390 px, touch, offline reload), not on a physical phone.
- **Photo proof:** proving a chore with a photo is on hold. The schema keeps a flag for it.
