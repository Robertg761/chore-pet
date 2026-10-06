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
  retired: Record<string, number>
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
  const upsert = (count: number, best: number, items: string[], retired: Record<string, number>) =>
    db.query(
      `insert into progress (home_id, chore_count, current_streak, best_streak, unlocked_items, retired)
       values ($1, $2, 0, $3, $4, $5)
       on conflict (home_id) do update set chore_count = excluded.chore_count, best_streak = excluded.best_streak,
         unlocked_items = excluded.unlocked_items, retired = excluded.retired`,
      [HOME, count, best, items, JSON.stringify(retired)],
    )
  const read = async () =>
    (await db.query<Row>(`select chore_count, best_streak, unlocked_items, retired from progress where home_id = $1`, [HOME])).rows[0]

  it('merges progress written by two devices instead of letting the last write win', async () => {
    await upsert(1, 1, ['item:beanie-red'], {})
    await upsert(3, 4, ['item:beanie-red', 'decor:plant'], { sink: 2 }) // phone deleted the sink
    await upsert(2, 2, ['item:beanie-red', 'wall:mint'], { bed: 1 }) // tablet deleted the bed, and wrote last
    expect(await read()).toEqual({ chore_count: 3, best_streak: 4, unlocked_items: ['item:beanie-red', 'decor:plant', 'wall:mint'], retired: { sink: 2, bed: 1 } })
  })

  it('never forgets an unlock or a retired chore, keeping the higher count per chore', async () => {
    await upsert(0, 0, [], { sink: 1, oven: 4 })
    const row = await read()
    expect(row.unlocked_items).toEqual(['item:beanie-red', 'decor:plant', 'wall:mint'])
    expect(row.retired).toEqual({ sink: 2, bed: 1, oven: 4 })
  })

  it('marks completions as counting unless told otherwise', async () => {
    const chore = '33333333-3333-4333-8333-333333333333'
    await db.query(`insert into chores (id, home_id, name, schedule) values ($1, $2, 'Dishes', '{"kind":"daily"}')`, [chore, HOME])
    await db.query(`insert into completions (id, chore_id, completed_on) values (gen_random_uuid(), $1, '2026-10-06')`, [chore])
    await db.query(`insert into completions (id, chore_id, completed_on, counts) values (gen_random_uuid(), $1, '2026-10-05', false)`, [chore])
    const counts = (await db.query<{ counts: boolean }>(`select counts from completions order by completed_on`)).rows.map((r) => r.counts)
    expect(counts).toEqual([false, true])
  })
})
