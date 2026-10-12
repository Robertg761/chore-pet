import type { Mood, Species } from '../domain/types'
import { ACTION_MS, blendGroundFeet, sampleMotion, type MotionFrame, type MotionInput } from '../character/motion'
import { poseFor, poseNameFor } from '../character/poses'
import { iso } from '../room/iso'
import { PET_SCALE, roomPoint } from '../room/shell/geometry'
import { blendProgress, groundPathFor, positionAt, routeAt, TIMING, type MotionSnapshot, type PetState } from './behaviour'

/**
 * The base fields remain valid sampler inputs. Render `frame` to include target
 * gaze and interruption blending, which the generic sampler cannot infer.
 * Pass the application clock as `now`; blink phase must survive action restarts.
 * Walk ground paths use accumulated tiles and room projection / PET_SCALE;
 * facing is separate, because the sampler applies the outer SVG mirror.
 */
export interface ActivityMotionInput extends MotionInput { frame: MotionFrame }
type SampleState = Pick<PetState, 'tile' | 'activity' | 'facing' | 'position' | 'noticeStart'> & Pick<MotionSnapshot, 'walkAt' | 'groundPosition'>
type NumericField = Exclude<keyof MotionFrame, 'expression'>
const MIRRORED_LIMBS: Partial<Record<NumericField, NumericField>> = {
  leftFoot: 'rightFoot', rightFoot: 'leftFoot', leftArm: 'rightArm', rightArm: 'leftArm',
  leftGroundX: 'rightGroundX', rightGroundX: 'leftGroundX',
  leftGroundY: 'rightGroundY', rightGroundY: 'leftGroundY',
}
const MIRRORED_ROTATIONS = new Set<NumericField>([
  'bodyX', 'lean', 'gazeX', 'leftArm', 'rightArm', 'leftAppendage', 'rightAppendage',
  'leftGroundX', 'rightGroundX',
])
const ease = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}
function inputFor(state: SampleState, now: number, species: Species, mood: Mood, reducedMotion: boolean): MotionInput {
  let action: MotionInput['action'] = 'idle'
  let start = now
  let durationMs = ACTION_MS.idle
  let distance = 0
  let groundPath = groundPathFor(state)
  const a = state.activity
  switch (a.kind) {
    case 'walk': {
      action = 'walk'
      start = a.journeyStart ?? a.stepStart
      const route = routeAt(state, state.walkAt ?? now)
      distance = route.travelled + Math.abs(route.position.tx - route.origin.tx) + Math.abs(route.position.ty - route.origin.ty)
      if (state.walkAt !== undefined && groundPath) {
        // Retain full snapshot history, but never plan a landing past the
        // validated collision endpoint, including an anticipated stance lead.
        const point = roomPoint(route.position.tx + 0.5, route.position.ty + 0.5)
        groundPath = [...groundPath.filter((p) => p.distance < distance),
          { distance, x: point.x / PET_SCALE, y: point.y / PET_SCALE }]
      }
      let previous = a.origin ?? state.tile
      durationMs = a.durationMs ?? a.path.reduce((total, tile) => {
        const length = Math.abs(tile.tx - previous.tx) + Math.abs(tile.ty - previous.ty)
        previous = tile
        return total + length * TIMING.stepMs
      }, 0)
      break
    }
    case 'react':
      action = a.action ?? 'greet'
      start = a.start ?? a.until - TIMING.reactMs
      durationMs = a.until - start
      break
    case 'interact':
      action = a.phase === 'orient' ? 'turn' : a.phase === 'action' ? a.target.action : 'idle'
      start = a.phase === 'settle' ? now : a.start
      durationMs = a.until - a.start
      break
    case 'look':
      action = 'inspect'
      start = a.start ?? a.until - TIMING.lookMs
      durationMs = a.until - start
      break
    case 'idle': start = a.start ?? now; break
    case 'sick': case 'sleep':
      if (state.noticeStart !== undefined && now < state.noticeStart + ACTION_MS.notice) {
        action = 'notice'; start = state.noticeStart; durationMs = ACTION_MS.notice
      }
      break
  }
  return { species, mood, action, elapsedMs: Math.max(0, now - start), blinkMs: now, distance, durationMs, reducedMotion,
    groundPath, facing: state.facing }
}
function frameFor(state: SampleState, now: number, input: MotionInput): MotionFrame {
  const frame = sampleMotion(input)
  // Older/custom samplers may omit this optional field. Normalize before the
  // generic numeric blend so absent eye openness cannot turn into NaN.
  frame.eyeOpen ??= 1
  frame.leftGroundX ??= 0
  frame.leftGroundY ??= 0
  frame.rightGroundX ??= 0
  frame.rightGroundY ??= 0
  if (state.groundPosition) {
    // Rejected landings have no valid world contact to preserve. Anchor their
    // replacement at the accepted container, retaining the sampled foot lift.
    frame.leftGroundX = frame.rightGroundX = -frame.bodyX
    frame.leftGroundY = frame.rightGroundY = 0
  }
  const a = state.activity
  if (!input.reducedMotion && a.kind === 'walk' && a.turnStart !== undefined) {
    const turn = sampleMotion({ ...input, action: 'turn', elapsedMs: now - a.turnStart, durationMs: ACTION_MS.turn })
    frame.scaleX += turn.scaleX - 1
    frame.scaleY += turn.scaleY - 1
    frame.lean += turn.lean
    frame.gazeX += turn.gazeX
  }
  if (input.reducedMotion || a.kind !== 'interact' || a.phase === 'settle') return frame
  const t = input.durationMs > 0 ? input.elapsedMs / input.durationMs : 1
  const attention = ease(t / 0.22) * (1 - ease((t - 0.68) / 0.32))
  // Gaze targets already include art height. Project before taking direction;
  // footprint centres incorrectly make elevated leaves and wall art look down.
  const position = positionAt({ ...state, beat: 0 }, state.walkAt ?? now)
  // Room pet placement adds half a tile on both axes; target gaze is already
  // an absolute projected point and must not receive that standing offset.
  const delta = iso(a.target.gaze.tx - position.tx - 0.5, a.target.gaze.ty - position.ty - 0.5)
  const length = Math.max(1, Math.hypot(delta.x, delta.y))
  frame.gazeX = delta.x / length * 4 * attention * state.facing
  frame.gazeY = delta.y / length * 3 * attention
  return frame
}
function snapshotFrame(snapshot: MotionSnapshot, input: MotionInput): MotionFrame {
  const oldInput = inputFor(snapshot, snapshot.at, input.species, input.mood, input.reducedMotion)
  return frameFor(snapshot, snapshot.at, oldInput)
}
type MotionLayers = NonNullable<PetState['transition']>['layers']
function outgoingFrame(layers: readonly MotionLayers[number][], state: SampleState, now: number, input: MotionInput, current: MotionFrame): MotionFrame {
  const frame = { ...current }
  const fields = Object.keys(current).filter((field) => field !== 'expression') as NumericField[]
  for (const field of fields) frame[field] = 0
  const position = state.groundPosition ?? positionAt({ ...state, beat: 0 }, state.walkAt ?? now)
  const point = roomPoint(position.tx + 0.5, position.ty + 0.5)
  const postureLean = input.mood === 'sick' ? 0 : poseFor(input.species, poseNameFor(input.mood)).anchors.body.rotate ?? 0
  for (const layer of layers) {
    const previous = snapshotFrame(layer.snapshot, input)
    const oldPosition = layer.snapshot.groundPosition ?? positionAt({ ...layer.snapshot, beat: 0 }, layer.snapshot.walkAt ?? layer.snapshot.at)
    const oldPoint = roomPoint(oldPosition.tx + 0.5, oldPosition.ty + 0.5)
    const dx = (oldPoint.x - point.x) / PET_SCALE * state.facing
    const dy = (oldPoint.y - point.y) / PET_SCALE
    const mirrored = layer.snapshot.facing !== state.facing
    for (const field of fields) {
      // Rebase contacts into the currently moving container after screen mirroring.
      let source = mirrored ? MIRRORED_LIMBS[field] ?? field : field
      if (mirrored && input.species === 'bun' && (field === 'leftAppendage' || field === 'rightAppendage')) {
        source = field === 'leftAppendage' ? 'rightAppendage' : 'leftAppendage'
      }
      const mirror = mirrored && MIRRORED_ROTATIONS.has(field) ? -1 : 1
      let value = (previous[source] ?? (field === 'eyeOpen' ? 1 : 0)) * mirror
      // The renderer adds mood posture after sampling. Reflect the full torso
      // angle so that adding the same posture again preserves its screen tilt.
      if (mirrored && field === 'lean') value -= 2 * postureLean
      if (field === 'leftGroundX' || field === 'rightGroundX') value += dx
      if (field === 'leftGroundY' || field === 'rightGroundY') value += dy
      frame[field] = (frame[field] ?? 0) + value * layer.weight
    }
    frame.expression = previous.expression
  }
  return frame
}
export function motionFor(state: PetState, now: number, species: Species, mood: Mood, reducedMotion: boolean): ActivityMotionInput {
  const input = inputFor(state, now, species, mood, reducedMotion)
  const current = frameFor(state, now, input)
  if (reducedMotion || !state.transition) return { ...input, frame: current }
  const progress = blendProgress(state.transition.start, now)
  if (progress === 1) return { ...input, frame: current }
  const frame = { ...current }
  const fields = Object.keys(current).filter((field) => field !== 'expression') as NumericField[]
  const previous = outgoingFrame(state.transition.layers, state, now, input, current)
  // Shared contact blending adds a lift when a foot is replanted. Preserve that
  // nonlinear part across another interruption without retaining state trees.
  for (const release of state.transition.groundReleases ?? []) {
    const to = snapshotFrame(release.to, input)
    const from = outgoingFrame(release.from, release.to, release.to.at, input, to)
    const lift = blendGroundFeet({ ...from, leftFoot: 0, rightFoot: 0 }, { ...to, leftFoot: 0, rightFoot: 0 }, release.progress)
    const mirrored = release.to.facing !== state.facing
    previous.leftFoot += (mirrored ? lift.rightFoot : lift.leftFoot) * release.weight
    previous.rightFoot += (mirrored ? lift.leftFoot : lift.rightFoot) * release.weight
  }
  for (const field of fields) {
    const fallback = field === 'eyeOpen' ? 1 : 0
    const value = (current[field] ?? fallback) * progress + (previous[field] ?? fallback) * (1 - progress)
    frame[field] = value === 0 ? 0 : value
  }
  Object.assign(frame, blendGroundFeet(previous, current, progress))
  for (const field of fields) if (frame[field] === 0) frame[field] = 0
  if (progress === 0) frame.expression = previous.expression
  return { ...input, frame }
}
