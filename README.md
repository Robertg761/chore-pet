# Chore Pet

A tiny pet that lives in a home you build. Every object brings real chores; keep up and it thrives, fall behind and the mess shows up in its room. Working name, built for Hackyard Yard #4.

## Setup

1. `npm install`
2. Create a Supabase project, then in Authentication settings turn on **Allow anonymous sign-ins**.
3. Run the files in `supabase/migrations/` in order in the Supabase SQL editor (or with the Supabase CLI).
4. Copy `.env.example` to `.env` and fill in your project URL and anon key.
5. `npm run dev`

The app also runs without Supabase keys using sample data, which is handy for UI work.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests |
| `npm run build` | Typecheck and build the PWA |
| `npm run lint` | Lint |

## Docs

- `docs/SPEC.md`: what we're building and why
- `docs/PLAN.md`: phased build plan and task split for Claude Code subagents
- `docs/ART.md`: art direction and character rules
