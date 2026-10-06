import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso, isoPoints } from '../iso'
import { bottle, can, drum, poly, ring } from './batch2-parts'
import { fly } from './mess'
import type { ObjectArt } from './types'

// A round recycling bin, smaller than its tile and centred in it. 1x1 on the
// floor. The lid is fabric-blue (the recycling colour) with an open slot that
// the mess pokes out of. Bounds match the sink so all 1x1 objects line up.

const { ink, floorWood, woodDark, steel, steelDark, fabricBlue, warmRed, leaf, sky, white } = PALETTE

const BIN_H = 24
const LID_H = 5
const TOP = BIN_H + LID_H
const C = 0.5

/** A flat sheet of cardboard on the floor (tile-space rectangle at z = 0). */
function flatBox(x0: number, x1: number, y0: number, y1: number) {
  return (
    <g strokeWidth={2}>
      <polygon points={isoPoints([x0, y1, 2], [x1, y1, 2], [x1, y1, 0], [x0, y1, 0])} fill={woodDark} />
      <polygon points={isoPoints([x1, y0, 2], [x1, y1, 2], [x1, y1, 0], [x1, y0, 0])} fill={woodDark} />
      <polygon points={isoPoints([x0, y0, 2], [x1, y0, 2], [x1, y1, 2], [x0, y1, 2])} fill={floorWood} />
      <polyline points={isoPoints([(x0 + x1) / 2, y0, 2], [(x0 + x1) / 2, y1, 2])} fill="none" strokeWidth={1.5} />
    </g>
  )
}

function bin() {
  const badge = iso(C + 0.21, C + 0.21, 11)
  return (
    <g>
      {drum({ cx: C, cy: C, a: 0.3, b: 0.3, z0: 0, z1: BIN_H, top: steel, side: steel })}
      {/* lid, with a round slot */}
      {drum({ cx: C, cy: C, a: 0.33, b: 0.33, z0: BIN_H, z1: TOP, top: fabricBlue, side: fabricBlue })}
      <polygon points={ring(C, C, 0.18, 0.18, TOP)} fill={steelDark} />
      {/* recycling badge */}
      <circle cx={badge.x} cy={badge.y} r={6.2} fill={leaf} />
      <path
        d={`M${badge.x} ${badge.y - 3.6} L${badge.x + 3.6} ${badge.y + 2.4} H${badge.x - 3.6} Z`}
        fill="none"
        stroke={white}
        strokeWidth={1.8}
      />
    </g>
  )
}

function slotCentre() {
  return iso(C, C, TOP)
}

/** A cardboard sheet standing up out of the slot. */
function sheet(x: number, y: number, tilt: number, colour: string = floorWood) {
  return (
    <g transform={`rotate(${tilt} ${x} ${y})`}>
      <polygon points={poly({ x: x - 8, y }, { x: x - 6, y: y - 24 }, { x: x + 9, y: y - 27 }, { x: x + 9, y: y - 2 })} fill={colour} />
      <path d={`M${x - 7} ${y - 12} L${x + 9} ${y - 14}`} fill="none" strokeWidth={1.5} />
    </g>
  )
}

function messy1() {
  const s = slotCentre()
  return (
    <g>
      {sheet(s.x + 5, s.y + 1, 14)}
      {bottle(s.x - 5, s.y + 1, leaf, -10)}
      {fly(s.x + 18, s.y - 34)}
    </g>
  )
}

function messy2() {
  const s = slotCentre()
  const left = iso(0.1, 0.78, 0)
  return (
    <g>
      {/* flat boxes and strays around the bin, all inside the tile */}
      {flatBox(0.08, 0.28, 0.6, 0.92)}
      {flatBox(0.62, 0.92, 0.08, 0.28)}
      {can(left.x + 14, left.y + 12, fabricBlue, 80)}
      {can(iso(0.8, 0.68, 0).x, iso(0.8, 0.68, 0).y, sky, 84)}
      {can(iso(0.82, 0.9, 0).x, iso(0.82, 0.9, 0).y, warmRed)}
      {bin()}
      {/* overflowing pile */}
      {sheet(s.x - 7, s.y + 2, -22)}
      {sheet(s.x + 8, s.y + 2, 20, steel)}
      {bottle(s.x - 11, s.y + 3, sky, -26)}
      {bottle(s.x + 2, s.y + 2, leaf, 8)}
      {can(s.x + 9, s.y + 1, warmRed, 22)}
      {can(s.x - 2, s.y + 3, fabricBlue, -12)}
      {can(s.x + 14, s.y + 4, steel, 55)}
      {fly(s.x + 16, s.y - 46)}
    </g>
  )
}

export const recyclingArt: ObjectArt = {
  catalogId: 'recycling',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {stage !== 'messy2' && bin()}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
