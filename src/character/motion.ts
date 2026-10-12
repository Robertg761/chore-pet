import type { Mood, Species } from '../domain/types'

export type MotionAction =
  | 'idle' | 'walk' | 'turn' | 'greet' | 'affection' | 'celebrate' | 'celebrate-big'
  | 'notice' | 'inspect' | 'wave' | 'reach' | 'rest' | 'dust' | 'smell' | 'concern'

export interface MotionInput {
  species: Species
  mood: Mood
  action: MotionAction
  elapsedMs: number
  /** Accumulated route distance in tiles, continuous across intermediate tiles. */
  distance: number
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
  leftArm: number
  rightArm: number
  leftAppendage: number
  rightAppendage: number
  /** Gaze offsets in SVG units. */
  gazeX: number
  gazeY: number
  /** Multipliers on the renderer's ground shadow size and base opacity. */
  shadowScale: number
  shadowOpacity: number
  accentOpacity: number
  expression: 'mood' | 'pleased' | 'alert'
}

export const ACTION_MS: Record<MotionAction, number> = {
  idle: 4000, walk: 900, turn: 360, greet: 1200, affection: 1600,
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

function neutral(): MotionFrame {
  return {
    bodyX: 0, bodyY: 0, scaleX: 1, scaleY: 1, lean: 0,
    leftFoot: 0, rightFoot: 0, leftArm: 0, rightArm: 0,
    leftAppendage: 0, rightAppendage: 0, gazeX: 0, gazeY: 0,
    shadowScale: 1, shadowOpacity: 1, accentOpacity: 0, expression: 'mood',
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
  if (mood === 'sick') return 'mood'
  switch (action) {
    case 'greet': case 'affection': case 'celebrate': case 'celebrate-big': case 'wave':
      return 'pleased'
    case 'notice': case 'inspect': case 'reach': case 'dust': case 'smell': case 'concern':
      return 'alert'
    default:
      return 'mood'
  }
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
  if (reducedMotion) return frame

  const personality = PERSONALITY[species]
  const energy = mood === 'sick' ? 0.22 : mood === 'scruffy' ? 0.65 : mood === 'meh' ? 0.8 : mood === 'content' ? 0.9 : 1
  const amplitude = personality.amplitude * energy
  const safeElapsed = Number.isFinite(elapsed) ? elapsed : 0
  if (action === 'idle') {
    const breath = (1 - Math.cos((safeElapsed % ACTION_MS.idle) / ACTION_MS.idle * Math.PI * 2)) / 2
    frame.scaleX -= 0.004 * breath * amplitude
    frame.scaleY += 0.007 * breath * amplitude
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
        frame.rightArm = -(42 + 12 * Math.sin((t - 0.35) * Math.PI * 8)) * gesture
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
        frame.rightArm = -(30 + 10 * Math.sin((t - 0.35) * Math.PI * 10)) * gesture
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
      case 'dust':
        frame.lean = -7 * gesture
        frame.rightArm = -(20 + 9 * Math.sin(t * Math.PI * 10)) * gesture
        frame.gazeX = 2 * attention
        frame.gazeY = 1.5 * attention
        break
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
    frame.lean *= amplitude
    frame.leftArm *= amplitude
    frame.rightArm *= amplitude
    frame.gazeX *= energy
    frame.gazeY *= energy
    frame.scaleX += compression * personality.squash * energy - extension * amplitude
    frame.scaleY += extension * amplitude - compression * personality.squash * energy
    // A delayed settling envelope stays active after the main gesture lowers.
    const follow = envelope(t, 0.1, 0.42, 0.8, 1)
    const sway = Math.sin(t * Math.PI * 4 - personality.lag) * follow * personality.follow * energy
    frame.leftAppendage = sway
    frame.rightAppendage = sway * (species === 'sprout' ? -0.75 : 0.8)
  }

  // Ground shadow follows height only; compression never translates the shadow.
  const height = -frame.bodyY / 24
  frame.shadowScale = 1 - 0.25 * height
  frame.shadowOpacity = 1 - 0.35 * height
  return frame
}
