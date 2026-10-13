import type { Mood, Species } from '../domain/types'

export type MotionAction =
  | 'idle' | 'walk' | 'turn' | 'greet' | 'affection' | 'stretch' | 'celebrate' | 'celebrate-big'
  | 'notice' | 'inspect' | 'wave' | 'reach' | 'rest' | 'dust' | 'smell' | 'concern'

/** Projected route point in unmirrored character SVG units, including past corners. */
export interface GroundPoint { distance: number; x: number; y: number }

export interface MotionInput {
  species: Species
  mood: Mood
  action: MotionAction
  elapsedMs: number
  /** Monotonic pet lifetime for blinks across action changes. Defaults to elapsedMs. */
  blinkMs?: number
  /** Accumulated route distance in tiles, continuous across intermediate tiles. */
  distance: number
  groundPath?: readonly GroundPoint[]
  facing?: 1 | -1
  /** Whole action/journey duration. Invalid durations use ACTION_MS; zero ends finite actions. */
  durationMs: number
  reducedMotion: boolean
}

export interface MotionFrame {
  /** SVG translation offsets. Apply scale and lean about the ground pivot (100,181). */
  bodyX: number
  bodyY: number
  scaleX: number
  scaleY: number
  /** Body, arm, and appendage rotations are in degrees. */
  lean: number
  /** Nonnegative foot lifts in SVG units; zero means ground contact. */
  leftFoot: number
  rightFoot: number
  /** Ground-space foot offsets after torso cancellation; omitted values mean zero. */
  leftGroundX?: number
  leftGroundY?: number
  rightGroundX?: number
  rightGroundY?: number
  leftArm: number
  rightArm: number
  leftAppendage: number
  rightAppendage: number
  /** Gaze offsets in SVG units. */
  gazeX: number
  gazeY: number
  /** Open-eye height multiplier. Omitted frames remain fully open. */
  eyeOpen?: number
  /** Multipliers on the renderer's ground shadow size and base opacity. */
  shadowScale: number
  shadowOpacity: number
  accentOpacity: number
  expression: 'mood' | 'pleased' | 'alert'
  /** Optional numeric smile blend; omitted legacy frames use expression directly. */
  pleasedWeight?: number
}

export const ACTION_MS: Record<MotionAction, number> = {
  idle: 4000, walk: 900, turn: 360, greet: 1200, affection: 1600, stretch: 2400,
  celebrate: 1800, 'celebrate-big': 2200, notice: 600, inspect: 1800,
  wave: 1400, reach: 1600, rest: 2400, dust: 1400, smell: 1600, concern: 1800,
}

// Bun is springy; Mochi compresses softly; Sprout takes smaller curious steps.
// Follow-through has its own amplitude and phase delay, rather than copying the torso.
const PERSONALITY: Record<Species, { amplitude: number; squash: number; stride: number; follow: number; lag: number }> = {
  mochi: { amplitude: 0.82, squash: 1, stride: 0.9, follow: 5, lag: 0.65 },
  bun: { amplitude: 1, squash: 0.85, stride: 0.72, follow: 12, lag: 0.9 },
  sprout: { amplitude: 0.72, squash: 0.65, stride: 0.82, follow: 9, lag: 1.1 },
}

// Pats settle with a smaller, slower sway than energetic finite gestures.
const AFFECTION_FOLLOW: Record<Species, number> = { mochi: 0.45, bun: 0.55, sprout: 0.5 }
// Environmental rest settles the same appendages with an even quieter sway.
const REST_FOLLOW: Record<Species, number> = { mochi: 0.25, bun: 0.3, sprout: 0.25 }
// A brief sniff recoils, then settles with smaller damped appendage movement.
const SMELL_FOLLOW: Record<Species, number> = { mochi: 0.45, bun: 0.5, sprout: 0.4 }
// An upright acknowledgment makes one quiet deflection; resting art stays static.
const NOTICE_FOLLOW: Record<Species, number> = { mochi: 0.15, bun: 0.20, sprout: 0.15 }
// A short furniture turn makes one small settling deflection.
const TURN_FOLLOW: Record<Species, number> = { mochi: 0.10, bun: 0.12, sprout: 0.10 }
// Inspection follows one calm sway without changing its pointing gesture.
const INSPECT_FOLLOW: Record<Species, number> = { mochi: 0.35, bun: 0.4, sprout: 0.35 }
// Concern settles in one smaller sway while the resident studies wilting leaves.
const CONCERN_FOLLOW: Record<Species, number> = { mochi: 0.35, bun: 0.4, sprout: 0.35 }

const STRETCH: Record<Species, { arms: number; extension: number; follow: number }> = {
  mochi: { arms: 46, extension: 0.022, follow: 0.2 },
  bun: { arms: 58, extension: 0.032, follow: 0.25 },
  sprout: { arms: 40, extension: 0.026, follow: 0.2 },
}

// The shared gesture envelope raises/lowers the hand. These held sweeps give
// Mochi a slower wave and Sprout a smaller one, retaining Bun's lively timing.
const HAND_WAVE: Record<'greet' | 'wave', Record<Species, { lift: number; arc: number; cycles: number }>> = {
  greet: {
    mochi: { lift: 42, arc: 10, cycles: 3 },
    bun: { lift: 42, arc: 12, cycles: 4 },
    sprout: { lift: 34, arc: 8, cycles: 2 },
  },
  wave: {
    mochi: { lift: 30, arc: 8, cycles: 4 },
    bun: { lift: 30, arc: 10, cycles: 5 },
    sprout: { lift: 26, arc: 6, cycles: 3 },
  },
}

// Smaller, slower dust hand sweeps retain Bun's livelier response.
const DUST_HAND: Record<Species, { arc: number; cycles: number }> = {
  mochi: { arc: 6, cycles: 2 },
  bun: { arc: 7, cycles: 3 },
  sprout: { arc: 5, cycles: 2 },
}

function waveArm(species: Species, action: 'greet' | 'wave', phase: number): number {
  const { lift, arc, cycles } = HAND_WAVE[action][species]
  return -(lift + arc * Math.sin((phase - 0.35) * Math.PI * (cycles * 2)))
}

function neutral(): MotionFrame {
  return {
    bodyX: 0, bodyY: 0, scaleX: 1, scaleY: 1, lean: 0,
    leftFoot: 0, rightFoot: 0, leftGroundX: 0, leftGroundY: 0, rightGroundX: 0, rightGroundY: 0, leftArm: 0, rightArm: 0,
    leftAppendage: 0, rightAppendage: 0, gazeX: 0, gazeY: 0, eyeOpen: 1,
    shadowScale: 1, shadowOpacity: 1, accentOpacity: 0, expression: 'mood', pleasedWeight: 0,
  }
}

/** Cubic smoothstep has zero velocity at both ends, including clamped joins. */
function ease(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function envelope(t: number, start: number, rise: number, hold: number, end: number): number {
  return ease((t - start) / (rise - start)) * (1 - ease((t - hold) / (end - hold)))
}

function expressionFor(action: MotionAction, mood: Mood): MotionFrame['expression'] {
  // The resting face keeps its sick art; alert only lets notice gaze reach it.
  if (mood === 'sick') return action === 'notice' ? 'alert' : 'mood'
  switch (action) {
    case 'greet': case 'affection': case 'stretch': case 'celebrate': case 'celebrate-big': case 'wave':
      return 'pleased'
    case 'notice': case 'inspect': case 'reach': case 'dust': case 'smell': case 'concern':
      return 'alert'
    default:
      return 'mood'
  }
}

/** A fixed world landing in stance, then a smooth transfer to the next landing. */
function plantFeet(frame: MotionFrame, input: MotionInput, distance: number, stride: number, strength: number) {
  const path = input.groundPath
  if (!path?.length || !path.every((p, i) => Number.isFinite(p.distance) && Number.isFinite(p.x) && Number.isFinite(p.y) && (i === 0 || p.distance > path[i - 1].distance))) return
  const at = (d: number) => {
    if (d <= path[0].distance) return path[0]
    for (let i = 1; i < path.length; i++) if (d <= path[i].distance) {
      const a = path[i - 1], b = path[i], t = (d - a.distance) / (b.distance - a.distance)
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    return path[path.length - 1]
  }
  const position = at(distance)
  const end = path[path.length - 1].distance
  const landing = (side: 'left' | 'right') => {
    if (distance >= end) return { ...at(end), lift: 0 }
    const phase = side === 'left' ? 0.25 : 0.75
    const first = distance < stride * phase
    const last = first ? 0 : (Math.floor((distance - stride * phase) / stride) + phase) * stride
    const next = Math.min(end, first ? stride * phase : last + stride)
    // Center steady stance around its landing rather than trailing by half a
    // stride. The initial rear foot releases earlier to leave uphill clearance.
    const lead = stride / 4
    // Shorten the final step itself. Never fade a planted foot's offset to zero.
    const release = first ? side === 'left' ? 0 : Math.min(lead, next / 2) : last + (next - last) / 2
    const t = next > release ? Math.max(0, Math.min(1, (distance - release) / (next - release))) : 1
    const a = at(first ? 0 : Math.min(end, last + lead))
    const b = at(Math.min(end, next + lead)), progress = ease(t)
    return { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress, lift: 6 * strength * Math.sin(t * Math.PI) ** 2 }
  }
  const left = landing('left'), right = landing('right')
  frame.leftFoot = left.lift
  frame.rightFoot = right.lift
  const facing = input.facing === -1 ? -1 : 1
  const offset = (value: number) => Number.isFinite(value) ? Math.max(-48, Math.min(48, value)) : 0
  frame.leftGroundX = offset((left.x - position.x) * facing - frame.bodyX)
  frame.leftGroundY = offset(left.y - position.y)
  frame.rightGroundX = offset((right.x - position.x) * facing - frame.bodyX)
  frame.rightGroundY = offset(right.y - position.y)
}

type GroundFeet = Pick<MotionFrame, 'leftFoot' | 'rightFoot' | 'leftGroundX' | 'leftGroundY' | 'rightGroundX' | 'rightGroundY'>

/** Blend already mirrored/rebased ground contacts; lift any contact being replanted. */
export function blendGroundFeet(from: MotionFrame, to: MotionFrame, progress: number): GroundFeet {
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
  const result: GroundFeet = { leftFoot: 0, rightFoot: 0 }
  for (const side of ['left', 'right'] as const) {
    const x = `${side}GroundX` as const, y = `${side}GroundY` as const, lift = `${side}Foot` as const
    const ax = from[x] ?? 0, ay = from[y] ?? 0, bx = to[x] ?? 0, by = to[y] ?? 0
    result[x] = t === 0 ? ax : t === 1 ? bx : ax + (bx - ax) * t
    result[y] = t === 0 ? ay : t === 1 ? by : ay + (by - ay) * t
    const moving = Math.hypot(from.bodyX + ax - to.bodyX - bx, ay - by) > 0.000001
    const release = moving && t > 0 && t < 1 ? 6 * Math.sin(t * Math.PI) ** 2 : 0
    result[lift] = t === 0 ? from[lift] : t === 1 ? to[lift] : Math.min(24, from[lift] + (to[lift] - from[lift]) * t + release)
  }
  return result
}

/** Pure sampling: no clock, randomness, renderer state, or mutable shared frame. */
export function sampleMotion(input: MotionInput): MotionFrame {
  const { species, mood, action, reducedMotion } = input
  const frame = neutral()
  const duration = Number.isFinite(input.durationMs) ? Math.max(0, input.durationMs) : ACTION_MS[action]
  // Positive infinity completes a finite action; other invalid times safely mean its start.
  const elapsed = input.elapsedMs === Infinity ? Infinity : Number.isFinite(input.elapsedMs) ? Math.max(0, input.elapsedMs) : 0
  const looping = action === 'idle' || action === 'walk'
  if (!looping && (duration === 0 || elapsed === 0 || elapsed >= duration)) return frame

  frame.expression = expressionFor(action, mood)
  frame.pleasedWeight = frame.expression === 'pleased'
    ? reducedMotion ? 1 : envelope(elapsed / duration, 0, 0.18, 0.82, 1)
    : 0
  if (reducedMotion) return frame

  const personality = PERSONALITY[species]
  const energy = mood === 'sick' ? 0.22 : mood === 'scruffy' ? 0.65 : mood === 'meh' ? 0.8 : mood === 'content' ? 0.9 : 1
  const amplitude = personality.amplitude * energy
  const safeElapsed = Number.isFinite(elapsed) ? elapsed : 0
  const blinkMs = input.blinkMs ?? safeElapsed
  const blinkOffset = { bun: 0, mochi: 1700, sprout: 3300 }[species]
  const lifetimePhase = ((Number.isFinite(blinkMs) ? Math.max(0, blinkMs) : 0) % 12000 + blinkOffset) % 12000
  const blinkPhase = lifetimePhase % 6000
  // Preserve primary timing; every other blink has a second 140ms blink after
  // a fully open 60ms gap. Both use the same lifetime clock and smooth joins.
  // Finite actions ease to neutral at their endpoints, even during a lifetime blink.
  const blinkStrength = looping ? 1 : envelope(elapsed / duration, 0, 0.1, 0.9, 1)
  const blink = Math.max(envelope(blinkPhase, 3000, 3050, 3090, 3140), envelope(lifetimePhase, 9200, 9250, 9290, 9340))
  frame.eyeOpen = 1 - 0.9 * blink * blinkStrength
  // Walking settles its geometry, but retains the lifetime blink for arrival
  // snapshots and shared travel. Finite gestures keep their neutral guard above.
  if (action === 'walk' && (duration === 0 || elapsed === 0 || elapsed >= duration)) return frame
  if (action === 'idle') {
    const phase = (safeElapsed % ACTION_MS.idle) / ACTION_MS.idle * Math.PI * 2
    const breath = (1 - Math.cos(phase)) / 2
    frame.scaleX -= 0.004 * breath * amplitude
    frame.scaleY += 0.007 * breath * amplitude
    // Follow the breath with a delayed, small movement. The breath envelope
    // gives appendages neutral position and zero velocity at the loop seam.
    const follow = breath === 0 ? 0 : Math.sin(phase - personality.lag) * breath * personality.follow * 0.18 * energy
    frame.leftAppendage = follow
    frame.rightAppendage = follow * 0.8
    return frame
  }

  if (action === 'walk') {
    const distance = Number.isFinite(input.distance) ? Math.max(0, input.distance) : 0
    // Reduce before multiplying so even extremely large finite distances cannot overflow.
    const phase = (distance % personality.stride) / personality.stride * Math.PI * 2
    const step = Math.sin(phase)
    const departure = ease(safeElapsed / 120)
    const arrival = duration > 0 ? ease((duration - safeElapsed) / 180) : 0
    const strength = departure * arrival * amplitude
    frame.leftFoot = Math.max(0, step) ** 2 * 6 * strength
    frame.rightFoot = Math.max(0, -step) ** 2 * 6 * strength
    frame.bodyY = -(step ** 2) * 3.5 * strength
    frame.bodyX = step * 1.2 * strength
    frame.lean = step * 2.5 * strength
    frame.scaleX += step ** 2 * 0.018 * strength * personality.squash
    frame.scaleY -= step ** 2 * 0.018 * strength * personality.squash
    frame.leftArm = -step * 10 * strength
    frame.rightArm = step * 10 * strength
    const follow = Math.sin(phase - personality.lag) * personality.follow * strength
    frame.leftAppendage = follow
    frame.rightAppendage = follow * 0.8
    plantFeet(frame, input, distance, personality.stride, strength)
  } else {
    const t = elapsed / duration
    const anticipation = envelope(t, 0, 0.1, 0.18, 0.3)
    const gesture = envelope(t, 0.18, 0.35, 0.64, 0.92)
    const recovery = envelope(t, 0.62, 0.76, 0.84, 1)
    const attention = envelope(t, 0, 0.22, 0.68, 1)
    let compression = anticipation * 0.025
    let extension = 0

    switch (action) {
      case 'turn':
        compression = attention * 0.045
        frame.lean = -6 * gesture
        frame.gazeX = 3 * attention
        break
      case 'greet':
        frame.lean = -3 * gesture
        frame.rightArm = waveArm(species, action, t) * gesture
        frame.leftArm = 5 * gesture
        frame.gazeY = -2 * attention
        break
      case 'affection':
        compression += 0.055 * gesture
        frame.lean = 7 * gesture
        frame.leftArm = -12 * gesture
        frame.rightArm = -18 * gesture
        frame.gazeY = -1.5 * attention
        frame.accentOpacity = mood === 'sick' ? 0 : gesture
        break
      case 'stretch': {
        const held = envelope(t, 0, 0.28, 0.7, 1)
        compression = anticipation * 0.012
        extension = STRETCH[species].extension * held
        frame.leftArm = STRETCH[species].arms * held
        frame.rightArm = -frame.leftArm
        frame.gazeY = -1.2 * attention
        break
      }
      case 'celebrate': case 'celebrate-big': {
        const big = action === 'celebrate-big'
        const lift = envelope(t, 0.18, 0.42, 0.42, 0.68)
        frame.bodyY = -(big ? 24 : 17) * lift
        compression = (big ? 0.095 : 0.075) * (anticipation + recovery)
        extension = 0.055 * lift
        frame.leftArm = (big ? 58 : 44) * gesture
        frame.rightArm = -(big ? 58 : 44) * gesture
        frame.gazeY = -3 * attention
        frame.accentOpacity = mood === 'sick' ? 0 : gesture
        break
      }
      case 'notice':
        frame.lean = 2 * gesture
        frame.gazeX = 2.5 * attention
        frame.gazeY = -2 * attention
        frame.rightArm = -5 * gesture
        break
      case 'inspect':
        frame.lean = 8 * gesture
        frame.gazeX = 4 * attention
        frame.gazeY = 2 * gesture
        frame.rightArm = -12 * gesture
        break
      case 'wave':
        frame.lean = 4 * gesture
        frame.rightArm = waveArm(species, action, t) * gesture
        frame.gazeX = 4 * attention
        break
      case 'reach':
        frame.lean = 10 * gesture
        frame.rightArm = -38 * gesture
        frame.leftArm = 8 * gesture
        frame.gazeX = 4 * attention
        frame.gazeY = 1.5 * gesture
        break
      case 'rest':
        compression = 0.045 * attention
        frame.lean = -4 * gesture
        frame.leftArm = -14 * gesture
        frame.rightArm = 14 * gesture
        frame.gazeY = 2 * attention
        break
      case 'dust': {
        const { arc, cycles } = DUST_HAND[species]
        frame.lean = -7 * gesture
        frame.rightArm = -(20 + arc * Math.sin((t - 0.35) * Math.PI * 2 * cycles)) * gesture
        frame.gazeX = 2 * attention
        frame.gazeY = 1.5 * attention
        break
      }
      case 'smell':
        frame.lean = -10 * gesture
        frame.bodyX = -2 * gesture
        frame.rightArm = -16 * gesture
        frame.gazeX = 3 * attention
        frame.gazeY = -1 * gesture
        break
      case 'concern':
        frame.lean = 6 * gesture
        frame.rightArm = -9 * gesture
        frame.leftArm = -5 * gesture
        frame.gazeX = 3 * attention
        frame.gazeY = 3 * gesture
        break
    }

    frame.bodyX *= amplitude
    frame.bodyY *= amplitude
    // Recoil moves the torso while both ground contacts stay fixed.
    if (action === 'smell' && mood !== 'sick') frame.leftGroundX = frame.rightGroundX = -frame.bodyX
    frame.lean *= amplitude
    frame.leftArm *= amplitude
    frame.rightArm *= amplitude
    frame.gazeX *= energy
    frame.gazeY *= energy
    frame.scaleX += compression * personality.squash * energy - extension * amplitude
    frame.scaleY += extension * amplitude - compression * personality.squash * energy
    // A delayed settling envelope stays active after the main gesture lowers.
    const follow = action === 'stretch' ? envelope(t, 0.14, 0.45, 0.76, 1) : envelope(t, 0.1, 0.42, 0.8, 1)
    // Advance the calm sway so inherited lag cannot add a tiny initial
    // counter-movement after the follow envelope first becomes visible.
    const calmConcern = action === 'concern' && mood !== 'sick'
    const calmInspect = action === 'inspect' && mood !== 'sick'
    const followStrength = action === 'stretch' ? STRETCH[species].follow
      : action === 'rest' ? REST_FOLLOW[species]
      : calmInspect ? INSPECT_FOLLOW[species]
      : calmConcern ? CONCERN_FOLLOW[species] : AFFECTION_FOLLOW[species]
    const sway = action === 'notice' && mood !== 'sick'
      ? Math.sin(t * Math.PI) * follow * personality.follow * NOTICE_FOLLOW[species] * energy
      : action === 'turn' && mood !== 'sick'
      ? Math.sin(t * Math.PI) * follow * personality.follow * TURN_FOLLOW[species] * energy
      : action === 'smell' && mood !== 'sick'
      ? Math.sin(t * Math.PI * 3 - personality.lag + 0.5) * follow * personality.follow * SMELL_FOLLOW[species] * (1 - 0.55 * ease(t)) * energy
      : action === 'affection' || action === 'stretch' || action === 'rest' || calmConcern || calmInspect
      ? Math.sin(t * Math.PI * 2 - personality.lag + 0.5) * follow * personality.follow * followStrength * energy
      : Math.sin(t * Math.PI * 4 - personality.lag) * follow * personality.follow * energy
    frame.leftAppendage = sway
    frame.rightAppendage = sway * (species === 'sprout' ? -0.75 : 0.8)
  }

  // Ground shadow follows height only; compression never translates the shadow.
  const height = -frame.bodyY / 24
  frame.shadowScale = 1 - 0.25 * height
  frame.shadowOpacity = 1 - 0.35 * height
  return frame
}
