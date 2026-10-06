import { PALETTE } from '../art/palette'
import type { Mood } from '../domain/types'

// Shared building blocks for every species, so Mochi, Bun and Sprout read as
// one family: same eyes, cheeks, feet, shadow and mood tint.

const { ink, blush, sickTint, dirt, white, sky, woodDark, floorWood, cream, creamDark, fabricBlue, warmRed } = PALETTE

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

// ---- Shared sick bed. Every species lies in the same bed with the same props;
// only the pet differs. Draw order: SickBedBack, the pet, IcePack, SickBedFront,
// the pet's paws, Thermometer. Draw inside a group that already has the ink
// stroke (CHARACTER_STROKE, round joins) set, and add <Shadow rx={84} /> first.

const BLANKET = 'M16 156 C16 148 40 146 66 149 C86 144 114 144 134 149 C160 146 184 148 184 156 L184 170 C184 176 176 178 168 178 L32 178 C24 178 16 176 16 170 Z'
const BLANKET_FOLD = 'M18 154 C18 147 42 145 66 148 C86 143 114 143 134 148 C158 145 182 147 182 154 C182 162 170 160 160 158 C130 155 108 160 98 158 C80 155 50 160 36 160 C26 160 18 160 18 154 Z'

/** Headboard, legs, mattress and pillow: everything behind the pet. */
export function SickBedBack() {
  return (
    <g>
      <rect x={20} y={88} width={160} height={84} rx={22} fill={woodDark} />
      <rect x={26} y={170} width={14} height={11} rx={4} fill={woodDark} />
      <rect x={160} y={170} width={14} height={11} rx={4} fill={woodDark} />
      <rect x={14} y={152} width={172} height={22} rx={11} fill={floorWood} />
      <rect x={30} y={108} width={140} height={44} rx={22} fill={cream} />
    </g>
  )
}

/** Blanket with a turned-down sheet, tucked in at the bed base. Paws go on top. */
export function SickBedFront() {
  return (
    <g>
      <path d={BLANKET} fill={fabricBlue} />
      <path d={BLANKET_FOLD} fill={cream} />
      <g fill="none" stroke={creamDark} strokeWidth={3}>
        <path d="M34 170 q6 -5 12 0" />
        <path d="M150 170 q6 -5 12 0" />
      </g>
    </g>
  )
}

/** Thermometer with its mouth end at (x, y), pointing right, turned by `rotate` degrees. */
export function Thermometer({ x, y, rotate = 10 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x={0} y={-4.5} width={28} height={9} rx={4.5} fill={white} />
      <path d="M2.5 0 h12" stroke={warmRed} strokeWidth={4} />
      <path d="M18.5 -4.5 v3 M23 -4.5 v3" strokeWidth={2} />
      <circle cx={31} cy={0} r={5.5} fill={warmRed} strokeWidth={3} />
    </g>
  )
}

/** Ice pack centred on (x, y), turned by `rotate` degrees. */
export function IcePack({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x={-21} y={-11} width={42} height={22} rx={8} fill={sky} />
      <path d="M-13 -3 H4" stroke={white} strokeWidth={3} fill="none" opacity={0.9} />
      <path d="M-13 3 H-6" stroke={white} strokeWidth={3} fill="none" opacity={0.9} />
    </g>
  )
}
