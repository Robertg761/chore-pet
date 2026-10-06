import { useId, type ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'

/**
 * Draws an outfit shape with its ink outline on top. `children` are details
 * (pockets, ribbing) clipped to the shape, so they never spill past the body
 * edge. Lives in its own file because it needs a unique clip id per instance.
 */
export function Garment({ d, fill, children }: { d: string; fill: string; children?: ReactNode }) {
  const clip = `garment${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round" strokeLinecap="round">
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={fill} stroke="none" />
      <g clipPath={`url(#${clip})`}>{children}</g>
      <path d={d} fill="none" />
    </g>
  )
}
