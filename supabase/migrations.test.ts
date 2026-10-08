import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { ALL_ENTRIES } from '../src/catalog/objects'
import { sampleHome } from '../src/content/sampleHome'
import {
  addChore,
  adoptSample,
  clearHome,
  completeChore,
  completeChoreWithRewards,
  createHousehold,
  createRoom,
  moveObject,
  placeObject,
  removeChore,
  removeHome,
  removeObject,
  setVacations,
  updateChore,
  updatePet,
  updateRoom,
  type History,
} from '../src/data/actions'
import { KEY_COLUMN, MAPPERS } from '../src/data/mappers'
import { change, emptySnapshot, planFlush, selectHome, type NewOp, type Snapshot } from '../src/data/state'
import { TABLES, type TableName } from '../src/data/tables'
import { CHARACTER_SLOTS, SPECIES, type Chore, type Home, type Pet, type PlacedObject, type Progress, type Room, type RoomType, type Schedule } from '../src/domain/types'
import { UNLOCKS } from '../src/domain/unlocks'
import { FLOOR_STYLES, WALL_STYLES } from '../src/room/shell/styles'
import { NAME_MAX } from '../src/screens/choreForm'
import { againInput } from '../src/screens/manageModel'
import { BODY_COLOURS, CHEEK_OPTIONS, EYE_OPTIONS } from '../src/screens/creatorModel'

// Runs the migrations on a real Postgres (PGlite) set up like Supabase:
// anon and authenticated roles with Supabase's default grants, auth.uid()
// read from the request's JWT claim, and SET ROLE so row-level security
// applies. Client writes are built by the app's own action functions and
// mappers and sent the way PostgREST runs an upsert.

const DIR = new URL('./migrations/', import.meta.url)
const MIGRATIONS = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
const sql = (file: string) => readFileSync(new URL(file, DIR), 'utf8')

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const D = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const USERS = [A, B, C, D]
const TODAY = '2026-10-07'

type Result = { ok: true; rows: Record<string, unknown>[] } | { ok: false; code: string; message: string }

/** A Postgres with Supabase's roles, auth stand-in and default privileges, and the migrations up to `last` (inclusive). */
async function supabaseLike(last = MIGRATIONS[MIGRATIONS.length - 1]): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
    insert into auth.users values ${USERS.map((u) => `('${u}')`).join(', ')};
  `)
  for (const file of MIGRATIONS.filter((f) => f <= last)) await db.exec(sql(file))
  return db
}

/** Run a statement as a signed-in user (or as anon with no user), with RLS on. */
async function as(db: PGlite, user: string | null, query: string, params: unknown[] = []): Promise<Result> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false); set role ${user ? 'authenticated' : 'anon'};`)
  try {
    const r = await db.query<Record<string, unknown>>(query, params)
    return { ok: true, rows: r.rows }
  } catch (e) {
    const err = e as { code?: string; message: string }
    return { ok: false, code: err.code ?? '', message: err.message }
  } finally {
    await db.exec('reset role')
  }
}

/** What PostgREST runs for supabase.from(table).upsert(rows, { onConflict }). */
function upsertRows(db: PGlite, user: string, table: TableName, rows: Record<string, unknown>[]): Promise<Result> {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const list = cols.join(', ')
  return as(
    db,
    user,
    `insert into ${table} (${list}) select ${list} from jsonb_populate_recordset(null::${table}, $1::jsonb)
     on conflict (${KEY_COLUMN[table]}) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}`,
    [JSON.stringify(rows)],
  )
}

/**
 * One device: applies actions locally and syncs them the way src/data/store.ts
 * does (planFlush order, mapper rows, one request per table and kind).
 * Returns the server's refusals; a working client gets none.
 */
function device(db: PGlite, user: string) {
  let snap: Snapshot = emptySnapshot(user)
  return {
    get tables() {
      return snap.tables
    },
    async apply(...ops: NewOp[]): Promise<string[]> {
      snap = ops.reduce(change, snap)
      const refused: string[] = []
      for (const step of planFlush(snap.outbox)) {
        const res =
          step.kind === 'upsert'
            ? await upsertRows(
                db,
                user,
                step.table,
                step.ops.map((o) => MAPPERS[step.table].toRow((o as { value: never }).value)),
              )
            : step.table === 'placed_objects' && step.ops[0]?.kind === 'delete' && step.ops[0].removal
              ? await as(db, user, `select public.remove_objects($1::uuid[], $2::date, $3::boolean)`, [step.ops.map(o => o.key), step.ops[0].removal.archivedOn, step.ops[0].removal.keepChores ?? false])
              : await as(db, user, `delete from ${step.table} where ${KEY_COLUMN[step.table]} = any($1::uuid[])`, [step.ops.map((o) => o.key)])
        if (!res.ok) refused.push(`${step.kind} ${step.table}: ${res.code} ${res.message}`)
      }
      snap = { ...snap, outbox: {} }
      return refused
    },
  }
}

type Device = ReturnType<typeof device>

const rowsOf = <T,>(dev: Device, table: TableName) => Object.values(dev.tables[table]) as T[]

/** Rows per table the user can read back. */
async function serverCounts(db: PGlite, user: string): Promise<Record<TableName, number>> {
  const out = {} as Record<TableName, number>
  for (const t of TABLES) {
    const r = await as(db, user, `select count(*)::int as n from ${t}`)
    if (!r.ok) throw new Error(r.message)
    out[t] = r.rows[0].n as number
  }
  return out
}

const localCounts = (dev: Device) => Object.fromEntries(TABLES.map((t) => [t, Object.keys(dev.tables[t]).length])) as Record<TableName, number>

/** Row counts for every owner, read past RLS. */
async function countsByOwner(db: PGlite): Promise<Record<string, Record<TableName, number>>> {
  const out: Record<string, Record<TableName, number>> = {}
  for (const u of USERS) {
    out[u] = {} as Record<TableName, number>
    for (const t of TABLES) out[u][t] = (await db.query<{ n: number }>(`select count(*)::int as n from ${t} where owner_id = $1`, [u])).rows[0].n
  }
  return out
}

const expectRefused = (r: Result, code: string) => {
  expect(r.ok, r.ok ? 'expected the server to refuse this' : '').toBe(false)
  if (!r.ok) expect(r.code).toBe(code)
}

describe('supabase migrations (0006 applied)', () => {
  let db: PGlite
  let a: Device
  const home = (dev: Device) => rowsOf<Home>(dev, 'homes')[0]
  const room = (dev: Device) => rowsOf<Room>(dev, 'rooms')[0]
  const pet = (dev: Device) => rowsOf<Pet>(dev, 'pets')[0]
  const progress = (dev: Device) => rowsOf<Progress>(dev, 'progress')[0]

  beforeAll(async () => {
    db = await supabaseLike()
    a = device(db, A)
    // A builds a home the way the app does: a longest-allowed pet name (with a non-Latin letter and an emoji).
    expect(await a.apply(...createHousehold({ species: 'mochi', petName: 'Ünïcødé 名前 🐾 '.padEnd(40, 'x'), userId: A }))).toEqual([])
  }, 60_000)

  describe('every write the app makes is still accepted', () => {
    it('rooms of every type, in every floor and wall style', async () => {
      for (const type of ['kitchen', 'bedroom', 'bathroom', 'living', 'other'] as RoomType[]) expect(await a.apply(...createRoom(home(a), type))).toEqual([])
      for (const floor of FLOOR_STYLES)
        for (const wall of WALL_STYLES) expect(await a.apply(...updateRoom(room(a), { floorStyle: floor.id, wallStyle: wall.id }))).toEqual([])
    })

    it('every catalog object, with its default chores, anywhere on the 8x8 room', async () => {
      let i = 0
      for (const entry of ALL_ENTRIES) {
        const at = { tileX: i % 8, tileY: Math.floor(i / 8) % 8, rotation: (i % 4) as PlacedObject['rotation'] }
        expect(await a.apply(...placeObject(room(a), entry, at, TODAY))).toEqual([])
        i++
      }
      const first = rowsOf<PlacedObject>(a, 'placed_objects')[0]
      expect(await a.apply(...moveObject(first, { tileX: 7, tileY: 7, rotation: 3 }))).toEqual([])
      expect(await a.apply(...moveObject(first, { tileX: 0, tileY: 0, rotation: 0 }))).toEqual([])
    })

    it('chores with the longest name and every schedule, including a "since" date', async () => {
      const schedules = [
        { kind: 'daily' },
        { kind: 'everyNDays', n: 60 },
        { kind: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] },
        { kind: 'weekly', weekday: 6 },
        { kind: 'monthly', dayOfMonth: 31 },
        { kind: 'everyNDays', n: 3, since: TODAY },
        { kind: 'monthly', dayOfMonth: 15, since: '2026-01-31' },
      ] as Schedule[]
      const object = rowsOf<PlacedObject>(a, 'placed_objects')[0]
      for (const schedule of schedules) {
        expect(await a.apply(...addChore(home(a), { name: 'Ä'.repeat(NAME_MAX), schedule }, TODAY))).toEqual([])
        expect(await a.apply(...addChore(home(a), { name: 'Wipe it', schedule, objectId: object.id }, TODAY))).toEqual([])
      }
      // The inline editor lets a little more through before validation trims it back.
      const chore = rowsOf<Chore>(a, 'chores')[0]
      expect(await a.apply(...updateChore(chore, { name: 'y'.repeat(NAME_MAX + 10), schedule: { kind: 'weekly', weekday: 2 }, objectId: null }))).toEqual([])
    })

    it('completions, the chore count and rewards', async () => {
      const chores = rowsOf<Chore>(a, 'chores')
      expect(await a.apply(...completeChore(chores[0], progress(a), new Date(2026, 9, 6, 9)))).toEqual([])
      expect(await a.apply(...completeChore(chores[1], progress(a), new Date(2026, 9, 6, 9), { counts: false }))).toEqual([])
      const done = completeChoreWithRewards(chores[2], progress(a), { chores, completions: rowsOf(a, 'completions'), vacations: [] }, new Date(2026, 9, 7, 10))
      expect(await a.apply(...done.ops)).toEqual([])
    })

    it('the pet in every species, colour, face and outfit', async () => {
      for (const species of SPECIES) expect(await a.apply(...updatePet(pet(a), { species }))).toEqual([])
      for (const colour of BODY_COLOURS) expect(await a.apply(...updatePet(pet(a), { bodyColour: colour.hex }))).toEqual([])
      for (const eye of EYE_OPTIONS) for (const cheek of CHEEK_OPTIONS) expect(await a.apply(...updatePet(pet(a), { eyes: eye.value, cheeks: cheek.value }))).toEqual([])
      const items = UNLOCKS.filter((u) => u.kind === 'item').map((u) => u.ref)
      const equipped = Object.fromEntries(CHARACTER_SLOTS.map((slot, i) => [slot, items[i % items.length]]))
      const outfits = [1, 2, 3].map((n) => ({ id: crypto.randomUUID(), name: `Outfit ${n} `.padEnd(16, 'z'), equipped }))
      expect(await a.apply(...updatePet(pet(a), { equipped, outfits, name: 'P'.repeat(40) }))).toEqual([])
      expect(await a.apply(...updatePet(pet(a), { equipped: {}, outfits: [] }))).toEqual([])
    })

    it('vacations, renaming the home, every unlock and banked chores', async () => {
      const windows = Array.from({ length: 30 }, (_, i) => ({ start: `2027-${String((i % 12) + 1).padStart(2, '0')}-01`, end: `2027-${String((i % 12) + 1).padStart(2, '0')}-${10 + (i % 18)}` }))
      expect(await a.apply(...setVacations(home(a), windows))).toEqual([])
      expect(await a.apply(...setVacations(home(a), []))).toEqual([])
      expect(await a.apply(...adoptSample(home(a), 'Our flat'))).toEqual([])
      const unlockedItems = [...UNLOCKS.map((u) => u.id), 'wall:peach', 'floor:wood']
      const retired = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [crypto.randomUUID(), i]))
      expect(await a.apply({ table: 'progress', kind: 'upsert', key: home(a).id, value: { ...progress(a), unlockedItems, retired, choreCount: 999, currentStreak: 40, bestStreak: 365 } } as NewOp)).toEqual([])
    })

    it('removing chores and objects (banking their progress), then the server matches the device', async () => {
      const history = (): History => ({ progress: progress(a), chores: rowsOf<Chore>(a, 'chores'), completions: rowsOf(a, 'completions') })
      const chore = rowsOf<Chore>(a, 'chores').find((c) => rowsOf<{ choreId: string }>(a, 'completions').some((x) => x.choreId === c.id))!
      expect(await a.apply(...removeChore(chore.id, history()))).toEqual([])
      const object = rowsOf<PlacedObject>(a, 'placed_objects')[1]
      expect(await a.apply(...removeObject(object.id, history()))).toEqual([])
      expect(await serverCounts(db, A)).toEqual(localCounts(a))
    })

    it('a whole sample home, for every pet', async () => {
      for (const [i, species] of SPECIES.entries()) {
        const dev = device(db, C)
        const ops = sampleHome({ species, userId: C, today: TODAY })
        expect(await dev.apply(...ops)).toEqual([])
        if (i === SPECIES.length - 1) expect(await dev.apply(...adoptSample(home(dev)))).toEqual([])
      }
      const counts = await serverCounts(db, C)
      expect(counts.homes).toBe(SPECIES.length)
      expect(counts.completions).toBeGreaterThan(10)
    })
  })

  describe('one owner cannot reach into another home', () => {
    let homeB: string
    let homeD: string
    beforeAll(async () => {
      const b = device(db, B)
      expect(await b.apply(...createHousehold({ species: 'bun', petName: 'Bun', userId: B }))).toEqual([])
      expect(await b.apply(...addChore(home(b), { name: 'B chore', schedule: { kind: 'daily' } }, TODAY))).toEqual([])
      expect(await b.apply(...placeObject(room(b), ALL_ENTRIES[0], { tileX: 0, tileY: 0, rotation: 0 }, TODAY))).toEqual([])
      homeB = home(b).id
      // D has a home whose pet and progress rows haven't synced yet.
      const d = device(db, D)
      expect(await d.apply(...createHousehold({ species: 'sprout', petName: 'Sprout', userId: D }).filter((op) => op.table === 'homes'))).toEqual([])
      homeD = home(d).id
    })

    it('reads, edits and deletes stay owner-only, and anon sees nothing', async () => {
      for (const t of TABLES) {
        const r = await as(db, B, `select * from ${t} where owner_id = $1`, [A])
        expect(r.ok && r.rows.length).toBe(0)
        const anon = await as(db, null, `select * from ${t}`)
        expect(anon.ok && anon.rows.length).toBe(0)
      }
      const update = await as(db, B, `update homes set name = 'mine now' where id = $1 returning id`, [home(a).id])
      expect(update.ok && update.rows.length).toBe(0)
      expectRefused(await as(db, B, `insert into homes (owner_id, name) values ($1, 'x')`, [A]), '42501')
      expectRefused(await as(db, null, `insert into homes (name) values ('x')`), '42501')
    })

    it('refuses rows that point at another owner’s home, room, object or chore', async () => {
      const aRoom = room(a).id
      const aObject = rowsOf<PlacedObject>(a, 'placed_objects')[0].id
      const aChore = rowsOf<Chore>(a, 'chores')[0].id
      expectRefused(await as(db, B, `insert into rooms (home_id, type) values ($1, 'other')`, [home(a).id]), '23503')
      expectRefused(await as(db, B, `insert into placed_objects (room_id, catalog_id, tile_x, tile_y) values ($1, 'bed', 1, 1)`, [aRoom]), '23503')
      expectRefused(await as(db, B, `insert into chores (home_id, name, schedule) values ($1, 'x', '{}')`, [home(a).id]), '23503')
      expectRefused(await as(db, B, `insert into chores (home_id, object_id, name, schedule) values ($1, $2, 'x', '{}')`, [homeB, aObject]), '23503')
      expectRefused(await as(db, B, `insert into completions (chore_id, completed_on) values ($1, '2026-10-06')`, [aChore]), '23503')
      expectRefused(await as(db, B, `update chores set home_id = $1 where owner_id = $2`, [homeD, B]), '23503')
    })

    it('refuses squatting the pet and progress slots of another home, so its owner can still sync them', async () => {
      expectRefused(await as(db, B, `insert into pets (home_id, name) values ($1, 'squat')`, [homeD]), '23503')
      expectRefused(await as(db, B, `insert into progress (home_id) values ($1)`, [homeD]), '23503')
      const d = device(db, D)
      const household = createHousehold({ species: 'sprout', petName: 'Sprout', userId: D })
      const homeOp = household.find((op) => op.table === 'homes')!
      const rest = household.filter((op) => op.table === 'pets' || op.table === 'progress').map((op) => ({ ...op, value: { ...(op as { value: object }).value, homeId: homeD } }) as NewOp)
      expect(homeOp.key).not.toBe(homeD)
      expect(await d.apply(...rest)).toEqual([])
      expect((await serverCounts(db, D)).pets).toBe(1)
      expect((await serverCounts(db, D)).progress).toBe(1)
    })

    it('gives the same error for a real id of another owner as for an id that does not exist', async () => {
      const refusal = (r: Result) => (r.ok ? 'accepted' : `${r.code} ${r.message}`)
      const real = await as(db, B, `insert into rooms (home_id, type) values ($1, 'other')`, [home(a).id])
      const made = await as(db, B, `insert into rooms (home_id, type) values (gen_random_uuid(), 'other')`)
      expect(refusal(real)).toBe(refusal(made))
      expect(refusal(real)).toMatch(/^23503 /)
    })
  })

  describe('limits', () => {
    const rejects = async (query: string, params: unknown[] = []) => {
      const r = await as(db, A, query, params)
      expect(r.ok, `expected a refusal: ${query}`).toBe(false)
    }

    it('refuses over-long names', async () => {
      const homeId = home(a).id
      await rejects(`update homes set name = $1 where id = $2`, ['h'.repeat(101), homeId])
      await rejects(`update pets set name = $1 where home_id = $2`, ['p'.repeat(61), homeId])
      await rejects(`insert into chores (home_id, name, schedule) values ($1, $2, '{"kind":"daily"}')`, [homeId, 'c'.repeat(101)])
      await rejects(`insert into chores (home_id, name, schedule) values ($1, $2, '{"kind":"daily"}')`, [homeId, 'c'.repeat(5_000_000)])
    })

    it('refuses bad JSON shapes, colours, ids, tiles, dates and counts', async () => {
      const homeId = home(a).id
      const roomId = room(a).id
      const choreId = rowsOf<Chore>(a, 'chores')[0].id
      await rejects(`update homes set vacations = '"lol"' where id = $1`, [homeId])
      await rejects(`update homes set vacations = '[1, 2]' where id = $1`, [homeId])
      await rejects(`update homes set vacations = $1 where id = $2`, [JSON.stringify(Array.from({ length: 501 }, () => ({ start: TODAY, end: TODAY }))), homeId])
      await rejects(`insert into chores (home_id, name, schedule) values ($1, 'x', '"daily"')`, [homeId])
      await rejects(`insert into chores (home_id, name, schedule) values ($1, 'x', $2)`, [homeId, JSON.stringify({ kind: 'daily', junk: 'j'.repeat(3000) })])
      await rejects(`update pets set body_colour = 'url(https://evil.example/x)' where home_id = $1`, [homeId])
      await rejects(`update pets set equipped = '[]' where home_id = $1`, [homeId])
      await rejects(`update pets set outfits = '{}' where home_id = $1`, [homeId])
      await rejects(`update pets set outfits = to_jsonb(array[repeat('o', 40000)]) where home_id = $1`, [homeId])
      await rejects(`update rooms set floor_style = 'wood; x' where id = $1`, [roomId])
      await rejects(`insert into placed_objects (room_id, catalog_id, tile_x, tile_y) values ($1, '../bed', 0, 0)`, [roomId])
      await rejects(`insert into placed_objects (room_id, catalog_id, tile_x, tile_y) values ($1, 'bed', 64, 0)`, [roomId])
      await rejects(`insert into placed_objects (room_id, catalog_id, tile_x, tile_y) values ($1, 'bed', 0, -1)`, [roomId])
      await rejects(`insert into completions (chore_id, completed_on) values ($1, '9999-12-31')`, [choreId])
      await rejects(`update progress set current_streak = -5 where home_id = $1`, [homeId])
      await rejects(`update progress set unlocked_items = array(select 'item:' || g from generate_series(1, 1001) g) where home_id = $1`, [homeId])
      for (const retired of [{ x: 'abc' }, { x: -1 }, { x: 1.5 }, { x: null }, { x: 2_000_000 }, ['x']]) {
        await rejects(`update progress set retired = $1 where home_id = $2`, [JSON.stringify(retired), homeId])
        // The insert path (a fresh home's first sync) is checked too.
        const fresh = crypto.randomUUID()
        expect((await as(db, A, `insert into homes (id) values ($1)`, [fresh])).ok).toBe(true)
        await rejects(`insert into progress (home_id, retired) values ($1, $2)`, [fresh, JSON.stringify(retired)])
        expect((await as(db, A, `delete from homes where id = $1`, [fresh])).ok).toBe(true)
      }
    })
  })

  describe('progress merge (0004) still works for a signed-in user', () => {
    let homeId: string
    const upsert = (count: number, best: number, items: string[], retired: Record<string, number>) =>
      upsertRows(db, B, 'progress', [{ home_id: homeId, chore_count: count, current_streak: 0, best_streak: best, unlocked_items: items, retired }])
    const read = async () => {
      const r = await as(db, B, `select chore_count, best_streak, unlocked_items, retired from progress where home_id = $1`, [homeId])
      return r.ok ? r.rows[0] : r
    }
    beforeAll(async () => {
      homeId = crypto.randomUUID()
      expect((await as(db, B, `insert into homes (id) values ($1)`, [homeId])).ok).toBe(true)
    })

    it('merges progress written by two devices instead of letting the last write win', async () => {
      expect((await upsert(1, 1, ['item:beanie-red'], {})).ok).toBe(true)
      expect((await upsert(3, 4, ['item:beanie-red', 'decor:plant'], { sink: 2 })).ok).toBe(true) // phone deleted the sink
      expect((await upsert(2, 2, ['item:beanie-red', 'wall:mint'], { bed: 1 })).ok).toBe(true) // tablet deleted the bed, and wrote last
      expect(await read()).toEqual({ chore_count: 3, best_streak: 4, unlocked_items: ['item:beanie-red', 'decor:plant', 'wall:mint'], retired: { sink: 2, bed: 1 } })
    })

    it('never forgets an unlock or a retired chore, keeping the higher count per chore', async () => {
      expect((await upsert(0, 0, [], { sink: 1, oven: 4 })).ok).toBe(true)
      const row = (await read()) as { unlocked_items: string[]; retired: Record<string, number> }
      expect(row.unlocked_items).toEqual(['item:beanie-red', 'decor:plant', 'wall:mint'])
      expect(row.retired).toEqual({ sink: 2, bed: 1, oven: 4 })
    })

    it('marks completions as counting unless told otherwise', async () => {
      const chore = crypto.randomUUID()
      expect((await as(db, B, `insert into chores (id, home_id, name, schedule) values ($1, $2, 'Dishes', '{"kind":"daily"}')`, [chore, homeId])).ok).toBe(true)
      expect((await as(db, B, `insert into completions (chore_id, completed_on) values ($1, '2026-10-06')`, [chore])).ok).toBe(true)
      expect((await as(db, B, `insert into completions (chore_id, completed_on, counts) values ($1, '2026-10-05', false)`, [chore])).ok).toBe(true)
      const r = await as(db, B, `select counts from completions where chore_id = $1 order by completed_on`, [chore])
      expect(r.ok && r.rows.map((x) => x.counts)).toEqual([false, true])
    })

    it('the trigger function cannot be called directly', async () => {
      const r = await db.query<{ anon: boolean; authed: boolean }>(
        `select has_function_privilege('anon', 'public.merge_progress()', 'execute') as anon, has_function_privilege('authenticated', 'public.merge_progress()', 'execute') as authed`,
      )
      expect(r.rows[0]).toEqual({ anon: false, authed: false })
    })
  })

  describe('delete_my_account', () => {
    it('is a definer function with an empty search_path that only signed-in users can run', async () => {
      const r = await db.query<Record<string, unknown>>(
        `select p.prosecdef, p.proconfig,
           has_function_privilege('anon', p.oid, 'execute') as anon,
           has_function_privilege('authenticated', p.oid, 'execute') as authed
         from pg_proc p where p.oid = 'public.delete_my_account()'::regprocedure`,
      )
      expect(r.rows[0]).toEqual({ prosecdef: true, proconfig: ['search_path=""'], anon: false, authed: true })
      expectRefused(await as(db, null, `select public.delete_my_account()`), '42501')
    })

    it('removes the caller and everything they own, and nobody else’s rows', async () => {
      const before = await countsByOwner(db)
      expect(Object.values(before[B]).every((n) => n > 0)).toBe(true)
      expect((await as(db, B, `select public.delete_my_account()`)).ok).toBe(true)
      const after = await countsByOwner(db)
      expect(after[B]).toEqual(Object.fromEntries(TABLES.map((t) => [t, 0])))
      for (const u of [A, C, D]) expect(after[u]).toEqual(before[u])
      const users = await db.query<{ id: string }>(`select id::text from auth.users order by id`)
      expect(users.rows.map((u) => u.id)).toEqual([A, C, D])
    })
  })
})

describe('upgrading an existing database to 0006', () => {
  // The auditor's upgrade check: legitimate data and planted cross-owner rows
  // written under 0001-0005, then 0006 applied on top.
  const homeC = 'c0000000-0000-4000-8000-00000000000c'
  const before0006 = MIGRATIONS.filter((f) => f < '0006')[MIGRATIONS.filter((f) => f < '0006').length - 1]
  let db: PGlite
  let a: Device
  let b: Device
  let legit: Record<string, Record<TableName, number>>
  let bChoreOnAObject: string

  beforeAll(async () => {
    db = await supabaseLike(before0006)
    // Real homes, written by the app.
    a = device(db, A)
    expect(await a.apply(...sampleHome({ species: 'mochi', userId: A, today: TODAY }))).toEqual([])
    b = device(db, B)
    expect(await b.apply(...createHousehold({ species: 'bun', petName: 'Bun', userId: B }))).toEqual([])
    const bHome = rowsOf<Home>(b, 'homes')[0]
    expect(await b.apply(...placeObject(rowsOf<Room>(b, 'rooms')[0], ALL_ENTRIES[0], { tileX: 0, tileY: 0, rotation: 0 }, TODAY))).toEqual([])
    const bChore = rowsOf<Chore>(b, 'chores')[0]
    expect(await b.apply(...completeChore(bChore, rowsOf<Progress>(b, 'progress')[0], new Date(2026, 9, 6, 9)))).toEqual([])
    // C has a home and nothing else yet.
    expect((await as(db, C, `insert into homes (id) values ($1)`, [homeC])).ok).toBe(true)
    legit = await countsByOwner(db)

    // Rows B plants in other homes (all allowed before 0006).
    const aHome = rowsOf<Home>(a, 'homes')[0].id
    const aRoom = rowsOf<Room>(a, 'rooms')[0].id
    const aObject = rowsOf<PlacedObject>(a, 'placed_objects')[0].id
    const aChore = rowsOf<Chore>(a, 'chores')[0].id
    const plantedRoom = crypto.randomUUID()
    const plantedChore = crypto.randomUUID()
    bChoreOnAObject = crypto.randomUUID()
    const plant = [
      [`insert into rooms (id, home_id, type) values ($1, $2, 'other')`, [plantedRoom, aHome]],
      [`insert into placed_objects (room_id, catalog_id, tile_x, tile_y) values ($1, 'bed', 1, 1)`, [plantedRoom]],
      [`insert into placed_objects (room_id, catalog_id, tile_x, tile_y) values ($1, 'bed', 2, 2)`, [aRoom]],
      [`insert into chores (id, home_id, name, schedule) values ($1, $2, 'planted', '{}')`, [plantedChore, aHome]],
      [`insert into completions (chore_id, completed_on) values ($1, '2026-10-01')`, [plantedChore]],
      [`insert into completions (chore_id, completed_on) values ($1, '2026-10-01')`, [aChore]],
      [`insert into chores (id, home_id, object_id, name, schedule) values ($1, $2, $3, 'tied to A', '{"kind":"daily"}')`, [bChoreOnAObject, bHome.id, aObject]],
      [`insert into completions (chore_id, completed_on) values ($1, '2026-10-02')`, [bChoreOnAObject]],
      [`insert into pets (home_id, name) values ($1, 'squat')`, [homeC]],
      [`insert into progress (home_id) values ($1)`, [homeC]],
    ] as const
    for (const [query, params] of plant) expect((await as(db, B, query, [...params])).ok, query).toBe(true)
    // An old row over the new limits stays (NOT VALID), it just can't be written again as is.
    expect((await as(db, B, `insert into chores (home_id, name, schedule) values ($1, $2, '{}')`, [bHome.id, 'z'.repeat(500)])).ok).toBe(true)

    await db.exec(sql(MIGRATIONS.find((f) => f.startsWith('0006'))!))
  }, 60_000)

  it('keeps every legitimate row and removes only the planted ones', async () => {
    const after = await countsByOwner(db)
    expect(after[A]).toEqual(legit[A])
    expect(after[C]).toEqual(legit[C])
    // B keeps its own home plus the chore tied to A's object (untied), its completion, and the old long-named chore.
    expect(after[B]).toEqual({ ...legit[B], chores: legit[B].chores + 2, completions: legit[B].completions + 1 })
    const tied = await db.query<{ object_id: string | null }>(`select object_id from chores where id = $1`, [bChoreOnAObject])
    expect(tied.rows).toEqual([{ object_id: null }])
    const cross = await db.query<{ n: number }>(`
      select (select count(*) from rooms r join homes h on h.id = r.home_id where r.owner_id <> h.owner_id)
           + (select count(*) from placed_objects o join rooms r on r.id = o.room_id where o.owner_id <> r.owner_id)
           + (select count(*) from chores c join homes h on h.id = c.home_id where c.owner_id <> h.owner_id)
           + (select count(*) from completions x join chores c on c.id = x.chore_id where x.owner_id <> c.owner_id)
           + (select count(*) from pets p join homes h on h.id = p.home_id where p.owner_id <> h.owner_id)
           + (select count(*) from progress p join homes h on h.id = p.home_id where p.owner_id <> h.owner_id) as n`)
    expect(Number(cross.rows[0].n)).toBe(0)
  })

  it('lets existing players keep syncing, and C can now claim its pet and progress', async () => {
    expect(await serverCounts(db, A)).toEqual(localCounts(a))
    const chores = rowsOf<Chore>(a, 'chores')
    expect(await a.apply(...completeChore(chores[0], rowsOf<Progress>(a, 'progress')[0], new Date(2026, 9, 7, 12)))).toEqual([])
    expect(await a.apply(...updatePet(rowsOf<Pet>(a, 'pets')[0], { bodyColour: BODY_COLOURS[3].hex }))).toEqual([])
    expect(await b.apply(...addChore(rowsOf<Home>(b, 'homes')[0], { name: 'New one', schedule: { kind: 'daily' } }, TODAY))).toEqual([])
    expect((await as(db, C, `insert into pets (home_id, name) values ($1, 'Mine')`, [homeC])).ok).toBe(true)
    expect((await as(db, C, `insert into progress (home_id) values ($1)`, [homeC])).ok).toBe(true)
  })
})

describe('retained history lifecycle (0007)', () => {
  let db: PGlite
  beforeAll(async () => { db = await supabaseLike() }, 60_000)

  async function fixture() {
    const home = crypto.randomUUID(), room = crypto.randomUUID(), object = crypto.randomUUID(), chore = crypto.randomUUID()
    for (const [query, params] of [
      [`insert into homes (id) values ($1)`, [home]],
      [`insert into rooms (id, home_id, type) values ($1, $2, 'kitchen')`, [room, home]],
      [`insert into placed_objects (id, room_id, catalog_id, tile_x, tile_y) values ($1, $2, 'sink', 0, 0)`, [object, room]],
      [`insert into chores (id, home_id, object_id, name, schedule, created_on) values ($1, $2, $3, 'Dishes', '{"kind":"daily"}', '2026-10-01')`, [chore, home, object]],
      [`insert into completions (chore_id, completed_on) values ($1, '2026-10-01')`, [chore]],
    ] as const) expect((await as(db, A, query, [...params])).ok, query).toBe(true)
    return { home, room, object, chore }
  }
  const retained = async (chore: string) => {
    const r = await as(db, A, `select count(*)::int as n from completions where chore_id = $1`, [chore])
    return r.ok && r.rows[0].n
  }

  it.each([
    ['2150-01-01', 'archive'], ['2999-12-31', 'archive'],
    ['2150-01-01', 'chore delete'], ['2999-12-31', 'chore delete'],
    ['2150-01-01', 'object delete'], ['2999-12-31', 'object delete'],
    ['2150-01-01', 'object RPC'], ['2999-12-31', 'object RPC'],
  ])('retains wrong-clock history created on %s through %s', async (createdOn, removal) => {
    const f = await fixture()
    // 0006 accepts these creation dates so a bad device clock can still sync.
    expect((await as(db, A, `update chores set created_on = $1 where id = $2`, [createdOn, f.chore])).ok).toBe(true)
    const result = removal === 'archive'
      ? await as(db, A, `update chores set archived_on = '2026-10-07' where id = $1`, [f.chore])
      : removal === 'chore delete'
        ? await as(db, A, `delete from chores where id = $1`, [f.chore])
        : removal === 'object delete'
          ? await as(db, A, `delete from placed_objects where id = $1`, [f.object])
          : await as(db, A, `select public.remove_objects(array[$1::uuid], '2026-10-07', false)`, [f.object])
    expect(result).toMatchObject({ ok: true })
    const row = await as(db, A, `select archived_on::text from chores where id = $1`, [f.chore])
    expect(row.ok && row.rows).toEqual([{ archived_on: createdOn }])
    expect(await retained(f.chore)).toBe(1)
  })

  it('intercepts an old stale-device hard delete without losing either completion', async () => {
    const f = await fixture()
    // B's cached bank contains one; A has written a second since B last pulled.
    expect((await as(db, A, `insert into progress (home_id, retired) values ($1, $2)`, [f.home, JSON.stringify({ [f.chore]: 1 })])).ok).toBe(true)
    expect((await as(db, A, `insert into completions (chore_id, completed_on) values ($1, '2026-10-02')`, [f.chore])).ok).toBe(true)
    expect((await as(db, A, `delete from chores where id = $1`, [f.chore])).ok).toBe(true)
    expect(await retained(f.chore)).toBe(2)
    const r = await as(db, A, `select archived_on from chores where id = $1`, [f.chore])
    expect(r.ok && r.rows[0]?.archived_on).toBeTruthy()
    // A completion queued before deletion may arrive after it; it still exists and counts.
    expect((await as(db, A, `insert into completions (chore_id, completed_on) values ($1, '2026-10-03')`, [f.chore])).ok).toBe(true)
    expect(await retained(f.chore)).toBe(3)
  })

  it('preserves authoritative schedule on archival and cannot be reopened by a stale upsert', async () => {
    const f = await fixture()
    expect((await as(db, A, `update chores set schedule = '{"kind":"weekly","weekday":2}' where id = $1`, [f.chore])).ok).toBe(true)
    expect((await as(db, A, `update chores set archived_on = '2026-10-06', schedule = '{"kind":"daily"}' where id = $1`, [f.chore])).ok).toBe(true)
    expect((await as(db, A, `update chores set archived_on = null, name = 'stale', schedule = '{"kind":"daily"}' where id = $1`, [f.chore])).ok).toBe(true)
    const r = await as(db, A, `select name, schedule, archived_on::text from chores where id = $1`, [f.chore])
    expect(r.ok && r.rows[0]).toEqual({ name: 'Dishes', schedule: { kind: 'weekly', weekday: 2 }, archived_on: '2026-10-06' })
  })

  it('archives and detaches legacy furniture cascades, retaining completions', async () => {
    const f = await fixture()
    expect((await as(db, A, `delete from placed_objects where id = $1`, [f.object])).ok).toBe(true)
    expect(await retained(f.chore)).toBe(1)
    const r = await as(db, A, `select object_id, archived_on from chores where id = $1`, [f.chore])
    expect(r.ok && r.rows[0].object_id).toBeNull()
    expect(r.ok && r.rows[0].archived_on).toBeTruthy()
  })

  it('atomically keeps even unseen attached chores active, and enforces owner isolation', async () => {
    const f = await fixture()
    expect((await as(db, B, `select public.remove_objects(array[$1::uuid], '2026-10-06', true)`, [f.object])).ok).toBe(true)
    const other = await as(db, A, `select id from placed_objects where id = $1`, [f.object])
    expect(other.ok && other.rows).toHaveLength(1)
    expect((await as(db, A, `select public.remove_objects(array[$1::uuid], '2026-10-06', true)`, [f.object])).ok).toBe(true)
    const r = await as(db, A, `select object_id, archived_on from chores where id = $1`, [f.chore])
    expect(r.ok && r.rows[0]).toEqual({ object_id: null, archived_on: null })
    expect(await retained(f.chore)).toBe(1)
  })

  it('keeps completion facts immutable to stale updates while allowing explicit Undo', async () => {
    const f = await fixture()
    expect((await as(db, A, `update completions set counts = false, completed_on = '2026-10-03' where chore_id = $1`, [f.chore])).ok).toBe(true)
    const r = await as(db, A, `select counts, completed_on::text from completions where chore_id = $1`, [f.chore])
    expect(r.ok && r.rows).toEqual([{ counts: true, completed_on: '2026-10-01' }])
    expect((await as(db, A, `delete from chores where id = $1`, [f.chore])).ok).toBe(true)
    expect((await as(db, A, `delete from completions where chore_id = $1`, [f.chore])).ok).toBe(true)
    expect(await retained(f.chore)).toBe(0)
  })

  it('uses the requested local end date and still truly deletes a whole home', async () => {
    const f = await fixture()
    expect((await as(db, A, `select public.remove_objects(array[$1::uuid], '2026-10-06', false)`, [f.object])).ok).toBe(true)
    const r = await as(db, A, `select archived_on::text from chores where id = $1`, [f.chore])
    expect(r.ok && r.rows[0].archived_on).toBe('2026-10-06')
    expect((await as(db, A, `delete from homes where id = $1`, [f.home])).ok).toBe(true)
    expect(await retained(f.chore)).toBe(0)
  })
})

describe('upgrading retained history from 0006', () => {
  it('keeps existing facts and legacy banks, protects subsequent deletes, and erases the account', async () => {
    const db = await supabaseLike(MIGRATIONS.find(f => f.startsWith('0006'))!)
    const a = device(db, A)
    expect(await a.apply(...createHousehold({ species: 'mochi', petName: 'Pip', userId: A }))).toEqual([])
    const home = rowsOf<Home>(a, 'homes')[0]
    expect(await a.apply(...addChore(home, { name: 'Dishes', schedule: { kind: 'daily' } }, '2026-10-01'))).toEqual([])
    const chore = rowsOf<Chore>(a, 'chores')[0]
    expect(await a.apply(...completeChore(chore, null, new Date('2026-10-01T12:00:00Z')))).toEqual([])
    expect((await as(db, A, `update progress set retired = '{"already-deleted":4}' where home_id = $1`, [home.id])).ok).toBe(true)
    const before = await countsByOwner(db)
    await db.exec(sql(MIGRATIONS.find(f => f.startsWith('0007'))!))
    expect(await countsByOwner(db)).toEqual(before)
    expect((await as(db, A, `delete from chores where id = $1`, [chore.id])).ok).toBe(true)
    expect(await countsByOwner(db)).toEqual(before)
    const bank = await as(db, A, `select retired from progress where home_id = $1`, [home.id])
    expect(bank.ok && bank.rows[0].retired).toEqual({ 'already-deleted': 4 })
    expect((await as(db, A, `select public.delete_my_account()`)).ok).toBe(true)
    expect((await countsByOwner(db))[A]).toEqual(Object.fromEntries(TABLES.map(t => [t, 0])))
    await db.close()
  }, 60_000)
})

describe('object removal from the real offline queue', () => {
  it.each([false, true])('sends keep=%s intent through sync and handles unseen server tasks', async (keep) => {
    const db = await supabaseLike()
    const dev = device(db, A)
    expect(await dev.apply(...createHousehold({ species: 'bun', petName: 'Pip', userId: A }))).toEqual([])
    const home = rowsOf<Home>(dev, 'homes')[0]
    expect(await dev.apply(...placeObject(rowsOf<Room>(dev, 'rooms')[0], ALL_ENTRIES.find(e => e.id === 'sink')!, { tileX: 0, tileY: 0, rotation: 0 }, '2026-10-01'))).toEqual([])
    const object = rowsOf<PlacedObject>(dev, 'placed_objects')[0]
    const chore = rowsOf<Chore>(dev, 'chores')[0]
    expect(await dev.apply(...completeChore(chore, null, new Date('2026-10-01T12:00:00Z')))).toEqual([])
    const unseen = crypto.randomUUID()
    expect((await as(db, A, `insert into chores (id, home_id, object_id, name, schedule, created_on) values ($1, $2, $3, 'Added on another device', '{"kind":"daily"}', '2026-10-01')`, [unseen, home.id, object.id])).ok).toBe(true)
    expect((await as(db, A, `insert into completions (chore_id, completed_on) values ($1, '2026-10-02')`, [chore.id])).ok).toBe(true)
    expect(await dev.apply(...removeObject(object.id, undefined, '2026-10-06', keep))).toEqual([])
    const tasks = await as(db, A, `select id, object_id, archived_on::text from chores where home_id = $1`, [home.id])
    expect(tasks.ok && tasks.rows).toHaveLength(rowsOf<Chore>(dev, 'chores').length + 1)
    expect(tasks.ok && tasks.rows.every(c => c.object_id === null && c.archived_on === (keep ? null : '2026-10-06'))).toBe(true)
    const counts = await serverCounts(db, A)
    expect(counts.placed_objects).toBe(0)
    expect(counts.completions).toBe(2)
    await db.close()
  }, 60_000)
})

describe('starting over from Settings, synced', () => {
  it('clears the room and chores on the server, keeps the pet, rewards and past work, and adds a chore back', async () => {
    const db = await supabaseLike()
    const dev = device(db, A)
    expect(await dev.apply(...sampleHome({ species: 'sprout', userId: A, today: TODAY }))).toEqual([])
    expect(await dev.apply(...adoptSample(rowsOf<Home>(dev, 'homes')[0]))).toEqual([])
    const before = await serverCounts(db, A)
    expect(before.placed_objects).toBeGreaterThan(3)
    expect(before.chores).toBeGreaterThan(3)
    const pet = await as(db, A, `select * from pets`)
    const progress = await as(db, A, `select * from progress`)

    expect(await dev.apply(...clearHome(selectHome(dev.tables), TODAY))).toEqual([])
    const after = await serverCounts(db, A)
    expect(after).toEqual(localCounts(dev))
    expect(after).toEqual({ ...before, placed_objects: 0 })
    const chores = await as(db, A, `select archived_on::text, object_id from chores`)
    expect(chores.ok && chores.rows.every((c) => c.archived_on === TODAY && c.object_id === null)).toBe(true)
    expect(await as(db, A, `select * from pets`)).toEqual(pet)
    expect(await as(db, A, `select * from progress`)).toEqual(progress)

    const old = rowsOf<Chore>(dev, 'chores')[0]
    expect(await dev.apply(...addChore(rowsOf<Home>(dev, 'homes')[0], againInput(old, []), TODAY))).toEqual([])
    const active = await as(db, A, `select name from chores where archived_on is null`)
    expect(active.ok && active.rows).toEqual([{ name: old.name }])
    await db.close()
  }, 60_000)

  it('erases the whole home on the server, leaving nothing behind', async () => {
    const db = await supabaseLike()
    const dev = device(db, A)
    expect(await dev.apply(...sampleHome({ species: 'bun', userId: A, today: TODAY }))).toEqual([])
    expect(await dev.apply(...adoptSample(rowsOf<Home>(dev, 'homes')[0]))).toEqual([])
    expect(await dev.apply(...removeHome(rowsOf<Home>(dev, 'homes')[0].id))).toEqual([])
    expect(await serverCounts(db, A)).toEqual(Object.fromEntries(TABLES.map((t) => [t, 0])))
    expect(localCounts(dev)).toEqual(Object.fromEntries(TABLES.map((t) => [t, 0])))
    await db.close()
  }, 60_000)
})
