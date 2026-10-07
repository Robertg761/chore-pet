import { PALETTE } from '../../art/palette'
import { mix } from '../../art/color'
import type { Species } from '../../domain/types'
import { Ink, Tube } from '../ink'
import { pair, type Fit } from './shared'

const { ink, warmRed, blush, leafDark, petDefault, woodDark, floorWood, cream, creamDark } = PALETTE


/** A big bow sitting on one side of the head: two loops, two tails and a knot. */
export function bow(fit: Fit) {
  // Sprout's crown is narrower and Bun's ears rise right behind, so each gets nudged onto the head
  const place = { mochi: 'translate(32 -6) rotate(14)', bun: 'translate(31 -3) rotate(14)', sprout: 'translate(28 -1) rotate(16)' }[fit.species]
  return (
    <g transform={place}>
      <Ink>
        {pair(<>
          <path d="M-2 4 C-7 12 -13 20 -17 27 L-8 25 L-5 30 C-1 22 1 14 2 7 Z" fill={warmRed} />
        </>)}
        {pair(<>
          <path d="M-4 0 C-8 -14 -25 -19 -30 -9 C-33 0 -29 12 -22 14 C-14 15 -8 8 -4 3 Z" fill={warmRed} />
          <path d="M-9 -3 C-13 -8 -19 -9 -22 -5" fill="none" stroke={blush} strokeWidth={3.5} />
        </>)}
        <rect x={-6.5} y={-7.5} width={13} height={15} rx={6} fill={warmRed} />
      </Ink>
    </g>
  )
}

/** Round glasses: the lenses sit on the eyes at (+/-20, 0), white shine on each. */


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
export function leafCrown(_fit: Fit) {
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
    <Ink>
      <Tube d={twig} outer={9} inner={4} colour={woodDark} />
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
    </Ink>
  )
}

/** How a beanie is cut for each pet (see `beanie`). All numbers are in item space, y down, 0 = head anchor. */
interface Cut {
  /** Half width of the dome where it meets the cuff. */
  w: number
  /** Top of the dome. */
  top: number
  /** Cuff band: top edge, bottom edge (at the sides) and how far the middle sags to follow the forehead. */
  cuffTop: number
  cuffBottom: number
  sag: number
  /** Pom-pom centre and radius; undefined for none. */
  pom?: { y: number; r: number }
  /** Width of the opening the stem comes up through; undefined for a closed top. */
  stemHole?: number
}

const CUTS: Record<Species, Cut> = {
  // Mochi: a wide dome that also swallows the pinched knot.
  mochi: { w: 52, top: -27, cuffTop: 8, cuffBottom: 21, sag: 4, pom: { y: -29, r: 9.5 } },
  // Bun: low and snug; the dome stops at the crown so the ears come up out of the top edge.
  bun: { w: 45, top: -14, cuffTop: 3, cuffBottom: 15, sag: 3, pom: { y: -18, r: 8 } },
  // Sprout: a hole at the top with the stem rising through it.
  sprout: { w: 44, top: -16, cuffTop: 3, cuffBottom: 15, sag: 3, stemHole: 9 },
}

const KNIT = mix(warmRed, ink, 0.18)
const CUFF = mix(warmRed, cream, 0.35)

/** A knitted beanie: ribbed cuff folded up around the head, a snug dome and (where it fits) a pom-pom. */
export function beanie(fit: Fit) {
  const { w, top, cuffTop, cuffBottom, sag, pom, stemHole } = CUTS[fit.species]
  const cw = w + 4 // the folded cuff is a touch wider than the dome
  const base = cuffTop + 3
  // the dome, ending in a flat top rim or a notch for the stem
  const h = stemHole
  const domeTop = h
    ? `C${-w} ${top + 2} ${-h - 14} ${top} ${-h} ${top} Q0 ${top + 7} ${h} ${top} C${h + 14} ${top} ${w} ${top + 2} ${w} ${base}`
    : `C${-w} ${top - 4} ${-w * 0.55} ${top} 0 ${top} C${w * 0.55} ${top} ${w} ${top - 4} ${w} ${base}`
  const dome = `M${-w} ${base} ${domeTop} Z`
  // knit rows on the dome: curved ridges that follow its shape
  const rows = [0.3, 0.6].map((k) => {
    const y = base - (base - top) * k
    const x = w * (1 - 0.12 * k * k) * Math.sqrt(1 - Math.pow(k, 2.2) * 0.9)
    return `M${-x} ${y} Q0 ${y + 5} ${x} ${y}`
  })
  // the cuff follows the forehead: both edges sag in the middle
  const cuff = `M${-cw} ${cuffTop} Q0 ${cuffTop + sag * 2} ${cw} ${cuffTop} L${cw} ${cuffBottom} Q0 ${cuffBottom + sag * 2} ${-cw} ${cuffBottom} Z`
  const ribs: string[] = []
  for (let x = -cw + 7; x < cw - 3; x += 7) {
    const t = (x + cw) / (2 * cw)
    const bow = 2 * t * (1 - t) * sag * 2
    ribs.push(`M${x} ${cuffTop + bow + 2.5} V${cuffBottom + bow - 2.5}`)
  }
  return (
    <Ink>
      <path d={dome} fill={warmRed} />
      {rows.map((d) => (
        <path key={d} d={d} fill="none" stroke={KNIT} strokeWidth={2.5} />
      ))}
      <path d={cuff} fill={CUFF} />
      {ribs.map((d) => (
        <path key={d} d={d} fill="none" stroke={KNIT} strokeWidth={2.5} />
      ))}
      {pom && (
        <g transform={`translate(0 ${pom.y})`}>
          <circle r={pom.r} fill={cream} />
          <path d={`M${-pom.r * 0.55} ${-pom.r * 0.1} Q${-pom.r * 0.2} ${-pom.r * 0.6} ${pom.r * 0.3} ${-pom.r * 0.55}`} fill="none" stroke={creamDark} strokeWidth={2.5} />
        </g>
      )}
    </Ink>
  )
}
