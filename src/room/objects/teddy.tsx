import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import { iso } from '../iso'
import { cobweb } from './lamp'
import type { ObjectArt } from './types'

// A cuddly sitting teddy bear on the floor, about knee-high to the pet: round
// ears with cream insides, a cream muzzle and belly, rosy cheeks and a little
// red bow. It has no chores, but if a player adds one the dust settles:
// messy1 slumps a little with dust on its head, messy2 has toppled onto its
// side under a friendly cobweb with a dust bunny nearby.
//
// Drawn in screen space around the tile centre. Local origin (0,0) is the
// floor point under the bear; the bear is ~40 units tall before BEAR_SCALE.

const { ink, floorWood, floorWoodSide, cream, creamDark, warmRed, blush, white, steel } = PALETTE

const DUST = mix(creamDark, steel, 0.5)
/** The bear is drawn at a comfortable size, then scaled to sit knee-high to the pet. */
const BEAR_SCALE = 0.9
const TILE_CENTRE_Y = iso(0.5, 0.5, 0).y
const FUR = floorWood
const FUR_SHADE = floorWoodSide
const BOW_DARK = mix(warmRed, ink, 0.22)

function shadow() {
  return <ellipse cx={0} cy={1} rx={22} ry={10} fill={ink} fillOpacity={0.15} stroke="none" />
}

/** A round ear: fur ball with a cream inside. */
function ear(x: number) {
  return (
    <g>
      <circle cx={x} cy={-41} r={5.6} fill={FUR} />
      <circle cx={x * 0.98} cy={-40.6} r={2.9} fill={cream} stroke="none" />
    </g>
  )
}

/** One fat paw: a squashed ball. `sole` shows the cream foot pad. */
function limb(cx: number, cy: number, rx: number, ry: number, rotate: number, sole = false) {
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={FUR} />
      {sole && <ellipse cx={cx} cy={cy + 0.4} rx={rx * 0.5} ry={ry * 0.55} fill={cream} stroke="none" />}
    </g>
  )
}

function bow() {
  return (
    <g strokeWidth={2}>
      <path d="M0 -17.4 Q-4 -23.5 -9 -21.4 Q-10.4 -17 -9 -13.6 Q-4 -11.8 0 -17.4 Z" fill={warmRed} />
      <path d="M0 -17.4 Q4 -23.5 9 -21.4 Q10.4 -17 9 -13.6 Q4 -11.8 0 -17.4 Z" fill={warmRed} />
      <path d="M0 -17.4 Q4 -12.2 9 -13.6 Q10 -15.4 9.6 -17.4 Z" fill={BOW_DARK} stroke="none" />
      <ellipse cx={0} cy={-17.4} rx={2.6} ry={2.8} fill={BOW_DARK} />
      <path d="M-7 -19.8 Q-5.5 -21 -3.6 -20" fill="none" stroke={white} strokeWidth={1.2} opacity={0.75} />
    </g>
  )
}

function face() {
  return (
    <g>
      <circle cx={-8.6} cy={-26.6} r={2.4} fill={blush} opacity={0.75} stroke="none" />
      <circle cx={8.6} cy={-26.6} r={2.4} fill={blush} opacity={0.75} stroke="none" />
      <ellipse cx={0} cy={-26.4} rx={6.2} ry={4.7} fill={cream} strokeWidth={2} />
      <ellipse cx={0} cy={-28.6} rx={2.6} ry={1.8} fill={ink} stroke="none" />
      <path d="M0 -27 V-25.2 M0 -25.2 Q-1.8 -23.6 -3.2 -24.4 M0 -25.2 Q1.8 -23.6 3.2 -24.4" fill="none" strokeWidth={1.4} />
      <circle cx={-6.2} cy={-33} r={2.1} fill={ink} stroke="none" />
      <circle cx={6.2} cy={-33} r={2.1} fill={ink} stroke="none" />
      <circle cx={-5.5} cy={-33.8} r={0.8} fill={white} stroke="none" />
      <circle cx={6.9} cy={-33.8} r={0.8} fill={white} stroke="none" />
    </g>
  )
}

/** The bear sitting, front on. */
function bear() {
  return (
    <g>
      {/* feet stick out in front, behind the body's lower edge */}
      {limb(-11.5, -3.4, 7.2, 5.6, -8, true)}
      {limb(11.5, -3.4, 7.2, 5.6, 8, true)}
      {/* body, with its darker lower-right shade clipped inside the outline */}
      <ellipse cx={0} cy={-11} rx={14.5} ry={12} fill={FUR} />
      <path d="M4 -1.4 Q12 -2.6 14 -12 Q14.6 -17.6 11.6 -21 Q16.4 -12 12 -4 Q8 0 4 -1.4 Z" fill={FUR_SHADE} stroke="none" />
      <ellipse cx={0} cy={-11} rx={14.5} ry={12} fill="none" />
      <ellipse cx={0} cy={-9.4} rx={7.6} ry={7} fill={cream} strokeWidth={2} />
      {limb(-15.4, -13.8, 4.6, 7, 24)}
      {limb(15.4, -13.8, 4.6, 7, -24)}
      {/* head */}
      {ear(-10.4)}
      {ear(10.4)}
      <circle cx={0} cy={-29.5} r={13} fill={FUR} />
      <path d="M6 -17 Q12.8 -20 12.8 -29 Q12.6 -34.6 9.4 -38 Q15 -32 13.4 -24 Q11 -17.6 6 -17 Z" fill={FUR_SHADE} stroke="none" />
      <circle cx={0} cy={-29.5} r={13} fill="none" />
      {face()}
      {bow()}
    </g>
  )
}

/** Dust sitting on a part of the bear: flat grey-beige specks. */
function specks(spots: [number, number, number][]) {
  return (
    <g fill={DUST} stroke="none" opacity={0.95}>
      {spots.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.6} />
      ))}
    </g>
  )
}

/** A small round dust bunny with two dot eyes, sitting on (x, y). */
function dustPuff(x: number, y: number, k = 1) {
  const puffs: [number, number, number][] = [
    [-3.6, -2.6, 3.2],
    [3.2, -2.8, 3.4],
    [0, -5.2, 3],
    [0, -2.2, 4],
  ]
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} strokeWidth={1.8}>
      {puffs.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={DUST} />
      ))}
      <g stroke="none" fill={DUST}>
        {puffs.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r - 0.8} />
        ))}
      </g>
      <circle cx={-1.6} cy={-2.8} r={0.8} fill={ink} stroke="none" />
      <circle cx={1.6} cy={-2.8} r={0.8} fill={ink} stroke="none" />
    </g>
  )
}

function floorDust(spots: [number, number, number][]) {
  return (
    <g fill={DUST} stroke="none" opacity={0.9}>
      {spots.map(([tx, ty, r], i) => {
        // Spots are tile positions; the bear group is already moved to the tile centre.
        const p = iso(tx, ty, 0)
        return <ellipse key={i} cx={p.x} cy={p.y - TILE_CENTRE_Y} rx={r} ry={r / 2} />
      })}
    </g>
  )
}

/** Slumped sideways a little, a sprinkle of dust on the head and shoulders. */
function messy1() {
  return (
    <g>
      <g transform={`rotate(-9 0 0) scale(${BEAR_SCALE})`} strokeWidth={ROOM_STROKE / BEAR_SCALE}>
        {bear()}
        {specks([[-3, -42.4, 3.2], [3.6, -42.8, 2.2], [-12, -45, 1.6], [-14, -21, 2.2]])}
      </g>
      {floorDust([[0.2, 0.62, 3], [0.78, 0.5, 2.2], [0.82, 0.7, 1.6]])}
    </g>
  )
}

/** Toppled onto its side, with a dust bunny, dusty fur and a cobweb on the ear. */
function messy2() {
  return (
    <g>
      <g transform={`translate(-6 2) rotate(84 0 -14) scale(${BEAR_SCALE})`} strokeWidth={ROOM_STROKE / BEAR_SCALE}>
        {bear()}
        {specks([[-2.6, -43, 3], [4, -42.8, 2.2], [-3, 0, 2]])}
      </g>
      {floorDust([[0.14, 0.7, 3], [0.7, 0.34, 3], [0.82, 0.58, 2]])}
      {dustPuff(-24, 20, 0.9)}
      {cobweb({ x: 15, y: -14 }, { x: 33, y: -2 }, { x: 25, y: 10 }, 3)}
    </g>
  )
}

export const teddyArt: ObjectArt = {
  catalogId: 'teddy',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -50, width: 72, height: 78 },
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      <g transform={`translate(0 ${TILE_CENTRE_Y})`}>
        {shadow()}
        {stage === 'clean' && (
          <g transform={`scale(${BEAR_SCALE})`} strokeWidth={ROOM_STROKE / BEAR_SCALE}>
            {bear()}
          </g>
        )}
        {stage === 'messy1' && messy1()}
        {stage === 'messy2' && messy2()}
      </g>
    </g>
  ),
}
