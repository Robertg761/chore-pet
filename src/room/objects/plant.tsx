import { PALETTE, ROOM_STROKE } from '../../art/palette'
import { mix } from '../../art/color'
import type { MessStage } from '../../domain/types'
import type { ObjectArt } from './types'

// Potted plant: a terracotta pot in the middle of its 1x1 floor tile and a
// cheerful bush of two-tone leaves. messy1 droops a bit and drops a leaf;
// messy2 is wilted but still cute (never dead), with dry cracked soil, two
// fallen leaves and a little watering can hinting at what it wants.

const { ink, warmRed, floorWood, dirt, leaf, leafDark, petDefault, creamDark, sky, steelDark, white } = PALETTE

const TERRACOTTA = mix(warmRed, floorWood, 0.4)
const TERRACOTTA_RIM = mix(TERRACOTTA, white, 0.22)
const SOIL = mix(dirt, ink, 0.25)
const DRY_SOIL = mix(dirt, creamDark, 0.5)

const YELLOW = { light: mix(leaf, petDefault, 0.7), dark: mix(leafDark, petDefault, 0.6) }
const TIRED = { light: mix(leaf, petDefault, 0.32), dark: mix(leafDark, petDefault, 0.3) }
const FRESH = { light: leaf, dark: leafDark }
export type LeafColours = { light: string; dark: string }

/**
 * One two-tone leaf growing from (x, y). `rot` 0 points straight up, positive
 * leans right; `bend` curves the tip sideways (px). `flat` squashes it into
 * the floor plane (a fallen leaf).
 */
export function leafShape(x: number, y: number, rot: number, len: number, bend: number, c: LeafColours, key?: string | number, flat = false) {
  const w = len * 0.3
  const right = `C${w + bend * 0.2} ${-len * 0.2} ${w + bend * 0.7} ${-len * 0.75} ${bend} ${-len}`
  const left = `C${-w + bend * 0.7} ${-len * 0.75} ${-w + bend * 0.2} ${-len * 0.2} 0 0`
  const tf = flat ? `translate(${x} ${y}) scale(1 0.5) rotate(${rot})` : `translate(${x} ${y}) rotate(${rot})`
  return (
    <g key={key} transform={tf} strokeWidth={2}>
      <path d={`M0 0 ${right} ${left} Z`} fill={c.light} />
      <path d={`M0 0 ${right} Q${bend * 0.5} ${-len * 0.5} 0 0 Z`} fill={c.dark} stroke="none" />
      <path d={`M0 0 ${right} ${left} Z`} fill="none" />
      <path d={`M0 -1 Q${bend * 0.45} ${-len * 0.45} ${bend * 0.9} ${-len * 0.82}`} fill="none" stroke={ink} strokeWidth={1.2} opacity={0.35} />
    </g>
  )
}

/** The terracotta pot. `soil` swaps the soil fill; `cracks` adds dry cracks. */
function pot(soil: string, cracks: boolean) {
  return (
    <g>
      <ellipse cx={0} cy={17} rx={19} ry={8} fill={ink} fillOpacity={0.15} stroke="none" />
      <path d="M-14 -2 L-10.5 16 A10.5 5.2 0 0 0 10.5 16 L14 -2 Z" fill={TERRACOTTA} />
      <path d="M-14 -2 L-10.5 16 A10.5 5.2 0 0 0 0 21.2 L0 -2 Z" fill={ink} opacity={0.16} stroke="none" />
      <path d="M-11.6 6 A11.6 5.2 0 0 0 11.6 6" fill="none" stroke={TERRACOTTA_RIM} strokeWidth={2} opacity={0.8} />
      <path d="M-16 -9 V-3 A16 7 0 0 0 16 -3 V-9 Z" fill={TERRACOTTA_RIM} />
      <path d="M-16 -9 V-3 A16 7 0 0 0 0 4 V-9 Z" fill={ink} opacity={0.12} stroke="none" />
      <ellipse cx={0} cy={-9} rx={16} ry={7} fill={soil} />
      {cracks && (
        <g fill="none" stroke={ink} strokeWidth={1.2} opacity={0.55}>
          <path d="M-9 -9 l4 1.5 l-1 2 M-5 -7.5 l5 -0.5 l3 2 M2 -8.5 l3 -3 M6 -8 l5 1 l1 -1.5 M-2 -8 l-1 -3" />
        </g>
      )}
    </g>
  )
}

interface Spec {
  rot: number
  len: number
  bend: number
  dx?: number
  colours?: LeafColours
}

function leaves(specs: Spec[], colours: LeafColours) {
  return <g>{specs.map((s, i) => leafShape((s.dx ?? 0), -9, s.rot, s.len, s.bend, s.colours ?? colours, i))}</g>
}

const CLEAN: Spec[] = [
  { rot: -10, len: 44, bend: -3, dx: -2 },
  { rot: 12, len: 46, bend: 3, dx: 2 },
  { rot: -38, len: 38, bend: -5, dx: -3 },
  { rot: 38, len: 38, bend: 5, dx: 3 },
  { rot: -58, len: 28, bend: -5, dx: -4 },
  { rot: 58, len: 28, bend: 5, dx: 4 },
  { rot: -22, len: 27, bend: -2, dx: -1 },
  { rot: 24, len: 27, bend: 2, dx: 1 },
]

const DROOPY: Spec[] = [
  { rot: -16, len: 42, bend: -9, dx: -2 },
  { rot: 14, len: 40, bend: 9, dx: 2 },
  { rot: -46, len: 32, bend: -11, dx: -3 },
  { rot: 46, len: 31, bend: 11, dx: 3, colours: YELLOW },
  { rot: -72, len: 26, bend: -12, dx: -4 },
  { rot: 76, len: 25, bend: 13, dx: 4 },
  { rot: -26, len: 24, bend: -4, dx: -1 },
  { rot: 26, len: 24, bend: 4, dx: 1 },
]

// Wilted: leaves flop over the rim, tips pointing down.
const WILTED: Spec[] = [
  { rot: -22, len: 28, bend: -20, dx: -2 },
  { rot: 20, len: 29, bend: 21, dx: 2, colours: YELLOW },
  { rot: -62, len: 24, bend: -22, dx: -3 },
  { rot: 64, len: 24, bend: 22, dx: 3 },
  { rot: -100, len: 21, bend: -18, dx: -7 },
  { rot: 100, len: 21, bend: 19, dx: 7, colours: YELLOW },
  { rot: -4, len: 22, bend: 8, dx: 0 },
]

function wateringCan(x: number, y: number) {
  const spout = `M${x + 5} ${y - 6} L${x + 12} ${y - 13}`
  return (
    <g strokeWidth={2}>
      <path d={`M${x - 5} ${y - 10} Q${x - 13} ${y - 9} ${x - 12} ${y - 5} Q${x - 11} ${y - 2} ${x - 5} ${y - 3}`} fill="none" />
      <path d={spout} fill="none" stroke={ink} strokeWidth={5} />
      <path d={spout} fill="none" stroke={sky} strokeWidth={1.8} />
      <path d={`M${x - 6} ${y - 11} V${y - 2} A6 3 0 0 0 ${x + 6} ${y - 2} V${y - 11} Z`} fill={sky} />
      <path d={`M${x - 6} ${y - 11} V${y - 2} A6 3 0 0 0 ${x} ${y + 1} V${y - 11} Z`} fill={ink} opacity={0.14} stroke="none" />
      <ellipse cx={x} cy={y - 11} rx={6} ry={3} fill={steelDark} />
      <path d={`M${x + 13} ${y - 9} q-1.8 3 0 4 q1.8 -1 0 -4 Z`} fill={sky} strokeWidth={1.5} />
    </g>
  )
}

/** A leaf lying on the floor tile. */
function fallen(x: number, y: number, rot: number, c: LeafColours, key?: string | number) {
  return leafShape(x, y, rot, 15, 2, c, key, true)
}

function messy1() {
  return <g>{fallen(19, 21, 66, YELLOW)}</g>
}

function messy2() {
  return (
    <g>
      {fallen(20, 20, 70, YELLOW, 'a')}
      {fallen(5, 28, -35, TIRED, 'b')}
      {wateringCan(-21, 21)}
    </g>
  )
}

export const plantArt: ObjectArt = {
  catalogId: 'plant',
  footprint: { w: 1, d: 1 },
  bounds: { x: -36, y: -88, width: 72, height: 124 },
  cueY: -57,
  render: (stage: MessStage) => (
    <g stroke={ink} strokeWidth={ROOM_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {pot(stage === 'messy2' ? DRY_SOIL : SOIL, stage === 'messy2')}
      {stage === 'clean' && leaves(CLEAN, FRESH)}
      {stage === 'messy1' && leaves(DROOPY, FRESH)}
      {stage === 'messy2' && leaves(WILTED, TIRED)}
      {stage === 'messy1' && messy1()}
      {stage === 'messy2' && messy2()}
    </g>
  ),
}
