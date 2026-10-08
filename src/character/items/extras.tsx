import { PALETTE } from '../../art/palette'
import { mix } from '../../art/color'
import { Ink, Tube } from '../ink'
import { pair, type Fit } from './shared'

const { warmRed, blush, fabricBlue, sky, leaf, leafDark, cream, white, steel, steelDark } = PALETTE


/** Round glasses: the lenses sit on the eyes at (+/-20, 0), white shine on each. */
export function glasses(_fit: Fit) {
  return (
    <Ink k={0.875}>
      {pair(<>
        <circle cx={-20} cy={0} r={14.5} fill={sky} fillOpacity={0.3} />
        <path d="M-34 -3 L-39 -6" fill="none" />
        <path d="M-30 -8 A11.5 11.5 0 0 1 -26 -10.8" fill="none" stroke={white} strokeWidth={3.5} />
      </>)}
      <path d="M-6 -2 Q0 -7 6 -2" fill="none" />
    </Ink>
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
      <Ink>
        {/* tail first, so the wrap sits over its top */}
        <g transform="rotate(-7 32 8)">
          <rect x={20} y={2} width={22} height={28} rx={6} fill={fabricBlue} />
          <path d="M21.5 15 H40.5 M21.5 23 H40.5" fill="none" stroke={cream} strokeWidth={3.5} strokeLinecap="butt" />
          <rect x={20} y={2} width={22} height={28} rx={6} fill="none" />
        </g>
        <path d={band} fill={fabricBlue} stroke="none" />
        <path d={`M${-i} -9 Q0 21 ${i} -9 L${i} -4 Q0 26 ${-i} -4 Z`} fill={cream} stroke="none" />
        <path d={band} fill="none" />
      </Ink>
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
      <Ink>
        <g strokeWidth={10} stroke={cream}>{shapes(cream)}</g>
        {pair(<>
          <path d={BOW_WINGS} fill={warmRed} />
          <path d="M-10 -1 L-19 -4.5" fill="none" stroke={blush} strokeWidth={3} />
        </>)}
        <rect x={-6} y={-7} width={12} height={14} rx={5} fill={warmRed} />
      </Ink>
    </g>
  )
}

// ---- Backpack. It comes in two parts that share the `back` anchor: the pack,
// drawn behind the body (`item.render`), and the shoulder straps, drawn in front
// of the body and outfit (`item.front`, see `backpackStraps`).

type Pt = readonly [number, number]

/**
 * Per-pet cut, in back-anchor space (y up is negative). The pack is a rounded box
 * a little narrower than the body, so its top corners stand clear of the round
 * shoulders and the top reads as a bag. `handleX` puts the grab handle over one
 * shoulder (the viewer's right), `handleW` and `handleH` size its loop. `strap` is
 * a cubic (start, two controls, end): it leaves the shoulder just inside the
 * bag's corner and runs down the body's side, outside the cheeks.
 */
const PACK = {
  mochi: { top: -60, hw: 46, r: 17, handleX: 29, handleW: 9, handleH: 11, strap: [[-40, -44], [-52, -34], [-60, -14], [-59, 14]] },
  bun: { top: -62, hw: 49, r: 17, handleX: 0, handleW: 8, handleH: 10, strap: [[-38, -38], [-46, -30], [-52, -15], [-50, 2]] },
  sprout: { top: -64, hw: 46, r: 17, handleX: 32, handleW: 8, handleH: 12, strap: [[-38, -38], [-47, -29], [-54, -14], [-52, 8]] },
} as const satisfies Record<string, { top: number; hw: number; r: number; handleX: number; handleW: number; handleH: number; strap: readonly [Pt, Pt, Pt, Pt] }>

/**
 * A rounded backpack drawn behind the body. Its top edge, a stitched seam and a
 * grab handle over the right shoulder show above the body's curve; the rest hides.
 */
export function backpack({ species }: Fit) {
  const { top, hw, r, handleX, handleW: hx, handleH: hh } = PACK[species]
  const bottom = 6
  const handle = `M${handleX - hx} ${top + 4} V${top - hh + 5} Q${handleX - hx} ${top - hh} ${handleX - hx + 5} ${top - hh} H${handleX + hx - 5} Q${handleX + hx} ${top - hh} ${handleX + hx} ${top - hh + 5} V${top + 4}`
  const body = <rect x={-hw} y={top} width={hw * 2} height={bottom - top} rx={r} />
  const seam = `M${-hw + 6} ${top + 14} Q0 ${top + 19} ${hw - 6} ${top + 14}`
  return (
    <Ink>
      <Tube d={handle} outer={11} inner={4} colour={leafDark} />
      <g fill={leaf}>{body}</g>
      {/* darker top flap with a stitched edge */}
      <path d={`M${-hw} ${top + 24} V${top + r} A${r} ${r} 0 0 1 ${-hw + r} ${top} H${hw - r} A${r} ${r} 0 0 1 ${hw} ${top + r} V${top + 24} Q0 ${top + 34} ${-hw} ${top + 24} Z`} fill={leafDark} stroke="none" />
      <path d={`M${-hw} ${top + 24} Q0 ${top + 34} ${hw} ${top + 24}`} fill="none" strokeWidth={3.5} />
      <path d={seam} fill="none" stroke={leaf} strokeWidth={2} strokeDasharray="4 4" />
      <g fill="none">{body}</g>
    </Ink>
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
 * outfit at the same `back` anchor. Each comes over the shoulder and runs down the
 * body's side to the hip, with a small steel buckle. They stay outside the eyes and
 * cheeks.
 */
export function backpackStraps({ species }: Fit) {
  const { strap } = PACK[species]
  const [[sx, sy], [c1x, c1y], [c2x, c2y], [ex, ey]] = strap
  const d = `M${sx} ${sy} C${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`
  const b = onCubic(strap, 0.5)
  return (
    <Ink>
      {pair(<>
        <Tube d={d} outer={11.5} inner={4.5} colour={leaf} />
        {/* buckle: a steel clip across the strap, with a slot */}
        <g transform={`translate(${b.x} ${b.y}) rotate(${b.angle + 90})`}>
          <rect x={-8.5} y={-5.5} width={17} height={11} rx={4} fill={steel} strokeWidth={3} />
          <path d="M-3.5 0 H3.5" fill="none" stroke={steelDark} strokeWidth={3} />
        </g>
      </>)}
    </Ink>
  )
}

// ---- Outfits. The pets are round blobs with no torso, so an outfit is a garment
// over the lower body. Every outfit is drawn in the space of the outfit anchor
// (about the lower middle of the body, tuned on Bun, the narrowest body) and its
// hem follows the body's rounded bottom. Mochi is wider, so its outfit anchor may
// carry a scale of about 1.1. The sick bed hides the body under a blanket, so
// outfits should not be drawn in the sick poses (anchor scale 0).

/** Top edge of every garment: just under the cheeks and mouth. */
/**
 * One heart lens, centred on the eye (0,0): soft rounded lobes and a short point.
 * Same width as the round glasses' lens, so the eyes sit in the middle of it.
 */
const HEART = 'M0 12 C-4 9 -14 3 -14 -5 C-14 -11 -9.5 -13 -6.5 -13 C-3.5 -13 -1 -11 0 -8 C1 -11 3.5 -13 6.5 -13 C9.5 -13 14 -11 14 -5 C14 3 4 9 0 12 Z'

/** Heart-shaped glasses: a pale blush lens, a warm red frame, white shine on each lens. */
export function heartGlasses(_fit: Fit) {
  return (
    <Ink k={0.875}>
      {pair(
        <g transform="translate(-20 1)">
          <path d={HEART} fill={mix(blush, white, 0.7)} fillOpacity={0.4} stroke="none" />
          <Tube d={HEART} outer={7} inner={3} colour={warmRed} />
          <path d="M-34 -4 L-39 -7" fill="none" />
          <path d="M-9.5 -4.5 Q-9.5 -8.5 -6 -8.5" fill="none" stroke={white} strokeWidth={3.2} />
        </g>,
      )}
      <Tube d="M-6 -3 Q0 -8 6 -3" outer={7} inner={3} colour={warmRed} />
    </Ink>
  )
}

/**
 * Bandana cut per pet: `w` is the half-width (about the body's width at the belly, like
 * the scarf), `dy` how far it sits below the neck anchor (Bun's low, worried mouth needs
 * more room) and `tip` the depth of the point.
 */
const BANDANA = { mochi: { w: 66, dy: 3, tip: 35 }, bun: { w: 56, dy: 8, tip: 27 }, sprout: { w: 57, dy: 5, tip: 31 } } as const

/**
 * A triangular cleaning bandana worn over the belly: a folded band across the top
 * (the one darker shade), a polka-dot triangle hanging to a rounded point, and a small
 * knot with two short tails on the viewer's right.
 */
export function bandana({ species }: Fit) {
  const { w, dy, tip } = BANDANA[species]
  const k = w / 66
  const f = (tip + 16) / 51
  const dark = mix(fabricBlue, PALETTE.ink, 0.22)
  const top = `M${-w} -16 Q0 12 ${w} -16`
  const cloth = `${top} Q${w * 0.6} ${tip * 0.4} 5 ${tip} Q0 ${tip + 6} -5 ${tip} Q${-w * 0.6} ${tip * 0.4} ${-w} -16 Z`
  const seam = `M${-w + 2} -9 Q0 17 ${w - 2} -9`
  const band = `${top} L${w - 2} -9 Q0 17 ${-w + 2} -9 Z`
  const dots: [number, number][] = [[-30, 4], [-8, 7], [14, 4], [-16, 18], [6, 20], [0, 30]]
  const kx = w - 9
  const ky = -9
  return (
    <g transform={`translate(0 ${dy})`}>
      <Ink>
        {/* tails first, so the knot sits over them */}
        <g transform={`translate(${kx} ${ky})`}>
          <path d="M0 0 Q-3 9 -6 19 Q1 22 6 16 Q6 8 5 0 Z" fill={fabricBlue} transform="rotate(6)" />
          <path d="M0 0 Q4 8 9 17 Q16 15 17 8 Q12 1 6 -2 Z" fill={dark} transform="rotate(18)" />
        </g>
        <clipPath id={`bandana-${species}`}>
          <path d={cloth} />
        </clipPath>
        <path d={cloth} fill={fabricBlue} stroke="none" />
        <g clipPath={`url(#bandana-${species})`}>
          {dots.map(([x, y]) => (
            <circle key={`${x},${y}`} cx={x * k} cy={(y + 16) * f - 16} r={2.8} fill={white} stroke="none" />
          ))}
        </g>
        <path d={band} fill={dark} stroke="none" />
        <path d={cloth} fill="none" />
        <path d={seam} fill="none" strokeWidth={2.5} />
        <circle cx={kx} cy={ky} r={7.5} fill={dark} />
        <path d={`M${kx - 3} ${ky - 2.5} Q${kx - 1} ${ky - 4.5} ${kx + 2} ${ky - 3.5}`} fill="none" stroke={white} strokeWidth={2} />
      </Ink>
    </g>
  )
}
