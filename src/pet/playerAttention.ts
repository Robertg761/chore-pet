import type { Mood, Species } from '../domain/types'
import type { MotionFrame } from '../character/motion'
import { poseNameFor } from '../character/poses'
import { articulatedFaceDelta } from '../character/species/animatedBody'

export interface AttentionPoint { x: number; y: number }
type ScreenMatrix = Pick<DOMMatrix, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'>
export interface AttentionSample {
  from: AttentionPoint
  target: AttentionPoint
  start: number
  value: AttentionPoint
}

const bounded = (value: number, limit: number) => Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value)) : 0

/** Retain screen input in the outer, unmirrored 200-unit character container. */
export function pointerPosition(clientX: number, clientY: number, matrix: ScreenMatrix | null): AttentionPoint | null {
  if (!matrix || ![clientX, clientY, matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].every(Number.isFinite)) return null
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-8) return null
  const dx = clientX - matrix.e, dy = clientY - matrix.f
  const x = (matrix.d * dx - matrix.c * dy) / determinant
  const y = (matrix.a * dy - matrix.b * dx) / determinant
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

/** Aim from the current drawn eyes; one scalar preserves local face direction. */
export function faceAttention(point: AttentionPoint, species: Species, mood: Mood, frame: MotionFrame, facing: 1 | -1): AttentionPoint {
  if (![point.x, point.y].every(Number.isFinite)) return { x: 0, y: 0 }
  const delta = articulatedFaceDelta(species, frame, poseNameFor(mood), { x: 100 + (point.x - 100) * facing, y: point.y })
  // Gentle nearby travel reaches three units at70horizontal units. An
  // elliptical cap keeps both actual eye limits without distorting direction.
  const length = Math.max(70 / 3, Math.hypot(delta.x / 3, delta.y / 2))
  return { x: delta.x / length, y: delta.y / length }
}

/** Absolute-time easing on the room's clock, with continuous retargeting. */
export function sampleAttention(previous: AttentionSample | null, target: AttentionPoint | null, now: number, still = false, retarget = true): AttentionSample {
  const at = Number.isFinite(now) ? now : previous?.start ?? 0
  const next = { x: still ? 0 : bounded(target?.x ?? 0, 3), y: still ? 0 : bounded(target?.y ?? 0, 2) }
  const zero = { x: 0, y: 0 }
  if (still || !previous) return { from: zero, target: next, start: at, value: zero }
  const progress = Math.max(0, Math.min(1, (at - previous.start) / 120))
  const eased = progress * progress * (3 - 2 * progress)
  if (!retarget) {
    // The same input point follows breathing geometry without restarting its
    // deadline. A new pointer/focus source still retargets continuously below.
    return { ...previous, target: next, value: {
      x: previous.from.x + (next.x - previous.from.x) * eased,
      y: previous.from.y + (next.y - previous.from.y) * eased,
    } }
  }
  const value = {
    x: previous.from.x + (previous.target.x - previous.from.x) * eased,
    y: previous.from.y + (previous.target.y - previous.from.y) * eased,
  }
  return next.x === previous.target.x && next.y === previous.target.y
    ? { ...previous, value }
    : { from: value, target: next, start: at, value }
}
