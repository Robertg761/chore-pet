import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { box, COUNTER_H as H, handleBar, knob, LIP, poly, puff, rightFace } from './kitchenParts'
import { fly, smudge, stink } from './mess'
import type { ObjectArt } from './types'

// The stove: a counter-height range (H = 34, level with the sink) with a hob on
// top and an oven door with a window on the right-front face.

const { ink, steel, steelDark, cream, creamDark, white, fabricBlue, warmRed, dirt, sky } = PALETTE

const door = rightFace(H)
const lipV = LIP / H

function body() {
  const v0 = lipV + 0.1 // oven door top
  const v1 = 0.93
  return (
    <g>
      {box(H, { left: steelDark, right: steel, top: cream, lip: true })}
      {/* dials along the lip */}
      {[0.25, 0.5, 0.75].map((u) => knob(door(u, lipV / 2), ink, 1.5, u))}
      {/* oven door, handle and window */}
      <polygon points={poly(door(0.1, v0), door(0.9, v0), door(0.9, v1), door(0.1, v1))} fill="none" strokeWidth={2} />
      {handleBar(door(0.2, v0 + 0.1), door(0.8, v0 + 0.1))}
      <polygon points={poly(door(0.22, 0.45), door(0.78, 0.45), door(0.78, 0.8), door(0.22, 0.8))} fill={sky} strokeWidth={2} />
      <path d={`M${door(0.32, 0.72).x} ${door(0.32, 0.72).y} L${door(0.44, 0.52).x} ${door(0.44, 0.52).y}`} stroke={white} strokeWidth={1.5} />
    </g>
  )
}

const BURNERS: [number, number][] = [
  [0.28, 0.28],
  [0.28, 0.72],
  [0.72, 0.28],
  [0.72, 0.72],
]

function hob() {
  return (
    <g>
      {BURNERS.map(([tx, ty]) => {
        const p = iso(tx, ty, H)
        return (
          <g key={`${tx}-${ty}`}>
            <ellipse cx={p.x} cy={p.y} rx={8} ry={4} fill={steelDark} strokeWidth={2} />
            <ellipse cx={p.x} cy={p.y} rx={4} ry={2} fill="none" strokeWidth={1.5} />
          </g>
        )
      })}
    </g>
  )
}

/** A low frying pan; `content` fills it. */
function pan(x: number, y: number, content?: string, key?: string) {
  return (
    <g key={key} strokeWidth={2}>
      <path d={`M${x + 8} ${y - 3} l9 -4`} strokeWidth={4} />
      <path d={`M${x - 9} ${y - 4} V${y} a9 4.5 0 0 0 18 0 V${y - 4} Z`} fill={fabricBlue} />
      <ellipse cx={x} cy={y - 4} rx={9} ry={4.5} fill={steelDark} />
      {content && <ellipse cx={x} cy={y - 4} rx={6.5} ry={3} fill={content} stroke="none" />}
    </g>
  )
}

/** A tall pot with a lid and knob. */
function pot(x: number, y: number, lidShift = 0) {
  return (
    <g strokeWidth={2}>
      <path d={`M${x - 9} ${y - 12} V${y} a9 4.5 0 0 0 18 0 V${y - 12} Z`} fill={steel} />
      <ellipse cx={x} cy={y - 12 - lidShift} rx={9.5} ry={4.8} fill={steelDark} />
      <circle cx={x} cy={y - 15 - lidShift} r={2} fill={ink} stroke="none" />
    </g>
  )
}

/** Clean stove: a pot and a pan waiting on the hob. */
function cleanPots() {
  const a = iso(0.28, 0.28, H)
  const b = iso(0.72, 0.28, H)
  return (
    <g>
      {pot(a.x, a.y + 1)}
      {pan(b.x, b.y + 1, steel)}
    </g>
  )
}

function messy1() {
  const b = iso(0.72, 0.28, H)
  const a = iso(0.28, 0.28, H)
  const d = door(0.72, 0.27)
  return (
    <g>
      {/* splash on the oven door */}
      <ellipse cx={door(0.34, 0.62).x} cy={door(0.34, 0.62).y} rx={4} ry={3} fill={warmRed} stroke="none" opacity={0.9} />
      <circle cx={door(0.52, 0.58).x} cy={door(0.52, 0.58).y} r={1.8} fill={warmRed} stroke="none" opacity={0.9} />
      <circle cx={door(0.26, 0.5).x} cy={door(0.26, 0.5).y} r={1.3} fill={warmRed} stroke="none" opacity={0.9} />
      <path d={`M${d.x - 2.5} ${d.y} v9 q0 3.5 2.5 3.5 q2.5 0 2.5 -3.5 v-9 Z`} fill={warmRed} strokeWidth={1.5} />
      {smudge(iso(0.5, 0.92, H).x, iso(0.5, 0.92, H).y, 4)}
      {/* pot, and a pan of sauce with a drip over the edge */}
      {pot(a.x, a.y + 1)}
      {pan(b.x, b.y + 1, warmRed)}
      <path
        d={`M${b.x + 5} ${b.y + 1.5} v5 q0 3 2.5 3 q2.5 0 2.5 -3 v-5 Z`}
        fill={warmRed}
        strokeWidth={1.5}
      />
      {fly(b.x + 14, b.y - 26)}
    </g>
  )
}

function messy2() {
  const a = iso(0.28, 0.28, H)
  const b = iso(0.72, 0.28, H)
  const c = iso(0.72, 0.72, H)
  const d = door(0.6, lipV + 0.1)
  return (
    <g>
      {/* boil-over stain across the hob and down the oven door */}
      <ellipse cx={a.x + 2} cy={a.y + 5} rx={13} ry={5.5} fill={creamDark} stroke="none" />
      <ellipse cx={a.x + 3} cy={a.y + 5} rx={11} ry={4.5} fill={dirt} opacity={0.45} stroke="none" />
      {smudge(iso(0.5, 0.92, H).x, iso(0.5, 0.92, H).y, 5)}
      <path d={`M${d.x - 3} ${d.y} v14 q0 4 3 4 q3 0 3 -4 v-14 Z`} fill={creamDark} strokeWidth={2} />
      <ellipse cx={door(0.28, 0.7).x} cy={door(0.28, 0.7).y} rx={4} ry={3} fill={dirt} opacity={0.45} stroke="none" />
      {/* the boiling-over pot: lid popped, foam piling out */}
      <g strokeWidth={2}>
        {pot(a.x, a.y + 1, 3)}
        <g fill={white} strokeWidth={1.5}>
          <circle cx={a.x - 6} cy={a.y - 17} r={4} />
          <circle cx={a.x + 5} cy={a.y - 18} r={4.5} />
          <circle cx={a.x} cy={a.y - 21} r={4} />
        </g>
        <path d={`M${a.x - 9} ${a.y - 10} v10 q0 3 2.5 3 q2.5 0 2.5 -3 v-8 Z`} fill={white} />
      </g>
      {/* a crusty pan and a burnt one stacked on top of it */}
      {pan(b.x, b.y + 1, dirt)}
      <ellipse cx={b.x - 2} cy={b.y - 4.5} rx={3} ry={1.3} fill={ink} opacity={0.5} stroke="none" />
      {pan(c.x, c.y + 1, dirt)}
      {pan(c.x + 1, c.y - 3, dirt)}
      <ellipse cx={c.x} cy={c.y - 7} rx={4} ry={1.6} fill={ink} opacity={0.5} stroke="none" />
      {/* smoke-ish stink */}
      {puff(c.x + 4, c.y - 15, 3.5)}
      {puff(c.x + 10, c.y - 23, 3)}
      {stink(b.x + 12, b.y - 14)}
      {fly(a.x + 18, a.y - 34, 'a')}
      {fly(a.x - 14, a.y - 36, 'b', true)}
      {fly(b.x + 12, b.y - 40, 'c')}
    </g>
  )
}

export const stoveArt: ObjectArt = {
  catalogId: 'stove',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {body()}
      {hob()}
      {stage === 'clean' && cleanPots()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}

