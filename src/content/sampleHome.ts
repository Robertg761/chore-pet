import { catalogEntry } from '../catalog/objects'
import type { CatalogEntry } from '../catalog/types'
import { completeChore, createHousehold, placeObject } from '../data/actions'
import type { TableMap, TableName } from '../data/tables'
import { upsertOp, type NewOp } from '../data/state'
import { addDays, diffDays } from '../domain/dates'
import { nextDueDate } from '../domain/schedule'
import type { Chore, Completion, ISODate, PlacedObject, Progress, Room, Species } from '../domain/types'

// The sample home for voters: a lived-in kitchen with two chores running late,
// so the first thing they see is a gentle mess and something easy to clean.
//
// It is built through the same action functions a real home uses (ids, default
// chores and cascades behave identically). Everything is relative to `today`,
// so it looks right whenever it is opened.

/** The home's name, so the UI can tell a sample apart from a real home. */
export const SAMPLE_HOME_NAME = 'Sample home'

export const SAMPLE_PET_NAMES: Record<Species, string> = {
  mochi: 'Mochi',
  bun: 'Bun',
  sprout: 'Sprout',
}

/** How far back the home was "set up", so there is a little history. */
const HISTORY_DAYS = 14

interface SampleSpot {
  catalogId: string
  tileX: number
  tileY: number
  rotation: PlacedObject['rotation']
}

/**
 * The kitchen, seen from the front (back corner at 0,0; the room is 8x8, so the front stays open).
 * Left wall (tx = 0): fridge in the corner, then sink, then stove.
 * Right wall (ty = 0): dishwasher and trash can beside the fridge.
 * Table on a rug in the open floor, with a clear lane all the way round.
 *
 *      tx: 0 1 2 3 4 5
 *   ty 0:  F D T . . .
 *   ty 1:  S . . . . .
 *   ty 2:  O . . R R .      F fridge, S sink, O stove (oven),
 *   ty 3:  . . . R R .      D dishwasher, T trash can,
 *   ty 4:  . . . r r .      R table over rug, r rug only
 *   ty 5:  . . . . . .
 */
export const SAMPLE_KITCHEN: readonly SampleSpot[] = [
  { catalogId: 'rug', tileX: 3, tileY: 2, rotation: 0 },
  { catalogId: 'fridge', tileX: 0, tileY: 0, rotation: 0 },
  { catalogId: 'sink', tileX: 0, tileY: 1, rotation: 0 },
  { catalogId: 'stove', tileX: 0, tileY: 2, rotation: 0 },
  { catalogId: 'dishwasher', tileX: 1, tileY: 0, rotation: 1 },
  { catalogId: 'trash', tileX: 2, tileY: 0, rotation: 1 },
  { catalogId: 'table', tileX: 3, tileY: 2, rotation: 0 },
]

/** The two chores left running late on purpose. Everything else is up to date. */
interface LateChore {
  catalogId: string
  choreName: string
  daysLate: number
  /** Extra days between the older completions (0 = right on time), cycled, for a believable history. */
  extras: number[]
}

export const SAMPLE_LATE_CHORES: readonly LateChore[] = [
  { catalogId: 'sink', choreName: 'Wash the dishes', daysLate: 3, extras: [0, 0, 1] },
  { catalogId: 'trash', choreName: 'Take out the trash', daysLate: 1, extras: [0, 1, 0] },
]

export interface SampleHomeInput {
  species: Species
  petName?: string
  userId: string | null
  today: ISODate
}

function entryFor(id: string): CatalogEntry {
  const entry = catalogEntry(id)
  if (!entry) throw new Error(`Sample home needs catalog entry "${id}"`)
  return entry
}

function rowsOf<T extends TableName>(ops: NewOp[], table: T): TableMap[T][] {
  return ops.flatMap((op) => (op.table === table && op.kind === 'upsert' ? [op.value as TableMap[T]] : []))
}

/** Days between occurrences of a simple repeating chore. */
function intervalOf(chore: Chore): number {
  const s = chore.schedule
  if (s.kind === 'everyNDays') return Math.max(1, s.n)
  if (s.kind === 'weekly') return 7
  return 1
}

/** A small, stable "sometimes a day late" so history is not robotic. */
function wobble(key: string): number {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 4 === 0 ? 1 : 0
}

function fakeCompletion(chore: Chore, on: ISODate): Completion {
  return { id: '', choreId: chore.id, completedAt: '', completedOn: on }
}

/**
 * Completion dates for a chore kept up to date: done on its due date, now and
 * then a day late, never later than `lastDay`. After the last one the chore is
 * due again on `lastDay + 1` at the earliest, so it is never overdue on the
 * following day.
 */
function upToDateHistory(chore: Chore, start: ISODate, lastDay: ISODate): ISODate[] {
  const done: Completion[] = []
  for (let d = start; d <= lastDay; d = addDays(d, 1)) {
    const due = nextDueDate(chore, done)
    if (due > lastDay) break
    const lag = Math.min(wobble(chore.name + due), diffDays(due, lastDay))
    if (d >= addDays(due, lag)) done.push(fakeCompletion(chore, d))
  }
  return done.map((c) => c.completedOn)
}

/**
 * Completion dates for a chore that ends up `daysLate` days overdue today:
 * the newest completion is placed so the next due date is `daysLate` days
 * ago, then older ones step back from it.
 */
function lateHistory(chore: Chore, late: LateChore, start: ISODate, today: ISODate): ISODate[] {
  const interval = intervalOf(chore)
  const dates: ISODate[] = []
  let date = addDays(today, -(late.daysLate + interval))
  for (let i = 0; date >= start; i++) {
    dates.push(date)
    date = addDays(date, -(interval + late.extras[i % late.extras.length]))
  }
  return dates.reverse()
}

/** A local-time moment on `date`, varied through the day, so completeChore records that calendar date. */
function momentOn(date: ISODate, index: number): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, 8 + ((index * 5) % 12), (index * 7) % 60)
}

export function sampleHome(input: SampleHomeInput): NewOp[] {
  const petName = input.petName?.trim() || SAMPLE_PET_NAMES[input.species]
  const start = addDays(input.today, -HISTORY_DAYS)
  const yesterday = addDays(input.today, -1)

  // The home (renamed so the UI can tell it is a sample), the pet, progress and the kitchen.
  const ops: NewOp[] = createHousehold({ species: input.species, petName, userId: input.userId }).map((op) =>
    op.table === 'homes' && op.kind === 'upsert' ? upsertOp('homes', { ...op.value, name: SAMPLE_HOME_NAME }) : op,
  )
  const home = rowsOf(ops, 'homes')[0]
  const room: Room = rowsOf(ops, 'rooms')[0]

  // Furnish it, set up two weeks ago.
  const objectIds = new Map<string, string>()
  for (const spot of SAMPLE_KITCHEN) {
    const placed = placeObject(room, entryFor(spot.catalogId), spot, start)
    objectIds.set(spot.catalogId, rowsOf(placed, 'placed_objects')[0].id)
    ops.push(...placed)
  }

  // Two weeks of believable history; only the two late chores are behind.
  let count = 0
  for (const chore of rowsOf(ops, 'chores')) {
    const catalogId = [...objectIds].find(([, objectId]) => objectId === chore.objectId)?.[0]
    const late = SAMPLE_LATE_CHORES.find((l) => l.catalogId === catalogId && l.choreName === chore.name)
    const dates = late ? lateHistory(chore, late, start, input.today) : upToDateHistory(chore, start, yesterday)
    for (const date of dates) {
      ops.push(...completeChore(chore, null, momentOn(date, count), { counts: false }))
      count++
    }
  }

  // Progress counts chores the player finishes (unlock milestones run on it),
  // so the seeded history is marked as not counting: a visitor's first tap is chore 1.
  const progress: Progress = rowsOf(ops, 'progress')[0]
  ops.push(upsertOp('progress', { ...progress, homeId: home.id, choreCount: 0 }))
  return ops
}
