import { TILE_W, type Point } from '../iso'

// Room-scale geometry for the shell (docs/ART.md, "Isometric room").
// Reference room: 390 px wide, floor diamond (195,170) (365,255) (195,340)
// (25,255), 6x6 tiles. Same tx/ty orientation as ../iso.ts: +tx toward the
// lower right (along the right wall), +ty toward the lower left (along the
// left wall), origin at the floor's top corner.

export const ROOM_WIDTH = 390
export const ROOM_TILES = 6
export const WALL_HEIGHT = 160
/** The floor's top corner, the origin of tile coordinates. */
export const ROOM_ORIGIN: Point = { x: 195, y: 170 }

/** One tile in room px: 340 / 6 wide, half as tall (2:1 iso). */
export const ROOM_TILE_W = 340 / ROOM_TILES
export const ROOM_TILE_H = ROOM_TILE_W / 2

/** Floor slab (diorama edge) and wall top thickness, in room px / tiles. */
export const SLAB_DEPTH = 14
export const WALL_THICKNESS = 0.3

/** SVG viewBox of the shell: walls, floor, slab and a small margin. */
export const ROOM_VIEWBOX = { x: 0, y: -4, width: ROOM_WIDTH, height: 392 }

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

/** Scale to apply to object art (drawn at 64 px tiles) so it fits room tiles. */
export const OBJECT_SCALE = ROOM_TILE_W / TILE_W
