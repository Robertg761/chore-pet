import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { DUST, darker, dustSpecks, lighter } from './decorParts'
import { cobweb, dustBunny } from './lamp'
import { poly, softBox } from './shapes3'
import type { ObjectArt } from './types'

// A short wooden bookcase with two shelves of chunky books, one leaning, and a
// tiny potted plant on top. 1x1 at rotation 0: the back sits against the left
// wall (tx = 0), the open shelves face the right-front side (tx = D). It has no
// chores, but if a player adds one the dust settles: messy1 is dusty tops and a
// cobweb strand, messy2 adds a friendly cobweb in the corner and dust bunnies.

const { ink, woodDark, floorWood, warmRed, fabricBlue, leaf, leafDark, petDefault, blush, cream } = PALETTE

const INNER = mix(woodDark, ink, 0.5) // the dim inside of the case
const INNER_SIDE = mix(woodDark, ink, 0.28) // inside wall, catches a little more light

const D = 0.62 // case depth along tx
const Y0 = 0.02 // case extent along ty
const Y1 = 0.98
const H = 60 // case height
const OY0 = 0.1 // shelf opening extent along ty
const OY1 = 0.9
const FLOOR = 6 // inside bottom of the case
const MID_BOARD = [28, 32] as const // the middle shelf board, bottom and top
const CEIL = 54 // inside top of the case
const BX0 = D - 0.34 // books stand this far back and stop just short of the front
const BX1 = D - 0.06

/** A point on the front (right-front) plane. */
const front = (ty: number, z: number) => iso(D, ty, z)

function carcass() {
  return <g>
    {/* The back is a thin board, behind the depth occupied by the books. */}
    {softBox({ x0: 0, x1: 0.07, y0: Y0, y1: Y1, z0: 0, z1: H, top: lighter(floorWood), left: woodDark, right: INNER, r: 1 })}
    {/* Far side first; the near side is drawn over the shelf contents below. */}
    {softBox({ x0: 0, x1: D, y0: Y0, y1: OY0, z0: 0, z1: H, top: lighter(floorWood), left: INNER_SIDE, right: floorWood, r: 1 })}
  </g>
}

/** Kept as a separate layer so legacy appearance rendering retains its slots. */
function opening() {
  return null
}

function board(z0: number, z1: number) {
  return softBox({ x0: 0.04, x1: D, y0: OY0, y1: OY1, z0, z1, top: lighter(floorWood), left: woodDark, right: floorWood, r: 1 })
}

interface BookSpec {
  ty: number
  w: number
  h: number
  colour: string
  /** Lean along ty: the top sits this far over. */
  lean?: number
}

/** A chunky book standing on a shelf: spine to the front, a pale band, three shaded faces. */
function book({ ty, w, h, colour, lean = 0 }: BookSpec, z0: number, key: number) {
  const ty1 = ty + w
  const at = (x: number, t: number, ty0: number) => iso(x, ty0 + lean * t, z0 + h * t)
  const spine = poly(at(BX1, 0, ty), at(BX1, 0, ty1), at(BX1, 1, ty1), at(BX1, 1, ty))
  const side = poly(at(BX0, 0, ty1), at(BX1, 0, ty1), at(BX1, 1, ty1), at(BX0, 1, ty1))
  const top = poly(at(BX0, 1, ty), at(BX1, 1, ty), at(BX1, 1, ty1), at(BX0, 1, ty1))
  const band = poly(at(BX1, 0.58, ty), at(BX1, 0.58, ty1), at(BX1, 0.72, ty1), at(BX1, 0.72, ty))
  return (
    <g key={key} strokeWidth={2.5}>
      <polygon points={side} fill={darker(colour)} />
      <polygon points={spine} fill={colour} />
      <polygon points={band} fill={cream} opacity={0.85} stroke="none" />
      <polygon points={top} fill={lighter(colour)} />
    </g>
  )
}

const LOWER: BookSpec[] = [
  { ty: 0.14, w: 0.15, h: 18, colour: fabricBlue },
  { ty: 0.29, w: 0.12, h: 15, colour: warmRed },
  { ty: 0.41, w: 0.16, h: 19, colour: leaf },
  { ty: 0.57, w: 0.12, h: 16, colour: petDefault },
  { ty: 0.69, w: 0.14, h: 17, colour: blush },
]
const UPPER: BookSpec[] = [
  { ty: 0.14, w: 0.14, h: 19, colour: petDefault },
  { ty: 0.28, w: 0.13, h: 15, colour: fabricBlue },
  { ty: 0.41, w: 0.15, h: 20, colour: warmRed },
  // leaning against the red one
  { ty: 0.66, w: 0.14, h: 19, colour: blush, lean: -0.1 },
]

function shelves() {
  return <g>
    {board(0, FLOOR)}
    {LOWER.map((b, i) => book(b, FLOOR, i))}
    {board(...MID_BOARD)}
    {UPPER.map((b, i) => book(b, MID_BOARD[1], i))}
    {softBox({ x0: 0, x1: D, y0: OY1, y1: Y1, z0: 0, z1: H, top: lighter(floorWood), left: woodDark, right: floorWood, r: 1 })}
    {softBox({ x0: 0, x1: D, y0: Y0, y1: Y1, z0: CEIL, z1: H, top: lighter(floorWood), left: woodDark, right: floorWood, r: 1 })}
  </g>
}

/** A tiny potted plant on the top board. */
function plant() {
  const p = iso(0.3, 0.6, H)
  const x = p.x
  const y = p.y + 1
  const leafAt = (dx: number, dy: number, rot: number, fill: string) => (
    <ellipse cx={x + dx} cy={y + dy} rx={3.1} ry={5.6} fill={fill} transform={`rotate(${rot} ${x + dx} ${y + dy})`} />
  )
  return (
    <g>
      <ellipse cx={x} cy={y} rx={7} ry={3.2} fill={ink} fillOpacity={0.15} stroke="none" />
      {leafAt(-4.5, -17, -28, leafDark)}
      {leafAt(4.5, -17, 28, leaf)}
      {leafAt(0, -21, 0, leaf)}
      <g>
        <path d={`M${x - 5} ${y - 8} H${x + 5} L${x + 4} ${y} Q${x} ${y + 2} ${x - 4} ${y} Z`} fill={warmRed} />
        <path d={`M${x} ${y - 8} H${x + 5} L${x + 4} ${y} Q${x + 2} ${y + 1.4} ${x} ${y + 1.6} Z`} fill={darker(warmRed)} stroke="none" />
        <path d={`M${x - 5} ${y - 8} H${x + 5} L${x + 4} ${y} Q${x} ${y + 2} ${x - 4} ${y} Z`} fill="none" />
        <rect x={x - 6} y={y - 10.5} width={12} height={3.6} rx={1.4} fill={warmRed} />
      </g>
    </g>
  )
}

/** Dust on a horizontal surface, given tile positions. */
function dustOn(z: number, spots: [number, number, number][]) {
  return dustSpecks(spots.map(([tx, ty, r]) => [iso(tx, ty, z).x, iso(tx, ty, z).y, r] as [number, number, number]))
}

function messy1() {
  return (
    <g>
      {dustOn(H, [[0.12, 0.2, 3.2], [0.48, 0.78, 3.4], [0.2, 0.86, 2], [0.5, 0.3, 2.2]])}
      {dustOn(MID_BOARD[1], [[D - 0.03, 0.84, 0.9], [D - 0.03, 0.2, 0.8]])}
      {/* a single cobweb strand hanging in the upper corner of the opening */}
      <g fill="none" stroke={ink} strokeWidth={1.2} opacity={0.6} strokeLinecap="round">
        <path d={`M${front(OY0, CEIL).x} ${front(OY0, CEIL).y} q-1 7 -6 9 q-4 1 -5 6`} />
        <path d={`M${front(OY0, CEIL).x - 3} ${front(OY0, CEIL).y + 6.6} l-5 -2`} />
      </g>
    </g>
  )
}

function messy2() {
  const corner = front(OY0, CEIL)
  const left = front(OY0 + 0.4, CEIL)
  const down = front(OY0, CEIL - 17)
  const bunnyTop = iso(0.4, 0.14, H)
  const bunnyFloor = iso(0.98, 0.62, 0)
  return (
    <g>
      {dustOn(H, [[0.12, 0.2, 3.4], [0.5, 0.8, 3.6], [0.22, 0.88, 2.2], [0.5, 0.3, 2.4], [0.1, 0.6, 2]])}
      {dustOn(MID_BOARD[1], [[D - 0.03, 0.84, 0.9], [D - 0.03, 0.2, 0.8], [D - 0.03, 0.52, 0.8]])}
      {dustOn(FLOOR, [[D - 0.03, 0.84, 0.9], [D - 0.03, 0.5, 0.8]])}
      {cobweb(corner, left, down, 3)}
      {dustBunny(bunnyTop.x, bunnyTop.y + 1, 0.75)}
      {dustBunny(bunnyFloor.x, bunnyFloor.y, 0.9)}
      {/* a few specks on the book tops */}
      <g fill={DUST} stroke="none">
        {[LOWER[2], UPPER[2]].map((b, i) => {
          const p = iso(BX0 + 0.12, b.ty + b.w / 2, (i === 0 ? FLOOR : MID_BOARD[1]) + b.h)
          return <ellipse key={i} cx={p.x} cy={p.y} rx={1.8} ry={0.9} />
        })}
      </g>
    </g>
  )
}

export const bookshelfArt: ObjectArt = {
  catalogId: 'bookshelf',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  cueY: -70,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {carcass()}
      {opening()}
      {shelves()}
      {plant()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
