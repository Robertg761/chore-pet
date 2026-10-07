import { mix } from '../../art/color'
import { PALETTE } from '../../art/palette'
import { Garment } from '../Garment'
import { Ink, Tube } from '../ink'
import { pair, type Fit } from './shared'

// Outfits are drawn around the outfit anchor (the lower belly) and clipped to
// the pose's body outline, which is re-inked on top. So every shape here is
// drawn generously wide and only its inner edges (neckline, hem, pocket, bib,
// straps) carry an outline. The face ends about y = -13 in this space, so
// nothing may rise above that between x = -46 and 46.

const { ink, warmRed, fabricBlue, cream, petDefault } = PALETTE

/** Half-width of each pet's body near the neckline (Mochi is a wide dumpling). */
const SHOULDER: Record<Fit['species'], number> = { mochi: 62, bun: 56, sprout: 58 }

const shade = (colour: string, by = 0.28) => mix(colour, ink, by)
// No stroke width here: lines inherit the character outline from the enclosing <Garment> or <Ink>.
const line = { fill: 'none', stroke: ink, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** The belly's lower outline, lifted by `y0`: a parabola that follows the round body bottom. */
const hemY = (x: number, y0: number) => y0 - (x * x) / 180
const hemCurve = (y0: number, a = 90) => `M${-a} ${hemY(-a, y0)} Q0 ${y0 + (a * a) / 180} ${a} ${hemY(a, y0)}`

/** A flat band between two belly-following curves, `y0` and `y1` (centre heights). */
const hemBand = (y0: number, y1: number, a = 90) =>
  `${hemCurve(y0, a)} L${a} ${hemY(a, y1)} Q0 ${y1 + (a * a) / 180} ${-a} ${hemY(-a, y1)} Z`

/** A small round button. */
function button(x: number, y: number, fill = petDefault) {
  return <circle cx={x} cy={y} r={2.7} fill={fill} stroke={ink} strokeWidth={2.4} />
}

/** A bow: two loops and a knot. */
function bow(x: number, y: number, fill: string, size = 1) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`} stroke={ink} strokeWidth={3} strokeLinejoin="round">
      {pair(<path d="M0 0 C-4 -7 -12 -7 -12 -1 C-12 5 -4 6 0 0 Z" fill={fill} />)}
      <circle r={2.8} fill={fill} />
    </g>
  )
}

// ---------------------------------------------------------------- hoodie

const hoodieBody = fabricBlue
const hoodieHood = mix(fabricBlue, PALETTE.white, 0.32)

/** Cosy hoodie: a solid blue body, a hood rolled round the neck and up the flanks, two drawstrings and one big pocket. */
export function hoodie({ species }: Fit) {
  const w = SHOULDER[species]
  // Upper edge of the hood: climbs outside the cheeks, dips under the chin.
  const top = `M-90 -46 C-72 -40 -58 -30 ${-w + 6} -16 C-52 -9 -40 -5 -22 -4 Q0 -3 22 -4 C40 -5 52 -9 ${w - 6} -16 C58 -30 72 -40 90 -46`
  // Lower edge of the hood where it meets the body.
  const low = 'M-90 -18 C-72 -12 -60 -3 -44 0.5 C-32 3.5 -16 4.5 0 4.5 C16 4.5 32 3.5 44 0.5 C60 -3 72 -12 90 -18'
  const lace = 'M-6 4.5 Q-8 7.5 -7.5 11'
  return (
    <Garment d={`${top} L90 40 L-90 40 Z`} fill={hoodieBody}>
      {/* the hood, rolled round the neck */}
      <path d={`${top} ${reversed(low)} Z`} fill={hoodieHood} stroke="none" />
      <path d={low} {...line} strokeWidth={3} />
      {/* kangaroo pocket: one rounded shape running off the bottom */}
      <path d="M-24 9 Q0 6.5 24 9 Q28 14 30 30 L-30 30 Q-28 14 -24 9 Z" {...line} fill={hoodieBody} strokeWidth={3} />
      {/* drawstrings */}
      {pair(
        <>
          <path d={lace} {...line} strokeWidth={5.4} />
          <path d={lace} {...line} stroke={cream} strokeWidth={2} />
          <circle cx={-7.5} cy={11.5} r={2} fill={cream} stroke={ink} strokeWidth={2} />
        </>,
      )}
    </Garment>
  )
}

/** The same cubic path walked backwards, as a continuation (no leading M). */
function reversed(path: string): string {
  const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number)
  const pts: [number, number][] = []
  for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]])
  // pts = start, then groups of three (c1, c2, end) per C segment.
  const segs: string[] = []
  for (let i = pts.length - 1; i >= 3; i -= 3) {
    const [c2, c1, start] = [pts[i - 1], pts[i - 2], pts[i - 3]]
    segs.push(`C${c2[0]} ${c2[1]} ${c1[0]} ${c1[1]} ${start[0]} ${start[1]}`)
  }
  return `L${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]} ${segs.join(' ')}`
}

// -------------------------------------------------------------- overalls

const denim = shade(fabricBlue, 0.3)
const denimShade = shade(fabricBlue, 0.48)

/** Denim overalls: a bib with a pocket, straps over the shoulders, a button on each, trousers below. */
export function overalls({ species }: Fit) {
  const w = SHOULDER[species]
  // Each strap leaves the bib's top corner, slips under the cheek, then climbs the side of the body.
  const strap = `M-13 -6 Q-30 -5 -${w - 14} -12 L-${w + 8} -34`
  return (
    <Ink>
      {/* trousers */}
      <Garment d="M-90 1 Q0 8 90 1 V40 H-90 Z" fill={denim}>
        <path d="M0 11 V30" {...line} strokeWidth={3} />
        {pair(<path d="M-33 11 Q-40 14 -42 18" {...line} strokeWidth={3} />)}
      </Garment>
      {/* straps */}
      {pair(
        <Tube d={strap} outer={10} inner={5.6} colour={denim} />,
      )}
      {/* bib */}
      <path d="M-17 -7 Q-17 -10 -14 -10 H14 Q17 -10 17 -7 V4 Q0 8 -17 4 Z" {...line} fill={denim} />
      <rect x={-8} y={-5} width={16} height={8} rx={3} {...line} fill={denimShade} strokeWidth={2.8} />
      {pair(button(-14.5, -6.5))}
    </Ink>
  )
}

// ----------------------------------------------------------------- dress

/** Half-width of each pet's body at the waist line (y = 1). */
const WAIST: Record<Fit['species'], number> = { mochi: 58, bun: 52, sprout: 54 }

/** A warm-red dress. The clipped part is the bodice with a cream collar and a waist bow; the flared skirt is `dressSkirt`. */
export function dress({ species }: Fit) {
  const w = SHOULDER[species]
  const top = `M-90 -40 C-72 -36 -60 -26 -${w - 6} -14 Q-44 -8 -32 -8 Q-14 -7 0 -3 Q14 -7 32 -8 Q44 -8 ${w - 6} -14 C60 -26 72 -36 90 -40`
  return (
    <Garment d={`${top} L90 40 L-90 40 Z`} fill={warmRed}>
      {pair(<path d="M0 -3 C-6 -9 -20 -11 -26 -7 C-25 -1 -10 1 0 0 Z" {...line} fill={cream} strokeWidth={3} />)}
    </Garment>
  )
}

/** The dress's skirt, drawn unclipped so it flares out past the body's sides, with a scalloped hem and the waist bow. */
export function dressSkirt({ species }: Fit) {
  const a = WAIST[species]
  const b = a + 14
  const n = 9
  const base = (x: number) => 13 + 2.5 * (1 - (x / b) ** 2)
  const xs = Array.from({ length: n }, (_, i) => b - ((i + 1) * 2 * b) / n)
  const skirt = `M${-a} 0.5 Q0 6 ${a} 0.5 L${b} ${base(b)} ${xs.map((x) => `A8 8 0 0 1 ${x} ${base(x)}`).join(' ')} Z`
  return (
    <Ink>
      <path {...line} d={skirt} fill={warmRed} />
      {pair(<path d="M-16 9 Q-20 14 -23 18 M-34 6 Q-40 12 -45 18" {...line} stroke={shade(warmRed, 0.2)} strokeWidth={2.4} />)}
      {bow(0, 3, cream, 1.2)}
    </Ink>
  )
}

// --------------------------------------------------------------- sweater

const sage = mix(PALETTE.leaf, cream, 0.35)
const sageDark = PALETTE.leafDark

/** A cosy sage sweater: a thick ribbed collar and one bold cream stripe across the chest. */
export function sweater({ species }: Fit) {
  const w = SHOULDER[species]
  const collar = `M-90 -26 C-72 -19 -60 -11 -${w - 14} -8 Q-40 -4 -22 -4 Q0 -2.5 22 -4 Q40 -4 ${w - 14} -8 C60 -11 72 -19 90 -26`
  return (
    <Garment d={`${collar} L90 40 L-90 40 Z`} fill={sage}>
      {/* the chest stripe */}
      <path d={hemBand(7, 12)} fill={cream} stroke="none" />
      {/* ribbed collar */}
      <Tube d={collar} outer={14} inner={10} colour={sageDark} />
      <path d={collar} {...line} stroke={ink} strokeOpacity={0.3} strokeWidth={10} strokeDasharray="2 7" strokeLinecap="butt" />
    </Garment>
  )
}
