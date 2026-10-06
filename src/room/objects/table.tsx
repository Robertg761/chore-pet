import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { fly, plate, smudge, stink } from './mess'
import { slab, softBox } from './shapes3'
import type { ObjectArt } from './types'

// 2x2 floor table: a wooden top on four legs. Floor objects have no wall, so
// all four legs show and a soft shadow sits on the floor under the top.

const { ink, woodDark, floorWood, fabricBlue, warmRed, dirt, sky, white, creamDark } = PALETTE

// Top face of the table: one step lighter than floor-wood so it reads as a surface.
const WOOD_LIGHT = mix(floorWood, white, 0.32)

const TOP_Z = 34 // table height
const THICK = 5 // tabletop thickness
const IN = 0.08 // tabletop overhang inset from the footprint edge

function leg(tx: number, ty: number) {
  const s = 0.15
  return softBox({ x0: tx, x1: tx + s, y0: ty, y1: ty + s, z0: 0, z1: TOP_Z - THICK, top: floorWood, left: woodDark, right: floorWood, r: 1.5 })
}

function frame() {
  const a = IN + 0.1
  const b = 2 - IN - 0.1 - 0.15
  const seam = (ty: number) => {
    const p = iso(IN + 0.1, ty, TOP_Z)
    const q = iso(2 - IN - 0.1, ty, TOP_Z)
    return <path d={`M${p.x} ${p.y} L${q.x} ${q.y}`} strokeWidth={1.5} opacity={0.35} />
  }
  return (
    <g>
      {/* one soft shadow layer: ink at 15% */}
      <polygon points={slab(0.3, 1.7, 0.3, 1.7, 0)} fill={ink} fillOpacity={0.15} stroke="none" />
      {leg(a, a)}
      {leg(b, a)}
      {leg(a, b)}
      {leg(b, b)}
      {softBox({ x0: IN, x1: 2 - IN, y0: IN, y1: 2 - IN, z0: TOP_Z - THICK, z1: TOP_Z, top: WOOD_LIGHT, left: woodDark, right: floorWood, r: 5 })}
      <g fill="none" stroke={woodDark}>
        {seam(0.7)}
        {seam(1.3)}
      </g>
    </g>
  )
}

function mug(x: number, y: number, tipped = false) {
  const body = (
    <g strokeWidth={2}>
      <path d={`M${x + 5} ${y - 7} q5 1 4 5 q-1 3 -4 2`} fill="none" />
      <path d={`M${x - 5} ${y - 10} V${y} a5 2.5 0 0 0 10 0 V${y - 10} Z`} fill={fabricBlue} />
      <ellipse cx={x} cy={y - 10} rx={5} ry={2.5} fill={tipped ? creamDark : PALETTE.steelDark} />
    </g>
  )
  return tipped ? <g transform={`rotate(-82 ${x} ${y - 4})`}>{body}</g> : body
}

function crumbs(points: [number, number][]) {
  return (
    <g fill={dirt} stroke="none" opacity={0.7}>
      {points.map(([tx, ty], i) => {
        const p = iso(tx, ty, TOP_Z)
        return <ellipse key={i} cx={p.x} cy={p.y} rx={1.6} ry={0.9} />
      })}
    </g>
  )
}

function messy1() {
  const a = iso(1.15, 0.7, TOP_Z)
  const b = iso(0.7, 1.35, TOP_Z)
  const m = iso(1.45, 1.4, TOP_Z)
  return (
    <g>
      {plate(a.x, a.y - 1, warmRed)}
      {plate(b.x, b.y - 1)}
      {mug(m.x, m.y + 1)}
      {crumbs([[0.9, 0.5], [0.85, 0.62], [1.3, 1.05]])}
      {fly(a.x + 10, a.y - 30)}
    </g>
  )
}

function messy2() {
  const c = iso(0.85, 0.85, TOP_Z)
  const spill = iso(1.45, 0.55, TOP_Z)
  const drip = iso(1.92, 0.62, TOP_Z)
  const cup = iso(1.4, 1.3, TOP_Z)
  return (
    <g>
      {/* spilled drink running off the right-front edge */}
      <ellipse cx={spill.x} cy={spill.y} rx={14} ry={6.5} fill={sky} strokeWidth={2} />
      <ellipse cx={spill.x - 4} cy={spill.y - 1} rx={4} ry={1.5} fill={white} opacity={0.7} stroke="none" />
      <path d={`M${drip.x - 3} ${drip.y - 2} v9 q0 4 3 4 q3 0 3 -4 v-9`} fill={sky} strokeWidth={2} />
      {mug(cup.x, cup.y + 1, true)}
      {smudge(iso(0.4, 1.5, TOP_Z).x, iso(0.4, 1.5, TOP_Z).y, 5)}
      {crumbs([[0.5, 0.45], [0.6, 0.55], [1.2, 1.6], [1.0, 1.75], [0.3, 1.0], [1.7, 1.0]])}
      {/* the stack */}
      {plate(c.x, c.y - 1, warmRed)}
      {plate(c.x + 1, c.y - 4.5)}
      {plate(c.x - 1, c.y - 8, fabricBlue)}
      {plate(c.x + 0.5, c.y - 11.5, warmRed)}
      <g transform={`rotate(-16 ${c.x} ${c.y - 15})`}>{plate(c.x, c.y - 15)}</g>
      {mug(c.x - 14, c.y + 5)}
      {stink(c.x + 4, c.y - 24)}
      {fly(c.x + 16, c.y - 36, 'a')}
      {fly(c.x - 20, c.y - 28, 'b', true)}
    </g>
  )
}

export const tableArt: ObjectArt = {
  catalogId: 'table',
  footprint: { w: 2, d: 2 },
  bounds: { x: -68, y: -92, width: 136, height: 162 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {frame()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
