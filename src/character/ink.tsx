import type { ReactNode, SVGProps } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'
import { useStrokeScale } from './strokeScale'

// The one source of the character's outline weight. `CharacterArt` provides a
// `strokeScale` (default 1); every outline, item line and face line reads it, so
// a pet drawn small (the 8x8 room) can keep an outline as heavy as the objects'.

/**
 * A group that inks everything inside it: ink colour, round joins and caps and the
 * character outline weight times the stroke scale. `k` is an extra factor, for art drawn
 * inside a shrunk transform (the sick bed) that must still show a 4-unit line.
 */
export function Ink({ k = 1, children, ...rest }: { k?: number; children?: ReactNode } & Omit<SVGProps<SVGGElement>, 'strokeWidth'>) {
  const scale = useStrokeScale()
  return (
    <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE * scale * k} strokeLinejoin="round" strokeLinecap="round" {...rest}>
      {children}
    </g>
  )
}

/**
 * A rope, strap or twig: an ink-outlined tube drawn as an ink stroke under a coloured one.
 * `outer` and `inner` are the two widths at stroke scale 1; the outline (their difference) grows
 * with the scale and the coloured core stays put.
 */
export function Tube({ d, outer, inner, colour, ...rest }: { d: string; outer: number; inner: number; colour: string } & Omit<SVGProps<SVGPathElement>, 'd'>) {
  const scale = useStrokeScale()
  return (
    <>
      <path d={d} fill="none" strokeWidth={inner + (outer - inner) * scale} {...rest} />
      <path d={d} fill="none" stroke={colour} strokeWidth={inner} {...rest} />
    </>
  )
}
