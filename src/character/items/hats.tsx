import { PALETTE } from '../../art/palette'
import { mix } from '../../art/color'
import type { Species } from '../../domain/types'
import { Ink, Tube } from '../ink'
import { pair, type Fit } from './shared'

const { ink, warmRed, blush, leafDark, petDefault, woodDark, floorWood, cream, creamDark, white } = PALETTE


/** How a chef's hat is cut for each pet. Item space, y down, 0 = head anchor. */
interface ToqueCut {
  /** Half width of the pleated band. */
  bw: number
  /** Band top edge, bottom edge (at the sides) and how far the middle sags to follow the forehead. */
  bandTop: number
  bandBottom: number
  sag: number
  /** Top of the puff, and how far the side lobes bulge past the band. */
  top: number
  side: number
  /** Half width of the dip the stem comes up through; undefined for a closed top. */
  stemGap?: number
}

const TOQUES: Record<Species, ToqueCut> = {
  // Mochi: a big toque that swallows the pinched knot.
  mochi: { bw: 40, bandTop: 6, bandBottom: 20, sag: 4, top: -50, side: 11 },
  // Bun: a shorter puff so the ears rise out beside it.
  bun: { bw: 36, bandTop: 1, bandBottom: 13, sag: 3, top: -47, side: 9 },
  // Sprout: low puffs either side of a dip; the stem and leaves rise out of the dip.
  sprout: { bw: 36, bandTop: 1, bandBottom: 13, sag: 3, top: -31, side: 8, stemGap: 10 },
}

/** Arc through a list of outline points; each lobe bulges outwards (clockwise on screen). */
function lobes(pts: [number, number][], round = 0.56) {
  return pts
    .slice(1)
    .map(([x, y], i) => {
      const [px, py] = pts[i]
      const r = Math.hypot(x - px, y - py) * round
      return `A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x} ${y}`
    })
    .join(' ')
}

/** A tall chef's toque: a cloud-like puff over a pleated band. */
export function chefHat(fit: Fit) {
  const { bw, bandTop, bandBottom, sag, top, side, stemGap } = TOQUES[fit.species]
  const H = bandTop - top
  const at = (k: number) => bandTop - H * k
  const mirror = ([x, y]: [number, number]): [number, number] => [-x, y]
  const base: [number, number] = [bw, bandTop + 2]
  // right half of the cloud, bottom to top: a low side bump, then (closed top) one big lobe each side of a crown lobe
  const sideB: [number, number] = [bw + side, at(0.4)]
  const shoulder: [number, number] = [bw * 0.4, at(stemGap ? 0.8 : 0.9)]
  // little folds where the lobes meet
  const fold = (p: [number, number], len: number) => `M${p[0]} ${p[1] + 1} Q${p[0] * 0.97} ${p[1] + len * 0.5} ${p[0] * 0.92} ${p[1] + len}`
  const creases = [fold(shoulder, 15), fold(mirror(shoulder), 15), fold(sideB, 10), fold(mirror(sideB), 10)]
  let puff: string
  if (stemGap) {
    // two crown lobes with a dip between them for the stem
    const g = stemGap
    puff =
      `M${-bw} ${bandTop + 2} ` +
      lobes([mirror(base), mirror(sideB), mirror(shoulder), [-g, top + 1]]) +
      ` Q0 ${top + 20} ${g} ${top + 1} ` +
      lobes([[g, top + 1], shoulder, sideB, base]) +
      ' Z'
  } else {
    puff = `M${-bw} ${bandTop + 2} ` + lobes([mirror(base), mirror(sideB), mirror(shoulder), shoulder, sideB, base], 0.54) + ' Z'
  }
  // the band follows the forehead: both edges sag in the middle
  const band = `M${-bw} ${bandTop} Q0 ${bandTop + sag * 2} ${bw} ${bandTop} L${bw + 2} ${bandBottom} Q0 ${bandBottom + sag * 2} ${-bw - 2} ${bandBottom} Z`
  const pleats: string[] = []
  for (let x = -bw + 8; x < bw - 4; x += 8) {
    const t = (x + bw) / (2 * bw)
    const dip = 2 * t * (1 - t) * sag * 2
    pleats.push(`M${x} ${bandTop + dip + 3} V${bandBottom + dip - 3}`)
  }
  return (
    <Ink>
      <path d={puff} fill={white} />
      {creases.map((d) => (
        <path key={d} d={d} fill="none" stroke={creamDark} strokeWidth={2.5} />
      ))}
      <path d={band} fill={cream} />
      {pleats.map((d) => (
        <path key={d} d={d} fill="none" stroke={creamDark} strokeWidth={2.5} />
      ))}
    </Ink>
  )
}

const GOLD_SHADE = mix(petDefault, woodDark, 0.32)

/** How a crown is cut for each pet. Item space, y down, 0 = head anchor. */
interface CrownCut {
  /** Half width of the band. */
  w: number
  /** Band top, bottom at the sides, and the sag of the middle (it follows the forehead). */
  bandTop: number
  bandBottom: number
  sag: number
  /** How far the outer, inner and middle points rise above the band top. */
  rise: [number, number, number]
  /** Lift and tilt of the whole crown. */
  dy: number
  tilt: number
}

const CROWNS: Record<Species, CrownCut> = {
  // Mochi: the middle point stands in front of the knot.
  mochi: { w: 30, bandTop: -3, bandBottom: 9, sag: 3, rise: [13, 18, 26], dy: 2, tilt: -8 },
  // Bun: sits between the ears, in front of their bases.
  bun: { w: 28, bandTop: 2, bandBottom: 13, sag: 3, rise: [12, 16, 24], dy: 0, tilt: -8 },
  // Sprout: sits low on the dome so the stem and leaves rise behind it.
  sprout: { w: 28, bandTop: 4, bandBottom: 15, sag: 3, rise: [12, 15, 22], dy: 1, tilt: -8 },
}

const TIP = 3.4 // radius of each rounded point

/** A small golden crown: a band with five rounded points, a gem on the middle one and tiny studs. */
export function crown(fit: Fit) {
  const { w, bandTop, bandBottom, sag, rise, dy, tilt } = CROWNS[fit.species]
  const reach = w - TIP - 1
  const xs = [-reach, -reach / 2, 0, reach / 2, reach]
  const tops = [rise[0], rise[1], rise[2], rise[1], rise[0]].map((r) => bandTop - r)
  const valley = bandTop - 5
  // the body: each point is a short spike ending in a round cap; the valleys between are straight and the joins round
  let d = `M${-w} ${bandBottom} L${-w} ${bandTop} L${xs[0] - TIP} ${tops[0] + TIP} `
  xs.forEach((x, i) => {
    d += `A${TIP} ${TIP} 0 0 1 ${x + TIP} ${tops[i] + TIP} `
    if (i < xs.length - 1) d += `L${(x + xs[i + 1]) / 2} ${valley} L${xs[i + 1] - TIP} ${tops[i + 1] + TIP} `
  })
  d += `L${w} ${bandTop} L${w} ${bandBottom} Q0 ${bandBottom + sag * 2} ${-w} ${bandBottom} Z`
  const band = `M${-w} ${bandTop} Q0 ${bandTop + sag * 2} ${w} ${bandTop} L${w} ${bandBottom} Q0 ${bandBottom + sag * 2} ${-w} ${bandBottom} Z`
  const studs = [-0.6, 0, 0.6].map((k) => {
    const t = (k * w + w) / (2 * w)
    const dip = 2 * t * (1 - t) * sag * 2
    return [k * w, (bandTop + bandBottom) / 2 + dip] as const
  })
  const gy = tops[2] + 5
  return (
    <g transform={`translate(0 ${dy}) rotate(${tilt})`}>
      <Ink>
        <path d={d} fill={petDefault} />
        <path d={band} fill={GOLD_SHADE} />
        {studs.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={2.6} fill={petDefault} strokeWidth={2} />
        ))}
        <path d={`M0 ${gy - 8.5} L7.5 ${gy} L0 ${gy + 8.5} L-7.5 ${gy} Z`} fill={warmRed} strokeWidth={3.4} />
        <path d={`M-3.4 ${gy - 0.6} L-1.2 ${gy - 3.6}`} fill="none" stroke={white} strokeWidth={2} />
      </Ink>
    </g>
  )
}

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
