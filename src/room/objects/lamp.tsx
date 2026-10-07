import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { drum } from './batch2-parts'
import type { ObjectArt } from './types'

// Floor lamp: a round wooden base, a slim pole and a rounded cream shade with a
// warm glow. It has no chores of its own, but if a player adds one the dust
// settles: messy1 is a cobweb strand and dust on the base, messy2 a big
// friendly cobweb with a tiny spider and two dust bunnies.

const { ink, woodDark, floorWood, cream, creamDark, petDefault, steel, white, accent, blush } = PALETTE

const DUST = mix(creamDark, steel, 0.5)
const SPIDER = mix(accent, ink, 0.35)

const BASE_TOP = 5
const SHADE_TOP = -66
const SHADE_BOTTOM = -42

type P = { x: number; y: number }

/**
 * A cartoon cobweb filling the corner at `j`, between two edges that run to
 * `b` and `c`. Spokes plus sagging rings. Strokes only (plus a faint fill).
 */
export function cobweb(j: P, b: P, c: P, rings = 3, key?: string | number) {
  const at = (p: P, t: number): P => ({ x: j.x + (p.x - j.x) * t, y: j.y + (p.y - j.y) * t })
  const mid: P = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 }
  let ringPath = ''
  for (let k = 1; k <= rings; k++) {
    const t = k / rings
    const p = at(b, t)
    const q = at(c, t)
    const sag = at({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, 0.78)
    ringPath += `M${p.x} ${p.y} Q${sag.x} ${sag.y} ${q.x} ${q.y} `
  }
  const spokeMid = at(mid, 0.9)
  return (
    <g key={key} fill="none" stroke={ink} strokeWidth={1.3} opacity={0.8} strokeLinecap="round">
      <path d={`M${j.x} ${j.y} L${b.x} ${b.y} Q${mid.x} ${mid.y} ${c.x} ${c.y} Z`} fill={white} fillOpacity={0.3} stroke="none" />
      <path d={`M${j.x} ${j.y} L${b.x} ${b.y} M${j.x} ${j.y} L${c.x} ${c.y} M${j.x} ${j.y} L${spokeMid.x} ${spokeMid.y}`} />
      <path d={ringPath} />
    </g>
  )
}

/** A fluffy dust bunny with two dot eyes, sitting on (x, y). */
function dustBunny(x: number, y: number, k = 1, key?: string | number) {
  const puffs: [number, number, number][] = [
    [-4.2, -3, 3.6],
    [3.6, -3.4, 3.8],
    [0, -6, 3.5],
    [0, -2.6, 4.6],
  ]
  return (
    <g key={key} transform={`translate(${x} ${y}) scale(${k})`} strokeWidth={1.8}>
      {puffs.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={DUST} />
      ))}
      <g stroke="none" fill={DUST}>
        {puffs.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r - 0.8} />
        ))}
      </g>
      <circle cx={-1.8} cy={-3.2} r={0.9} fill={ink} stroke="none" />
      <circle cx={1.8} cy={-3.2} r={0.9} fill={ink} stroke="none" />
    </g>
  )
}

/** A tiny friendly spider hanging from a thread. */
function spider(x: number, y: number, threadTop: number) {
  const legs = [-1, 1].flatMap((s) =>
    [0, 1, 2, 3].map((i) => `M${s * 3} ${-1.5 + i * 1.4} Q${s * 8} ${-5.5 + i * 3.4} ${s * 9} ${-1 + i * 3.6}`),
  )
  return (
    <g>
      <path d={`M${x} ${threadTop} V${y - 4}`} fill="none" strokeWidth={1.2} opacity={0.7} />
      <g transform={`translate(${x} ${y})`}>
        <path d={legs.join(' ')} fill="none" strokeWidth={1.5} />
        <circle cx={0} cy={0} r={4.6} fill={SPIDER} strokeWidth={2} />
        <circle cx={-1.9} cy={-0.8} r={1.7} fill={white} strokeWidth={0.8} />
        <circle cx={1.9} cy={-0.8} r={1.7} fill={white} strokeWidth={0.8} />
        <circle cx={-1.7} cy={-0.6} r={0.8} fill={ink} stroke="none" />
        <circle cx={2.1} cy={-0.6} r={0.8} fill={ink} stroke="none" />
        <path d="M-1.4 1.6 Q0 2.8 1.4 1.6" fill="none" strokeWidth={1} />
        <circle cx={-3.2} cy={1.2} r={0.9} fill={blush} stroke="none" />
        <circle cx={3.2} cy={1.2} r={0.9} fill={blush} stroke="none" />
      </g>
    </g>
  )
}

function glow() {
  const f = iso(0.5, 0.5, 0)
  return (
    <g stroke="none" fill={petDefault}>
      <ellipse cx={f.x} cy={f.y} rx={29} ry={14.5} opacity={0.18} />
      <circle cx={0} cy={-46} r={34} opacity={0.15} />
      <circle cx={0} cy={-46} r={24} opacity={0.18} />
    </g>
  )
}

function base() {
  const c = iso(0.5, 0.5, 0)
  return (
    <g>
      {drum({ cx: 0.5, cy: 0.5, a: 0.22, b: 0.22, z0: 0, z1: BASE_TOP, top: floorWood, side: woodDark })}
      <path d={`M${c.x} ${c.y - BASE_TOP} V${SHADE_BOTTOM + 6}`} stroke={ink} strokeWidth={7} fill="none" />
      <path d={`M${c.x} ${c.y - BASE_TOP} V${SHADE_BOTTOM + 6}`} stroke={woodDark} strokeWidth={3.2} fill="none" />
    </g>
  )
}

function shade() {
  const body = `M-10 ${SHADE_TOP} L-19 ${SHADE_BOTTOM} A19 7.5 0 0 0 19 ${SHADE_BOTTOM} L10 ${SHADE_TOP} Z`
  return (
    <g>
      <path d={body} fill={cream} />
      <path d={`M-10 ${SHADE_TOP} L-19 ${SHADE_BOTTOM} A19 7.5 0 0 0 0 ${SHADE_BOTTOM + 7.5} V${SHADE_TOP + 4} Z`} fill={creamDark} stroke="none" />
      <path d={body} fill="none" />
      <path d={`M-14.5 ${SHADE_BOTTOM - 4} L-9 ${SHADE_TOP + 5}`} stroke={white} strokeWidth={2} opacity={0.7} fill="none" />
      <ellipse cx={0} cy={SHADE_TOP} rx={10} ry={4} fill={creamDark} />
      <ellipse cx={0} cy={SHADE_TOP + 0.4} rx={5.5} ry={2} fill={petDefault} stroke="none" />
      {/* pull chain */}
      <path d={`M9 ${SHADE_BOTTOM + 6.6} V${SHADE_BOTTOM + 15}`} fill="none" strokeWidth={1.5} />
      <circle cx={9} cy={SHADE_BOTTOM + 16.5} r={2} fill={petDefault} strokeWidth={1.5} />
    </g>
  )
}

function dustOnBase(spots: [number, number, number][]) {
  return (
    <g fill={DUST} stroke="none" opacity={0.95}>
      {spots.map(([tx, ty, r], i) => {
        const p = iso(tx, ty, BASE_TOP)
        return <ellipse key={i} cx={p.x} cy={p.y} rx={r} ry={r / 2} />
      })}
    </g>
  )
}

function messy1() {
  return (
    <g>
      {dustOnBase([[0.42, 0.4, 3.4], [0.62, 0.52, 3], [0.5, 0.64, 2.4], [0.36, 0.55, 1.8]])}
      {/* a single cobweb strand drooping off the shade */}
      <g fill="none" stroke={ink} strokeWidth={1.2} opacity={0.6} strokeLinecap="round">
        <path d="M17 -39 Q16 -28 9 -25 Q4 -23 2 -17" />
        <path d="M12 -38 Q11 -33 7 -31" />
        <path d="M9 -25 L13 -22" />
      </g>
    </g>
  )
}

function messy2() {
  return (
    <g>
      {dustOnBase([[0.4, 0.38, 3.6], [0.6, 0.5, 3.4], [0.46, 0.64, 2.6], [0.34, 0.55, 2], [0.66, 0.4, 2]])}
      {dustBunny(-22, 24)}
      {dustBunny(20, 26, 0.8)}
      {cobweb({ x: 1.5, y: -35 }, { x: 20, y: -38 }, { x: 3, y: 5 }, 4)}
      {spider(11, -12, -30)}
    </g>
  )
}

export const lampArt: ObjectArt = {
  catalogId: 'lamp',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  cueY: -82,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {glow()}
      {base()}
      {shade()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
