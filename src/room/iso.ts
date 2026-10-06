// Object-local isometric maths (docs/ART.md, "Isometric room").
//
// Object art is drawn at a fixed scale: one floor tile is TILE_W x TILE_H
// screen units. The origin (0,0) is the back (top) corner of the object's
// footprint on the floor. +tx runs toward the lower right (along the right
// wall), +ty toward the lower left (along the left wall), +z is up.
// The room renderer scales object art by (room tile width / TILE_W).

export const TILE_W = 64
export const TILE_H = TILE_W / 2

export interface Point {
  x: number
  y: number
}

export function iso(tx: number, ty: number, z = 0): Point {
  return { x: ((tx - ty) * TILE_W) / 2, y: ((tx + ty) * TILE_H) / 2 - z }
}

/** SVG `points` string for a polygon through iso points [tx, ty, z]. */
export function isoPoints(...corners: [number, number, number][]): string {
  return corners
    .map(([tx, ty, z]) => {
      const p = iso(tx, ty, z)
      return `${round(p.x)},${round(p.y)}`
    })
    .join(' ')
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
