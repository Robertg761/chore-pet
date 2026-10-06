import type { CatalogEntry } from './types'

// The starting catalog. Footprints, placement and layer are fixed by the lead
// (object art is drawn to them); names, rooms and default chores are content.
// Rotation 0 has the object's back against the left wall (tx = 0); the room
// mirrors it for rotation 1 (back against the right wall), swapping w and d.
//
// Sorted by first room, then name. Weekly chores are spread over the week
// (Sun bed, Mon sink, Tue rug, Wed toilet, Thu recycling, Fri fridge, Sat
// shower) and monthly chores sit on days 1 to 28, spread across the month.

export const CATALOG: CatalogEntry[] = [
  // Bathroom
  {
    id: 'shower',
    name: 'Shower',
    rooms: ['bathroom'],
    footprint: { w: 2, d: 2 },
    placement: 'wall',
    layer: 'solid',
    chores: [{ name: 'Scrub the shower', schedule: { kind: 'weekly', weekday: 6 } }],
  },
  {
    id: 'toilet',
    name: 'Toilet',
    rooms: ['bathroom'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    chores: [{ name: 'Clean the toilet', schedule: { kind: 'weekly', weekday: 3 } }],
  },
  {
    id: 'washer',
    name: 'Washing machine',
    rooms: ['bathroom', 'kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
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
    chores: [
      { name: 'Make the bed', schedule: { kind: 'daily' } },
      { name: 'Change the sheets', schedule: { kind: 'weekly', weekday: 0 } },
    ],
  },

  // Kitchen
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
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
    chores: [{ name: 'Take out the recycling', schedule: { kind: 'weekly', weekday: 4 } }],
  },
  {
    id: 'sink',
    name: 'Sink',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
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
    chores: [
      { name: 'Wipe the stove', schedule: { kind: 'everyNDays', n: 3 } },
      { name: 'Clean the oven', schedule: { kind: 'monthly', dayOfMonth: 12 } },
    ],
  },
  {
    id: 'table',
    name: 'Table',
    rooms: ['kitchen', 'living'],
    footprint: { w: 2, d: 2 },
    placement: 'floor',
    layer: 'solid',
    chores: [{ name: 'Wipe the table', schedule: { kind: 'everyNDays', n: 2 } }],
  },
  {
    id: 'trash',
    name: 'Trash can',
    rooms: ['kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    chores: [
      { name: 'Take out the trash', schedule: { kind: 'everyNDays', n: 3 } },
      { name: 'Wash the trash can', schedule: { kind: 'monthly', dayOfMonth: 25 } },
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
    chores: [
      { name: 'Fluff the cushions', schedule: { kind: 'everyNDays', n: 3 } },
      { name: 'Vacuum under the cushions', schedule: { kind: 'monthly', dayOfMonth: 10 } },
    ],
  },
  {
    id: 'rug',
    name: 'Floor rug',
    rooms: ['living', 'bedroom'],
    footprint: { w: 2, d: 3 },
    placement: 'floor',
    layer: 'flat',
    chores: [{ name: 'Vacuum the rug', schedule: { kind: 'weekly', weekday: 2 } }],
  },
]

/** Decor earned through unlocks (src/domain/unlocks.ts). Art: src/room/objects/decor*.tsx. */
export const DECOR: CatalogEntry[] = [
  {
    id: 'plant',
    name: 'Potted plant',
    rooms: ['living', 'bedroom', 'kitchen'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
    chores: [{ name: 'Water the plant', schedule: { kind: 'everyNDays', n: 3 } }],
    unlock: 'decor:plant',
  },
  {
    id: 'lamp',
    name: 'Lamp',
    rooms: ['living', 'bedroom'],
    footprint: { w: 1, d: 1 },
    placement: 'floor',
    layer: 'solid',
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
    chores: [],
    unlock: 'decor:poster',
  },
  {
    id: 'fish-tank',
    name: 'Fish tank',
    rooms: ['living'],
    footprint: { w: 1, d: 1 },
    placement: 'wall',
    layer: 'solid',
    chores: [
      { name: 'Feed the fish', schedule: { kind: 'daily' } },
      { name: 'Clean the fish tank', schedule: { kind: 'monthly', dayOfMonth: 8 } },
    ],
    unlock: 'decor:fish-tank',
  },
]

/** Everything that can be placed: the starting catalog plus decor rewards. */
export const ALL_ENTRIES: CatalogEntry[] = [...CATALOG, ...DECOR]

export function catalogEntry(id: string): CatalogEntry | undefined {
  return ALL_ENTRIES.find((e) => e.id === id)
}
