import type { Mood } from '../domain/types'
import type { PoseName } from '../character/poses'
import { ROOM_SIZE } from '../room/grid'

// The pet's life in the room, as a pure state machine (no timers, no React):
// call `step` on each tick with the time and a random source, `tap` when the
// player taps the pet. The UI interpolates position with `positionAt`.
//
//   sleep  on vacation: dozes where it is.
//   sick   health is low: tucked up in bed (the sick pose), no wandering.
//   react  just tapped: a little cheer, then back to what it was doing.
//   walk   tile by tile along a path, then idles or looks at mess.
//   look   standing beside the messiest object, looking at it.
//   idle   standing still for a few seconds.

export interface Tile {
  tx: number
  ty: number
}

export type Activity =
  | { kind: 'idle'; until: number }
  | { kind: 'walk'; path: Tile[]; stepStart: number; then: 'idle' | 'look' }
  | { kind: 'look'; objectId: string; until: number }
  | { kind: 'react'; until: number }
  | { kind: 'sick' }
  | { kind: 'sleep' }

export interface PetState {
  tile: Tile
  /** 1 faces right on screen, -1 faces left. */
  facing: 1 | -1
  activity: Activity
  /** Bumped whenever the pet starts something new, so the UI can vary lines. */
  beat: number
}

export interface World {
  /** Whether the pet can stand on a tile (inside the room, no solid object). */
  free: (t: Tile) => boolean
  mood: Mood
  away: boolean
  /** The messiest object and the tiles it covers, if anything is late. */
  mess: { objectId: string; tiles: Tile[] } | null
}

export const TIMING = {
  stepMs: 420,
  idleMs: [2200, 5200] as const,
  lookMs: 4200,
  reactMs: 1600,
  /** How far a wander goes, in tiles. */
  wanderRange: 3,
}

export function initialPet(tile: Tile, now: number): PetState {
  return { tile, facing: 1, activity: { kind: 'idle', until: now + 1500 }, beat: 0 }
}

const key = (t: Tile) => `${t.tx},${t.ty}`
const NEIGHBOURS: Tile[] = [
  { tx: 1, ty: 0 },
  { tx: -1, ty: 0 },
  { tx: 0, ty: 1 },
  { tx: 0, ty: -1 },
]

function inRoom(t: Tile): boolean {
  return t.tx >= 0 && t.ty >= 0 && t.tx < ROOM_SIZE && t.ty < ROOM_SIZE
}

/** Shortest path from `from` to any goal tile over free tiles (excluding `from`), or null. */
export function findPath(from: Tile, goals: Tile[], free: (t: Tile) => boolean): Tile[] | null {
  const goalKeys = new Set(goals.map(key))
  const prev = new Map<string, Tile | null>([[key(from), null]])
  const queue: Tile[] = [from]
  while (queue.length) {
    const t = queue.shift()!
    if (goalKeys.has(key(t)) && key(t) !== key(from)) {
      const path: Tile[] = []
      for (let c: Tile | null = t; c && key(c) !== key(from); c = prev.get(key(c)) ?? null) path.unshift(c)
      return path
    }
    for (const n of NEIGHBOURS) {
      const next = { tx: t.tx + n.tx, ty: t.ty + n.ty }
      if (!inRoom(next) || prev.has(key(next)) || !free(next)) continue
      prev.set(key(next), t)
      queue.push(next)
    }
  }
  return null
}

/** Free tiles touching an object's tiles: where the pet stands to look at it. */
export function besideTiles(tiles: Tile[], free: (t: Tile) => boolean): Tile[] {
  const own = new Set(tiles.map(key))
  const out = new Map<string, Tile>()
  for (const t of tiles) {
    for (const n of NEIGHBOURS) {
      const c = { tx: t.tx + n.tx, ty: t.ty + n.ty }
      if (inRoom(c) && !own.has(key(c)) && free(c)) out.set(key(c), c)
    }
  }
  return [...out.values()]
}

/** Screen-facing for a move from a to b: right on screen is +tx or -ty. */
function facingFor(a: Tile, b: Tile, current: 1 | -1): 1 | -1 {
  const dx = b.tx - a.tx - (b.ty - a.ty)
  return dx > 0 ? 1 : dx < 0 ? -1 : current
}

function centre(tiles: Tile[]): Tile {
  const n = tiles.length || 1
  return { tx: tiles.reduce((s, t) => s + t.tx, 0) / n, ty: tiles.reduce((s, t) => s + t.ty, 0) / n }
}

function nearestFree(t: Tile, free: (t: Tile) => boolean): Tile {
  if (inRoom(t) && free(t)) return t
  const path = findPath(t, allTiles().filter(free), (x) => inRoom(x))
  return path?.[path.length - 1] ?? t
}

function allTiles(): Tile[] {
  const out: Tile[] = []
  for (let tx = 0; tx < ROOM_SIZE; tx++) for (let ty = 0; ty < ROOM_SIZE; ty++) out.push({ tx, ty })
  return out
}

function idle(now: number, rand: () => number): Activity {
  const [lo, hi] = TIMING.idleMs
  return { kind: 'idle', until: now + lo + (hi - lo) * rand() }
}

/** What to do next once the current activity is over. */
function decide(state: PetState, world: World, now: number, rand: () => number): PetState {
  const beat = state.beat + 1
  if (world.mess && rand() < 0.5) {
    const goals = besideTiles(world.mess.tiles, world.free)
    const here = goals.some((g) => key(g) === key(state.tile))
    if (here) {
      const facing = facingFor(state.tile, centre(world.mess.tiles), state.facing)
      return { ...state, facing, beat, activity: { kind: 'look', objectId: world.mess.objectId, until: now + TIMING.lookMs } }
    }
    const path = findPath(state.tile, goals, world.free)
    if (path) return { ...state, beat, activity: { kind: 'walk', path, stepStart: now, then: 'look' } }
  }
  if (rand() < 0.6) {
    const near = allTiles().filter(
      (t) => world.free(t) && Math.abs(t.tx - state.tile.tx) + Math.abs(t.ty - state.tile.ty) <= TIMING.wanderRange && key(t) !== key(state.tile),
    )
    if (near.length) {
      const goal = near[Math.floor(rand() * near.length)]
      const path = findPath(state.tile, [goal], world.free)
      if (path) return { ...state, beat, activity: { kind: 'walk', path, stepStart: now, then: 'idle' } }
    }
  }
  return { ...state, beat, activity: idle(now, rand) }
}

export function step(state: PetState, world: World, now: number, rand: () => number): PetState {
  // Something was placed on the pet's tile: hop to the nearest free one.
  if (!world.free(state.tile)) state = { ...state, tile: nearestFree(state.tile, world.free) }

  if (world.away) return state.activity.kind === 'sleep' ? state : { ...state, beat: state.beat + 1, activity: { kind: 'sleep' } }
  if (world.mood === 'sick') return state.activity.kind === 'sick' ? state : { ...state, beat: state.beat + 1, activity: { kind: 'sick' } }

  const a = state.activity
  switch (a.kind) {
    case 'sleep':
    case 'sick':
      return { ...state, activity: idle(now, rand) }
    case 'idle':
    case 'look':
    case 'react':
      return now >= a.until ? decide(state, world, now, rand) : state
    case 'walk': {
      let { stepStart } = a
      let tile = state.tile
      let facing = state.facing
      let path = a.path
      while (path.length && now - stepStart >= TIMING.stepMs) {
        if (!world.free(path[0])) {
          path = []
          break
        }
        facing = facingFor(tile, path[0], facing)
        tile = path[0]
        path = path.slice(1)
        stepStart += TIMING.stepMs
      }
      if (path.length) {
        facing = facingFor(tile, path[0], facing)
        return { ...state, tile, facing, activity: { ...a, path, stepStart } }
      }
      const arrived = { ...state, tile, facing }
      if (a.then === 'look' && world.mess) {
        facing = facingFor(tile, centre(world.mess.tiles), facing)
        return { ...arrived, facing, activity: { kind: 'look', objectId: world.mess.objectId, until: now + TIMING.lookMs } }
      }
      return { ...arrived, activity: idle(now, rand) }
    }
  }
}

/** The player tapped the pet. Sleeping and sick pets just notice; others cheer. */
export function tap(state: PetState, now: number): PetState {
  if (state.activity.kind === 'sleep' || state.activity.kind === 'sick') return { ...state, beat: state.beat + 1 }
  return { ...state, beat: state.beat + 1, activity: { kind: 'react', until: now + TIMING.reactMs } }
}

/** Fractional tile position for drawing, sliding smoothly between tiles while walking. */
export function positionAt(state: PetState, now: number): Tile {
  const a = state.activity
  if (a.kind !== 'walk' || !a.path.length) return state.tile
  const t = Math.min(1, Math.max(0, (now - a.stepStart) / TIMING.stepMs))
  const next = a.path[0]
  return { tx: state.tile.tx + (next.tx - state.tile.tx) * t, ty: state.tile.ty + (next.ty - state.tile.ty) * t }
}

/** Which pose to draw. */
export function poseFor(state: PetState): PoseName | undefined {
  switch (state.activity.kind) {
    case 'sleep':
      return 'sleeping'
    case 'react':
      return 'cheering'
    default:
      return undefined // the mood's own pose (sick shows the bed)
  }
}
