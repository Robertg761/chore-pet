import type { ReactNode } from 'react'
import { mix } from '../art/color'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'
import { Garment } from './Garment'
import type { Item } from './slots'

// Wearable items. Each is drawn centred on (0,0) and must look right on every
// pose of every species (check the art gallery at /?art, "Wardrobe check").
// Anchors (see slots.ts): neck sits on the upper belly, face between the eyes
// (eyes at x = +/-20), head on top of the body, back behind the body.

const { ink, warmRed, blush, fabricBlue, sky, leaf, leafDark, cream, white, petDefault, woodDark, floorWood } = PALETTE

/** The shared outline every item is drawn inside. */
const LINE = { stroke: ink, strokeWidth: CHARACTER_STROKE, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

/** Draws `children` and a mirrored copy, so the item is symmetrical. */
function pair(children: ReactNode) {
  return (
    <>
      {children}
      <g transform="scale(-1 1)">{children}</g>
    </>
  )
}

/** A big bow sitting on one side of the head: two loops, two tails and a knot. */
function bow() {
  return (
    <g transform="translate(32 -6) rotate(14)">
      <g {...LINE}>
        {pair(<>
          <path d="M-2 4 C-7 12 -13 20 -17 27 L-8 25 L-5 30 C-1 22 1 14 2 7 Z" fill={warmRed} />
        </>)}
        {pair(<>
          <path d="M-4 0 C-8 -14 -25 -19 -30 -9 C-33 0 -29 12 -22 14 C-14 15 -8 8 -4 3 Z" fill={warmRed} />
          <path d="M-9 -3 C-13 -8 -19 -9 -22 -5" fill="none" stroke={blush} strokeWidth={3.5} />
        </>)}
        <rect x={-6.5} y={-7.5} width={13} height={15} rx={6} fill={warmRed} />
      </g>
    </g>
  )
}

/** Round glasses: the lenses sit on the eyes at (+/-20, 0), white shine on each. */
function glasses() {
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

/** A cosy striped scarf around the base of the body, with a short tail hanging down. */
function scarf() {
  const band = 'M-60 -16 Q0 14 60 -16 L60 -1 Q0 35 -60 -1 Z'
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
        <path d="M-57 -9 Q0 21 57 -9 L57 -4 Q0 26 -57 -4 Z" fill={cream} stroke="none" />
        <path d={band} fill="none" />
      </g>
    </g>
  )
}

/** A small neat bow tie with a centre knot. */
function bowTie() {
  return (
    <g transform="translate(0 4)">
      <g {...LINE}>
        {pair(<>
          <path d="M-3 0 L-22 -10 Q-27 0 -22 10 Z" fill={warmRed} />
          <path d="M-10 -1 L-19 -4.5" fill="none" stroke={blush} strokeWidth={3} />
        </>)}
        <rect x={-6} y={-7} width={12} height={14} rx={5} fill={warmRed} />
      </g>
    </g>
  )
}

/**
 * A little rounded backpack, drawn behind the body. Only its top corners and
 * the straps show beside the shoulders; the body hides the rest.
 */
function backpack() {
  return (
    <g transform="translate(0 -2)">
      <g {...LINE}>
        <rect x={-55} y={-58} width={110} height={92} rx={28} fill={leaf} />
        <path d="M-55 -30 C-55 -46 -43 -58 -28 -58 H28 C43 -58 55 -46 55 -30 Q0 -17 -55 -30 Z" fill={leafDark} />
        {/* straps curling over the shoulders */}
        {pair(<>
          <path d="M-36 -52 C-58 -30 -57 6 -44 30" fill="none" strokeWidth={15} />
          <path d="M-36 -52 C-58 -30 -57 6 -44 30" fill="none" stroke={leafDark} strokeWidth={7} />
        </>)}
      </g>
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
const WAIST = -9
/** The body's lower outline in outfit space (right half, then left half), as an open path. */
const HEM = `M-55 ${WAIST} C-56 6 -33 19 0 19 C33 19 56 6 55 ${WAIST}`
/** A garment that follows the body: flat top edge at `top`, rounded hem hugging the belly. */
const fitted = (top: number) => `M-55 ${top} L55 ${top} C56 6 33 19 0 19 C-33 19 -56 6 -55 ${top} Z`

/** A tiny round button. */
function button(x: number, y: number) {
  return <circle cx={x} cy={y} r={2.6} fill={petDefault} strokeWidth={2.5} />
}

const hoodieShade = mix(fabricBlue, ink, 0.28)
const denim = mix(fabricBlue, ink, 0.3)
const denimShade = mix(fabricBlue, ink, 0.45)
const knit = mix(petDefault, warmRed, 0.45)
const knitRust = mix(warmRed, woodDark, 0.4)

/** Cosy hoodie: hood bunched round the neck, two drawstrings, kangaroo pocket. */
function hoodie() {
  const neck = `M-55 ${WAIST} C-55 -15 -43 -16 -36 -12 Q-20 -4 0 -4 Q20 -4 36 -12 C43 -16 55 -15 55 ${WAIST}`
  const body = `${neck} C56 6 33 19 0 19 C-33 19 -56 6 -55 ${WAIST} Z`
  const lace = 'M-7 -3 Q-9 0 -8 3'
  return (
    <Garment d={body} fill={fabricBlue}>
      {/* kangaroo pocket */}
      <path d="M-23 6 Q0 3.5 23 6 L33 28 L-33 28 Z" fill={fabricBlue} />
      <path d="M-23 6 L-28 11 M23 6 L28 11" fill="none" strokeWidth={3} />
      {/* the hood, rolled along the neckline */}
      <path d={neck} fill="none" stroke={ink} strokeWidth={12} />
      <path d={neck} fill="none" stroke={hoodieShade} strokeWidth={8} />
      {/* drawstrings */}
      {pair(
        <>
          <path d={lace} fill="none" stroke={ink} strokeWidth={6} />
          <path d={lace} fill="none" stroke={cream} strokeWidth={2.5} />
          <circle cx={-8} cy={4.5} r={2.6} fill={cream} strokeWidth={2.5} />
        </>,
      )}
    </Garment>
  )
}

/** Denim overalls: bib with a pocket, two straps and a button on each. */
function overalls() {
  const strap = <rect x={-4.5} y={-10} width={9} height={12} rx={3.5} fill={denim} transform="translate(-14 -5) rotate(-14)" />
  return (
    <>
      {pair(strap)}
      <Garment d={fitted(-4)} fill={denim}>
        <path d="M-18 -9 Q-18 -11 -16 -11 H16 Q18 -11 18 -9 V30 H-18 Z" fill={denim} />
        <rect x={-8.5} y={0} width={17} height={12} rx={3.5} fill={denimShade} strokeWidth={3} />
      </Garment>
      {pair(button(-15.5, -10))}
    </>
  )
}

/** A warm-red dress: cream dots, a cream hem trim, a skirt that flares past the body. */
function dress() {
  const d = `M-54 ${WAIST} L54 ${WAIST} C55 -2 56 5 60 15 Q0 29 -60 15 C-56 5 -55 -2 -54 ${WAIST} Z`
  return (
    <Garment d={d} fill={warmRed}>
      <path d="M-70 14 Q0 28 70 14 L70 6 Q0 20 -70 6 Z" fill={cream} />
      <path d="M-70 6 Q0 20 70 6" fill="none" strokeWidth={3} />
      <g fill={cream} stroke="none">
        {[[-30, 4], [-12, 9], [14, 8], [31, 3], [-4, 1], [-44, -2], [44, -2]].map(([x, y]) => (
          <circle key={`${x}`} cx={x} cy={y} r={2.4} />
        ))}
      </g>
    </Garment>
  )
}

/** A cable-knit sweater: ribbed neck and hem, braided cables down the front. */
function sweater() {
  const braid = (x: number, y0: number, y1: number) => {
    const h = (y1 - y0) / 2
    return (
      <>
        <path d={`M${x - 3.5} ${y0} q7 ${h / 2} 0 ${h} t0 ${h}`} />
        <path d={`M${x + 3.5} ${y0} q-7 ${h / 2} 0 ${h} t0 ${h}`} />
      </>
    )
  }
  const neck = 'M-55 -11 Q0 1 55 -11'
  const top = `${neck} C56 6 33 19 0 19 C-33 19 -56 6 -55 -11 Z`
  /** A ribbed band along `path`: dark band, light ticks. */
  const rib = (path: string, w: number) => (
    <>
      <path d={path} fill="none" stroke={ink} strokeWidth={w + 4} />
      <path d={path} fill="none" stroke={knitRust} strokeWidth={w} />
      <path d={path} fill="none" stroke={knit} strokeWidth={w} strokeDasharray="2 5" strokeLinecap="butt" />
    </>
  )
  return (
    <Garment d={top} fill={knit}>
      <g fill="none" stroke={knitRust} strokeWidth={3.5}>
        {braid(0, -1, 11)}
        {pair(braid(-26, 0, 8))}
      </g>
      {rib(HEM, 10)}
      {rib(neck, 9)}
    </Garment>
  )
}

/** One autumn leaf lying along +x from the origin, `len` long. */
function autumnLeaf(len: number, fill: string) {
  const w = len * 0.31
  return (
    <g>
      <path d={`M0 0 C${len * 0.2} ${-w} ${len * 0.75} ${-w} ${len} 0 C${len * 0.75} ${w} ${len * 0.2} ${w} 0 0 Z`} fill={fill} />
      <path d={`M${len * 0.2} 0 H${len * 0.62}`} fill="none" stroke={ink} strokeWidth={2} />
    </g>
  )
}

/** A circlet of autumn leaves with a tiny acorn, hugging the top of the head. */
function leafCrown() {
  const twig = 'M-46 14 Q-40 -5 0 -9 Q40 -5 46 14'
  // (x, y, angle, colour) along the head's curve, right half; pair() mirrors it
  const leaves: [number, number, number, string][] = [
    [2, -9, -8, leafDark],
    [15, -8, 4, warmRed],
    [27, -4, 30, petDefault],
    [37, 3, 50, warmRed],
    [43, 12, 74, leafDark],
  ]
  return (
    <g {...LINE}>
      <path d={twig} fill="none" stroke={ink} strokeWidth={9} />
      <path d={twig} fill="none" stroke={woodDark} strokeWidth={4} />
      {pair(
        <>
          {leaves.map(([x, y, a, c], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
              {autumnLeaf(25, c)}
            </g>
          ))}
        </>,
      )}
      {/* acorn */}
      <g transform="translate(14 -13) rotate(12)">
        <path d="M-6 0 C-6 9 -3 12 0 13 C3 12 6 9 6 0 Z" fill={floorWood} />
        <path d="M-8 1 C-8 -7 8 -7 8 1 Z" fill={woodDark} />
        <path d="M0 -5 V-8" fill="none" />
      </g>
    </g>
  )
}

export const ITEMS: Item[] = [
  {
    id: 'beanie-red',
    slot: 'head',
    name: 'Red beanie',
    render: () => (
      <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round">
        <path d="M-38 18 C-38 -26 38 -26 38 18 Z" fill={PALETTE.warmRed} />
        <rect x={-42} y={10} width={84} height={14} rx={7} fill="#F4A08A" />
        <circle cx={0} cy={-28} r={9} fill={PALETTE.white} />
      </g>
    ),
  },
  { id: 'bow', slot: 'head', name: 'Bow', render: () => bow() },
  { id: 'glasses', slot: 'face', name: 'Round glasses', render: () => glasses() },
  { id: 'scarf', slot: 'neck', name: 'Scarf', render: () => scarf() },
  { id: 'bow-tie', slot: 'neck', name: 'Bow tie', render: () => bowTie() },
  { id: 'backpack', slot: 'back', name: 'Backpack', render: () => backpack() },
  { id: 'hoodie', slot: 'outfit', name: 'Hoodie', render: () => hoodie() },
  { id: 'overalls', slot: 'outfit', name: 'Overalls', render: () => overalls() },
  { id: 'dress', slot: 'outfit', name: 'Dress', render: () => dress() },
  { id: 'knit-sweater', slot: 'outfit', name: 'Cosy knit sweater', render: () => sweater() },
  { id: 'leaf-crown', slot: 'head', name: 'Autumn leaf crown', render: () => leafCrown() },
]
