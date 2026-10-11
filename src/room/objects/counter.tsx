import type { ReactNode } from 'react'
import { mix } from '../../art/color'
import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso, isoPoints } from '../iso'
import { COUNTER_H as H, drip, LIP, poly, rightFace } from './kitchenParts'
import { fly, smudge, stink } from './mess'
import { softBox } from './shapes3'
import { bowl, crumbs, mug } from './tableware'
import type { ObjectArt } from './types'

// The counter: a 1x2 run of base cabinets. Same height (34), lip, doors, knobs
// and colours as the sink, so it sits flush beside the sink and stove as one
// fitted kitchen. At rotation 0 its back is against the left wall (tx = 0), the
// doors face right-front and it runs two tiles along ty.

const { ink, woodDark, floorWood, cream, creamDark, steel, steelDark, white, warmRed, sky, dirt, petDefault } = PALETTE

const LEN = 2 // tiles along the wall
const door = rightFace(H)
const lipV = LIP / H

// Chopping board: one step lighter than floor-wood, like the table tops.
const BOARD = mix(floorWood, white, 0.32)

function cabinet() {
  const tiles = Array.from({ length: LEN }, (_, i) => i)
  return (
    <g>
      {/* left-front end panel */}
      <polygon points={isoPoints([0, LEN, H], [1, LEN, H], [1, LEN, 0], [0, LEN, 0])} fill={woodDark} />
      <polygon points={isoPoints([0, LEN, H], [1, LEN, H], [1, LEN, H - LIP], [0, LEN, H - LIP])} fill={creamDark} />
      {/* right-front door run */}
      <polygon points={isoPoints([1, 0, H], [1, LEN, H], [1, LEN, 0], [1, 0, 0])} fill={floorWood} />
      <polygon points={isoPoints([1, 0, H], [1, LEN, H], [1, LEN, H - LIP], [1, 0, H - LIP])} fill={creamDark} />
      {/* two doors per tile, exactly the sink's spacing */}
      <g fill="none" strokeWidth={2}>
        {tiles.flatMap((i) =>
          [
            [0.1, 0.46],
            [0.54, 0.9],
          ].map(([a, b]) => (
            <polygon
              key={`${i}-${a}`}
              points={poly(door(i + a, lipV + 0.14), door(i + b, lipV + 0.14), door(i + b, 0.9), door(i + a, 0.9))}
            />
          )),
        )}
      </g>
      {tiles.flatMap((i) =>
        [0.4, 0.6].map((u) => {
          const p = door(i + u, 0.42)
          return <circle key={`${i}-${u}`} cx={p.x} cy={p.y} r={2} fill={ink} stroke="none" />
        }),
      )}
      {/* worktop */}
      <polygon points={isoPoints([0, 0, H], [1, 0, H], [1, LEN, H], [0, LEN, H])} fill={cream} />
    </g>
  )
}

/** A wooden spoon, spatula and whisk in a little steel jar. */
function utensilJar(tx: number, ty: number) {
  const p = iso(tx, ty, H)
  const stick = (dx: number, dy: number, colour: string, head: ReactNode) => (
    <g fill="none" strokeLinecap="round">
      <path d={`M${p.x} ${p.y - 8} l${dx} ${dy}`} stroke={ink} strokeWidth={4.5} />
      <path d={`M${p.x} ${p.y - 8} l${dx} ${dy}`} stroke={colour} strokeWidth={1.6} />
      {head}
    </g>
  )
  return (
    <g>
      {stick(-5, -17, floorWood, <ellipse cx={p.x - 5.4} cy={p.y - 27} rx={3.3} ry={2.4} fill={floorWood} strokeWidth={2} />)}
      {stick(5, -15, warmRed, <rect x={p.x + 2.4} y={p.y - 29} width={5.4} height={5} rx={1.4} fill={warmRed} strokeWidth={2} />)}
      {stick(0, -19, steel, <ellipse cx={p.x} cy={p.y - 25.5} rx={2.4} ry={3.4} fill="none" stroke={ink} strokeWidth={1.8} />)}
      <path d={`M${p.x - 6} ${p.y - 10} V${p.y} a6 3 0 0 0 12 0 V${p.y - 10} Z`} fill={steel} strokeWidth={2} />
      <ellipse cx={p.x} cy={p.y - 10} rx={6} ry={3} fill={steelDark} strokeWidth={2} />
      <path d={`M${p.x - 4.5} ${p.y - 6} q4.5 2.2 9 0`} fill="none" stroke={white} strokeWidth={1.4} />
    </g>
  )
}

/** A chopping board with two tomato slices, lying flat on the worktop. */
function board() {
  const slice = (tx: number, ty: number) => {
    const p = iso(tx, ty, H + 2)
    return (
      <g key={`${tx}-${ty}`} strokeWidth={1.5}>
        <ellipse cx={p.x} cy={p.y} rx={4.6} ry={2.4} fill={warmRed} />
        <ellipse cx={p.x} cy={p.y} rx={2.2} ry={1} fill={white} stroke="none" opacity={0.8} />
      </g>
    )
  }
  const hole = iso(0.56, 1.76, H + 2)
  return (
    <g>
      <g strokeWidth={2}>{softBox({ x0: 0.3, x1: 0.82, y0: 1.18, y1: 1.88, z0: H, z1: H + 2, top: BOARD, left: woodDark, right: floorWood, r: 2 })}</g>
      <ellipse cx={hole.x} cy={hole.y} rx={2.2} ry={1.1} fill={ink} stroke="none" opacity={0.7} />
      {slice(0.5, 1.34)}
      {slice(0.62, 1.52)}
    </g>
  )
}

function clean() {
  return (
    <g>
      {board()}
      {utensilJar(0.24, 0.3)}
    </g>
  )
}

/** A spill on the worktop: a flat puddle with a glossy dot. */
function puddle(tx: number, ty: number, rx: number, fill: string) {
  const p = iso(tx, ty, H)
  return (
    <g>
      <ellipse cx={p.x} cy={p.y} rx={rx} ry={rx / 2} fill={fill} strokeWidth={2} />
      <ellipse cx={p.x - rx * 0.3} cy={p.y - rx * 0.1} rx={rx * 0.25} ry={rx * 0.1} fill={white} opacity={0.7} stroke="none" />
    </g>
  )
}

function messy1() {
  const m = iso(0.5, 0.92, H)
  return (
    <g>
      {puddle(0.8, 0.62, 7, sky)}
      {crumbs([[0.4, 0.5], [0.55, 0.42], [0.3, 1.05], [0.7, 0.95], [0.62, 1.1]], H)}
      {mug(m.x, m.y + 1, { dirty: true })}
      {fly(m.x + 34, m.y - 20)}
    </g>
  )
}

/** A takeout carton with a wire handle and noodles poking out. */
function takeout(x: number, y: number) {
  const body = `M${x - 7} ${y - 14} L${x - 5} ${y} a5 2.5 0 0 0 10 0 L${x + 7} ${y - 14} Z`
  return (
    <g strokeWidth={2}>
      <path d={`M${x - 6} ${y - 14} q6 -12 12 0`} fill="none" strokeWidth={1.5} />
      <path d={body} fill={white} />
      <path d={`M${x - 6.3} ${y - 9} L${x - 5.6} ${y - 4} L${x + 5.6} ${y - 4} L${x + 6.3} ${y - 9} Z`} fill={warmRed} stroke="none" />
      <path d={body} fill="none" />
      <ellipse cx={x} cy={y - 14} rx={7} ry={3.5} fill={creamDark} />
      <path d={`M${x - 4} ${y - 14.5} q2 -3 4 0 q2 -3 4 0`} fill="none" stroke={dirt} strokeWidth={1.8} />
    </g>
  )
}

function messy2() {
  const b = iso(0.5, 0.58, H)
  const t = iso(0.56, 1.5, H)
  const edge = iso(1, 0.78, H)
  const stain = door(0.3, 0.55)
  return (
    <g>
      {/* sticky spill running off the front edge and down the doors */}
      {puddle(0.82, 0.8, 10, petDefault)}
      {drip(edge.x, edge.y + 1, petDefault, 10)}
      <ellipse cx={stain.x} cy={stain.y} rx={4} ry={3} fill={dirt} opacity={0.45} stroke="none" />
      <ellipse cx={door(1.3, 0.7).x} cy={door(1.3, 0.7).y} rx={3.2} ry={2.4} fill={dirt} opacity={0.45} stroke="none" />
      {smudge(iso(0.9, 1.15, H).x, iso(0.9, 1.15, H).y, 4)}
      {crumbs([[0.3, 0.55], [0.4, 1.0], [0.2, 0.85], [0.65, 0.3], [0.82, 1.1], [0.8, 1.45], [0.35, 1.1], [0.9, 0.9]], H)}
      {/* a wobbly tower of dirty bowls, and a takeout box sitting on the board */}
      {takeout(t.x, t.y + 1)}
      {bowl(b.x, b.y + 1, white, undefined, 'a')}
      {bowl(b.x + 0.5, b.y - 3, warmRed, undefined, 'b')}
      {bowl(b.x - 0.5, b.y - 7, white, undefined, 'c')}
      <g transform={`rotate(-10 ${b.x} ${b.y - 11})`}>{bowl(b.x, b.y - 11, PALETTE.fabricBlue, dirt)}</g>
      {mug(iso(0.86, 1.22, H).x, iso(0.86, 1.22, H).y + 2, { dirty: true, tipped: true })}
      {stink(b.x - 14, b.y - 18)}
      {fly(b.x + 16, b.y - 28, 'a')}
      {fly(b.x - 22, b.y - 40, 'b', true)}
      {fly(t.x + 8, t.y - 32, 'c')}
    </g>
  )
}

export const counterArt: ObjectArt = {
  catalogId: 'counter',
  footprint: { w: 1, d: 2 },
  bounds: { x: -68, y: -92, width: 104, height: 144 },
  cueY: -45,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {cabinet()}
      {clean()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
