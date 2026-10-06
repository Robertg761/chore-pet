import { PALETTE } from '../../art/palette'

// Shared mess pieces so every object's mess looks like the same world:
// funny, colourful, never gross.

const { ink, white, creamDark, dirt, sickTint } = PALETTE

/** A cartoon fly with a dotted loop of flight path. */
export function fly(x: number, y: number, key?: string | number, flip = false) {
  const s = flip ? -1 : 1
  return (
    <g key={key}>
      <path
        d={`M${x} ${y} c${-10 * s} -8 ${-18 * s} 4 ${-10 * s} 9 c${6 * s} 4 ${10 * s} -2 ${7 * s} -6`}
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        strokeDasharray="2 3"
        opacity={0.4}
      />
      <g stroke={ink} strokeWidth={1.5}>
        <ellipse cx={x - 2.6} cy={y - 3} rx={3.2} ry={2} fill={white} transform={`rotate(-30 ${x - 2.6} ${y - 3})`} />
        <ellipse cx={x + 2.6} cy={y - 3} rx={3.2} ry={2} fill={white} transform={`rotate(30 ${x + 2.6} ${y - 3})`} />
        <ellipse cx={x} cy={y} rx={2.8} ry={2.3} fill={ink} />
      </g>
    </g>
  )
}

/** Two wavy stink lines rising from (x, y). */
export function stink(x: number, y: number, key?: string | number) {
  return (
    <g key={key} fill="none" stroke={sickTint} strokeWidth={2.5} strokeLinecap="round" opacity={0.85}>
      <path d={`M${x - 4} ${y} q-4 -5 0 -10 q4 -5 0 -10`} />
      <path d={`M${x + 5} ${y - 3} q-4 -5 0 -10 q4 -5 0 -10`} />
    </g>
  )
}

/** A flat dirt smudge, as seen on a top face (2:1 squashed). */
export function smudge(x: number, y: number, r = 5, key?: string | number) {
  return <ellipse key={key} cx={x} cy={y} rx={r} ry={r / 2} fill={dirt} opacity={0.45} />
}

/** A plate lying flat in iso, optionally with a splash of sauce. */
export function plate(x: number, y: number, sauce?: string, key?: string | number) {
  return (
    <g key={key}>
      <ellipse cx={x} cy={y} rx={10} ry={5} fill={white} stroke={ink} strokeWidth={2} />
      <ellipse cx={x} cy={y} rx={6} ry={3} fill="none" stroke={creamDark} strokeWidth={1.5} />
      {sauce && <ellipse cx={x + 1.5} cy={y - 0.5} rx={3.5} ry={1.6} fill={sauce} opacity={0.9} />}
    </g>
  )
}
