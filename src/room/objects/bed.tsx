import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso, isoPoints } from '../iso'
import { box, cushion, laundryPile, onRight, rectCorners, sock } from './batch2-parts'
import { fly, stink } from './mess'
import type { ObjectArt } from './types'

// A wooden double bed, 3x2 against the left wall. The headboard runs along
// tx = 0, the bed reaches 3 tiles into the room and is 2 tiles wide. The frame
// is inset a little in ty so a strip of floor shows on the left-front side,
// which is where the messy2 blanket and laundry land (still inside the 3x2).
// Bounds run from iso(0, 2) on the left to iso(3, 0) on the right.

const { ink, woodDark, floorWood, cream, creamDark, white, fabricBlue, warmRed, leaf } = PALETTE

const Y0 = 0.12 // frame inset: back side
const Y1 = 1.74 // frame inset: front (left-front) side
const FRAME_X = 2.9
const SHEET_Z = 15
const BLANKET_Z = 19

const wood = { top: floorWood, right: floorWood, left: woodDark }
const linen = { top: white, right: cream, left: creamDark }

function frame() {
  return (
    <g>
      {box({ x0: 0, x1: FRAME_X, y0: Y0, y1: Y1, z0: 0, z1: 8, ...wood })}
      {/* headboard with a rounded panel and two finials */}
      {box({ x0: 0, x1: 0.16, y0: 0.06, y1: 1.8, z0: 0, z1: 40, ...wood })}
      {onRight(
        0.16,
        1.8,
        <rect x={5} y={-37} width={1.74 * 32 - 10} height={20} rx={7} fill="none" strokeWidth={2} />,
      )}
      {[0.06, 1.8].map((y) => {
        const p = iso(0.08, y, 42)
        return <circle key={y} cx={p.x} cy={p.y - 1} r={3.5} fill={floorWood} strokeWidth={2.5} />
      })}
    </g>
  )
}

function mattress() {
  return box({ x0: 0.16, x1: 2.84, y0: Y0 + 0.04, y1: Y1 - 0.04, z0: 8, z1: SHEET_Z, ...linen })
}

function pillows(askew = false) {
  return (
    <g>
      {cushion(rectCorners(0.58, 0.58, 0.28, 0.38), SHEET_Z, white, creamDark)}
      {cushion(rectCorners(0.58, 1.26, 0.28, 0.38, askew ? 0.5 : 0), SHEET_Z + (askew ? 2 : 0), white, creamDark)}
    </g>
  )
}

/** The blanket: a thick quilt from `x0` to the foot, in fabric-blue. */
function blanket(x0: number) {
  return (
    <g>
      {box({
        x0,
        x1: FRAME_X - 0.06,
        y0: Y0 - 0.02,
        y1: Y1 + 0.02,
        z0: 8,
        z1: BLANKET_Z,
        top: fabricBlue,
        right: fabricBlue,
        left: fabricBlue,
        shade: 0.18,
      })}
      {/* folded-back cream edge and stitch lines */}
      <polygon points={isoPoints([x0, Y0 - 0.02, BLANKET_Z], [x0 + 0.2, Y0 - 0.02, BLANKET_Z], [x0 + 0.2, Y1 + 0.02, BLANKET_Z], [x0, Y1 + 0.02, BLANKET_Z])} fill={cream} strokeWidth={2} />
      <g fill="none" strokeWidth={1.5} opacity={0.5}>
        <polyline points={isoPoints([x0 + 0.7, Y0 + 0.1, BLANKET_Z], [x0 + 0.7, Y1 - 0.1, BLANKET_Z])} />
        <polyline points={isoPoints([x0 + 1.3, Y0 + 0.1, BLANKET_Z], [x0 + 1.3, Y1 - 0.1, BLANKET_Z])} />
      </g>
    </g>
  )
}

function footboard() {
  return box({ x0: FRAME_X - 0.1, x1: FRAME_X, y0: 0.06, y1: 1.8, z0: 0, z1: 23, ...wood })
}

function lumps() {
  const spots: [number, number, number][] = [
    [1.7, 0.6, 5],
    [2.2, 1.2, 6],
    [1.5, 1.3, 4],
  ]
  return (
    <g fill="none" strokeWidth={2}>
      {spots.map(([tx, ty, r], i) => {
        const p = iso(tx, ty, BLANKET_Z)
        return <path key={i} d={`M${p.x - r * 1.6} ${p.y + 1} q${r * 0.6} ${-r * 1.6} ${r * 1.6} ${-r * 0.4} q${r * 0.9} ${r * 0.9} ${r * 1.6} ${-r * 0.2}`} />
      })}
    </g>
  )
}

function messy1() {
  const p = iso(2.4, 0.5, BLANKET_Z)
  return (
    <g>
      {sock(p.x, p.y - 2, warmRed, false, -8)}
      {fly(iso(1.2, 1, 40).x + 6, iso(1.2, 1, 40).y - 12)}
    </g>
  )
}

/** The blanket slumped off the left-front side onto the strip of floor. */
function droop() {
  const tl = iso(1.5, Y1 + 0.02, BLANKET_Z)
  const tr = iso(2.7, Y1 + 0.02, BLANKET_Z)
  const r = iso(2.72, Y1 + 0.02, 5)
  const fr = iso(2.76, 1.97, 1)
  const fm = iso(2.2, 1.99, 1)
  const fl = iso(1.7, 1.96, 1)
  const l = iso(1.52, Y1 + 0.02, 6)
  const d = `M${tl.x} ${tl.y} L${tr.x} ${tr.y} L${r.x} ${r.y} Q${fr.x + 3} ${fr.y - 3} ${fr.x} ${fr.y} Q${fm.x} ${fm.y + 5} ${fl.x} ${fl.y} Q${l.x - 3} ${l.y + 3} ${l.x} ${l.y} Z`
  const fold = `M${iso(2.0, Y1 + 0.02, 15).x} ${iso(2.0, Y1 + 0.02, 15).y} Q${iso(2.05, Y1 + 0.1, 8).x} ${iso(2.05, Y1 + 0.1, 8).y} ${iso(2.15, 1.94, 2).x} ${iso(2.15, 1.94, 2).y}`
  return (
    <g>
      <path d={d} fill={fabricBlue} />
      <path d={d} fill={ink} opacity={0.18} stroke="none" />
      <path d={fold} fill="none" strokeWidth={1.5} opacity={0.5} />
    </g>
  )
}

function messy2() {
  const pile = iso(0.45, 1.9, 0)
  const lone = iso(1.15, 1.9, 0)
  return (
    <g>
      {sock(iso(2.4, 0.7, BLANKET_Z).x, iso(2.4, 0.7, BLANKET_Z).y - 2, leaf, false, 12)}
      {laundryPile(pile.x, pile.y + 2, 1)}
      {sock(lone.x, lone.y, warmRed, true, 4)}
      {stink(pile.x + 2, pile.y - 20)}
      {fly(pile.x + 22, pile.y - 40, 'a')}
      {fly(pile.x - 4, pile.y - 50, 'b')}
    </g>
  )
}

export const bedArt: ObjectArt = {
  catalogId: 'bed',
  footprint: { w: 3, d: 2 },
  bounds: { x: -72, y: -64, width: 176, height: 152 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {frame()}
      {mattress()}
      {pillows(stage !== 'clean')}
      {blanket(stage === 'messy2' ? 1.5 : 1.0)}
      {stage === 'messy1' && lumps()}
      {stage === 'messy2' && droop()}
      {footboard()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
