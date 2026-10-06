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

/** A cosy striped scarf around the base of the body, with a short tail hanging down. */
export function scarf(_fit: Fit) {
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
export function bowTie(_fit: Fit) {
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
export function backpack(_fit: Fit) {
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