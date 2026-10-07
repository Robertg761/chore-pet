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
- Health starts at 100 and loses a penalty per overdue chore that grows with lateness and is capped per chore (`src/domain/health.ts`, `HEALTH_TUNING`).
- Moods by health: happy (85+), content (65+), meh (45+), scruffy (25+), sick.

## Open decisions

- Name of the game
