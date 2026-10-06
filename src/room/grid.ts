import type { CatalogEntry, Layer } from '../catalog/types'
import type { PlacedObject } from '../domain/types'
import { ROOM_ORIGIN, ROOM_TILE_H, ROOM_TILE_W, ROOM_TILES } from './shell/geometry'

// Pure tile maths for the room: footprints, placement rules, depth order and
// screen <-> tile conversion. No React, so it is all unit-testable.
//
// Tiles: tx runs along the right wall (toward the lower right), ty along the
// left wall (toward the lower left); (0, 0) is the back corner. The two walls
// are the lines tx = 0 (left wall) and ty = 0 (right wall).
//
// Rotation: 0 = back against the left wall, facing +tx (how all art is drawn).
// 1 = back against the right wall, facing +ty; the art is mirrored and the
// footprint's w and d swap. 2 and 3 draw like 0 and 1 (free-standing floor
// objects only); wall objects use 0 and 1.

export const ROOM_SIZE = ROOM_TILES

export type Rotation = PlacedObject['rotation']

export interface Footprint {
  tx: number
  ty: number
  w: number
  d: number
}

export interface Placement {
  tileX: number
  tileY: number
  rotation: Rotation
}

/** Size on the floor after rotation. */
export function rotatedSize(entry: Pick<CatalogEntry, 'footprint'>, rotation: Rotation): { w: number; d: number } {
  const { w, d } = entry.footprint
  return rotation % 2 === 0 ? { w, d } : { w: d, d: w }
}

export function footprintOf(p: Placement, entry: Pick<CatalogEntry, 'footprint'>): Footprint {
  return { tx: p.tileX, ty: p.tileY, ...rotatedSize(entry, p.rotation) }
}

export function overlaps(a: Footprint, b: Footprint): boolean {
  return a.tx < b.tx + b.w && b.tx < a.tx + a.w && a.ty < b.ty + b.d && b.ty < a.ty + a.d
}

export function insideRoom(f: Footprint): boolean {
  return f.tx >= 0 && f.ty >= 0 && f.tx + f.w <= ROOM_SIZE && f.ty + f.d <= ROOM_SIZE
}

/** True when a wall object's back touches the wall its rotation faces away from. */
export function againstWall(p: Placement): boolean {
  if (p.rotation === 0) return p.tileX === 0
  if (p.rotation === 1) return p.tileY === 0
  return false
}

export type PlacementProblem = 'outside' | 'needsWall' | 'overlap'

export interface PlacementCheck {
  ok: boolean
  problem: PlacementProblem | null
  /** Ids of placed objects in the way. */
  blockers: string[]
}

type Lookup = (catalogId: string) => Pick<CatalogEntry, 'footprint' | 'placement' | 'layer'> | undefined

/**
 * Can `entry` go at `p`? `others` are the room's placed objects; the object
 * being moved (`movingId`) is ignored. Solid things can't overlap solid
 * things, flat things (rugs) can't overlap flat things, and a solid thing may
 * stand on a rug.
 */
export function checkPlacement(
  entry: Pick<CatalogEntry, 'footprint' | 'placement' | 'layer'>,
  p: Placement,
  others: PlacedObject[],
  lookup: Lookup,
  movingId?: string,
): PlacementCheck {
  const fp = footprintOf(p, entry)
  if (!insideRoom(fp)) return { ok: false, problem: 'outside', blockers: [] }
  if (entry.placement === 'wall' && !againstWall(p)) return { ok: false, problem: 'needsWall', blockers: [] }
  const blockers = others
    .filter((o) => o.id !== movingId)
    .filter((o) => {
      const other = lookup(o.catalogId)
      return other !== undefined && other.layer === entry.layer && overlaps(fp, footprintOf(o, other))
    })
    .map((o) => o.id)
  return blockers.length ? { ok: false, problem: 'overlap', blockers } : { ok: true, problem: null, blockers: [] }
}

/** Wall objects at rotation 0 and 1; floor objects at 0 and 1 too (2 and 3 look the same). */
export function rotationsFor(entry: Pick<CatalogEntry, 'placement'>): Rotation[] {
  return entry.placement === 'wall' ? [0, 1] : [0, 1]
}

/**
 * The first spot where `entry` fits, scanning from the back corner outward so
 * new things appear near the walls first. null when the room is full.
 */
export function findFreeSpot(
  entry: Pick<CatalogEntry, 'footprint' | 'placement' | 'layer'>,
  others: PlacedObject[],
  lookup: Lookup,
): Placement | null {
  const spots: Placement[] = []
  for (let sum = 0; sum <= 2 * (ROOM_SIZE - 1); sum++) {
    for (let tileX = 0; tileX <= sum; tileX++) {
      const tileY = sum - tileX
      if (tileX >= ROOM_SIZE || tileY >= ROOM_SIZE) continue
      for (const rotation of rotationsFor(entry)) spots.push({ tileX, tileY, rotation })
    }
  }
  return spots.find((p) => checkPlacement(entry, p, others, lookup).ok) ?? null
}

/**
 * Where a dragged object lands when the pointer is at fractional tile
 * (tx, ty): centred under the pointer and kept inside the room. Wall objects
 * slide along the nearer wall and turn to face out from it.
 */
export function snapDrag(entry: Pick<CatalogEntry, 'footprint' | 'placement'>, tx: number, ty: number, rotation: Rotation): Placement {
  let rot = rotation
  if (entry.placement === 'wall') rot = tx <= ty ? 0 : 1
  const { w, d } = rotatedSize(entry, rot)
  const clamp = (v: number, size: number) => Math.min(Math.max(v, 0), ROOM_SIZE - size)
  let tileX = clamp(Math.round(tx - w / 2), w)
  let tileY = clamp(Math.round(ty - d / 2), d)
  if (entry.placement === 'wall') {
    if (rot === 0) tileX = 0
    else tileY = 0
  }
  return { tileX, tileY, rotation: rot }
}

export interface Sortable {
  id: string
  footprint: Footprint
  layer: Layer
}

/**
 * Back-to-front draw order. Flat things go first (they lie under everything).
 * For solid things, A is drawn before B when A ends before B starts along tx,
 * or else along ty; the result is topologically sorted, falling back to
 * distance from the back corner if the rules ever form a cycle.
 */
export function depthOrder<T extends Sortable>(items: T[]): T[] {
  const flat = items.filter((i) => i.layer === 'flat').sort(byCorner)
  const solid = items.filter((i) => i.layer !== 'flat').sort(byCorner)
  const behind = (a: Footprint, b: Footprint) => (a.tx + a.w <= b.tx ? true : b.tx + b.w <= a.tx ? false : a.ty + a.d <= b.ty)

  const remaining = new Set(solid)
  const ordered: T[] = []
  while (remaining.size) {
    const next = [...remaining].find((a) => ![...remaining].some((b) => b !== a && behind(b.footprint, a.footprint)))
    const pick = next ?? [...remaining][0]
    ordered.push(pick)
    remaining.delete(pick)
  }
  return [...flat, ...ordered]
}

function byCorner(a: Sortable, b: Sortable): number {
  const fa = a.footprint
  const fb = b.footprint
  return fa.tx + fa.ty - (fb.tx + fb.ty) || fa.tx - fb.tx
}

/** Room-px point -> fractional tile coordinates (inverse of roomPoint at z = 0). */
export function screenToTile(x: number, y: number): { tx: number; ty: number } {
  const dx = x - ROOM_ORIGIN.x
  const dy = y - ROOM_ORIGIN.y
  return { tx: dx / ROOM_TILE_W + dy / ROOM_TILE_H, ty: dy / ROOM_TILE_H - dx / ROOM_TILE_W }
}

/** Every tile a footprint covers. */
export function tilesOf(f: Footprint): { tx: number; ty: number }[] {
  const tiles = []
  for (let x = f.tx; x < f.tx + f.w; x++) for (let y = f.ty; y < f.ty + f.d; y++) tiles.push({ tx: x, ty: y })
  return tiles
}

/**
 * The same object turned. A wall object moves to the other wall (mirrored
 * across the room's diagonal) so it still backs onto a wall; a floor object
 * turns in place, nudged back inside the room if it would poke out.
 */
export function turned(entry: Pick<CatalogEntry, 'placement' | 'footprint'>, p: Placement): Placement {
  const rotation: Rotation = p.rotation % 2 === 0 ? 1 : 0
  if (entry.placement === 'wall') return { tileX: p.tileY, tileY: p.tileX, rotation }
  // Turning swaps w and d, so nudge it back inside if it would poke out.
  const { w, d } = rotatedSize(entry, rotation)
  return { tileX: Math.min(p.tileX, ROOM_SIZE - w), tileY: Math.min(p.tileY, ROOM_SIZE - d), rotation }
}

/** A free floor tile for the pet to stand on, preferring the front of the room. */
export function freeTile(occupied: Footprint[]): { tx: number; ty: number } | null {
  for (let sum = 2 * (ROOM_SIZE - 1); sum >= 0; sum--) {
    for (let tx = ROOM_SIZE - 1; tx >= 0; tx--) {
      const ty = sum - tx
      if (ty < 0 || ty >= ROOM_SIZE) continue
      if (!occupied.some((f) => overlaps(f, { tx, ty, w: 1, d: 1 }))) return { tx, ty }
    }
  }
  return null
}
