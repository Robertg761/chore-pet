import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { onRight } from './batch2-parts'
import { cobweb } from './lamp'
import type { ObjectArt } from './types'

// A garland of round bulbs hung in three generous swags along two tiles of
// wall: no floor footprint, drawn flat on the left-wall plane (tx = 0) at
// rotation 0 using `onRight`, exactly like poster.tsx. Local coordinates: x
// 0..64 runs along the wall (0 is the front edge), y = -height above the floor.
// The room mirrors this for the right wall. It has no chores, but if a player
// adds one the dust settles: messy1 has one bulb out and a cobweb strand,
// messy2 has two bulbs out, the last pin has popped so the string droops, and
// a friendly cobweb.

const { ink, woodDark, cream, creamDark, petDefault, blush, warmRed, steel, white } = PALETTE

// Wall art is drawn a touch finer than solids; the string itself is a bolder line.
const WALL_STROKE = ROOM_STROKE - 1

const DUST = mix(creamDark, steel, 0.5)
const AMBER = mix(warmRed, petDefault, 0.45)
const BULB_OFF = mix(steel, creamDark, 0.5)
const COLOURS = [petDefault, blush, cream, AMBER]

type P = { x: number; y: number }

const PIN_Y = -128
const PINS: P[] = [
  { x: 1.2, y: PIN_Y },
  { x: 22, y: PIN_Y + 1.5 },
  { x: 43, y: PIN_Y },
  { x: 62.8, y: PIN_Y + 1.5 },
]
/** Where the last end hangs once its pin pops out. */
const DROOP_END: P = { x: 55, y: -101 }
const SAG = 10
const WIRE = 2.4
/** Bulbs sit at these fractions along each swag. */
const BULB_AT = [0.27, 0.73]

interface Swag {
  a: P
  b: P
  sag: number
}

function swags(stage: MessStage): Swag[] {
  const loose = stage === 'messy2'
  return [
    { a: PINS[0], b: PINS[1], sag: SAG },
    { a: PINS[1], b: PINS[2], sag: SAG + 1 },
    { a: PINS[2], b: loose ? DROOP_END : PINS[3], sag: loose ? 6 : SAG },
  ]
}

/** Cubic from a to b that dips `sag` below the chord: a round U, not a V. */
function controls(s: Swag): [P, P] {
  const dx = s.b.x - s.a.x
  return [
    { x: s.a.x + dx * 0.16, y: s.a.y + s.sag * 1.33 },
    { x: s.b.x - dx * 0.16, y: s.b.y + s.sag * 1.33 },
  ]
}

function at(s: Swag, t: number): P {
  const [c1, c2] = controls(s)
  const u = 1 - t
  const f = (a: number, b: number, c: number, d: number) => u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
  return { x: f(s.a.x, c1.x, c2.x, s.b.x), y: f(s.a.y, c1.y, c2.y, s.b.y) }
}

function wirePath(list: Swag[]) {
  return list
    .map((s, i) => {
      const [c1, c2] = controls(s)
      return `${i === 0 ? `M${s.a.x} ${s.a.y} ` : ''}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${s.b.x} ${s.b.y}`
    })
    .join(' ')
}

interface Bulb extends P {
  colour: string
  on: boolean
}

function bulbs(list: Swag[], off: number[]): Bulb[] {
  let n = 0
  return list.flatMap((s) =>
    BULB_AT.map((t) => {
      const p = at(s, t)
      const i = n++
      return { x: p.x, y: p.y + 5.4, colour: COLOURS[i % COLOURS.length], on: !off.includes(i) }
    }),
  )
}

/** Soft glow behind a lit bulb: two faint discs, no outline. */
function glow(b: Bulb, key: number) {
  return (
    <g key={key} fill={b.colour} stroke="none">
      <circle cx={b.x} cy={b.y} r={11.5} opacity={0.2} />
      <circle cx={b.x} cy={b.y} r={7.4} opacity={0.26} />
    </g>
  )
}

function bulb(b: Bulb, key: number) {
  return (
    <g key={key}>
      {/* socket */}
      <rect x={b.x - 1.7} y={b.y - 7.2} width={3.4} height={3.2} rx={0.8} fill={woodDark} strokeWidth={1.2} />
      <ellipse cx={b.x} cy={b.y} rx={4} ry={4.6} fill={b.on ? b.colour : BULB_OFF} strokeWidth={1.4} />
      <path d={`M${b.x - 1.2} ${b.y - 0.4} Q${b.x - 1.2} ${b.y - 1.5} ${b.x - 0.2} ${b.y - 1.7}`} fill="none" stroke={white} strokeWidth={1.1} opacity={b.on ? 0.85 : 0.55} />
    </g>
  )
}

function pins(loose: boolean) {
  return (
    <g fill={ink} stroke="none">
      {PINS.map((p, i) => (loose && i === 3 ? null : <circle key={i} cx={p.x} cy={p.y} r={1.9} />))}
    </g>
  )
}

function dust(spots: [number, number, number][]) {
  return (
    <g fill={DUST} stroke="none">
      {spots.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.6} />
      ))}
    </g>
  )
}

function render(stage: MessStage) {
  const list = swags(stage)
  const off = stage === 'messy1' ? [3] : stage === 'messy2' ? [1, 4] : []
  const all = bulbs(list, off)
  const d = wirePath(list)
  return (
    <g>
      {/* soft wall shadow of the string */}
      <path d={d} transform="translate(1.6 2.6)" fill="none" stroke={ink} strokeOpacity={0.15} strokeWidth={2.6} />
      {all.filter((b) => b.on).map(glow)}
      <path d={d} fill="none" strokeWidth={WIRE} />
      {pins(stage === 'messy2')}
      {all.map(bulb)}
      {stage === 'messy1' && (
        <g>
          {dust(all.filter((_, i) => i === 2 || i === 5).map((b) => [b.x + 1, b.y - 8.2, 2] as [number, number, number]))}
          {/* a single cobweb strand off the first pin */}
          <g fill="none" stroke={ink} strokeWidth={1.2} opacity={0.6} strokeLinecap="round">
            <path d="M1.2 -128 Q3 -116 8 -112 Q12 -109 12.5 -101" />
            <path d="M3.4 -120 L8.4 -121.4" />
            <path d="M8 -112 L13 -114" />
          </g>
        </g>
      )}
      {stage === 'messy2' && (
        <g>
          {dust(all.filter((_, i) => i !== 5).map((b) => [b.x + 1, b.y - 8.2, 2] as [number, number, number]))}
          {cobweb({ x: 1.4, y: -128.6 }, { x: 25, y: -128.2 }, { x: 2, y: -100 }, 3)}
        </g>
      )}
    </g>
  )
}

export const fairyLightsArt: ObjectArt = {
  catalogId: 'fairy-lights',
  footprint: { w: 1, d: 2 },
  bounds: { x: -78, y: -144, width: 92, height: 84 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={WALL_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {onRight(0, 2, render(stage))}
    </g>
  ),
}
