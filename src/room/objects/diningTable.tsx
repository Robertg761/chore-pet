import { mix } from '../../art/color'
import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso, isoPoints } from '../iso'
import { fly, plate, smudge, stink } from './mess'
import { slab, softBox } from './shapes3'
import { bowl, crumbs, mug } from './tableware'
import type { ObjectArt } from './types'

// 2x2 dining table with two chairs tucked in. Dining height (40, taller than the
// coffee table's 34) on four slim legs under an apron. The chairs sit on the
// two BACK sides (tx = 0 and ty = 0), facing the table, so their backs peek out
// behind the top and never cover it: all the mess stays visible.

const { ink, woodDark, floorWood, warmRed, cream, creamDark, sky, white, blush, petDefault, leaf, leafDark } = PALETTE

const WOOD_LIGHT = mix(floorWood, white, 0.32) // table top, a step lighter like table.tsx
const WOOD_DEEP = mix(woodDark, ink, 0.2) // darkest wood face
const RED_LIGHT = mix(warmRed, white, 0.28)
const RED_DARK = mix(warmRed, ink, 0.2)

const TOP_Z = 40 // table height
const THICK = 5 // tabletop thickness
const APRON = 4 // apron band under the top
const IN = 0.08 // tabletop overhang inset from the footprint edge

const SEAT = 21 // seat deck top
const BACK_Z = 56 // chair back top (a little over the tabletop so it reads from behind)
const LEG = 0.17 // table leg width
const POST = 0.11 // chair post width

function sorted<T extends { s: number }>(parts: T[]): T[] {
  return [...parts].sort((p, q) => p.s - q.s)
}

/**
 * One chair against a back wall side. `a` runs from the chair's back toward the
 * table, `b` across it; for the tx-side chair (a, b) = (tx, ty), for the
 * ty-side chair they swap. Parts draw back to front.
 */
function chair(side: 'tx' | 'ty') {
  const C = 1 // centred on the table's middle
  const at = (a0: number, a1: number, b0: number, b1: number) =>
    side === 'tx' ? { x0: a0, x1: a1, y0: b0, y1: b1 } : { x0: b0, x1: b1, y0: a0, y1: a1 }
  const post = (a: number, b: number, z1: number) => ({
    s: a + b,
    node: softBox({ ...at(a, a + POST, b, b + POST), z0: 0, z1, top: floorWood, left: WOOD_DEEP, right: woodDark, r: 1 }),
  })
  const W = 0.3 // half width
  const A0 = 0.03 // back edge
  const A1 = 0.6 // seat front edge
  const parts = sorted([
    post(A0, C - W, BACK_Z),
    post(A0, C + W - POST, BACK_Z),
    post(A1 - POST, C - W, SEAT - 3),
    post(A1 - POST, C + W - POST, SEAT - 3),
  ])
  const dx = A1 - A0
  return (
    <g strokeWidth={2}>
      {parts.slice(0, 2).map((p, i) => (
        <g key={i}>{p.node}</g>
      ))}
      {/* back rest: slats between the posts, then a top rail */}
      {softBox({ ...at(A0 + 0.01, A0 + 0.08, C - W + POST, C + W - POST), z0: SEAT + 12, z1: BACK_Z - 9, top: floorWood, left: WOOD_DEEP, right: woodDark, r: 1 })}
      {softBox({ ...at(A0, A0 + 0.1, C - W, C + W), z0: BACK_Z - 9, z1: BACK_Z, top: floorWood, left: WOOD_DEEP, right: woodDark, r: 2 })}
      {parts.slice(2).map((p, i) => (
        <g key={i}>{p.node}</g>
      ))}
      {/* seat board and a rosy cushion */}
      {softBox({ ...at(A0, A0 + dx, C - W, C + W), z0: SEAT - 3, z1: SEAT, top: floorWood, left: WOOD_DEEP, right: woodDark, r: 1.5 })}
      {softBox({ ...at(A0 + 0.07, A0 + dx - 0.04, C - W + 0.04, C + W - 0.04), z0: SEAT, z1: SEAT + 3, top: RED_LIGHT, left: RED_DARK, right: warmRed, r: 2 })}
    </g>
  )
}

function leg(tx: number, ty: number) {
  return softBox({ x0: tx, x1: tx + LEG, y0: ty, y1: ty + LEG, z0: 0, z1: TOP_Z - THICK, top: floorWood, left: WOOD_DEEP, right: woodDark, r: 1.2 })
}

function frame() {
  const a = IN + 0.04
  const b = 2 - IN - 0.04 - LEG
  return (
    <g>
      {/* one soft shadow layer: ink at 15% */}
      <polygon points={slab(0.15, 1.85, 0.15, 1.85, 0)} fill={ink} fillOpacity={0.15} stroke="none" />
      {chair('tx')}
      {chair('ty')}
      {leg(a, a)}
      {softBox({ x0: IN + 0.1, x1: 2 - IN - 0.1, y0: IN + 0.1, y1: 2 - IN - 0.1, z0: TOP_Z - THICK - APRON, z1: TOP_Z - THICK, top: woodDark, left: WOOD_DEEP, right: woodDark, r: 2 })}
      {leg(b, a)}
      {leg(a, b)}
      {leg(b, b)}
      {softBox({ x0: IN, x1: 2 - IN, y0: IN, y1: 2 - IN, z0: TOP_Z - THICK, z1: TOP_Z, top: WOOD_LIGHT, left: woodDark, right: floorWood, r: 5 })}
    </g>
  )
}

/** A cream placemat lying on the top at the given tx and ty span. */
function placemat(tx0: number, tx1: number, ty0: number, ty1: number, key: string) {
  return (
    <polygon
      key={key}
      points={isoPoints([tx0, ty0, TOP_Z], [tx1, ty0, TOP_Z], [tx1, ty1, TOP_Z], [tx0, ty1, TOP_Z])}
      fill={cream}
      stroke={creamDark}
      strokeWidth={1.5}
    />
  )
}

/** A round flower on a stem, rising from (x, y). */
function flower(x: number, y: number, dx: number, h: number, petal: string) {
  const tip = { x: x + dx, y: y - h }
  return (
    <g>
      <path d={`M${x} ${y} Q${x + dx * 0.2} ${y - h * 0.6} ${tip.x} ${tip.y}`} fill="none" stroke={ink} strokeWidth={4} />
      <path d={`M${x} ${y} Q${x + dx * 0.2} ${y - h * 0.6} ${tip.x} ${tip.y}`} fill="none" stroke={leaf} strokeWidth={1.6} />
      <circle cx={tip.x} cy={tip.y} r={3.6} fill={petal} strokeWidth={2} />
      <circle cx={tip.x} cy={tip.y} r={1.3} fill={petDefault} stroke="none" />
    </g>
  )
}

/** A little sky-blue vase with two flowers and a leaf. */
function vase(tx: number, ty: number) {
  const p = iso(tx, ty, TOP_Z)
  return (
    <g>
      {flower(p.x, p.y - 9, -5, 14, blush)}
      {flower(p.x, p.y - 9, 5, 11, warmRed)}
      <path d={`M${p.x} ${p.y - 10} q-1 -6 -7 -7 q0 6 7 7 Z`} fill={leafDark} strokeWidth={1.5} />
      <path d={`M${p.x - 5} ${p.y - 11} q-4 4 -3 8 q1 4 8 4 q7 0 8 -4 q1 -4 -3 -8 Z`} fill={sky} strokeWidth={2} />
      <ellipse cx={p.x - 3} cy={p.y - 4} rx={1.2} ry={2.2} fill={white} opacity={0.75} stroke="none" />
    </g>
  )
}

const MAT_1 = { tx0: 0.26, tx1: 0.7, ty0: 0.72, ty1: 1.28 } // in front of the tx-side chair
const MAT_2 = { tx0: 0.72, tx1: 1.28, ty0: 0.26, ty1: 0.7 } // in front of the ty-side chair

function clean() {
  return (
    <g>
      {placemat(MAT_1.tx0, MAT_1.tx1, MAT_1.ty0, MAT_1.ty1, 'm1')}
      {placemat(MAT_2.tx0, MAT_2.tx1, MAT_2.ty0, MAT_2.ty1, 'm2')}
      {vase(1.0, 1.0)}
    </g>
  )
}

const SPOT_1 = iso(0.48, 1.0, TOP_Z)
const SPOT_2 = iso(1.0, 0.48, TOP_Z)

function messy1() {
  const m = iso(1.6, 0.9, TOP_Z)
  return (
    <g>
      {crumbs([[0.35, 0.85], [0.55, 1.2], [0.85, 0.4], [1.15, 0.55], [0.8, 1.05]], TOP_Z)}
      {plate(SPOT_1.x, SPOT_1.y - 1, warmRed)}
      {plate(SPOT_2.x, SPOT_2.y - 1)}
      {mug(m.x, m.y + 1, { dirty: true })}
      {fly(SPOT_1.x + 10, SPOT_1.y - 26)}
    </g>
  )
}

function messy2() {
  const stack = iso(1.5, 1.5, TOP_Z)
  const spill = iso(1.55, 0.5, TOP_Z)
  const drip = iso(1.92, 0.5, TOP_Z)
  const cup = iso(0.62, 1.62, TOP_Z)
  return (
    <g>
      {/* spilled drink, running off the right-front edge */}
      <ellipse cx={spill.x + 4} cy={spill.y} rx={13} ry={6.2} fill={sky} strokeWidth={2} />
      <ellipse cx={spill.x} cy={spill.y - 1} rx={4} ry={1.5} fill={white} opacity={0.7} stroke="none" />
      <path d={`M${drip.x - 3} ${drip.y - 3} v9 q0 4 3 4 q3 0 3 -4 v-9`} fill={sky} strokeWidth={2} />
      {smudge(iso(0.36, 1.5, TOP_Z).x, iso(0.36, 1.5, TOP_Z).y, 5)}
      {crumbs([[0.32, 0.8], [0.4, 1.2], [0.55, 0.9], [0.85, 0.34], [1.1, 0.4], [1.0, 0.9], [1.3, 1.0], [0.9, 1.35], [1.7, 1.2], [1.2, 1.7]], TOP_Z)}
      {/* messy plates and a bowl at each place */}
      {plate(SPOT_1.x, SPOT_1.y - 1, warmRed)}
      {plate(SPOT_1.x + 1, SPOT_1.y - 4.5)}
      {bowl(SPOT_2.x, SPOT_2.y, white, petDefault, 'b')}
      {mug(cup.x, cup.y + 1, { tipped: true, dirty: true })}
      {/* the stack */}
      {plate(stack.x, stack.y - 1, warmRed)}
      {plate(stack.x + 1, stack.y - 4.5)}
      {plate(stack.x - 1, stack.y - 8, PALETTE.fabricBlue)}
      <g transform={`rotate(-16 ${stack.x} ${stack.y - 11.5})`}>{plate(stack.x, stack.y - 11.5, warmRed)}</g>
      {mug(stack.x + 17, stack.y - 4, { dirty: true, fill: warmRed })}
      {stink(stack.x - 16, stack.y - 18)}
      {fly(stack.x + 16, stack.y - 36, 'a')}
      {fly(stack.x - 20, stack.y - 28, 'b', true)}
    </g>
  )
}

export const diningTableArt: ObjectArt = {
  catalogId: 'dining-table',
  footprint: { w: 2, d: 2 },
  bounds: { x: -68, y: -92, width: 136, height: 162 },
  cueY: -42,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {frame()}
      {clean()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
