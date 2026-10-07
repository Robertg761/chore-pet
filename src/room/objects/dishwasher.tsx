import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { box, COUNTER_H as H, handleBar, knob, LIP, poly, rightFace } from './kitchenParts'
import { fly, plate, stink } from './mess'
import type { ObjectArt } from './types'

// The dishwasher: counter height, a control strip under the worktop and a big
// door on the right-front face. messy2 drops the door open with a rack of
// dirty plates sliding out.

const { ink, steel, steelDark, cream, creamDark, white, sky, leaf, warmRed, fabricBlue, petDefault } = PALETTE

const door = rightFace(H)
const lipV = LIP / H
const U0 = 0.08
const U1 = 0.92
const DOOR_TOP = lipV + 0.26
const DOOR_BOT = 0.94

function line(a: { x: number; y: number }, b: { x: number; y: number }) {
  return `M${a.x} ${a.y} L${b.x} ${b.y}`
}

function body() {
  return (
    <g>
      {box(H, { left: steelDark, right: steel, top: cream, lip: true })}
      {/* control strip with three buttons */}
      <polygon
        points={poly(door(U0, lipV + 0.04), door(U1, lipV + 0.04), door(U1, lipV + 0.19), door(U0, lipV + 0.19))}
        fill={steelDark}
        strokeWidth={2}
      />
      {knob(door(0.22, lipV + 0.115), leaf, 1.6)}
      {knob(door(0.34, lipV + 0.115), sky, 1.6)}
      {knob(door(0.46, lipV + 0.115), warmRed, 1.6)}
    </g>
  )
}

function closedDoor() {
  return (
    <g>
      <polygon points={poly(door(U0, DOOR_TOP), door(U1, DOOR_TOP), door(U1, DOOR_BOT), door(U0, DOOR_BOT))} fill="none" strokeWidth={2} />
      {handleBar(door(0.2, DOOR_TOP + 0.1), door(0.8, DOOR_TOP + 0.1))}
      <polygon points={poly(door(0.24, 0.58), door(0.76, 0.58), door(0.76, 0.84), door(0.24, 0.84))} fill={sky} strokeWidth={2} />
      <path d={line(door(0.34, 0.8), door(0.44, 0.64))} stroke={white} strokeWidth={1.5} />
    </g>
  )
}

function messy1() {
  const c = iso(0.55, 0.45, H)
  return (
    <g>
      {plate(c.x, c.y - 1)}
      {plate(c.x + 1, c.y - 4.5, warmRed)}
      {plate(c.x - 1, c.y - 8, fabricBlue)}
      {plate(c.x + 0.5, c.y - 11.5, petDefault)}
      {fly(c.x + 14, c.y - 28)}
    </g>
  )
}

/** The door folded down on its bottom hinge with the rack slid out over it. */
function messy2() {
  const zb = 3 // hinge height
  const zt = 8 // door's free edge, folded almost flat
  const reach = 0.45
  const u0 = 0.12
  const u1 = 0.88
  const p = (tx: number, ty: number, z: number) => iso(tx, ty, z)
  // a spot on the folded-down door: s runs hinge to free edge, t back to front
  const rack = (s: number, t: number) => p(1 + s * reach, u0 + t * (u1 - u0), zb + s * (zt - zb))
  const stack = rack(0.55, 0.5)
  return (
    <g>
      {/* the open belly, with a rack inside */}
      <polygon points={poly(door(U0, DOOR_TOP), door(U1, DOOR_TOP), door(U1, DOOR_BOT), door(U0, DOOR_BOT))} fill={creamDark} strokeWidth={2} />
      <path d={line(door(U0, 0.5), door(U1, 0.5))} strokeWidth={1.5} />
      {/* the folded-down door, showing its inside */}
      <polygon points={poly(rack(0, 0), rack(0, 1), rack(1, 1), rack(1, 0))} fill={steel} strokeWidth={2.5} />
      {/* wire rack with dirty plates standing in it */}
      <polygon points={poly(rack(0.15, 0.1), rack(0.15, 0.9), rack(0.9, 0.9), rack(0.9, 0.1))} fill="none" strokeWidth={1.5} />
      {[0.3, 0.5, 0.7].map((t) => (
        <path key={t} d={line(rack(0.15, t), rack(0.9, t))} strokeWidth={1} />
      ))}
      {plate(stack.x, stack.y - 1.5, warmRed)}
      {plate(stack.x + 1, stack.y - 5)}
      {plate(stack.x, stack.y - 8.5, petDefault)}
      <g transform={`rotate(-22 ${stack.x} ${stack.y - 12})`}>{plate(stack.x, stack.y - 12, fabricBlue)}</g>
      {stink(stack.x - 14, stack.y - 16)}
      {fly(stack.x + 8, stack.y - 28, 'a')}
      {fly(stack.x - 24, stack.y - 34, 'b', true)}
      {fly(stack.x - 6, stack.y - 46, 'c')}
    </g>
  )
}

export const dishwasherArt: ObjectArt = {
  catalogId: 'dishwasher',
  footprint: { w: 1, d: 1 },
  bounds: { x: -46, y: -88, width: 92, height: 128 },
  cueY: -35,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {body()}
      {stage !== 'messy2' && closedDoor()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
