export interface AttentionPoint { x: number; y: number }
type ScreenMatrix = Pick<DOMMatrix, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'>
export interface AttentionSample {
  from: AttentionPoint
  target: AttentionPoint
  start: number
  value: AttentionPoint
}

const bounded = (value: number, limit: number) => Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value)) : 0

/** Convert screen input into the unmirrored 200-unit character space. */
export function pointerAttention(clientX: number, clientY: number, matrix: ScreenMatrix | null): AttentionPoint | null {
  if (!matrix || ![clientX, clientY, matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].every(Number.isFinite)) return null
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (Math.abs(determinant) < 1e-8) return null
  const dx = clientX - matrix.e, dy = clientY - matrix.f
  const x = (matrix.d * dx - matrix.c * dy) / determinant
  const y = (matrix.a * dy - matrix.b * dx) / determinant
  return { x: bounded((x - 100) / 70 * 3, 3), y: bounded((y - 126) / 70 * 2, 2) }
}

/** Absolute-time easing on the room's clock, with continuous retargeting. */
export function sampleAttention(previous: AttentionSample | null, target: AttentionPoint | null, now: number, still = false): AttentionSample {
  const at = Number.isFinite(now) ? now : previous?.start ?? 0
  const next = { x: still ? 0 : bounded(target?.x ?? 0, 3), y: still ? 0 : bounded(target?.y ?? 0, 2) }
  const zero = { x: 0, y: 0 }
  if (still || !previous) return { from: zero, target: next, start: at, value: zero }
  const progress = Math.max(0, Math.min(1, (at - previous.start) / 120))
  const eased = progress * progress * (3 - 2 * progress)
  const value = {
    x: previous.from.x + (previous.target.x - previous.from.x) * eased,
    y: previous.from.y + (previous.target.y - previous.from.y) * eased,
  }
  return next.x === previous.target.x && next.y === previous.target.y
    ? { ...previous, value }
    : { from: value, target: next, start: at, value }
}
