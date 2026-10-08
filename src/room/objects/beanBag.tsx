import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { darker, dustSpecks, lighter } from './decorParts'
import { cobweb, dustBunny } from './lamp'
import type { ObjectArt } from './types'

// A squashy, slumped bean bag in fabric blue: a slouchy back lobe toward
// the wall, a dip where a sitter would sag, and a smaller front lobe, with a
// soft crease and a few stitches. It has no chores, but if a
// player adds one the dust settles: messy1 is dusty lobes, messy2 has gone a
// little flat with a few beans spilled, a dust bunny and a friendly cobweb.
//
// Drawn in screen space around the tile centre. Local origin (0,0) is the
// floor point under the bag.

const { ink, fabricBlue, cream, white } = PALETTE

const TILE_CENTRE_Y = iso(0.5, 0.5, 0).y
const BAG = fabricBlue
const BAG_DARK = darker(fabricBlue)
const BAG_LIGHT = lighter(fabricBlue)

/** The slumped silhouette, y = 0 on the floor under the bag. */
const BODY =
  'M-28 -1 C-31 -10 -27 -20 -18 -25 C-13 -31 -3 -31 1 -25 C4 -21 10 -20 15 -22 C23 -24 30 -17 29 -7 C30 0 21 8 0 8 C-15 8 -27 5 -28 -1 Z'

function shadow() {
  return <ellipse cx={0} cy={3} rx={31} ry={10} fill={ink} fillOpacity={0.15} stroke="none" />
}

/** The bag with its three shades clipped inside the silhouette. `squash` flattens it for messy2. */
function bag(clipId: string) {
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <path d={BODY} fill={BAG} />
      <g clipPath={`url(#${clipId})`} stroke="none">
        {/* left-front side in shade, down from the dip to the floor */}
        <path d="M-40 -40 L1 -40 C5 -26 3 -14 0 -6 C2 0 4 6 4 12 L-40 12 Z" fill={BAG_DARK} />
        {/* lightest tops of the two lobes */}
        <path d="M-40 -40 H2 C2 -30 -4 -26 -12 -25 C-20 -24 -28 -20 -40 -14 Z" fill={BAG_LIGHT} />
        <path d="M7 -40 H40 V-14 C32 -20 24 -22 17 -20 C10 -19 6 -25 7 -40 Z" fill={BAG_LIGHT} />
        {/* a soft shine on the back lobe */}
        <path d="M-21 -23 Q-17 -29 -9 -30" fill="none" stroke={white} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      </g>
      <path d={BODY} fill="none" />
      {/* soft creases */}
      <g fill="none" strokeWidth={2}>
        <path d="M1 -23 Q7 -17 5 -9 Q4 -4 7 2" />
        <path d="M-17 -9 Q-10 -6 -8 0" strokeWidth={1.6} />
        <path d="M17 -17 Q22 -12 20 -6" strokeWidth={1.6} />
      </g>
      {/* stitches along the front */}
      <path d="M-22 3 Q-10 6 2 5 M10 4 Q18 3 24 -2" fill="none" stroke={cream} strokeWidth={1.4} strokeDasharray="2.4 3" opacity={0.85} />
    </g>
  )
}

/** A spilled bean: a small cream oval with an outline. */
function bean(x: number, y: number, rot: number, key: number) {
  return <ellipse key={key} cx={x} cy={y} rx={2.6} ry={1.6} fill={cream} stroke={ink} strokeWidth={1.4} transform={`rotate(${rot} ${x} ${y})`} />
}

function messy1() {
  return dustSpecks([[-12, -28, 3.2], [-5, -29, 2], [18, -22, 2.6], [-23, -15, 2.2], [10, -19, 1.8], [24, -10, 1.6]], 0.6)
}

function messy2() {
  return (
    <g>
      {dustSpecks([[-12, -23, 3.4], [-5, -24, 2.2], [17, -18, 2.8], [-23, -11, 2.4], [10, -15, 2], [24, -7, 1.8]], 0.6)}
      {cobweb({ x: -9, y: -28 }, { x: 0, y: -25.5 }, { x: -19, y: -18 }, 3)}
      {bean(23, 10, 20, 0)}
      {bean(31, 5, -25, 1)}
      {bean(14, 13, 60, 2)}
      {dustBunny(-26, 15, 0.85)}
    </g>
  )
}

export const beanBagArt: ObjectArt = {
  catalogId: 'bean-bag',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -22, width: 72, height: 58 },
  cueY: -12,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      <g transform={`translate(0 ${TILE_CENTRE_Y + 4})`}>
        {shadow()}
        {/* messy2 has lost a little puff: squashed toward the floor */}
        <g transform={stage === 'messy2' ? 'translate(0 8) scale(1 0.88) translate(0 -8)' : undefined}>
          {bag(`bean-bag-clip-${stage === 'messy2' ? 'flat' : 'full'}`)}
        </g>
        {stage === 'messy1' && messy1()}
        {stage === 'messy2' && messy2()}
      </g>
    </g>
  ),
}
