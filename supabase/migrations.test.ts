import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

// Runs every migration on a real Postgres (PGlite) with a stand-in for
// Supabase's auth schema, then checks the progress merge trigger (0004).

const DIR = new URL('./migrations/', import.meta.url)
const USER = '11111111-1111-4111-8111-111111111111'
const HOME = '22222222-2222-4222-8222-222222222222'

interface Row {
  chore_count: number
  best_streak: number
  unlocked_items: string[]
  counted_from: string | null
}

describe('supabase migrations', () => {
  const db = new PGlite()

  beforeAll(async () => {
    await db.exec(`
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select '${USER}'::uuid $$;
      insert into auth.users values ('${USER}');
    `)
    for (const file of readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(file, DIR), 'utf8'))
    await db.exec(`insert into homes (id, name) values ('${HOME}', 'Home')`)
  }, 30_000)

  // The same upsert PostgREST sends (insert ... on conflict do update).
  const upsert = (count: number, best: number, items: string[], from: string | null) =>
    db.query(
      `insert into progress (home_id, chore_count, current_streak, best_streak, unlocked_items, counted_from)
       values ($1, $2, 0, $3, $4, $5)
       on conflict (home_id) do update set chore_count = excluded.chore_count, best_streak = excluded.best_streak,
         unlocked_items = excluded.unlocked_items, counted_from = excluded.counted_from`,
      [HOME, count, best, items, from],
    )
  const read = async () =>
    (await db.query<Row>(`select chore_count, best_streak, unlocked_items, counted_from::text from progress where home_id = $1`, [HOME])).rows[0]

  it('merges progress written by two devices instead of letting the last write win', async () => {
    await upsert(1, 1, ['item:beanie-red'], '2026-10-06')
    await upsert(3, 4, ['item:beanie-red', 'decor:plant'], '2026-10-06') // phone
    await upsert(2, 2, ['item:beanie-red', 'wall:mint'], null) // tablet, last
    expect(await read()).toEqual({ chore_count: 3, best_streak: 4, unlocked_items: ['item:beanie-red', 'decor:plant', 'wall:mint'], counted_from: '2026-10-06' })
  })

  it('keeps the earliest counting day and never forgets an unlock', async () => {
    await upsert(0, 0, [], '2026-10-01')
    const row = await read()
    expect(row.counted_from).toBe('2026-10-01')
    expect(row.unlocked_items).toEqual(['item:beanie-red', 'decor:plant', 'wall:mint'])
  })
})
