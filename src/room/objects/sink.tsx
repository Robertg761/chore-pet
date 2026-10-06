import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso, isoPoints } from '../iso'
import { fly, plate, smudge, stink } from './mess'
import type { ObjectArt } from './types'

// REFERENCE OBJECT. Every catalog object copies this file's structure:
// box faces first (left-front darker, right-front lighter, top lightest),
// then fixtures, then mess layered on top for messy1 and messy2. Nothing
// leaves `bounds`, so all three stages line up exactly.
//
// The sink is a 1x1 kitchen counter. At rotation 0 its back sits against the
// left wall (tx = 0), so its doors face the right-front side.

const { ink, woodDark, floorWood, cream, creamDark, steel, steelDark, fabricBlue, warmRed, dirt, sky } = PALETTE

const H = 34 // counter height
const LIP = 6 // countertop thickness

/** A point on the right-front (door) face: u runs back to front, v top to bottom. */
function door(u: number, v: number) {
  return iso(1, u, H * (1 - v))
}

function poly(...pts: { x: number; y: number }[]) {
  return pts.map((p) => `${p.x},${p.y}`).join(' ')
}

function cabinet() {
  const lipV = LIP / H
  return (
    <g>
      {/* left-front side panel */}
      <polygon points={isoPoints([0, 1, H], [1, 1, H], [1, 1, 0], [0, 1, 0])} fill={woodDark} />
      <polygon points={isoPoints([0, 1, H], [1, 1, H], [1, 1, H - LIP], [0, 1, H - LIP])} fill={creamDark} />
      {/* right-front door panel */}
      <polygon points={isoPoints([1, 0, H], [1, 1, H], [1, 1, 0], [1, 0, 0])} fill={floorWood} />
      <polygon points={isoPoints([1, 0, H], [1, 1, H], [1, 1, H - LIP], [1, 0, H - LIP])} fill={creamDark} />
      {/* doors */}
      <g fill="none" strokeWidth={2}>
        <polygon points={poly(door(0.1, lipV + 0.14), door(0.46, lipV + 0.14), door(0.46, 0.9), door(0.1, 0.9))} />
        <polygon points={poly(door(0.54, lipV + 0.14), door(0.9, lipV + 0.14), door(0.9, 0.9), door(0.54, 0.9))} />
      </g>
      <circle cx={door(0.4, 0.42).x} cy={door(0.4, 0.42).y} r={2} fill={ink} stroke="none" />
      <circle cx={door(0.6, 0.42).x} cy={door(0.6, 0.42).y} r={2} fill={ink} stroke="none" />
      {/* countertop */}
      <polygon points={isoPoints([0, 0, H], [1, 0, H], [1, 1, H], [0, 1, H])} fill={cream} />
    </g>
  )
}

function basin() {
  return (
    <g>
      <polygon points={isoPoints([0.3, 0.18, H], [0.86, 0.18, H], [0.86, 0.82, H], [0.3, 0.82, H])} fill={steel} strokeWidth={2} />
      <polygon points={isoPoints([0.37, 0.26, H], [0.79, 0.26, H], [0.79, 0.74, H], [0.37, 0.74, H])} fill={steelDark} strokeWidth={2} />
    </g>
  )
}

function faucet() {
  const base = iso(0.14, 0.5, H)
  const knob = iso(0.12, 0.76, H)
  const pipe = `M${base.x} ${base.y} V${base.y - 18} Q${base.x} ${base.y - 26} ${base.x + 7} ${base.y - 23} L${base.x + 9} ${base.y - 15}`
  return (
    <g fill="none">
      <path d={pipe} stroke={ink} strokeWidth={8} />
      <path d={pipe} stroke={steel} strokeWidth={3.5} />
      <ellipse cx={knob.x} cy={knob.y - 2} rx={3.5} ry={2.5} fill={steel} strokeWidth={2} />
    </g>
  )
}

function mug(x: number, y: number) {
  return (
    <g strokeWidth={2}>
      <path d={`M${x + 5} ${y - 7} q5 1 4 5 q-1 3 -4 2`} fill="none" />
      <path d={`M${x - 5} ${y - 10} V${y} a5 2.5 0 0 0 10 0 V${y - 10} Z`} fill={fabricBlue} />
      <ellipse cx={x} cy={y - 10} rx={5} ry={2.5} fill={steelDark} />
    </g>
  )
}

function pot(x: number, y: number) {
  return (
    <g strokeWidth={2}>
      <path d={`M${x + 8} ${y - 6} l8 -4`} strokeWidth={4} />
      <path d={`M${x - 9} ${y - 7} V${y} a9 4.5 0 0 0 18 0 V${y - 7} Z`} fill={warmRed} />
      <ellipse cx={x} cy={y - 7} rx={9} ry={4.5} fill={steelDark} />
      <ellipse cx={x - 1} cy={y - 7.5} rx={4} ry={1.6} fill={dirt} opacity={0.6} stroke="none" />
    </g>
  )
}

function messy1() {
  const c = iso(0.58, 0.5, H)
  return (
    <g>
      {plate(c.x, c.y - 1)}
      {plate(c.x + 1, c.y - 4.5, warmRed)}
      {mug(iso(0.2, 0.86, H).x, iso(0.2, 0.86, H).y + 2)}
      {smudge(iso(0.85, 0.9, H).x, iso(0.85, 0.9, H).y, 4)}
      {fly(c.x + 12, c.y - 30)}
    </g>
  )
}

function messy2() {
  const c = iso(0.58, 0.5, H)
  const drip = door(0.72, 0)
  return (
    <g>
      {/* smudges and a drip down the doors */}
      <path d={`M${drip.x - 3} ${drip.y + 6} q0 6 3 7 q3 -1 3 -7`} fill={sky} strokeWidth={2} />
      <ellipse cx={door(0.28, 0.65).x} cy={door(0.28, 0.65).y} rx={4} ry={3} fill={dirt} opacity={0.45} stroke="none" />
      <ellipse cx={door(0.8, 0.78).x} cy={door(0.8, 0.78).y} rx={3} ry={2.2} fill={dirt} opacity={0.45} stroke="none" />
      {smudge(iso(0.85, 0.9, H).x, iso(0.85, 0.9, H).y, 5)}
      {smudge(iso(0.25, 0.2, H).x + 4, iso(0.25, 0.2, H).y + 2, 3.5)}
      {/* the pile */}
      {pot(iso(0.7, 0.2, H).x, iso(0.7, 0.2, H).y + 1)}
      {plate(c.x, c.y - 1)}
      {plate(c.x + 1, c.y - 4.5, warmRed)}
      {plate(c.x - 1, c.y - 8, fabricBlue)}
      {plate(c.x + 0.5, c.y - 11.5)}
      <g transform={`rotate(-24 ${c.x} ${c.y - 15})`}>{plate(c.x, c.y - 15, warmRed)}</g>
      {mug(iso(0.2, 0.86, H).x, iso(0.2, 0.86, H).y + 2)}
      {mug(c.x - 7, c.y - 14)}
      {stink(c.x + 6, c.y - 26)}
      {fly(c.x + 14, c.y - 38, 'a')}
      {fly(c.x - 18, c.y - 30, 'b', true)}
      {fly(c.x + 4, c.y - 50, 'c')}
    </g>
  )
}

export const sinkArt: ObjectArt = {
  catalogId: 'sink',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {cabinet()}
      {basin()}
      {faucet()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
