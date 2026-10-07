import type { RoomType, Schedule } from '../domain/types'

/**
 * - wall: the object's back must touch a wall (a counter, a bed's headboard).
 * - floor: anywhere on the floor.
 */
export type Placement = 'wall' | 'floor'

/**
 * - solid: takes up its tiles; nothing else solid can overlap it.
 * - flat: lies on the floor (a rug). Solid things can stand on it; two flat
 *   things can't overlap.
 * - hung: hangs on a wall above the floor (a poster). It only clashes with
 *   other hung things; the floor below stays free. Always placement 'wall'.
 */
export type Layer = 'solid' | 'flat' | 'hung'

/**
 * How neglect shows above the object as it gets worse (src/room/neglect.tsx):
 * - stink: food, water and bathroom things get smelly, then flies arrive.
 * - dust: furniture and fabric gather dust and cobwebs.
 * - wilt: a plant droops and drops dry leaves.
 */
export type MessKind = 'stink' | 'dust' | 'wilt'

export interface DefaultChore {
  name: string
  schedule: Schedule
}

export interface CatalogEntry {
  id: string
  name: string
  /** Rooms it is offered in first; it can still be placed anywhere. */
  rooms: RoomType[]
  /** Tiles at rotation 0: w along +tx (away from the left wall), d along +ty. */
  footprint: { w: number; d: number }
  placement: Placement
  layer: Layer
  /** Chores created when the object is placed. Players can edit them later. Decor may have none. */
  chores: DefaultChore[]
  /** How its neglect cue looks when its chores run late. */
  mess: MessKind
  /** Decor earned as a reward: offered in the tray only once this unlock id is in progress (src/domain/unlocks.ts). */
  unlock?: string
}
