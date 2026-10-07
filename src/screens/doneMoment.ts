import { mix } from '../art/color'
import { PALETTE } from '../art/palette'
import type { CatalogEntry } from '../catalog/types'
import type { PlacedObject } from '../domain/types'
import { footprintOf } from '../room/grid'
import { ROOM_TILE_W, TILE_SCALE, roomPoint } from '../room/shell/geometry'

// Pure helpers for the completion moment: where the sparkle goes and what
// colour the health bar is.

/** How far above the floor the sparkle sits, in room px. Tall things get more. */
const LIFT: Record<string, number> = { fridge: 78, shower: 80, bed: 40, wardrobe: 70 }
const DEFAULT_LIFT = 40

export interface SparkleSpot {
  x: number
  y: number
  size: number
}

/** Room-px spot for the sparkle over an object: above the middle of its footprint. */
export function sparkleSpot(placed: PlacedObject, entry: Pick<CatalogEntry, 'id' | 'footprint'>): SparkleSpot {
  const f = footprintOf(placed, entry)
  const centre = roomPoint(f.tx + f.w / 2, f.ty + f.d / 2, (LIFT[entry.id] ?? DEFAULT_LIFT) * TILE_SCALE)
  // About the width of the footprint on screen, never smaller than one tile.
  const size = Math.max(f.w, f.d, 1) * ROOM_TILE_W
  return { x: centre.x, y: centre.y, size }
}

/** Bar colour: blush when low, through petDefault yellow, to leaf green when high. */
export function healthColour(health: number): string {
  const h = Math.max(0, Math.min(100, health)) / 100
  return h < 0.5 ? mix(PALETTE.blush, PALETTE.petDefault, h * 2) : mix(PALETTE.petDefault, PALETTE.leaf, (h - 0.5) * 2)
}
