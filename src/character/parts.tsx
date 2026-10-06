import { PALETTE } from '../art/palette'
import type { Mood } from '../domain/types'

// Shared building blocks for every species, so Mochi, Bun and Sprout read as
// one family: same eyes, cheeks, feet, shadow and mood tint.

const { ink, blush, sickTint, dirt, white, sky } = PALETTE

/** Soft ground shadow under the feet. */
export function Shadow({ rx }: { rx: number }) {
  return <ellipse cx={100} cy={186} rx={rx} ry={7} fill={ink} opacity={0.15} stroke="none" />
}

/** A rounded nub (foot or arm), drawn before the body so the body overlaps it. */
export function Nub({ cx, cy, rx, ry, rotate = 0, fill }: { cx: number; cy: number; rx: number; ry: number; rotate?: number; fill: string }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} transform={`rotate(${rotate} ${cx} ${cy})`} />
}

export function Cheeks({ y, spread = 34 }: { y: number; spread?: number }) {
  return (
    <g fill={blush} stroke="none" opacity={0.85}>
      <ellipse cx={100 - spread} cy={y} rx={9} ry={5} />
      <ellipse cx={100 + spread} cy={y} rx={9} ry={5} />
    </g>
  )
}

/** A mood, or one of the two special moments that override the face. */
export type Expression = Mood | 'sleeping' | 'cheering'

function Eye({ x, y, mood, side }: { x: number; y: number; mood: Expression; side: -1 | 1 }) {
  switch (mood) {
    case 'sleeping':
      // Peacefully shut: soft downward curves.
      return <path d={`M${x - 7} ${y} q7 6 14 0`} />
    case 'cheering':
      // Squeezed happy: ^ ^
      return <path d={`M${x - 7} ${y + 3} q7 -11 14 0`} />
    case 'happy':
    case 'content':
      return (
        <g>
          <ellipse cx={x} cy={y} rx={7.5} ry={9.5} fill={ink} stroke="none" />
          <circle cx={x + 2.6} cy={y - 3.6} r={2.8} fill={white} stroke="none" />
        </g>
      )
    case 'meh':
      // Half-lidded: the lower half of the eye under a flat lid.
      return (
        <g>
          <path d={`M${x - 7.5} ${y - 1} a7.5 8 0 0 0 15 0 Z`} fill={ink} stroke="none" />
          <path d={`M${x - 9} ${y - 1} h18`} />
        </g>
      )
    case 'scruffy':
      // Tired: half-lidded, lids sloping down toward the outside (never angry).
      return (
        <g>
          <path d={`M${x - 7.5} ${y} a7.5 7 0 0 0 15 0 Z`} fill={ink} stroke="none" />
          <path d={`M${x - 9 * side} ${y - 2} L${x + 9 * side} ${y + 2}`} />
        </g>
      )
    case 'sick':
      // Squeezed shut: > <
      return <path d={`M${x + 6 * side} ${y - 6} L${x - 5 * side} ${y} L${x + 6 * side} ${y + 6}`} />
  }
}

function Mouth({ y, mood }: { y: number; mood: Expression }) {
  switch (mood) {
    case 'sleeping':
      return <ellipse cx={100} cy={y + 1} rx={3} ry={2.5} fill={ink} stroke="none" />
    case 'happy':
    case 'cheering':
      return (
        <g>
          <path d={`M91 ${y - 2} q9 12 18 0 Z`} fill={ink} />
          <ellipse cx={100} cy={y + 3.5} rx={4} ry={2.2} fill={blush} stroke="none" />
        </g>
      )
    case 'content':
      return <path d={`M93 ${y} q7 6 14 0`} />
    case 'meh':
      return <path d={`M94 ${y + 1} h12`} />
    case 'scruffy':
    case 'sick':
      return <path d={`M89 ${y + 2} q5.5 -5 11 0 q5.5 5 11 0`} />
  }
}

/** Eyes and mouth. Eyes sit at (100 +/- 18, eyeY). */
export function Face({ mood, eyeY, mouthY }: { mood: Expression; eyeY: number; mouthY: number }) {
  return (
    <g stroke={ink} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Eye x={82} y={eyeY} mood={mood} side={-1} />
      <Eye x={118} y={eyeY} mood={mood} side={1} />
      <Mouth y={mouthY} mood={mood} />
      {mood === 'sick' && (
        <path d={`M150 ${eyeY - 14} q-6 9 0 12 q6 -3 0 -12 Z`} fill={sky} strokeWidth={2.5} />
      )}
    </g>
  )
}

/**
 * Greenish tint and a couple of dirt smudges over the body when the pet is
 * scruffy or sick. `d` is the body outline path.
 */
export function MoodTint({ d, mood, smudges }: { d: string; mood: Mood; smudges: [number, number][] }) {
  if (mood !== 'scruffy' && mood !== 'sick') return null
  return (
    <g stroke="none">
      <path d={d} fill={sickTint} opacity={mood === 'sick' ? 0.32 : 0.18} />
      <g fill={dirt} opacity={0.45}>
        {smudges.map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={i % 2 ? 5 : 7} ry={i % 2 ? 3.5 : 4.5} transform={`rotate(${i % 2 ? 20 : -15} ${x} ${y})`} />
        ))}
      </g>
    </g>
  )
}
