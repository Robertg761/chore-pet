// Shared outlines for the effects: a plump four-point star and a heart, both
// drawn centred on (0,0). Local to src/effects so Sparkle and Cheer match.

/** Path of a four-point star with tips at distance `r`; `pinch` is the waist (0 spiky, 1 diamond-round). */
export function starPath(r: number, pinch = 0.24): string {
  const k = r * pinch
  return `M0 ${-r} Q${k} ${-k} ${r} 0 Q${k} ${k} 0 ${r} Q${-k} ${k} ${-r} 0 Q${-k} ${-k} 0 ${-r} Z`
}

/** Path of a heart about `s` wide, centred on (0,0). */
export function heartPath(s: number): string {
  const u = s / 24
  return `M0 ${8 * u} C${-14 * u} ${-1 * u} ${-10 * u} ${-13 * u} 0 ${-5 * u} C${10 * u} ${-13 * u} ${14 * u} ${-1 * u} 0 ${8 * u} Z`
}

/** True when the player asked the OS for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
