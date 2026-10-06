import { PALETTE, ROOM_STROKE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { box, bubble, laundryPile, onRight, sock } from './batch2-parts'
import { fly, smudge, stink } from './mess'
import type { ObjectArt } from './types'

// A front-loading washing machine at counter height (same H as the sink), 1x1
// against the left wall. The round door and control strip sit on the
// right-front face. Bounds match the sink.

const { ink, cream, white, steel, steelDark, sky, warmRed, fabricBlue, blush, leaf } = PALETTE

const H = 34
const DOOR = { x: 16, z: 14 }

function body() {
  return box({ x0: 0, x1: 1, y0: 0, y1: 1, z0: 0, z1: H, top: white, right: cream, left: steel })
}

function controls() {
  return onRight(
    1,
    1,
    <g>
      {/* control strip */}
      <rect x={3} y={-32} width={26} height={7} rx={3} fill={steel} strokeWidth={2} />
      <circle cx={9} cy={-28.5} r={2.6} fill={warmRed} strokeWidth={1.5} />
      <rect x={16} y={-30.5} width={9} height={4} rx={1.5} fill={sky} strokeWidth={1.5} />
      {/* door ring and window */}
      <circle cx={DOOR.x} cy={-DOOR.z} r={10.5} fill={steel} />
    </g>,
  )
}

function glass(open: boolean) {
  return onRight(
    1,
    1,
    <g>
      <circle cx={DOOR.x} cy={-DOOR.z} r={7.4} fill={open ? steelDark : sky} strokeWidth={2} />
      {!open && <path d={`M${DOOR.x - 4.5} ${-DOOR.z - 1} q1 -4 5 -4.5`} fill="none" stroke={white} strokeWidth={1.8} />}
    </g>,
  )
}

function messy1() {
  const top = iso(0.5, 0.5, H)
  return (
    <g>
      {smudge(iso(0.8, 0.82, H).x, iso(0.8, 0.82, H).y, 4)}
      {laundryPile(top.x - 3, top.y + 1, 0.9)}
      {sock(top.x + 14, top.y - 2, fabricBlue, false, -10)}
      {fly(top.x + 16, top.y - 30)}
    </g>
  )
}

function messy2() {
  const top = iso(0.5, 0.5, H)
  return (
    <g>
      {/* laundry bursting out of the open door and hanging down the front */}
      {onRight(
        1,
        1,
        <g>
          <path d={`M${DOOR.x - 7} ${-DOOR.z - 2} Q${DOOR.x - 12} ${-DOOR.z + 9} ${DOOR.x - 7} ${-DOOR.z + 9.5} Q${DOOR.x - 2} ${-DOOR.z + 10} ${DOOR.x - 1} ${-DOOR.z + 3} Z`} fill={fabricBlue} strokeWidth={2} />
          <path d={`M${DOOR.x + 1} ${-DOOR.z - 4} Q${DOOR.x + 9} ${-DOOR.z + 1} ${DOOR.x + 8} ${-DOOR.z + 8} Q${DOOR.x + 4} ${-DOOR.z + 10} ${DOOR.x + 1} ${-DOOR.z + 6} Z`} fill={warmRed} strokeWidth={2} />
          <path d={`M${DOOR.x - 5} ${-DOOR.z - 4} Q${DOOR.x} ${-DOOR.z - 9} ${DOOR.x + 5} ${-DOOR.z - 3} Q${DOOR.x} ${-DOOR.z + 2} ${DOOR.x - 5} ${-DOOR.z - 4} Z`} fill={blush} strokeWidth={2} />
        </g>,
      )}
      {smudge(iso(0.82, 0.84, H).x, iso(0.82, 0.84, H).y, 4.5)}
      {laundryPile(top.x - 6, top.y + 2, 1.15)}
      <g transform={`translate(${top.x + 10} ${top.y - 6})`}>
        <path d="M-9 0 Q-10 -6 -3 -7 Q4 -8 8 -4 Q10 0 6 2 Q-2 4 -9 0 Z" fill={leaf} />
        <path d="M-3 -6 Q0 -10 5 -7" fill="none" stroke={white} strokeWidth={1.5} />
      </g>
      {sock(top.x - 20, top.y + 2, warmRed, true, 8)}
      {bubble(top.x + 20, top.y - 22, 4, 'a')}
      {bubble(top.x + 12, top.y - 34, 2.6, 'b')}
      {bubble(top.x - 14, top.y - 32, 3.2, 'c')}
      {bubble(iso(1, 0.15, 20).x, iso(1, 0.15, 20).y, 2.2, 'd')}
      {stink(top.x - 4, top.y - 22)}
      {fly(top.x + 18, top.y - 46)}
    </g>
  )
}

export const washerArt: ObjectArt = {
  catalogId: 'washer',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {body()}
      {controls()}
      {glass(stage === 'messy2')}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
