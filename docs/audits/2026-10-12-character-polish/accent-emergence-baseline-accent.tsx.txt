import type { SVGProps } from 'react'
import { PALETTE } from '../art/palette'
import { heartPath, starPath } from '../effects/shapes'
import { useStrokeScale } from './strokeScale'

// The one accent mark every cheer uses, baked into each species' cheering pose and
// popped by the Cheer effect: a plump four-point star or a heart, palette fill, inked.

const { ink, blush, petDefault } = PALETTE

/** A small ink-outlined heart (`size` wide) or four-point star (`size` tip to tip), centred on (0,0). */
export function AccentMark({ kind, size, fill, ...rest }: { kind: 'heart' | 'star'; size: number; fill: string } & Omit<SVGProps<SVGPathElement>, 'd' | 'fill'>) {
  const scale = useStrokeScale()
  return (
    <path
      d={kind === 'heart' ? heartPath(size) : starPath(size / 2, 0.26)}
      fill={fill}
      stroke={ink}
      strokeWidth={3 * scale}
      strokeLinejoin="round"
      strokeLinecap="round"
      {...rest}
    />
  )
}

/** [x, y, size] for the heart and the star a cheering pose draws beside the pet. */
export type CheerSpots = { heart: [number, number, number]; star: [number, number, number] }

/** The accents of a cheering pose: a blush heart and a sunny star, the same in every species. */
export function CheerMarks({ heart, star }: CheerSpots) {
  return (
    <g aria-hidden="true">
      <g transform={`translate(${heart[0]} ${heart[1]}) rotate(-12)`}>
        <AccentMark kind="heart" size={heart[2]} fill={blush} />
      </g>
      <g transform={`translate(${star[0]} ${star[1]}) rotate(10)`}>
        <AccentMark kind="star" size={star[2]} fill={petDefault} />
      </g>
    </g>
  )
}
