import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { onRight } from './batch2-parts'
import { darker, dustSpecks, lighter } from './decorParts'
import { cobweb } from './lamp'
import type { ObjectArt } from './types'

// A round wall clock with a warm red rim and a cream face: two simple hands
// and four tick dots, no numbers. The catalog gives it a 1x1 footprint like
// poster.tsx; it hangs flat on the left-wall plane (tx = 0) at rotation 0 using
// `onRight`, exactly like the poster. Local coordinates: x 0..32 runs along the wall (0 is the front
// edge), y = -height above the floor. The room mirrors this for the right
// wall. It has no chores, but if a player adds one the dust settles: messy1
// hangs a little crooked with dust on the rim and a cobweb strand, messy2 is
// crooked with a friendly cobweb and more dust.

const { ink, warmRed, cream, creamDark } = PALETTE

// The wall plane is only 32 units across, so the outline is a touch finer than on solids.
const WALL_STROKE = ROOM_STROKE - 1

const C = { x: 16, y: -84 }
const NAIL = { x: 16, y: -98.4 }
const R = 13.4 // outer rim
const FACE = 10 // cream face

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return { x: C.x + r * Math.sin(a), y: C.y - r * Math.cos(a) }
}

/** Soft wall shadow behind the clock, one layer. */
function shadow() {
  return <circle cx={C.x + 2.5} cy={C.y + 2.5} r={R} fill={ink} fillOpacity={0.15} stroke="none" />
}

function rim() {
  // the lower right half of the rim is the shaded side; it stays just inside the outline, so no clip is needed
  const a = polar(R - 1, 40)
  const b = polar(R - 1, 220)
  return (
    <g>
      <circle cx={C.x} cy={C.y} r={R} fill={warmRed} />
      <path d={`M${a.x} ${a.y} A${R - 1} ${R - 1} 0 0 1 ${b.x} ${b.y} A${FACE + 1} ${FACE + 1} 0 0 0 ${a.x} ${a.y} Z`} fill={darker(warmRed)} stroke="none" />
      <circle cx={C.x} cy={C.y} r={R} fill="none" />
      <path d={`M${polar(R - 2.6, -62).x} ${polar(R - 2.6, -62).y} A${R - 2.6} ${R - 2.6} 0 0 1 ${polar(R - 2.6, -22).x} ${polar(R - 2.6, -22).y}`} stroke={lighter(warmRed)} strokeWidth={1.6} fill="none" />
    </g>
  )
}

function face() {
  // four tick dots at 12, 3, 6 and 9, and two hands showing ten past ten
  const dots = [0, 90, 180, 270].map((deg) => polar(FACE - 2.6, deg))
  const hour = polar(5.2, -60)
  const minute = polar(7.6, 60)
  return (
    <g>
      <circle cx={C.x} cy={C.y} r={FACE} fill={cream} strokeWidth={1.5} />
      <path d={`M${polar(FACE - 1.4, 200).x} ${polar(FACE - 1.4, 200).y} A${FACE - 1.4} ${FACE - 1.4} 0 0 0 ${polar(FACE - 1.4, 110).x} ${polar(FACE - 1.4, 110).y}`} stroke={creamDark} strokeWidth={1.5} fill="none" />
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.15} fill={ink} stroke="none" />
      ))}
      <path d={`M${C.x} ${C.y} L${hour.x} ${hour.y}`} strokeWidth={2.6} fill="none" />
      <path d={`M${C.x} ${C.y} L${minute.x} ${minute.y}`} strokeWidth={2} fill="none" />
      <circle cx={C.x} cy={C.y} r={1.9} fill={warmRed} strokeWidth={1.3} />
    </g>
  )
}

function clock() {
  return (
    <g>
      {/* the nail it hangs on, peeking above the rim */}
      <circle cx={NAIL.x} cy={NAIL.y} r={1.9} fill={ink} stroke="none" />
      {shadow()}
      {rim()}
      {face()}
    </g>
  )
}

function render(stage: MessStage) {
  const tilt = stage === 'messy1' ? -6 : stage === 'messy2' ? -12 : 0
  return (
    <g transform={`rotate(${tilt} ${NAIL.x} ${NAIL.y})`}>
      {clock()}
      {stage === 'messy1' && (
        <g>
          {dustSpecks([[C.x - 5, C.y - R - 0.4, 2.2], [C.x - 9.4, C.y - R + 3, 1.6], [C.x + 6.5, C.y - R + 0.4, 1.7]], 0.6)}
          {/* a single cobweb strand off the nail */}
          <g fill="none" stroke={ink} strokeWidth={1.2} opacity={0.6} strokeLinecap="round">
            <path d={`M${C.x - 7} ${C.y - R + 1} Q${C.x - 14} ${C.y - R + 6} ${C.x - 13} ${C.y - 3} Q${C.x - 13} ${C.y + 2} ${C.x - 11} ${C.y + 5}`} />
            <path d={`M${C.x - 13.4} ${C.y - 6} l3 -1.4`} />
          </g>
        </g>
      )}
      {stage === 'messy2' && (
        <g>
          {dustSpecks([[C.x - 5, C.y - R - 0.4, 2.4], [C.x - 9.4, C.y - R + 3, 1.8], [C.x + 6.5, C.y - R + 0.4, 2], [C.x + 11, C.y - R + 3.6, 1.5], [C.x + 11, C.y + 8, 1.4]], 0.6)}
          {cobweb({ x: C.x - 7.6, y: C.y - R + 0.6 }, { x: C.x + 1, y: C.y - R - 3 }, { x: C.x - 14, y: C.y - 3 }, 3)}
        </g>
      )}
    </g>
  )
}

export const wallClockArt: ObjectArt = {
  catalogId: 'wall-clock',
  footprint: { w: 1, d: 1 },
  bounds: { x: -42, y: -110, width: 52, height: 60 },
  cueY: -96,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={WALL_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {onRight(0, 1, render(stage))}
    </g>
  ),
}
