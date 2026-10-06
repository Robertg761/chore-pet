import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { onRight } from './batch2-parts'
import { cobweb } from './lamp'
import type { ObjectArt } from './types'

// A framed picture hung on the wall: no floor footprint, drawn flat on the
// left-wall plane (tx = 0) at rotation 0 using the face-skew helper `onRight`.
// Local coordinates: x 0..32 runs across the tile along the wall (0 is the
// front edge), y = -height above the floor. The room mirrors this for the
// right wall. The picture is a sunny hill; messy1 hangs crooked, messy2 is
// crooked with a peeling corner and a dusty frame.

const { ink, floorWood, woodDark, cream, creamDark, sky, white, petDefault, leaf, leafDark, blush, steel } = PALETTE

// The wall plane is only 32 units across, so the outline is a touch finer than on solids.
const WALL_STROKE = ROOM_STROKE - 1

const FRAME = { x: 1, y: -104, w: 30, h: 40 }
const NAIL = { x: 16, y: -110 }
const DUST = mix(creamDark, steel, 0.5)

function picture() {
  return (
    <g strokeWidth={1.5}>
      <rect x={7} y={-98} width={18} height={28} fill={sky} />
      <circle cx={19.5} cy={-91.5} r={3.8} fill={petDefault} strokeWidth={1.5} />
      {/* a puffy cloud */}
      <g fill={white} strokeWidth={1.2}>
        <ellipse cx={12} cy={-90} rx={3.4} ry={2} />
        <ellipse cx={14.2} cy={-91.4} rx={2.2} ry={1.7} />
      </g>
      <path d="M7 -76 Q12 -85 18.5 -79 Q22 -77 25 -80 V-70 H7 Z" fill={leaf} />
      <path d="M7 -72 Q16 -80 25 -73 V-70 H7 Z" fill={leafDark} />
      <circle cx={12} cy={-74} r={1.1} fill={blush} strokeWidth={0.8} />
      <circle cx={19} cy={-72.2} r={1.1} fill={petDefault} strokeWidth={0.8} />
      <circle cx={15.6} cy={-71.6} r={0.9} fill={white} strokeWidth={0.8} />
      <rect x={7} y={-98} width={18} height={28} fill="none" />
    </g>
  )
}

function frame() {
  const { x, y, w, h } = FRAME
  return (
    <g>
      {/* nail and cord */}
      <path d={`M${x + 5} ${y} L${NAIL.x} ${NAIL.y} L${x + w - 5} ${y}`} fill="none" strokeWidth={1.5} />
      <circle cx={NAIL.x} cy={NAIL.y} r={1.8} fill={ink} stroke="none" />
      <rect x={x} y={y} width={w} height={h} rx={3} fill={floorWood} />
      {/* lower right half of the frame is the shaded side */}
      <path d={`M${x + w} ${y + 3} V${y + h - 3} Q${x + w} ${y + h} ${x + w - 3} ${y + h} H${x + 3} L${x + w - 3} ${y + 3} Z`} fill={woodDark} opacity={0.35} stroke="none" />
      <rect x={x} y={y} width={w} height={h} rx={3} fill="none" />
      <rect x={4} y={-101} width={24} height={34} rx={1.5} fill={cream} strokeWidth={1.5} />
      {picture()}
      <path d="M5.4 -99.6 H11" stroke={white} strokeWidth={1.6} opacity={0.7} fill="none" />
    </g>
  )
}

/** Wall shadow behind the frame, one soft layer. */
function shadow() {
  const { x, y, w, h } = FRAME
  return <rect x={x + 2.5} y={y + 2.5} width={w} height={h} rx={3} fill={ink} fillOpacity={0.15} stroke="none" />
}

function dust(spots: [number, number, number][]) {
  return (
    <g fill={DUST} stroke="none">
      {spots.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.6} />
      ))}
    </g>
  )
}

/** The poster's lower right corner, curled up. */
function peel() {
  const { x, y, w, h } = FRAME
  const cx = x + w
  const cy = y + h
  return (
    <g strokeWidth={1.8}>
      <path d={`M${cx - 9} ${cy} L${cx} ${cy - 9} L${cx} ${cy} Z`} fill={cream} stroke="none" />
      <path d={`M${cx - 9} ${cy} Q${cx - 4} ${cy - 1.5} ${cx} ${cy - 9} Q${cx - 6} ${cy - 11} ${cx - 8.5} ${cy - 6.5} Q${cx - 11} ${cy - 3} ${cx - 9} ${cy} Z`} fill={white} />
      <path d={`M${cx - 9} ${cy} Q${cx - 4} ${cy - 1.5} ${cx} ${cy - 9}`} fill="none" stroke={creamDark} strokeWidth={1.5} />
    </g>
  )
}

function render(stage: MessStage) {
  const tilt = stage === 'messy1' ? -7 : stage === 'messy2' ? -13 : 0
  return (
    <g>
      <g transform={`rotate(${tilt} ${NAIL.x} ${NAIL.y})`}>
        {shadow()}
        {frame()}
        {stage === 'messy2' && peel()}
        {stage === 'messy2' && (
          <g>
            {dust([[6, -104.4, 2.2], [11, -104.8, 1.5], [24, -104.4, 2.4], [28.5, -102, 1.5], [2.6, -70, 1.6]])}
            {cobweb({ x: 1.6, y: -103.4 }, { x: 14, y: -103.8 }, { x: 2, y: -90 }, 3)}
          </g>
        )}
      </g>
    </g>
  )
}

export const posterArt: ObjectArt = {
  catalogId: 'poster',
  footprint: { w: 1, d: 1 },
  bounds: { x: -46, y: -114, width: 60, height: 76 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={WALL_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {onRight(0, 1, render(stage))}
    </g>
  ),
}
