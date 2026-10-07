# Chore Pet: Product Spec

Working name. Built for Hackyard Yard #4 (theme: Gamification). All code is written fresh during the Yard, solo, with AI tools.

## The idea

A cute virtual pet lives in an isometric home you build to match your own. Every object you place brings real chores: a sink brings dishes, a bed brings making the bed. Skip them and the mess appears on that object in the pet's room and the pet gets sick. Finish them and it thrives, and you unlock outfits and decor.

## The rule it must pass

Hackyard: "The real task has to get done." A game about laundry doesn't count; a game that gets the laundry folded does. Phase 1 alone satisfies this, so every later phase is improvement.

## Principles

- Cute first. The character and art style are the product. See `docs/ART.md`.
- Every phase ends usable. Never start a phase with the previous one broken.
- Setup is play. Building your home is how you set up chores, never a form.
- Rewards only come from real chores getting done.
- Rewards are purely cosmetic: outfits, room styles and decor that brings no chores. Anything that brings chores (a plant, a fish tank) is in the catalog from the start, never behind an unlock.
- Progress is never lost: accounts with cloud sync by default; guests start instantly (anonymous auth) and link a login later.
- All art is designed from scratch, no asset packs.

## Decisions

| Topic | Decision |
| --- | --- |
| Platform | Installable PWA, mobile-first |
| Frontend | Vite + React + TypeScript |
| Rendering | SVG + DOM (no canvas engine) |
| Backend | Supabase: anonymous auth, Postgres with row-level security |
| Pet character | All three concepts ship: Mochi (dumpling), Bun (bunny), Sprout (seedling). Each player picks one at first launch and can switch later in the character creator. Every item works on every species |
| Pet death | Never. Lowest state is sick in bed; always recovers |
| Vacation | Pauses chores, health decay and streaks |
| Photo proof | On hold (schema keeps a `photo_proof` flag) |
| Demo | In-app screen recording only; sample home for voters |

## Domain rules

- Schedules: daily, every N days, specific weekdays, weekly, monthly (clamped to month length).
- A chore is due on its date, overdue after. On-time, late and early completions are handled in `src/domain/schedule.ts` (see its doc comment).
- Every chore's schedule is the player's to set: every day, every N days (2 to 60), chosen weekdays, weekly or monthly. Objects bring sensible defaults (washing the dishes daily, cleaning the toilet weekly, the oven monthly), and any chore can be tied to an object in the room, or to none.
- A late chore's neglect level (0 to 3, `src/domain/neglect.ts`) follows its own rhythm: level 1 from one day late, level 2 at 40% of its cadence (2 to 7 days), level 3 after a whole cadence (4 to 14 days). A weekly toilet is level 1 the day after, level 2 after 3 days and level 3 after a week; daily dishes reach level 3 in 4 days; a monthly oven clean takes two weeks.
- Neglect shows on the object it belongs to and grows: level 1 swaps in the object's messy art with a hint of a cue above it, level 2 the very messy art with a clear cue (stink and a fly, a dust puff, dry leaves), level 3 an unmistakable one (a big stink cloud with flies, a dust cloud with cobwebs). The chore list's late tags get louder with the same levels. It stays funny, never gross.
- Health starts at 100 and loses a penalty per late chore by its neglect level (6, 15, 25), growing slowly while it stays at level 3 and capped per chore (`src/domain/health.ts`, `HEALTH_TUNING`). The pet feels what the room shows.
- Moods by health: happy (85+), content (65+), meh (45+), scruffy (25+), sick.

## Open decisions

- Name of the game
