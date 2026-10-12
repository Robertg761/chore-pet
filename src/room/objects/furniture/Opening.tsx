import { useId, type ReactNode } from 'react'
import { mix } from '../../../art/color'
import { front, ink, pts, timber, type FurnitureLook } from './parts'

export function Opening({ look, x, y0, y1, z0, z1, children }: { look: FurnitureLook; x: number; y0: number; y1: number; z0: number; z1: number; children?: ReactNode }) {
  const clipId = `${useId()}-opening`
  return <g>
    <defs><clipPath id={clipId}><polygon points={pts([x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1])} /></clipPath></defs>
    {front(x, y0, y1, <rect x={0} y={-z1} width={(y1 - y0) * 32} height={z1 - z0} rx={1} fill={mix(look.colors.woodDark, ink, 0.38)} strokeWidth={1.5} />)}
    <g clipPath={`url(#${clipId})`}>
      {timber(look, x - 0.42, x, y0, y1, z0 - 2, z0, 0)}
      {children}
    </g>
  </g>
}
