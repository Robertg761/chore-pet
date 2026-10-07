import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso, isoPoints } from '../iso'
import { box, drum, onRight, ring } from './batch2-parts'
import { fly, smudge, stink } from './mess'
import type { ObjectArt } from './types'

// A rounded toilet, 1x1 against the left wall: the tank sits at the wall
// (tx = 0) and the bowl faces the right-front side. White and cream with a
// steel flush. Bounds match the sink.

const { ink, white, cream, creamDark, steel, steelDark, sky, warmRed, dirt, floorWood, woodDark } = PALETTE

const TANK_TOP = 38
const RIM = 18
const BOWL = { cx: 0.64, cy: 0.5, a: 0.35, b: 0.31 }

function tank() {
  return (
    <g>
      {box({ x0: 0.08, x1: 0.32, y0: 0.26, y1: 0.74, z0: 0, z1: 8, top: white, right: cream, left: creamDark })}
      {box({ x0: 0.04, x1: 0.36, y0: 0.12, y1: 0.88, z0: 6, z1: TANK_TOP, top: white, right: cream, left: creamDark })}
      {/* lid */}
      {box({ x0: 0.02, x1: 0.38, y0: 0.1, y1: 0.9, z0: TANK_TOP, z1: TANK_TOP + 4, top: white, right: cream, left: creamDark })}
      {drum({ cx: 0.2, cy: 0.5, a: 0.07, b: 0.07, z0: TANK_TOP + 4, z1: TANK_TOP + 7, top: steel, side: steel })}
      {/* flush lever on the front of the tank */}
      {onRight(
        0.36,
        1,
        <g strokeWidth={2}>
          <rect x={18} y={-31} width={11} height={4} rx={2} fill={steel} />
          <circle cx={19} cy={-29} r={3.4} fill={steel} />
        </g>,
      )}
    </g>
  )
}

function bowl(seatDown: boolean, stained: boolean) {
  const { cx, cy, a, b } = BOWL
  const rimZ = seatDown ? RIM + 3 : RIM
  return (
    <g>
      {drum({ cx, cy, a: a - 0.1, b: b - 0.09, z0: 0, z1: 8, top: cream, side: cream })}
      {drum({ cx, cy, a, b, z0: 8, z1: RIM, top: white, side: cream })}
      {seatDown && drum({ cx, cy, a, b, z0: RIM, z1: RIM + 3, top: white, side: white, shade: 0.12 })}
      <polygon points={ring(cx + 0.02, cy, a - 0.11, b - 0.1, rimZ)} fill={steelDark} />
      <polygon points={ring(cx + 0.03, cy + 0.01, a - 0.18, b - 0.17, rimZ)} fill={sky} strokeWidth={1.5} />
      {/* the funny ring around the water line */}
      {stained && <polygon points={ring(cx + 0.03, cy + 0.01, a - 0.15, b - 0.14, rimZ)} fill="none" stroke={dirt} strokeWidth={2.5} opacity={0.7} />}
    </g>
  )
}

/** The seat flipped up against the tank. */
function seatUp() {
  return onRight(
    0.4,
    1,
    <g>
      <ellipse cx={16} cy={-32} rx={13} ry={13.5} fill={white} />
      <ellipse cx={16} cy={-31} rx={8} ry={8.5} fill={creamDark} strokeWidth={2} />
    </g>,
  )
}

function roll() {
  const c = { x: 0.84, y: 0.1 }
  return (
    <g>
      {/* a trailing strip of paper on the floor */}
      <polygon points={isoPoints([0.8, 0.14, 0.5], [0.42, 0.1, 0.5], [0.4, 0.17, 0.5], [0.78, 0.2, 0.5])} fill={white} strokeWidth={1.5} />
      {drum({ cx: c.x, cy: c.y, a: 0.1, b: 0.1, z0: 0, z1: 11, top: floorWood, side: floorWood })}
      <polygon points={ring(c.x, c.y, 0.06, 0.06, 11)} fill={woodDark} strokeWidth={1.5} />
    </g>
  )
}

function plunger() {
  const base = iso(0.16, 0.9, 0)
  const x = base.x
  const y = base.y
  return (
    <g>
      <path d={`M${x + 1} ${y - 8} L${x + 15} ${y - 40}`} fill="none" stroke={ink} strokeWidth={6} />
      <path d={`M${x + 1} ${y - 8} L${x + 15} ${y - 40}`} fill="none" stroke={floorWood} strokeWidth={2.4} />
      <path d={`M${x - 7} ${y} Q${x - 8} ${y - 10} ${x} ${y - 10} Q${x + 8} ${y - 10} ${x + 7} ${y} Q${x} ${y + 3} ${x - 7} ${y} Z`} fill={warmRed} strokeWidth={2} />
    </g>
  )
}

function messy1() {
  const lid = iso(0.2, 0.7, TANK_TOP + 4)
  return (
    <g>
      {smudge(lid.x, lid.y, 4)}
      {fly(iso(0.6, 0.5, 36).x + 12, iso(0.6, 0.5, 36).y - 22)}
    </g>
  )
}

function messy2() {
  const top = iso(0.4, 0.5, TANK_TOP)
  return (
    <g>
      {plunger()}
      {stink(top.x + 18, top.y - 10)}
      {fly(top.x + 30, top.y - 28, 'a')}
      {fly(top.x - 14, top.y - 22, 'b', true)}
      {fly(top.x + 6, top.y - 40, 'c')}
    </g>
  )
}

export const toiletArt: ObjectArt = {
  catalogId: 'toilet',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  cueY: -42,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {stage === 'messy1' && roll()}
      {tank()}
      {bowl(stage !== 'messy2', stage === 'messy2')}
      {stage === 'messy2' && seatUp()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
