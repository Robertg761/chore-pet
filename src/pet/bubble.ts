import { catalogEntry } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import { OBJECT_ART, cleanTop } from '../room/objects'
import { OBJECT_SCALE, PET_SCALE, ROOM_VIEWBOX, ROOM_WIDTH, roomPoint } from '../room/shell/geometry'

// Where the pet's speech bubble goes. By default it floats just over the pet's
// head; when that would sit on top of furniture (the table, the rug, a counter)
// it is nudged a little up or sideways to a clearer spot. All in room px, and
// pure, so it can be tested without a browser.

/** A rectangle in room px. */
export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface BubbleSize {
  w: number
  h: number
}

/** Where the bubble's bottom-centre goes (room px), and how far its tail is shifted to keep pointing at the pet. */
export interface BubbleSpot {
  x: number
  y: number
  /** Room px from the bubble's centre to the pet's head; the tail follows it. */
  tail: number
}

/** Furthest the bubble is moved to find a clear spot, in room px: sideways, and up (so it still reads as the pet's). */
const MAX_SIDE = 96
const MAX_UP = 36
const STEP_SIDE = 12
const STEP_UP = 6
/** Moving costs less than covering things: a shift of this many px is worth this much overlap (px squared). */
const SIDE_COST = 5
const UP_COST = 12
const EDGE = 4

/** Room-px boxes for the visible art of each object: from its clean top down, as wide as its art. */
export function objectBoxes(objects: PlacedObject[]): Box[] {
  const boxes: Box[] = []
  for (const o of objects) {
    const entry = catalogEntry(o.catalogId)
    const art = OBJECT_ART[o.catalogId]
    if (!entry || !art) continue
    const corner = roomPoint(o.tileX, o.tileY)
    const flip = o.rotation % 2 === 1 ? -1 : 1
    const xa = corner.x + flip * OBJECT_SCALE * art.bounds.x
    const xb = corner.x + flip * OBJECT_SCALE * (art.bounds.x + art.bounds.width)
    boxes.push({
      x0: Math.min(xa, xb),
      x1: Math.max(xa, xb),
      y0: corner.y + OBJECT_SCALE * cleanTop(art),
      y1: corner.y + OBJECT_SCALE * (art.bounds.y + art.bounds.height),
    })
  }
  return boxes
}

function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  return w > 0 && h > 0 ? w * h : 0
}

/** The bubble's default anchor: bottom-centre, clear of the top of the pet's head so the tail points at it without covering it. */
export function headSpot(pos: { tx: number; ty: number }): { x: number; y: number } {
  const head = roomPoint(pos.tx + 0.5, pos.ty + 0.5)
  return { x: head.x, y: head.y - 190 * PET_SCALE }
}

/**
 * The spot for a bubble of `size` over a pet standing at `pos`. Tries the default
 * spot first, then small steps up and to the sides, and takes the one that
 * covers the least furniture for the least movement. Always inside the room picture.
 */
export function bubbleSpot(pos: { tx: number; ty: number }, size: BubbleSize, boxes: Box[]): BubbleSpot {
  const home = headSpot(pos)
  const half = size.w / 2
  const minX = half + EDGE
  const maxX = Math.max(minX, ROOM_WIDTH - half - EDGE)
  const minY = ROOM_VIEWBOX.y + size.h + EDGE
  const clampX = (x: number) => Math.min(maxX, Math.max(minX, x))
  const clampY = (y: number) => Math.max(minY, y)

  let best: BubbleSpot & { score: number } | null = null
  for (let up = 0; up <= MAX_UP; up += STEP_UP) {
    for (let side = -MAX_SIDE; side <= MAX_SIDE; side += STEP_SIDE) {
      const x = clampX(home.x + side)
      const y = clampY(home.y - up)
      const rect: Box = { x0: x - half, x1: x + half, y0: y - size.h, y1: y }
      const covered = boxes.reduce((sum, b) => sum + overlapArea(rect, b), 0)
      // What the clamps already moved counts as movement too.
      const score = covered + SIDE_COST * Math.abs(x - home.x) + UP_COST * Math.abs(home.y - y)
      if (!best || score < best.score - 1e-6) best = { x, y, tail: home.x - x, score }
    }
  }
  const spot = best as BubbleSpot
  // Keep the tail on the bubble's body.
  const reach = Math.max(0, half - 12)
  return { x: spot.x, y: spot.y, tail: Math.min(reach, Math.max(-reach, spot.tail)) }
}

/** CSS for a spot: percentages of the room picture (so it scales with it), and the tail's shift in room px as a fraction of the picture. */
export function bubbleStyle(spot: BubbleSpot) {
  const vb = ROOM_VIEWBOX
  return {
    left: `${((spot.x - vb.x) / vb.width) * 100}%`,
    top: `${((spot.y - vb.y) / vb.height) * 100}%`,
    // The bubble's own tail offset, in picture widths; CSS multiplies it by the picture's width.
    '--tail-x': `${spot.tail / vb.width}`,
  }
}
