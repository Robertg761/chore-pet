import { mix } from '../../art/color'
import { PALETTE } from '../../art/palette'
import { Garment } from '../Garment'
import { pair, type Fit } from './shared'

const { ink, warmRed, fabricBlue, cream, petDefault, woodDark } = PALETTE


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
export function hoodie(_fit: Fit) {
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
export function overalls(_fit: Fit) {
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
export function dress(_fit: Fit) {
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
export function sweater(_fit: Fit) {
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
