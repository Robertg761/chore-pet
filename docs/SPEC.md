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

- Schedules: daily, every N days, specific weekdays, weekly, monthly (clamped to month length). A schedule kind this version doesn't know (written by a newer app) is treated as daily rather than crashing.
- A chore is due on its date, overdue after. Each completion day is replayed in order (`src/domain/schedule.ts`):
  - On time or late: satisfies the owed occurrence; the next one is the first scheduled date after the completion.
  - Early (after the previous scheduled date, before the due date): satisfies the owed occurrence, but only if nothing was done in that window yet and, once the chore has been done at all, only from halfway through the gap (a weekly chore from 3 days before). Anything else is a repeat: it isn't recorded and doesn't count toward rewards. So a late completion followed by another the next day never skips an occurrence, and tapping a chore every day counts no faster than its schedule.
  - Every N days: due N days after the last counted completion; a completion counts only from halfway (due minus floor(N/2) days). A new one is first due floor(N/2) days after it is created (plant and cushions in 3 days, trash and stove tomorrow), so a fresh home doesn't fall due all at once. Daily chores are due the day they are made, so the first-chore gift lands in the first session.
- Grace days, so the pet is never unwell for something fair:
  - A new chore's first occurrence, due the day it is created with nothing done yet, gets one extra day before it is late (a chore added in the evening isn't late by morning).
  - An occurrence that falls due during a vacation is due on the first day back, not late on it. Overdue days count from that day and skip vacation days.
- A schedule change is not retroactive: a changed schedule records the day it took effect (`since`, set by `updateChore`), nothing from before it is owed, and the first due date is the schedule's first date on or after it (a completion on or after that day still counts). A rename, or saving the same schedule, keeps the old one. Comparing schedules ignores `since`.
- Every chore's schedule is the player's to set: every day, every N days (2 to 180), chosen weekdays, weekly or monthly. Objects bring sensible defaults (washing the dishes daily, cleaning the toilet weekly, the oven every 90 days), and any chore can be tied to an object in the room, or to none.
- A late chore's neglect level (0 to 3, `src/domain/neglect.ts`) follows its own rhythm: level 1 from one day late, level 2 at 40% of its cadence (2 to 7 days), level 3 after a whole cadence (4 to 14 days). A weekly toilet is level 1 the day after, level 2 after 3 days and level 3 after a week; daily dishes reach level 3 in 4 days; a monthly chore takes two weeks.
- Neglect shows on the object it belongs to and grows: level 1 swaps in the object's messy art with a hint of a cue above it, level 2 the very messy art with a clear cue (stink and a fly, a dust puff, dry leaves), level 3 an unmistakable one (a big stink cloud with flies, a dust cloud with cobwebs). The chore list's late tags get louder with the same levels. It stays funny, never gross.
- Health (`src/domain/health.ts`, `HEALTH_TUNING`): each late chore costs a penalty by its neglect level (4, 12, 25), growing by 2 a day while it stays at level 3, capped at 35 per chore. Level-1 penalties together cost at most 20, so a few things a day late is a nudge, not a slump. With P the total, health is 100 × 100 / (100 + P): full at 100, gentle at first, never quite 0, and every chore done moves the bar, even after a week away. The pet feels what the room shows.
- Moods by health: happy (88+), content (70+), meh (50+), scruffy (33+), sick below that. The pet never dies.
- Streak (`src/domain/unlocks.ts`): a day counts when at least one chore was done that day (or nothing was due) and no chore ended the day at neglect level 2 or worse. Today counts as soon as it qualifies, and isn't held against the streak until it's over. Every 7 counted days bank a rest token (at most 2); a day that doesn't count spends a token instead of breaking the streak, and adds nothing to it. Vacation days neither count, break nor spend. Seeded sample-home history isn't the player's and doesn't make a day count.
- Removing a chore archives it with an exclusive local end date. Its completions and earlier schedule remain available to streaks, week totals and historical health. Furniture removal detaches its chores and archives them unless the player chooses to keep them. Removing a whole home/account still erases its history. An end date can only move earlier (never later, never back to open, never before the chore starts), so removals from several devices, one with its clock set ahead, settle on the earliest in any order (`archiveEnd`, and the server's trigger from migration 0008). Deletes from clients older than 0007 carry no local date, so the server's guess for them never overrides an end already recorded. Days with no active chores and no real completions pause the current streak without counting, breaking or spending tokens. Work recorded on the archive day still counts.
- Managing chores: every chore's name opens its editor (a pencil marks it). The Chores screen (More, or Manage on the full list) groups chores by object, removes several at once, and lists removed chores (newest first, once per name, leaving out names already on the list) so one can be added back. Adding one back makes a new chore with the same name and rule, tied to its object if that is still in the room; archived chores are never reopened. It starts that day. If the removed one's current round was already done, it resumes where that one stood (`resumeFrom`, kept on the schedule as `resume`: the next due date and the last day done), so it is due exactly when the old one would have been and an early completion counts exactly as it would have; removing and adding back can neither earn a round twice nor count as missing one. Completions dated after that day (a clock set ahead) are ignored.
- Starting over (Settings): "Clear room and chores" removes all furniture and archives every chore, as removing them one by one would, so the pet, its look, rewards and history stay; meant for a move or a new set of chores. Clearing also sends one server instruction (`clear_home`, migration 0008) that clears everything in the home stored before the moment it was pressed, including what another device added that this one hadn't pulled yet; anything added after it, on any device, stays (a chore added since to furniture that is cleared stays too, detached). The server corrects that moment for the device clock's error, from the device's time when sending. A clear that reaches the server more than a day late does nothing there (the rows may have been in use since); what it missed shows on the Chores screen. Until the migration is applied the app clears what each device has and keeps that one instruction queued, without holding up anything else. "Erase everything" removes the home; if the account has other homes, the question says they stay. Each asks twice, with focus on the safe choice. The sample home has its own Start fresh instead.
- Chore count (rewards): counted completions, once per chore per day, plus legacy banked counts for chores deleted before history retention; a chore is counted once whether its rows or its banked count are present, so a delete that hasn't synced yet never counts it twice.
- Completions are stamped with the real date and time, never later, so a clock set ahead (the dev clock) can't record a day that hasn't happened.

## Open decisions

- Name of the game
