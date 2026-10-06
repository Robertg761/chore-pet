import { PALETTE } from '../../art/palette'
import { LINE, pair, type Fit } from './shared'

const { ink, warmRed, blush, fabricBlue, sky, leaf, leafDark, cream, white } = PALETTE


/** Round glasses: the lenses sit on the eyes at (+/-20, 0), white shine on each. */
export function glasses(_fit: Fit) {
  return (
    <g stroke={ink} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round">
      {pair(<>
        <circle cx={-20} cy={0} r={14.5} fill={sky} fillOpacity={0.3} />
        <path d="M-34 -3 L-39 -6" fill="none" />
        <path d="M-30 -8 A11.5 11.5 0 0 1 -26 -10.8" fill="none" stroke={white} strokeWidth={3.5} />
      </>)}
      <path d="M-6 -2 Q0 -7 6 -2" fill="none" />
    </g>
  )
}

/** Scarf half-width per pet: a little wider than the body, so it reads as a thick wrap. */
const SCARF_HALF = { mochi: 70, bun: 59, sprout: 60 } as const

/** A cosy striped scarf around the base of the body, with a short tail hanging down. */
export function scarf({ species }: Fit) {
  const w = SCARF_HALF[species]
  const i = w - 3
  const band = `M${-w} -16 Q0 14 ${w} -16 L${w} -1 Q0 35 ${-w} -1 Z`
  return (
    <g transform="translate(0 -2)">
      <g {...LINE}>
        {/* tail first, so the wrap sits over its top */}
        <g transform="rotate(-7 32 8)">
          <rect x={20} y={2} width={22} height={28} rx={6} fill={fabricBlue} />
          <path d="M21.5 15 H40.5 M21.5 23 H40.5" fill="none" stroke={cream} strokeWidth={3.5} strokeLinecap="butt" />
          <rect x={20} y={2} width={22} height={28} rx={6} fill="none" />
        </g>
        <path d={band} fill={fabricBlue} stroke="none" />
        <path d={`M${-i} -9 Q0 21 ${i} -9 L${i} -4 Q0 26 ${-i} -4 Z`} fill={cream} stroke="none" />
        <path d={band} fill="none" />
      </g>
    </g>
  )
}

/** The bow tie's shapes: two wings and a knot. */
const BOW_WINGS = 'M-3 0 L-22 -10 Q-27 0 -22 10 Z'

/**
 * A small neat bow tie with a centre knot. A thin cream rim under the outline
 * keeps the red from vanishing into the red dress or the orange sweater.
 */
export function bowTie(_fit: Fit) {
  const shapes = (fill: string) => (
    <>
      {pair(<path d={BOW_WINGS} fill={fill} />)}
      <rect x={-6} y={-7} width={12} height={14} rx={5} fill={fill} />
    </>
  )
  return (
    <g transform="translate(0 4) scale(1.1)">
      <g {...LINE}>
        <g strokeWidth={10} stroke={cream}>{shapes(cream)}</g>
        {pair(<>
          <path d={BOW_WINGS} fill={warmRed} />
          <path d="M-10 -1 L-19 -4.5" fill="none" stroke={blush} strokeWidth={3} />
        </>)}
        <rect x={-6} y={-7} width={12} height={14} rx={5} fill={warmRed} />
      </g>
    </g>
  )
}

// ---- Backpack. It comes in two parts that share the `back` anchor: the pack,
// drawn behind the body (`item.render`), and the shoulder straps, drawn in front
// of the body and outfit (`item.front`, see `backpackStraps`).

type Pt = readonly [number, number]

/**
 * Per-pet cut, in back-anchor space. The pack is small: only its top corners
 * and handle peek past the shoulders. `strap` is a cubic (start, two controls,
 * end): it starts on the shoulder curve (about 70% of the way out) and runs
 * down the body's side, outside the cheeks.
 */
const PACK = {
  mochi: { top: -61, hw: 59, r: 24, handleW: 13, handleH: 8, strap: [[-50, -44], [-56, -32], [-60, -12], [-59, 14]] },
  bun: { top: -57, hw: 52, r: 22, handleW: 10, handleH: 7, strap: [[-39, -44], [-46, -32], [-52, -15], [-50, 2]] },
  sprout: { top: -66, hw: 50, r: 24, handleW: 9, handleH: 7, strap: [[-43, -42], [-49, -30], [-54, -14], [-52, 8]] },
} as const satisfies Record<string, { top: number; hw: number; r: number; handleW: number; handleH: number; strap: readonly [Pt, Pt, Pt, Pt] }>

/**
 * A small rounded backpack drawn behind the body. Only its handle and top
 * corners show above the shoulders, and its sides just clear the upper body.
 */
export function backpack({ species }: Fit) {
  const { top, hw, r, handleW: hx, handleH: hh } = PACK[species]
  const bottom = 6
  const handle = `M${-hx} ${top + 3} V${top - hh + 5} Q${-hx} ${top - hh} ${-hx + 5} ${top - hh} H${hx - 5} Q${hx} ${top - hh} ${hx} ${top - hh + 5} V${top + 3}`
  const body = <rect x={-hw} y={top} width={hw * 2} height={bottom - top} rx={r} />
  return (
    <g {...LINE}>
      {/* top handle: ink outline, then a leaf-dark core */}
      <path d={handle} fill="none" strokeWidth={11} />
      <path d={handle} fill="none" stroke={leafDark} strokeWidth={3.5} />
      <g fill={leaf}>{body}</g>
      {/* darker top flap with a stitched edge */}
      <path d={`M${-hw} ${top + 30} V${top + r} A${r} ${r} 0 0 1 ${-hw + r} ${top} H${hw - r} A${r} ${r} 0 0 1 ${hw} ${top + r} V${top + 30} Q0 ${top + 40} ${-hw} ${top + 30} Z`} fill={leafDark} stroke="none" />
      <path d={`M${-hw} ${top + 30} Q0 ${top + 40} ${hw} ${top + 30}`} fill="none" strokeWidth={3.5} />
      <g fill="none">{body}</g>
    </g>
  )
}

/** Point and tangent angle (degrees) at `t` along a cubic Bezier. */
function onCubic([p0, p1, p2, p3]: readonly [Pt, Pt, Pt, Pt], t: number) {
  const u = 1 - t
  const at = (i: 0 | 1) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]
  const dt = (i: 0 | 1) => 3 * u * u * (p1[i] - p0[i]) + 6 * u * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i])
  return { x: at(0), y: at(1), angle: (Math.atan2(dt(1), dt(0)) * 180) / Math.PI }
}

/**
 * The backpack's shoulder straps (`Item.front`), drawn in front of the body and
 * outfit at the same `back` anchor. Each comes over the shoulder, runs down the
 * body's side to the hip, and has a small adjuster buckle. They stay outside
 * the eyes and cheeks.
 */
export function backpackStraps({ species }: Fit) {
  const { strap } = PACK[species]
  const [[sx, sy], [c1x, c1y], [c2x, c2y], [ex, ey]] = strap
  const d = `M${sx} ${sy} C${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`
  const b = onCubic(strap, 0.62)
  return (
    <g {...LINE}>
      {pair(<>
        <path d={d} fill="none" strokeWidth={11.5} />
        <path d={d} fill="none" stroke={leaf} strokeWidth={4.5} />
        {/* adjuster buckle, a little wider than the strap */}
        <rect x={-8} y={-3.5} width={16} height={7} rx={3} fill={leafDark} strokeWidth={3} transform={`translate(${b.x} ${b.y}) rotate(${b.angle + 90})`} />
      </>)}
    </g>
  )
}

// ---- Outfits. The pets are round blobs with no torso, so an outfit is a garment
// over the lower body. Every outfit is drawn in the space of the outfit anchor
// (about the lower middle of the body, tuned on Bun, the narrowest body) and its
// hem follows the body's rounded bottom. Mochi is wider, so its outfit anchor may
// carry a scale of about 1.1. The sick bed hides the body under a blanket, so
// outfits should not be drawn in the sick poses (anchor scale 0).

/** Top edge of every garment: just under the cheeks and mouth. */