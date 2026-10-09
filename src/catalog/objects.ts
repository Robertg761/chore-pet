import type { CatalogEntry } from './types'

// The starting catalog. Footprints, placement and layer are fixed by the lead
// (object art is drawn to them); names, rooms and default chores are content.
// Rotation 0 has the object's back against the left wall (tx = 0); the room
// mirrors it for rotation 1 (back against the right wall), swapping w and d.
//
// Sorted by first room, then name. Weekly chores are spread over the week
// (Sun bed, Mon sink, Tue rug, Wed toilet, Thu recycling, Fri fridge, Sat
// shower) and monthly chores sit on days 1 to 28, spread across the month.
// Slow chores (oven, trash can wash, fish tank) repeat every N days instead, so
// they stay realistic: oven 90, trash can 60, fish tank 14.

export const CATALOG: CatalogEntry[] = [
  // Bathroom
  {
    id: 'shower',
    name: 'Shower',
    rooms: ['bathroom'],
    footprint: { w: 2, d: 2 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [{ name: 'Scrub the shower', schedule: { kind: 'weekly', weekday: 6 } }],
  },
  {
    id: 'toilet',
    name: 'Toilet',
    rooms: ['bathroom'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [{ name: 'Clean the toilet', schedule: { kind: 'weekly', weekday: 3 } }],
  },
  {
    id: 'washer',
    name: 'Washing machine',
    rooms: ['bathroom', 'kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [
      { name: 'Do a load of laundry', schedule: { kind: 'weekdays', days: [1, 4] } },
      { name: 'Run a washer cleaning cycle', schedule: { kind: 'monthly', dayOfMonth: 15 } },
    ],
  },

  // Bedroom
  {
    id: 'bed',
    name: 'Bed',
    rooms: ['bedroom'],
    footprint: { w: 3, d: 2 },
    placement: 'wall',
    layer: 'solid',
    mess: 'dust',
    chores: [
      { name: 'Make the bed', schedule: { kind: 'daily' } },
      { name: 'Change the sheets', schedule: { kind: 'weekly', weekday: 0 } },
    ],
  },

  // Kitchen
  {
    id: 'counter',
    name: 'Counter',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 2 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [{ name: 'Wipe the counters', schedule: { kind: 'everyNDays', n: 2 } }],
  },
  {
    id: 'dining-table',
    name: 'Dining table',
    rooms: ['kitchen'],
    footprint: { w: 2, d: 2 },
    placement: 'floor',
    layer: 'solid',
    mess: 'dust',
    chores: [{ name: 'Wipe the table', schedule: { kind: 'everyNDays', n: 2 } }],
  },
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [
      { name: 'Run and empty the dishwasher', schedule: { kind: 'everyNDays', n: 2 } },
      { name: 'Clean the dishwasher filter', schedule: { kind: 'monthly', dayOfMonth: 20 } },
    ],
  },
  {
    id: 'fridge',
    name: 'Fridge',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [
      { name: 'Clear out old food', schedule: { kind: 'weekly', weekday: 5 } },
      { name: 'Wipe the fridge shelves', schedule: { kind: 'monthly', dayOfMonth: 5 } },
    ],
  },
  {
    id: 'recycling',
    name: 'Recycling',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    mess: 'stink',
    chores: [{ name: 'Take out the recycling', schedule: { kind: 'weekly', weekday: 4 } }],
  },
  {
    id: 'sink',
    name: 'Sink',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [
      { name: 'Wash the dishes', schedule: { kind: 'daily' } },
      { name: 'Scrub the sink', schedule: { kind: 'weekly', weekday: 1 } },
    ],
  },
  {
    id: 'stove',
    name: 'Stove',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [
      { name: 'Wipe the stove', schedule: { kind: 'everyNDays', n: 3 } },
      { name: 'Clean the oven', schedule: { kind: 'everyNDays', n: 90 } },
    ],
  },
  {
    id: 'table',
    name: 'Table',
    rooms: ['kitchen', 'living'],
    footprint: { w: 2, d: 2 },
    placement: 'floor',
    layer: 'solid',
    mess: 'dust',
    chores: [{ name: 'Wipe the table', schedule: { kind: 'everyNDays', n: 2 } }],
  },
  {
    id: 'trash',
    name: 'Trash can',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    mess: 'stink',
    chores: [
      { name: 'Take out the trash', schedule: { kind: 'everyNDays', n: 3 } },
      { name: 'Wash the trash can', schedule: { kind: 'everyNDays', n: 60 } },
    ],
  },

  // Living room
  {
    id: 'couch',
    name: 'Couch',
    rooms: ['living'],
    footprint: { w: 1, d: 2 },
    placement: 'wall',
    layer: 'solid',
    mess: 'dust',
    chores: [
      { name: 'Fluff the cushions', schedule: { kind: 'everyNDays', n: 7 } },
      { name: 'Vacuum under the cushions', schedule: { kind: 'monthly', dayOfMonth: 10 } },
    ],
  },
  {
    id: 'fish-tank',
    name: 'Fish tank',
    rooms: ['living'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    mess: 'stink',
    chores: [
      { name: 'Feed the fish', schedule: { kind: 'daily' } },
      { name: 'Clean the fish tank', schedule: { kind: 'everyNDays', n: 14 } },
    ],
  },
  {
    id: 'plant',
    name: 'Potted plant',
    rooms: ['living', 'bedroom', 'kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    mess: 'wilt',
    chores: [{ name: 'Water the plant', schedule: { kind: 'everyNDays', n: 7 } }],
  },
  {
    id: 'rug',
    name: 'Floor rug',
    rooms: ['living', 'bedroom'],
    footprint: { w: 2, d: 3 },
    placement: 'floor',
    layer: 'flat',
    mess: 'dust',
    chores: [{ name: 'Vacuum the rug', schedule: { kind: 'weekly', weekday: 2 } }],
  },
]

/**
 * Decor earned through unlocks (src/domain/unlocks.ts). Rewards are purely
 * cosmetic: decor never brings chores, and anything that does (a plant, a fish
 * tank) is in the starting catalog above. Art: src/room/objects/decor.ts.
 */
export const DECOR: CatalogEntry[] = [
  {
    id: 'teddy',
    name: 'Teddy bear',
    rooms: ['living', 'bedroom'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    mess: 'dust',
    chores: [],
    unlock: 'decor:teddy',
  },
  {
    id: 'lamp',
    name: 'Lamp',
    rooms: ['living', 'bedroom'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    mess: 'dust',
    chores: [],
    unlock: 'decor:lamp',
  },
  {
    id: 'poster',
    name: 'Poster',
    rooms: ['living', 'bedroom', 'kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'hung',
    mess: 'dust',
    chores: [],
    unlock: 'decor:poster',
  },
  {
    id: 'fairy-lights',
    name: 'Fairy lights',
    rooms: ['living', 'bedroom', 'kitchen'],
    footprint: { w: 1, d: 2 },
    placement: 'wall',
    layer: 'hung',
    mess: 'dust',
    chores: [],
    unlock: 'decor:fairy-lights',
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    rooms: ['living', 'bedroom'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    mess: 'dust',
    chores: [],
    unlock: 'decor:bookshelf',
  },
  {
    id: 'wall-clock',
    name: 'Wall clock',
    rooms: ['living', 'bedroom', 'kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'hung',
    mess: 'dust',
    chores: [],
    unlock: 'decor:wall-clock',
  },
  {
    id: 'bean-bag',
    name: 'Bean bag',
    rooms: ['living', 'bedroom'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    mess: 'dust',
    chores: [],
    unlock: 'decor:bean-bag',
  },
]

/** Everything that can be placed: the starting catalog plus decor rewards. */
export const ALL_ENTRIES: CatalogEntry[] = [...CATALOG, ...DECOR]

export function catalogEntry(id: string): CatalogEntry | undefined {
  return ALL_ENTRIES.find((e) => e.id === id)
}
