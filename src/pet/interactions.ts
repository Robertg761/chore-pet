import { catalogEntry } from '../catalog/objects'
import type { MotionAction } from '../character/motion'
import type { MessStage, PlacedObject } from '../domain/types'
import { footprintOf, insideRoom, ROOM_SIZE } from '../room/grid'
import { TILE_H } from '../room/iso'
import { findPath } from './pathfinding'
import type { Tile } from './pathfinding'

export interface InteractionTarget {
  objectId: string
  signature: string
  tile: Tile
  /** Visual point projected into tile coordinates, including the art's height. */
  gaze: Tile
  action: MotionAction
  contact: boolean
}

interface Profile {
  action: MotionAction
  /** Object-local iso point. z is in SVG art units, as in room/iso.ts. */
  gaze?: Tile & { z: number }
  /** Follow visible piles/openings when the clean detail is covered. */
  gazeByStage?: Partial<Record<MessStage, Tile & { z: number }>>
}

// These gaze points follow the existing art, without importing its React renderers.
// No profile has verified paw/contact anchors, so none emits reach or contact.
const PROFILES: ReadonlyMap<string, Profile> = new Map([
  // Basin centre and the upper plate centres in sink.tsx.
  ['sink', { action: 'inspect', gaze: { tx: 0.58, ty: 0.5, z: 34 }, gazeByStage: {
    // The second plate is nudged one SVG unit right: keep projected y fixed.
    messy1: { tx: 0.58 + 1 / 64, ty: 0.5 - 1 / 64, z: 38.5 }, messy2: { tx: 0.58, ty: 0.5, z: 49 },
  } }],
  // Pot knob: hob height 34, base +1, knob -15; messy2 raises the lid by 3.
  ['stove', { action: 'inspect', gaze: { tx: 0.28, ty: 0.28, z: 48 }, gazeByStage: {
    messy2: { tx: 0.28, ty: 0.28, z: 51 },
  } }],
  // Retained red freezer magnet at rightFace(82)(.3,.14), in every stage.
  ['fridge', { action: 'inspect', gaze: { tx: 1, ty: 0.3, z: 70.52 } }],
  // Tomato on the board; a takeout opening covers it in messy2.
  ['counter', { action: 'inspect', gaze: { tx: 0.62, ty: 1.52, z: 36 }, gazeByStage: {
    messy2: { tx: 0.56, ty: 1.5, z: 47 },
  } }],
  ['plant', { action: 'wave', gaze: { tx: 0, ty: 0, z: 28 } }], // leaves around SVG (0,-28)
  ['fish-tank', { action: 'wave', gaze: { tx: 0.92, ty: 0.5, z: 40 } }], // front glass
  ['bookshelf', { action: 'inspect', gaze: { tx: 0.62, ty: 0.5, z: 42 } }], // open upper shelf
  ['teddy', { action: 'inspect', gaze: { tx: 0.5, ty: 0.5, z: 24 } }],
  ['lamp', { action: 'inspect', gaze: { tx: 0, ty: 0, z: 54 } }], // shade centre
  ['poster', { action: 'inspect', gaze: { tx: 0, ty: 0.5, z: 84 } }],
  ['wall-clock', { action: 'inspect', gaze: { tx: 0, ty: 0.5, z: 84 } }],
  // Middle swag at t=.5: wall-local x=32.5,y=-116.2775, then onRight(0,2).
  ['fairy-lights', { action: 'inspect', gaze: { tx: 0, ty: 0.984375, z: 116.2775 } }],
  ['bed', { action: 'rest' }],
  ['couch', { action: 'rest' }],
  ['bean-bag', { action: 'rest' }],
  ['rug', { action: 'rest' }],
])

const CONDITION_ACTION = { dust: 'dust', stink: 'smell', wilt: 'concern' } as const

function inRoom(tile: Tile): boolean {
  return Number.isInteger(tile.tx) && Number.isInteger(tile.ty)
    && tile.tx >= 0 && tile.ty >= 0 && tile.tx < ROOM_SIZE && tile.ty < ROOM_SIZE
}

/** Free perimeter tiles, ordered front, other visible side, back, remaining side. */
export function interactionTargets(
  objects: readonly PlacedObject[],
  free: (tile: Tile) => boolean,
  stages: Readonly<Record<string, MessStage>>,
): InteractionTarget[] {
  const targets: InteractionTarget[] = []
  for (const object of objects) {
    const entry = catalogEntry(object.catalogId)
    if (!entry) continue
    const footprint = footprintOf(object, entry)
    if (!Number.isInteger(footprint.tx) || !Number.isInteger(footprint.ty) || !insideRoom(footprint)) continue

    const profile = PROFILES.get(entry.id) ?? { action: 'inspect' }
    const stage = Object.prototype.hasOwnProperty.call(stages, object.id) ? stages[object.id] ?? 'clean' : 'clean'
    const action = stage === 'clean' ? profile.action : CONDITION_ACTION[entry.mess]
    const signature = JSON.stringify([object.id, entry.id, object.tileX, object.tileY, object.rotation, stage, action])
    const local = profile.gazeByStage?.[stage] ?? profile.gaze ?? { tx: entry.footprint.w / 2, ty: entry.footprint.d / 2, z: 0 }
    // Inverse iso: raising a visual point by z subtracts z/TILE_H from both
    // tile axes. Mirroring the renderer's screen x swaps tx and ty.
    const lift = local.z / TILE_H
    const odd = object.rotation % 2 === 1
    const gaze = {
      tx: object.tileX + (odd ? local.ty : local.tx) - lift,
      ty: object.tileY + (odd ? local.tx : local.ty) - lift,
    }
    const { tx, ty, w, d } = footprint
    const positiveX = Array.from({ length: d }, (_, i) => ({ tx: tx + w, ty: ty + i }))
    const positiveY = Array.from({ length: w }, (_, i) => ({ tx: tx + i, ty: ty + d }))
    const negativeX = Array.from({ length: d }, (_, i) => ({ tx: tx - 1, ty: ty + i }))
    const negativeY = Array.from({ length: w }, (_, i) => ({ tx: tx + i, ty: ty - 1 }))
    const sides = odd ? [positiveY, positiveX, negativeY, negativeX] : [positiveX, positiveY, negativeX, negativeY]
    for (const side of sides) for (const tile of side) {
      if (inRoom(tile) && free(tile)) targets.push({ objectId: object.id, signature, tile, gaze, action, contact: false })
    }
  }
  return targets
}

/**
 * Choose an object using a random sample in [0,1), then its first reachable
 * approach. Target order preserves front preference without weighting large
 * objects more heavily. Recheck occupancy because generation may precede a move.
 */
export function chooseInteraction(
  from: Tile,
  targets: readonly InteractionTarget[],
  free: (tile: Tile) => boolean,
  choice: number,
): { target: InteractionTarget; path: Tile[] } | null {
  if (!inRoom(from) || !free(from)) return null
  const reachable = new Map<string, { target: InteractionTarget; path: Tile[] }>()
  for (const target of targets) {
    if (reachable.has(target.objectId) || !inRoom(target.tile) || !free(target.tile)) continue
    const here = from.tx === target.tile.tx && from.ty === target.tile.ty
    const path = here ? [] : findPath(from, [target.tile], free)
    if (path !== null) reachable.set(target.objectId, { target, path })
  }
  const candidates = [...reachable.values()]
  if (!candidates.length) return null
  const sample = Number.isFinite(choice) ? Math.max(0, Math.min(1, choice)) : 0
  return candidates[Math.min(candidates.length - 1, Math.floor(sample * candidates.length))]
}
