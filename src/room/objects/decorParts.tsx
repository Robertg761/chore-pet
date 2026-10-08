import { PALETTE } from '../../art/palette'
import { mix } from '../../art/color'

// Small pieces shared by the bookshelf, wall clock and bean bag: the dust
// colour, the two derived face shades and flat dust specks.

const { ink, white, creamDark, steel } = PALETTE

/** Grey-beige dust, the same as the lamp, teddy and poster use. */
export const DUST = mix(creamDark, steel, 0.5)

/** The darker left-front shade of a colour. */
export const darker = (c: string) => mix(c, ink, 0.22)
/** The lightest top shade of a colour. */
export const lighter = (c: string) => mix(c, white, 0.28)

/** Flat dust specks at [x, y, radius]; `flat` squashes them for top faces. */
export function dustSpecks(spots: [number, number, number][], flat = 0.5) {
  return (
    <g fill={DUST} stroke="none" opacity={0.95}>
      {spots.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * flat} />
      ))}
    </g>
  )
}
