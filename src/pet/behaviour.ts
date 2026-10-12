import type { Mood } from '../domain/types'
import type { PoseName } from '../character/poses'
import { ACTION_MS, type GroundPoint, type MotionAction } from '../character/motion'
import { ROOM_SIZE } from '../room/grid'
import { PET_SCALE, roomPoint } from '../room/shell/geometry'
import { chooseInteraction, type InteractionTarget } from './interactions'
import { besideTiles, findPath, type Tile } from './pathfinding'

// Keep the old public pathfinding imports valid without a behaviour/interaction cycle.
export { besideTiles, findPath, type Tile } from './pathfinding'
export type ReactionKind = 'tap' | 'celebrate' | 'celebrate-big'
type ReactionAction = 'greet' | 'affection' | 'celebrate' | 'celebrate-big'
export type Walk = {
  kind: 'walk'; path: Tile[]; stepStart: number; then: 'idle' | 'look'
  /** First segment may start between tiles after an interruption. */
  origin?: Tile
  /** Preserve both grid endpoints when reconnecting along a partial segment. */
  segment?: { from: Tile; to: Tile }
  journeyStart?: number
  distance?: number
  durationMs?: number
  /** Whole journey in unmirrored SVG units; retain completed corners. */
  groundPath?: readonly GroundPoint[]
  /** A route turn overlays compression without pausing placement or resetting gait. */
  turnStart?: number
  target?: InteractionTarget
}
export type Activity =
  | { kind: 'idle'; until: number; start?: number }
  | Walk
  | { kind: 'look'; objectId: string; until: number; start?: number }
  | { kind: 'interact'; phase: 'orient' | 'action' | 'settle'; target: InteractionTarget; start: number; until: number }
  | { kind: 'react'; until: number; start?: number; action?: ReactionAction }
  | { kind: 'sick' }
  | { kind: 'sleep' }

/** Frozen sampler inputs; never retains an earlier state or a transition tree. */
export interface MotionSnapshot {
  tile: Tile
  facing: 1 | -1
  activity: Activity
  position?: Tile
  noticeStart?: number
  at: number
  /** Validated route clock when a collision rejects elapsed traversal. */
  walkAt?: number
  /** Safe contact origin after rejected traversal, including retained layers. */
  groundPosition?: Tile
}
type MotionLayer = { snapshot: MotionSnapshot; weight: number }
/** Frozen shared-helper release terms, flat rather than nested transition trees. */
interface GroundRelease {
  from: readonly MotionLayer[]
  to: MotionSnapshot
  progress: number
  weight: number
}
export interface PetState {
  tile: Tile
  /** 1 faces right on screen, -1 faces left. */
  facing: 1 | -1
  activity: Activity
  /** Visible semantic phase changes, not animation frames or coalesced input. */
  beat: number
  pendingTap?: boolean
  reactions?: number
  noticeStart?: number
  /** Drawn interruption origin, independent of the integer pathfinding tile. */
  position?: Tile
  /** Only the endpoints of the interrupted segment are safe reconnection goals. */
  resume?: { from: Tile; to: Tile }
  transition?: { start: number; layers: MotionLayer[]; groundReleases?: GroundRelease[] }
}
export interface World {
  free: (t: Tile) => boolean
  mood: Mood
  away: boolean
  mess: { objectId: string; tiles: Tile[] } | null
  /** Omitted by legacy callers; an explicit list enables environmental sequencing. */
  interactions?: readonly InteractionTarget[]
}
export const TIMING = {
  stepMs: 420,
  idleMs: [2200, 5200] as const,
  lookMs: 4200,
  reactMs: ACTION_MS.greet,
  settleMs: 180,
  blendMs: 120,
  wanderRange: 3,
}
export function initialPet(tile: Tile, now: number): PetState {
  return { tile, facing: 1, activity: { kind: 'idle', start: now, until: now + 1500 }, beat: 0 }
}
const key = (t: Tile) => `${t.tx},${t.ty}`
const distance = (a: Tile, b: Tile) => Math.abs(b.tx - a.tx) + Math.abs(b.ty - a.ty)
const inRoom = (t: Tile) => t.tx >= 0 && t.ty >= 0 && t.tx < ROOM_SIZE && t.ty < ROOM_SIZE
export function blendProgress(start: number, now: number): number {
  const t = Math.max(0, Math.min(1, (now - start) / TIMING.blendMs))
  return t * t * (3 - 2 * t)
}
function change(state: PetState, activity: Activity, now: number, walkAt?: number): PetState {
  const layers: NonNullable<PetState['transition']>['layers'] = []
  const groundReleases: GroundRelease[] = []
  const progress = state.transition ? blendProgress(state.transition.start, now) : 1
  if (state.transition && progress < 1) for (const layer of state.transition.layers) {
    const weight = layer.weight * (1 - progress)
    if (weight > 1e-9) layers.push({ ...layer, weight })
  }
  const snapshot: MotionSnapshot = {
    tile: state.tile, facing: state.facing, activity: state.activity.kind === 'walk'
      ? { ...state.activity, groundPath: groundPathFor(state) } : state.activity, position: state.position,
    noticeStart: state.noticeStart, at: now,
  }
  if (walkAt !== undefined && walkAt !== now) snapshot.walkAt = walkAt
  if (progress > 0) layers.push({ weight: progress, snapshot })
  if (state.transition && progress < 1) {
    for (const release of state.transition.groundReleases ?? []) {
      const weight = release.weight * (1 - progress)
      if (weight > 1e-9) groundReleases.push({ ...release, weight })
    }
    if (progress > 0) groundReleases.push({ from: state.transition.layers, to: snapshot, progress, weight: 1 })
  }
  if (walkAt !== undefined && walkAt < now) {
    // A delayed collision can rewind past an unfinished turn. Discard rejected
    // contact placement in every frozen reference, not just the newest pose.
    // Preserve pose clocks/history and share immutable copies across releases.
    const groundPosition = positionAt(state, walkAt)
    const validated = new Map<MotionSnapshot, MotionSnapshot>()
    const validate = (old: MotionSnapshot): MotionSnapshot => {
      let safe = validated.get(old)
      if (!safe) {
        safe = { ...old, groundPosition }
        validated.set(old, safe)
      }
      return safe
    }
    for (const layer of layers) layer.snapshot = validate(layer.snapshot)
    for (const release of groundReleases) {
      release.to = validate(release.to)
      release.from = release.from.map((layer) => ({ ...layer, snapshot: validate(layer.snapshot) }))
    }
  }
  return { ...state, activity, beat: state.beat + 1, transition: layers.length
    ? { start: now, layers, ...(groundReleases.length ? { groundReleases } : {}) } : undefined }
}
function facingFor(a: Tile, b: Tile, current: 1 | -1): 1 | -1 {
  const dx = b.tx - a.tx - (b.ty - a.ty)
  return dx > 0 ? 1 : dx < 0 ? -1 : current
}
function centre(tiles: Tile[]): Tile {
  const n = tiles.length || 1
  return { tx: tiles.reduce((s, t) => s + t.tx, 0) / n, ty: tiles.reduce((s, t) => s + t.ty, 0) / n }
}
function allTiles(): Tile[] {
  const out: Tile[] = []
  for (let tx = 0; tx < ROOM_SIZE; tx++) for (let ty = 0; ty < ROOM_SIZE; ty++) out.push({ tx, ty })
  return out
}
function nearestFree(t: Tile, free: World['free']): Tile {
  if (inRoom(t) && free(t)) return t
  const path = findPath(t, allTiles().filter(free), inRoom)
  return path?.at(-1) ?? t
}
function idle(now: number, rand: () => number): Activity {
  const [lo, hi] = TIMING.idleMs
  return { kind: 'idle', start: now, until: now + lo + (hi - lo) * rand() }
}

/** Advance the mathematical route, shared by rendering and interruption capture. */
export function routeAt(state: Pick<PetState, 'tile' | 'activity'>, now: number): {
  tile: Tile; origin: Tile; path: Tile[]; stepStart: number; travelled: number; position: Tile
  segment?: { from: Tile; to: Tile }
} {
  if (state.activity.kind !== 'walk') return {
    tile: state.tile, origin: state.tile, path: [], stepStart: now, travelled: 0, position: state.tile,
  }
  const a = state.activity
  let tile = state.tile
  let origin = a.origin ?? tile
  let stepStart = a.stepStart
  let travelled = a.distance ?? 0
  let path = a.path
  let segment = a.segment
  while (path.length) {
    const length = distance(origin, path[0])
    const ms = length * TIMING.stepMs
    if (now < stepStart + ms) {
      const t = Math.max(0, (now - stepStart) / ms)
      return { tile, origin, path, stepStart, travelled, segment: segment ?? { from: tile, to: path[0] }, position: {
        tx: origin.tx + (path[0].tx - origin.tx) * t,
        ty: origin.ty + (path[0].ty - origin.ty) * t,
      } }
    }
    travelled += length
    stepStart += ms
    tile = path[0]
    origin = tile
    path = path.slice(1)
    segment = undefined
  }
  return { tile, origin, path, stepStart, travelled, position: tile }
}
export function positionAt(state: PetState, now: number): Tile {
  return state.activity.kind === 'walk' ? routeAt(state, now).position : state.position ?? state.tile
}
function projectedPath(origin: Tile, path: readonly Tile[], travelled: number): readonly GroundPoint[] {
  const project = (tile: Tile, distance: number): GroundPoint => {
    const point = roomPoint(tile.tx + 0.5, tile.ty + 0.5)
    return { distance, x: point.x / PET_SCALE, y: point.y / PET_SCALE }
  }
  const points = [project(origin, travelled)]
  let previous = origin
  for (const tile of path) {
    const length = distance(previous, tile)
    travelled += length
    if (length > 0) points.push(project(tile, travelled))
    previous = tile
  }
  return points
}
/** Legacy walks derive their known route once, before any completed tiles are dropped. */
export function groundPathFor(state: Pick<PetState, 'tile' | 'activity'>): readonly GroundPoint[] | undefined {
  const a = state.activity
  return a.kind === 'walk' ? a.groundPath ?? projectedPath(a.origin ?? state.tile, a.path, a.distance ?? 0) : undefined
}
function freeze(state: PetState, now: number): PetState {
  if (state.activity.kind !== 'walk') return state
  const route = routeAt(state, now)
  return { ...state, tile: route.tile, position: route.position,
    resume: route.segment }
}
function startWalk(state: PetState, path: Tile[], now: number, then: Walk['then'], target?: InteractionTarget): PetState {
  const origin = state.position ?? state.tile
  let durationMs = 0
  let previous = origin
  for (const tile of path) { durationMs += distance(previous, tile) * TIMING.stepMs; previous = tile }
  const next = change(state, { kind: 'walk', path, origin, segment: state.resume, stepStart: now, journeyStart: now,
    distance: 0, durationMs, groundPath: projectedPath(origin, path, 0), then, target }, now)
  return { ...next, facing: path.length ? facingFor(origin, path[0], state.facing) : state.facing, position: undefined, resume: undefined }
}
function reconnect(state: PetState, world: World, now: number): PetState | null {
  if (!state.position || (key(state.position) === key(state.tile) && world.free(state.tile))) return null
  // Never round a fractional point into an unrelated tile or cut diagonally through furniture.
  const endpoints = state.resume ? [state.resume.to, state.resume.from]
    : key(state.position) === key(state.tile) ? besideTiles([state.tile], world.free) : [state.tile]
  const endpoint = endpoints.find((tile) => inRoom(tile) && world.free(tile))
  return endpoint ? startWalk(state, [endpoint], now, 'idle') : null
}
function orient(state: PetState, target: InteractionTarget, now: number): PetState {
  const next = change(state, { kind: 'interact', phase: 'orient', target, start: now, until: now + ACTION_MS.turn }, now)
  return { ...next, facing: facingFor(positionAt(state, now), target.gaze, state.facing) }
}
function decide(state: PetState, world: World, now: number, rand: () => number): PetState {
  const connection = reconnect(state, world, now)
  if (connection) return connection
  // No valid endpoint means wait in place until the segment becomes accessible.
  if (state.position && (key(state.position) !== key(state.tile) || !world.free(state.tile))) return change(state, idle(now, rand), now)
  if (world.interactions !== undefined) {
    const selected = chooseInteraction(state.tile, world.interactions, world.free, rand())
    if (selected) return selected.path.length
      ? startWalk(state, selected.path, now, 'idle', selected.target)
      : orient(state, selected.target, now)
  } else if (world.mess && rand() < 0.5) {
    // Compatibility for callers not yet supplying the reviewed interaction metadata.
    const goals = besideTiles(world.mess.tiles, world.free)
    if (goals.some((g) => key(g) === key(state.tile))) {
      const next = change(state, { kind: 'look', objectId: world.mess.objectId, start: now, until: now + TIMING.lookMs }, now)
      return { ...next, facing: facingFor(state.tile, centre(world.mess.tiles), state.facing) }
    }
    const path = findPath(state.tile, goals, world.free)
    if (path) return startWalk(state, path, now, 'look')
  }
  if (rand() < 0.6) {
    const near = allTiles().filter((t) => world.free(t) && distance(t, state.tile) <= TIMING.wanderRange && key(t) !== key(state.tile))
    if (near.length) {
      const goal = near[Math.min(near.length - 1, Math.floor(rand() * near.length))]
      const path = findPath(state.tile, [goal], world.free)
      if (path) return startWalk(state, path, now, 'idle')
    }
  }
  return change(state, idle(now, rand), now)
}
function targetValid(target: InteractionTarget, world: World): boolean {
  return world.free(target.tile) && !!world.interactions?.some((current) =>
    current.objectId === target.objectId && current.signature === target.signature && key(current.tile) === key(target.tile))
}
function cancel(state: PetState, now: number, rand: () => number, walkAt?: number): PetState {
  // Capture outgoing motion before freezing, so the transition samples the moving pose.
  const next = change(state, idle(now, rand), now, walkAt)
  const frozen = freeze(state, now)
  return { ...next, tile: frozen.tile, position: frozen.position ?? positionAt(state, now), resume: frozen.resume }
}
/** Shared by ordinary walking and suppression, before either can commit elapsed travel. */
function blockedRoute(state: PetState, world: World, now: number): {
  frozen: Pick<PetState, 'tile' | 'position' | 'resume'>
  walkAt: number
} | null {
  const a = state.activity
  if (a.kind !== 'walk') return null
  let origin = a.origin ?? state.tile
  let safeTile = state.tile
  let deadline = a.stepStart
  let segment = a.segment
  for (const tile of a.path) {
    const end = deadline + distance(origin, tile) * TIMING.stepMs
    if (!world.free(tile)) return {
      frozen: {
        tile: safeTile, position: now < end ? positionAt(state, now) : origin,
        resume: segment ?? { from: safeTile, to: tile },
      },
      // Placement and frozen ground contacts must use the same accepted route.
      // Keep the application clock at now for the new blend and lifetime blink.
      walkAt: now < end ? now : deadline,
    }
    if (now < end) break
    origin = tile
    safeTile = tile
    deadline = end
    segment = undefined
  }
  return null
}
function hasFreshTap(state: PetState, now: number): boolean {
  return !!state.pendingTap && state.activity.kind === 'react' && now <= state.activity.until + TIMING.stepMs
}
export function step(state: PetState, world: World, now: number, rand: () => number): PetState {
  const blocked = blockedRoute(state, world, now)
  const suppressed = world.away ? 'sleep' : world.mood === 'sick' ? 'sick' : null
  if (suppressed) {
    if (state.activity.kind === suppressed) return state
    const next = change(state, { kind: suppressed }, now, blocked?.walkAt)
    const frozen = blocked?.frozen ?? freeze(state, now)
    return { ...next, tile: frozen.tile, position: frozen.position, resume: frozen.resume, pendingTap: false, noticeStart: undefined }
  }
  if (blocked) return { ...cancel(state, now, rand, blocked.walkAt), ...blocked.frozen }
  if (state.activity.kind === 'interact' && !targetValid(state.activity.target, world)) return cancel(state, now, rand)
  // Preserve the legacy relocation when furniture lands directly on a stationary grid tile.
  if (!state.position && state.activity.kind !== 'walk' && !world.free(state.tile)) {
    state = { ...state, tile: nearestFree(state.tile, world.free) }
  }
  const a = state.activity
  switch (a.kind) {
    case 'sleep': case 'sick':
      return { ...change(state, idle(now, rand), now), noticeStart: undefined }
    case 'idle':
      return now >= a.until ? decide(state, world, now, rand) : state
    case 'look':
      if (!world.mess || world.mess.objectId !== a.objectId) return cancel(state, now, rand)
      return now >= a.until ? change(state, idle(now, rand), now) : state
    case 'interact': {
      if (!targetValid(a.target, world)) return cancel(state, now, rand)
      if (now < a.until) return state
      // Use deadlines, not tick time, so background gaps settle all elapsed phases.
      const actionEnd = a.phase === 'orient' ? a.until + ACTION_MS[a.target.action] : a.until
      if (a.phase === 'orient' && now < actionEnd) return change(state, {
        ...a, phase: 'action', start: a.until, until: actionEnd,
      }, now)
      const settleEnd = a.phase === 'settle' ? a.until : actionEnd + TIMING.settleMs
      if (now < settleEnd) return change(state, { ...a, phase: 'settle', start: actionEnd, until: settleEnd }, now)
      return change(state, idle(now, rand), now)
    }
    case 'react': {
      if (now < a.until) return state
      // A hidden tab must not replay stale taps on its first visible frame.
      if (hasFreshTap(state, now)) return react({ ...state, pendingTap: false }, now, 'tap')
      const next = { ...state, pendingTap: false }
      return reconnect(next, world, now) ?? change(next, idle(now, rand), now)
    }
    case 'walk': {
      if (a.target && !targetValid(a.target, world)) return cancel(state, now, rand)
      const route = routeAt(state, now)
      const finalFrom = a.path.length > 1 ? a.path[a.path.length - 2] : a.origin ?? state.tile
      const facing = route.path.length
        ? facingFor(route.origin, route.path[0], state.facing)
        : facingFor(finalFrom, route.position, state.facing)
      const groundPath = groundPathFor(state)
      const arrived = { ...state, tile: route.tile, facing, position: undefined,
        activity: { ...a, origin: a.origin ?? state.tile, groundPath } }
      if (route.path.length) {
        const turning = facing !== state.facing
        const activity: Walk = {
          ...a, origin: route.origin, segment: route.segment, path: route.path, stepStart: route.stepStart, distance: route.travelled,
          journeyStart: a.journeyStart ?? a.stepStart,
          groundPath,
          durationMs: a.durationMs ?? a.path.reduce((sum, tile, i) => sum + distance(i ? a.path[i - 1] : a.origin ?? state.tile, tile) * TIMING.stepMs, 0),
          turnStart: turning ? now : a.turnStart !== undefined && now < a.turnStart + ACTION_MS.turn ? a.turnStart : undefined,
        }
        // Sample the outgoing facing before updating it, then blend in screen space.
        return turning ? { ...change(state, activity, now), tile: route.tile, facing, position: undefined }
          : { ...arrived, activity }
      }
      if (a.target) return orient(arrived, a.target, now)
      if (a.then === 'look' && world.mess) return { ...change(arrived, {
        kind: 'look', objectId: world.mess.objectId, start: now, until: now + TIMING.lookMs,
      }, now), facing: facingFor(route.tile, centre(world.mess.tiles), facing) }
      return change(arrived, idle(now, rand), now)
    }
  }
}
export function react(state: PetState, now: number, kind: ReactionKind): PetState {
  // Test against the outgoing deadline before a new completion replaces it.
  const pendingTap = hasFreshTap(state, now)
  if (state.activity.kind === 'sleep' || state.activity.kind === 'sick') {
    if (state.noticeStart !== undefined && now - state.noticeStart < ACTION_MS.notice) return state
    return { ...state, noticeStart: now, pendingTap: false, beat: state.beat + 1 }
  }
  if (state.activity.kind === 'react' && now < state.activity.until) {
    if (kind === 'tap') return state.pendingTap ? state : { ...state, pendingTap: true }
    const priority = (action: MotionAction) => action === 'celebrate-big' ? 2 : action === 'celebrate' ? 1 : 0
    if (priority(kind) <= priority(state.activity.action ?? 'greet')) return state
  }
  const count = (state.reactions ?? 0) + (kind === 'tap' ? 1 : 0)
  const action: ReactionAction = kind === 'tap' ? count % 2 ? 'greet' : 'affection' : kind
  const next = change(state, { kind: 'react', action, start: now, until: now + ACTION_MS[action] }, now)
  const frozen = freeze(state, now)
  return { ...next, tile: frozen.tile, position: frozen.position, resume: frozen.resume, reactions: count, pendingTap: kind === 'tap' ? false : pendingTap, noticeStart: undefined }
}
export function tap(state: PetState, now: number): PetState { return react(state, now, 'tap') }
export function needsRender(prev: PetState, next: PetState): boolean {
  if (prev === next) return false
  const a = prev.activity
  const b = next.activity
  return a.kind !== b.kind || prev.facing !== next.facing || prev.beat !== next.beat
    || (a.kind === 'look' && b.kind === 'look' && a.objectId !== b.objectId)
    || (a.kind === 'interact' && b.kind === 'interact' && (a.phase !== b.phase || a.target.signature !== b.target.signature))
}
export function sortTile(pos: Tile): Tile { return { tx: Math.round(pos.tx), ty: Math.round(pos.ty) } }
/** Static callers retain their old pose; animated callers consume motionFor().frame. */
export function poseFor(state: PetState): PoseName | undefined {
  switch (state.activity.kind) {
    case 'sleep': return 'sleeping'
    case 'react': return 'cheering'
    default: return undefined
  }
}
