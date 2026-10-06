import type { ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'
import type { Item } from './slots'

// Wearable items. Each is drawn centred on (0,0) and must look right on every
// pose of every species (check the art gallery at /?art, "Wardrobe check").
// Anchors (see slots.ts): neck sits on the upper belly, face between the eyes
// (eyes at x = +/-20), head on top of the body, back behind the body.

const { ink, warmRed, blush, fabricBlue, sky, leaf, leafDark, cream, white } = PALETTE

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
]
