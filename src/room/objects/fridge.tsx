import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { box, handleBar, magnet, poly, rightFace } from './kitchenParts'
import { fly, stink } from './mess'
import type { ObjectArt } from './types'

// The fridge: about 2.4x the counter height, two doors on the right-front face
// (freezer above, fridge below) with chunky handles and a couple of magnets.

const { ink, cream, creamDark, white, sky, warmRed, fabricBlue, leaf, petDefault } = PALETTE

const FH = 82 // 2.4 x the 34 counter height
const door = rightFace(FH)

// door rectangles as [v top, v bottom]
const FREEZER: [number, number] = [0.04, 0.3]
const FRIDGE: [number, number] = [0.34, 0.96]

function rect(u0: number, u1: number, [v0, v1]: [number, number]) {
  return poly(door(u0, v0), door(u1, v0), door(u1, v1), door(u0, v1))
}

function frame() {
  return (
    <g>
      {box(FH, { left: creamDark, right: cream, top: white })}
      <polygon points={rect(0.08, 0.92, FREEZER)} fill="none" strokeWidth={2} />
      {handleBar(door(0.8, 0.1), door(0.8, 0.22))}
    </g>
  )
}

function lowerDoor() {
  return (
    <g>
      <polygon points={rect(0.08, 0.92, FRIDGE)} fill="none" strokeWidth={2} />
      {handleBar(door(0.8, 0.4), door(0.8, 0.56))}
    </g>
  )
}

function magnets() {
  return (
    <g>
      {magnet(door(0.3, 0.14), warmRed)}
      {magnet(door(0.5, 0.2), fabricBlue)}
    </g>
  )
}

/** The lower door swung a little open on its back hinge, cold light spilling out. */
function ajarDoor() {
  const [v0, v1] = FRIDGE
  const zt = FH * (1 - v0)
  const zb = FH * (1 - v1)
  const hinge = 0.08
  const reach = 0.84 // door width in tiles
  const a = (16 * Math.PI) / 180
  const tx = 1 + reach * Math.sin(a)
  const ty = hinge + reach * Math.cos(a)
  const p = (x: number, y: number, z: number) => iso(x, y, z)
  const inner = (u: number, v: number) => door(u, v)
  return (
    <g>
      {/* cold glow on the floor and the dark opening */}
      <ellipse cx={iso(1.1, 0.8, 0).x} cy={iso(1.1, 0.8, 0).y} rx={20} ry={7} fill={sky} stroke="none" opacity={0.45} />
      <polygon points={rect(hinge, 0.92, FRIDGE)} fill={sky} strokeWidth={2} />
      {[0.55, 0.75].map((v) => (
        <path key={v} d={`M${inner(hinge, v).x} ${inner(hinge, v).y} L${inner(0.92, v).x} ${inner(0.92, v).y}`} strokeWidth={1.5} fill="none" />
      ))}
      <ellipse cx={inner(0.7, 0.68).x} cy={inner(0.7, 0.68).y} rx={4} ry={3} fill={leaf} strokeWidth={1.5} />
      {/* the door itself */}
      <polygon
        points={poly(p(1, hinge, zt), p(tx, ty, zt), p(tx, ty, zb), p(1, hinge, zb))}
        fill={cream}
        strokeWidth={ROOM_STROKE}
      />
      {handleBar(p(tx, ty - 0.1, zt - 10), p(tx, ty - 0.1, zt - 26))}
    </g>
  )
}

function messy1() {
  const note = (u: number, v: number) => door(u, v)
  const [a, b, c, d] = [note(0.38, 0.42), note(0.62, 0.42), note(0.62, 0.52), note(0.38, 0.52)]
  const base = door(0.72, 0.97)
  return (
    <g>
      {/* sticky note with a smiley */}
      <polygon points={poly(a, b, c, d)} fill={petDefault} strokeWidth={1.5} />
      <circle cx={door(0.45, 0.46).x} cy={door(0.45, 0.46).y} r={0.8} fill={ink} stroke="none" />
      <circle cx={door(0.55, 0.46).x} cy={door(0.55, 0.46).y} r={0.8} fill={ink} stroke="none" />
      <path d={`M${door(0.47, 0.49).x} ${door(0.47, 0.49).y} q3 2 6 -1`} fill="none" strokeWidth={1.2} />
      {/* a small spill running down to a puddle at the base */}
      <path d={`M${door(0.72, 0.62).x - 2.5} ${door(0.72, 0.62).y} v14 q0 3 2.5 3 q2.5 0 2.5 -3 v-14 Z`} fill={white} strokeWidth={1.5} />
      <ellipse cx={base.x} cy={base.y + 1} rx={13} ry={4.5} fill={white} strokeWidth={2} />
      <ellipse cx={base.x - 3} cy={base.y} rx={4} ry={1.4} fill={creamDark} stroke="none" />
      {fly(-14, -85)}
    </g>
  )
}

function messy2() {
  const base = door(0.5, 1)
  return (
    <g>
      {ajarDoor()}
      {/* one magnet clings on, the others have fallen to the floor */}
      {magnet(door(0.3, 0.14), warmRed)}
      {magnet({ x: base.x + 14, y: base.y + 3 }, fabricBlue)}
      {magnet({ x: base.x + 2, y: base.y + 5 }, petDefault)}
      {stink(24, -22)}
      {fly(-20, -52, 'a', true)}
      {fly(14, -86, 'b')}
    </g>
  )
}

export const fridgeArt: ObjectArt = {
  catalogId: 'fridge',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -100, width: 72, height: 138 },
  cueY: -84,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {frame()}
      {stage !== 'messy2' && lowerDoor()}
      {stage !== 'messy2' && magnets()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
