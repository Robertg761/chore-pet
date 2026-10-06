# Chore Pet

A cute virtual pet that lives in an isometric home you build. Placed objects bring real chores; overdue chores show as mess and make the pet sick; finishing them unlocks outfits and decor. Built for Hackyard Yard #4: all code written fresh during the Yard.

## Read first

- docs/SPEC.md: product, decisions, domain rules
- docs/PLAN.md: phased build plan with the lead vs subagent split. This is the source of truth for what to do next.
- docs/ART.md: art contract for every visual asset

## Commands

- `npm run dev`: local dev server (open `/?art` for the art gallery)
- `npm test`: Vitest unit tests (domain logic)
- `npm run build`: typecheck + production build (PWA)
- `npm run lint`: oxlint

## How to work

1. Follow docs/PLAN.md in phase order. Don't start a phase until the previous one's "Done when" is met (Phase 0 art may run alongside Phase 1).
2. You are the lead. Do every [LEAD] task yourself.
3. Delegate every [SONNET: agent] task to that project subagent (`.claude/agents/`). Dispatch all tasks in a "Parallel batch" together, in parallel, with the task text, the files it owns, and its check.
4. Review each subagent result before moving on: run `npm run build` and `npm test`, look at the diff, and for art compare against docs/ART.md in the `/?art` gallery. Send it back with specific notes if it misses the bar. Cuteness and consistency are the product.
5. Tick tasks off in docs/PLAN.md as they land. Commit after each task with a clear message.

Subagents are configured with `model: claude-sonnet-5-5`. Run `/agents` to confirm they're picked up; if a subagent reports running on a different model, mention it to Robert rather than working around it.

## Code rules

- Domain logic stays pure in src/domain with tests; UI never re-implements schedule or health rules.
- Dates are local ISO calendar dates ("YYYY-MM-DD"); use the helpers in src/domain/dates.ts.
- All art is hand-authored SVG in TSX following docs/ART.md. No asset packs, no raster images, no emoji in the UI.
- The pet never dies. Copy is kind and short; the pet never guilt-trips.
- Never commit secrets. Supabase keys go in .env (see .env.example).
