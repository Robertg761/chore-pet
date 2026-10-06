import { CHARACTER_STROKE, PALETTE } from '../../art/palette'
import { LINE, pair, type Fit } from './shared'

const { ink, warmRed, blush, leafDark, petDefault, woodDark, floorWood } = PALETTE


/** A big bow sitting on one side of the head: two loops, two tails and a knot. */
export function bow(_fit: Fit) {
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

/** A knitted beanie with a turned-up brim and a pom-pom. */
export function beanie(_fit: Fit) {
  return (
    <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round">
      <path d="M-38 18 C-38 -26 38 -26 38 18 Z" fill={PALETTE.warmRed} />
      <rect x={-42} y={10} width={84} height={14} rx={7} fill="#F4A08A" />
      <circle cx={0} cy={-28} r={9} fill={PALETTE.white} />
    </g>
  )
}
