import type { MessKind } from '../catalog/types'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore } from '../domain/types'
import type { Point } from './iso'
import { TILE_SCALE } from './shell/geometry'

// Which neglect cues the room draws, how big, and where (src/room/neglect.tsx
// draws them). A room with many late things must still read as a room, and
// every running SVG animation costs battery, so:
// - Budget: only the CUE_FULL most neglected objects (by level, then days
//   late) show their full cue and animate. Every other cue is a still level 1.
// - Size: bigger levels are drawn smaller than they were designed (CUE_SIZE),
//   so a cue is never much wider than the object under it.
// - Overlap: a cue never covers a higher-ranked one. It slides sideways if
//   that clears it, drops to level 1, or is left out.

export type CueLevel = 1 | 2 | 3

/** How many cues keep their full level and animate. */
export const CUE_FULL = 2

/** Drawn size of each level against its design size (outlines keep their width). */
export const CUE_SIZE: Record<CueLevel, number> = { 1: 1, 2: 0.7, 3: 0.65 }

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * Each cue's extent at design size, in cue units around its anchor (0,0), the
 * top-centre of the object; cues rise into negative y. Measured from the
 * drawings with getBBox, outlines and animation travel included.
 */
export const CUE_BOX: Record<MessKind, Record<CueLevel, Box>> = {
  stink: {
    1: { x0: -7, y0: -48, x1: 7, y1: 0 },
    2: { x0: -21, y0: -64, x1: 28, y1: 0 },
    3: { x0: -40, y0: -62, x1: 41, y1: 3 },
  },
  dust: {
    1: { x0: -16, y0: -34, x1: 19, y1: 0 },
    2: { x0: -24, y0: -50, x1: 27, y1: 1 },
    3: { x0: -34, y0: -61, x1: 35, y1: 10 },
  },
  wilt: {
    1: { x0: -8, y0: -28, x1: 16, y1: 10 },
    2: { x0: -28, y0: -48, x1: 32, y1: 14 },
    3: { x0: -39, y0: -72, x1: 34, y1: 18 },
  },
}

export interface CueInput {
  /** Placed object id. */
  id: string
  kind: MessKind
  level: CueLevel
  /** Days late of the object's latest chore; breaks ties between equal levels. */
  overdue: number
  /** The object's top-centre in room px. */
  anchor: Point
}

export interface CuePlan {
  id: string
  kind: MessKind
  level: CueLevel
  /** Only the most neglected cues move. */
  animate: boolean
  /** Where the cue is drawn (room px): the anchor, maybe nudged sideways. */
  x: number
  y: number
  /** Its box in room px, for tests and debugging. */
  box: Box
}

/** Most neglected first: by level, then days late, then the order given (stable). */
export function rankCues<T extends Pick<CueInput, 'level' | 'overdue'>>(cues: T[]): T[] {
  return cues
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.level - a.c.level || b.c.overdue - a.c.overdue || a.i - b.i)
    .map(({ c }) => c)
}

/** A cue's box in room px, drawn at (x, y) with the room's tile scale. */
export function cueBox(kind: MessKind, level: CueLevel, x: number, y: number, roomScale = TILE_SCALE): Box {
  const b = CUE_BOX[kind][level]
  const k = roomScale * CUE_SIZE[level]
  return { x0: x + b.x0 * k, y0: y + b.y0 * k, x1: x + b.x1 * k, y1: y + b.y1 * k }
}

const hits = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/** Sideways nudges tried in turn, in room px. */
const NUDGES = [0, 8, -8, 16, -16]

/** The cues to draw, most neglected first. */
export function planCues(cues: CueInput[], roomScale = TILE_SCALE): CuePlan[] {
  const placed: CuePlan[] = []
  rankCues(cues).forEach((c, rank) => {
    const full = rank < CUE_FULL
    const levels: CueLevel[] = full && c.level > 1 ? [c.level, 1] : [1]
    for (const level of levels) {
      for (const dx of NUDGES) {
        const x = c.anchor.x + dx
        const box = cueBox(c.kind, level, x, c.anchor.y, roomScale)
        if (placed.some((p) => hits(box, p.box))) continue
        placed.push({ id: c.id, kind: c.kind, level, animate: full, x, y: c.anchor.y, box })
        return
      }
    }
  })
  return placed
}

/** Days late of each object's latest chore, by placed object id (objects with nothing late are left out). */
export function objectOverdue(chores: Pick<Chore, 'id' | 'objectId'>[], statuses: Pick<ChoreStatus, 'choreId' | 'overdueDays'>[]): Record<string, number> {
  const objectOf = new Map(chores.map((c) => [c.id, c.objectId]))
  const out: Record<string, number> = {}
  for (const s of statuses) {
    const id = objectOf.get(s.choreId)
    if (!id || s.overdueDays <= 0) continue
    out[id] = Math.max(out[id] ?? 0, s.overdueDays)
  }
  return out
}
