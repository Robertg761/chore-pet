import type { Mood, Species } from '../domain/types'
import { ACTION_MS, sampleMotion, type MotionFrame, type MotionInput } from '../character/motion'
import { iso } from '../room/iso'
import { blendProgress, positionAt, routeAt, TIMING, type MotionSnapshot, type PetState } from './behaviour'

/**
 * The base fields remain valid sampler inputs. Render `frame` to include target
 * gaze and interruption blending, which the generic sampler cannot infer.
 * Pass the application clock as `now`; blink phase must survive action restarts.
 */
export interface ActivityMotionInput extends MotionInput { frame: MotionFrame }
type SampleState = Pick<PetState, 'tile' | 'activity' | 'facing' | 'position' | 'noticeStart'>
type NumericField = Exclude<keyof MotionFrame, 'expression'>
const MIRRORED_LIMBS: Partial<Record<NumericField, NumericField>> = {
  leftFoot: 'rightFoot', rightFoot: 'leftFoot', leftArm: 'rightArm', rightArm: 'leftArm',
}
const MIRRORED_ROTATIONS = new Set<NumericField>([
  'bodyX', 'lean', 'gazeX', 'leftArm', 'rightArm', 'leftAppendage', 'rightAppendage',
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
  const a = state.activity
  switch (a.kind) {
    case 'walk': {
      action = 'walk'
      start = a.journeyStart ?? a.stepStart
      const route = routeAt(state, now)
      distance = route.travelled + Math.abs(route.position.tx - route.origin.tx) + Math.abs(route.position.ty - route.origin.ty)
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
  return { species, mood, action, elapsedMs: Math.max(0, now - start), blinkMs: now, distance, durationMs, reducedMotion }
}
function frameFor(state: SampleState, now: number, input: MotionInput): MotionFrame {
  const frame = sampleMotion(input)
  // Older/custom samplers may omit this optional field. Normalize before the
  // generic numeric blend so absent eye openness cannot turn into NaN.
  frame.eyeOpen ??= 1
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
  const position = positionAt({ ...state, beat: 0 }, now)
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
export function motionFor(state: PetState, now: number, species: Species, mood: Mood, reducedMotion: boolean): ActivityMotionInput {
  const input = inputFor(state, now, species, mood, reducedMotion)
  const current = frameFor(state, now, input)
  if (reducedMotion || !state.transition) return { ...input, frame: current }
  const progress = blendProgress(state.transition.start, now)
  if (progress === 1) return { ...input, frame: current }
  const frame = { ...current }
  const fields = Object.keys(current).filter((field) => field !== 'expression') as NumericField[]
  for (const field of fields) frame[field] = (frame[field] ?? (field === 'eyeOpen' ? 1 : 0)) * progress
  for (const layer of state.transition.layers) {
    const previous = snapshotFrame(layer.snapshot, input)
    const weight = layer.weight * (1 - progress)
    for (const field of fields) {
      // A facing change swaps paired screen limbs and reverses local rotations.
      // Mochi's knot and Sprout's stem retain their own central appendage pivots.
      const mirrored = layer.snapshot.facing !== state.facing
      let source = mirrored ? MIRRORED_LIMBS[field] ?? field : field
      if (mirrored && species === 'bun' && (field === 'leftAppendage' || field === 'rightAppendage')) {
        source = field === 'leftAppendage' ? 'rightAppendage' : 'leftAppendage'
      }
      const mirror = mirrored && MIRRORED_ROTATIONS.has(field) ? -1 : 1
      const previousValue = previous[source] ?? (field === 'eyeOpen' ? 1 : 0)
      const value = (frame[field] ?? 0) + previousValue * weight * mirror
      frame[field] = value === 0 ? 0 : value
    }
    // Layers run oldest to newest. At the join, the latest snapshot retains
    // the outgoing categorical expression even when its numeric pose was blended.
    if (progress === 0) frame.expression = previous.expression
  }
  return { ...input, frame }
}
