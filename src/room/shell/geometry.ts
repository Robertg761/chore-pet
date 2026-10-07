import { TILE_W, type Point } from '../iso'

// Room-scale geometry for the shell (docs/ART.md, "Isometric room").
// The room is 390 px wide with a floor diamond 340 px across, split into
// ROOM_TILES x ROOM_TILES tiles. The art was drawn for a 6x6 reference room;
// TILE_SCALE shrinks what is sized in px (walls, window, pet, effects) so a
// bigger floor keeps every proportion. Same tx/ty orientation as ../iso.ts:
// +tx toward the lower right (along the right wall), +ty toward the lower left
// (along the left wall), origin at the floor's top corner.

export const ROOM_WIDTH = 390
export const ROOM_TILES = 8
/** Size of one tile against the 6x6 reference room the art was drawn for. */
export const TILE_SCALE = 6 / ROOM_TILES
export const WALL_HEIGHT = Math.round(160 * TILE_SCALE)
/** The floor's top corner, the origin of tile coordinates. */
export const ROOM_ORIGIN: Point = { x: 195, y: WALL_HEIGHT + 10 }

/** One tile in room px: 340 / ROOM_TILES wide, half as tall (2:1 iso). */
export const ROOM_TILE_W = 340 / ROOM_TILES
export const ROOM_TILE_H = ROOM_TILE_W / 2

/** Floor slab (diorama edge) and wall top thickness, in room px / tiles. */
export const SLAB_DEPTH = 14
export const WALL_THICKNESS = 0.3

/** SVG viewBox of the shell: walls, floor, slab and a small margin. */
export const ROOM_VIEWBOX = { x: 0, y: -4, width: ROOM_WIDTH, height: ROOM_ORIGIN.y + 222 }

/** Screen point (room px) of floor point (tx, ty) at height z; fractions allowed. */
export function roomPoint(tx: number, ty: number, z = 0): Point {
  return {
    x: ROOM_ORIGIN.x + ((tx - ty) * ROOM_TILE_W) / 2,
    y: ROOM_ORIGIN.y + ((tx + ty) * ROOM_TILE_H) / 2 - z,
  }
}

/** Screen point of a tile's back (top) corner: the origin of object art placed on it. */
export function tileCorner(tx: number, ty: number): Point {
  return roomPoint(tx, ty)
}

/** SVG `points` string through room points [tx, ty, z]. */
export function roomPoints(...corners: [number, number, number?][]): string {
  return corners
    .map(([tx, ty, z]) => {
      const p = roomPoint(tx, ty, z ?? 0)
      return `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`
    })
    .join(' ')
}

/** How big the pet's 200x200 art is drawn in the room (about one tile wide). */
export const PET_SCALE = 0.44 * TILE_SCALE

/** Scale to apply to object art (drawn at 64 px tiles) so it fits room tiles. */
export const OBJECT_SCALE = ROOM_TILE_W / TILE_W

/**
 * The window on the left wall: tiles u0..u1 along ty (sill included), heights z0..z1 in room px.
 * It stays on the same tiles as in the 6x6 room, so wall decor placed before the room grew
 * never ends up over it, and at 1.8 tiles wide it shrinks with the tiles in both directions.
 */
export const WINDOW = { u0: 1.8, u1: 3.6, z0: Math.round(76 * TILE_SCALE), z1: Math.round(140 * TILE_SCALE) }
