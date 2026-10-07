import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { fly, stink } from './mess'
import type { ObjectArt } from './types'

// The trash can: a rounded pedal bin, smaller than its tile and centred on it.
// Floor objects have no wall, so every stage stays inside the tile diamond.

const { ink, steel, steelDark, white, sky, leaf, leafDark, warmRed, fabricBlue, petDefault, dirt } = PALETTE

const C = iso(0.5, 0.5) // tile centre on the floor
const R_TOP = 12
const R_BOT = 10
const BODY_H = 28
const yBot = C.y
const yTop = C.y - BODY_H

function bin() {
  const { x } = C
  const outline = `M${x - R_TOP} ${yTop} L${x - R_BOT} ${yBot} A${R_BOT} ${R_BOT / 2} 0 0 0 ${x + R_BOT} ${yBot} L${x + R_TOP} ${yTop} Z`
  // left half is the darker face
  const shade = `M${x - R_TOP} ${yTop} L${x - R_BOT} ${yBot} A${R_BOT} ${R_BOT / 2} 0 0 0 ${x} ${yBot + R_BOT / 2} L${x} ${yTop + R_TOP / 2} Z`
  return (
    <g>
      {/* pedal */}
      <path d={`M${x + 1} ${yBot + 3} h8 q3 0 3 2 q0 2 -3 2 h-8 Z`} fill={steelDark} strokeWidth={2} />
      <path d={outline} fill={leaf} />
      <path d={shade} fill={leafDark} stroke="none" />
      <path d={outline} fill="none" />
      {/* a pale band and little highlight so it reads as a bin */}
      <path d={`M${x + 5} ${yTop + 9} v12`} stroke={white} strokeWidth={2} opacity={0.6} fill="none" />
    </g>
  )
}

/** The lid, lifted by `lift` and tilted by `tilt` degrees. */
function lid(lift = 0, tilt = 0) {
  const y = yTop - lift
  return (
    <g transform={`rotate(${tilt} ${C.x} ${y})`}>
      <ellipse cx={C.x} cy={y} rx={R_TOP + 2} ry={(R_TOP + 2) / 2} fill={steel} />
      <ellipse cx={C.x} cy={y - 1} rx={R_TOP - 3} ry={(R_TOP - 3) / 2} fill="none" stroke={steelDark} strokeWidth={1.5} />
      <rect x={C.x - 3} y={y - 3} width={6} height={3.5} rx={1.5} fill={steelDark} strokeWidth={2} />
    </g>
  )
}

/** The dark opening seen when the lid is up. */
function opening() {
  return <ellipse cx={C.x} cy={yTop} rx={R_TOP} ry={R_TOP / 2} fill={ink} />
}

/** A knotted rubbish bag blob poking up from the rim. */
function bagBlob(x: number, y: number, r: number, fill: string) {
  return <ellipse cx={x} cy={y} rx={r} ry={r * 0.8} fill={fill} strokeWidth={2} />
}

function peel(x: number, y: number) {
  return (
    <g strokeWidth={1.8}>
      <path d={`M${x - 8} ${y} q4 -9 9 -4 q2 3 6 -1 q-1 8 -9 8 q-4 0 -6 -3 Z`} fill={petDefault} />
      <path d={`M${x - 3} ${y - 2} q-5 -6 -9 -3 q4 7 9 3`} fill={petDefault} />
      <circle cx={x + 7} cy={y - 4} r={1.2} fill={dirt} stroke="none" />
    </g>
  )
}

function scrap(x: number, y: number, r: number, fill: string, key: string) {
  return <ellipse key={key} cx={x} cy={y} rx={r} ry={r * 0.7} fill={fill} strokeWidth={1.8} />
}

function messy1() {
  return (
    <g>
      {opening()}
      {/* the bag pokes out and props the lid up */}
      {bagBlob(C.x + 1, yTop - 3, 8, sky)}
      <path d={`M${C.x + 1} ${yTop - 9} l-3 -7 q2 -3 5 0 l2 7`} fill={sky} strokeWidth={2} />
      {lid(10, -16)}
      {fly(C.x + 16, yTop - 22)}
    </g>
  )
}

function messy2() {
  const floor = (tx: number, ty: number) => iso(tx, ty)
  const lidP = floor(0.2, 0.62)
  const [s1, s2, s3, s4] = [floor(0.62, 0.9), floor(0.86, 0.62), floor(0.38, 0.88), floor(0.8, 0.86)]
  return (
    <g>
      {/* the lid has slid off onto the floor */}
      <g>
        <ellipse cx={lidP.x} cy={lidP.y} rx={10} ry={5} fill={steel} />
        <ellipse cx={lidP.x} cy={lidP.y - 0.5} rx={6.5} ry={3.2} fill="none" stroke={steelDark} strokeWidth={1.5} />
      </g>
      {opening()}
      {/* overflowing heap */}
      {bagBlob(C.x - 6, yTop - 4, 7, sky)}
      {bagBlob(C.x + 6, yTop - 5, 7.5, fabricBlue)}
      {bagBlob(C.x, yTop - 10, 7, white)}
      {scrap(C.x - 8, yTop - 11, 3.5, warmRed, 'a')}
      {scrap(C.x + 9, yTop - 13, 3, leaf, 'b')}
      {peel(C.x + 1, yTop - 17)}
      {/* colourful scraps around the base */}
      {scrap(s1.x, s1.y, 3.5, warmRed, 'c')}
      {scrap(s2.x, s2.y, 3, fabricBlue, 'd')}
      {scrap(s3.x, s3.y, 3, petDefault, 'e')}
      {scrap(s4.x, s4.y, 2.5, white, 'f')}
      {stink(C.x - 16, yTop - 12)}
      {fly(C.x + 18, yTop - 24, 'fa')}
      {fly(C.x - 20, yTop - 34, 'fb', true)}
      {fly(C.x + 2, yTop - 42, 'fc')}
    </g>
  )
}

export const trashArt: ObjectArt = {
  catalogId: 'trash',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -64, width: 72, height: 100 },
  cueY: -20,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {bin()}
      {stage === 'clean' && lid()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}

