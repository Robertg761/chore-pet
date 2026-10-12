import { useId } from 'react'
import { PALETTE } from '../../../art/palette'
import type { MessStage } from '../../../domain/types'
import { dustSpecks } from '../decorParts'
import { cobweb } from '../lamp'
import { cream, front, ink, type FurnitureLook } from './parts'

export function MirrorArt({ look, stage }: { look: FurnitureLook; stage: MessStage }) {
  const id = useId()
  const frameClip = `${id}-frame`
  const glassClip = `${id}-glass`
  const { style, pattern, details } = look.options
  const c = look.colors
  const w = 27
  const top = -112
  const bottom = -48
  const frame = (inset: number, fill: string, stroke: string = ink, strokeWidth = 2) => {
    const x = inset
    const y = top + inset
    const ww = w - 2 * inset
    const hh = bottom - top - 2 * inset
    if (style === 'classic') return <ellipse cx={w / 2} cy={(top + bottom) / 2} rx={ww / 2} ry={hh / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    if (style === 'cottage') return <path d={`M${x} ${bottom - inset} V${y + ww * 0.6} Q${w / 2} ${y - ww * 0.55} ${w - inset} ${y + ww * 0.6} V${bottom - inset} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    if (style === 'industrial') return <path d={`M${x + 5} ${y} H${w - inset - 5} L${w - inset} ${y + 5} V${bottom - inset - 5} L${w - inset - 5} ${bottom - inset} H${x + 5} L${x} ${bottom - inset - 5} V${y + 5} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    if (style === 'playful') return <path d={`M${x + 5} ${y + 2} Q${w / 2} ${y - 7} ${w - inset - 4} ${y + 3} Q${w - inset + 5} ${y + 10} ${w - inset - 1} ${y + 23} Q${w - inset + 3} ${y + 37} ${w - inset - 2} ${y + 48} Q${w - inset + 1} ${bottom - inset + 3} ${w / 2} ${bottom - inset} Q${x - 3} ${bottom - inset + 5} ${x + 2} ${y + 43} Q${x - 4} ${y + 28} ${x + 1} ${y + 17} Q${x - 4} ${y + 8} ${x + 5} ${y + 2} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    if (style === 'nordic') return <path d={`M${x + 5} ${y} H${w - inset - 5} L${w - inset} ${y + 10} V${bottom - inset - 8} L${w - inset - 5} ${bottom - inset} H${x + 5} L${x} ${bottom - inset - 8} V${y + 10} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    return <rect x={x} y={y + 4} width={ww} height={hh - 8} rx={ww * 0.45} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  }
  return front(0.1, 0.08, 0.92, <g>
    <defs>
      <clipPath id={frameClip}>{frame(0, PALETTE.white, 'none', 0)}</clipPath>
      <clipPath id={glassClip}>{frame(5, PALETTE.white, 'none', 0)}</clipPath>
    </defs>
    {style === 'nordic' && <path d="M3 -110 L13.5 -128 L24 -110" fill="none" stroke={c.woodDark} strokeWidth={2} />}
    {style === 'cottage' && <><path d="M3 -108 Q13.5 -128 24 -108" fill={c.woodLight} /><path d="M-2 -47 H29 V-43 H-2 Z" fill={c.wood} /></>}
    {frame(0, c.wood, style === 'industrial' ? c.metal : ink, style === 'industrial' ? 3 : 2)}
    {frame(3, c.fabric, ink, 1)}
    {frame(5, PALETTE.sky, ink, 1)}
    <path d="M10 -95 L18 -105 M9 -89 L20 -103" stroke={cream} strokeWidth={2.5} opacity={0.8} fill="none" />
    <g clipPath={`url(#${frameClip})`}>{pattern !== 'plain' && [0, 1, 2, 3, 4].map((i) => {
      const y = -98 + i * 9
      return <g key={i} fill={c.fabricLight} strokeWidth={0.8}>
        {pattern === 'dots' ? <><circle cx={2} cy={y} r={1} /><circle cx={25} cy={y} r={1} /></> : pattern === 'checks' ? <><rect x={0.5} y={y - 1} width={2.5} height={2.5} /><rect x={24} y={y - 1} width={2.5} height={2.5} /></> : <><path d={`M0.5 ${y} L3 ${y - 3}`} stroke={c.fabricLight} strokeWidth={1.5} /><path d={`M24 ${y} L26.5 ${y - 3}`} stroke={c.fabricLight} strokeWidth={1.5} /></>}
      </g>
    })}</g>
    {style === 'industrial' && [-104, -55].flatMap((y) => [3.5, 23.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} fill={cream} strokeWidth={0.7} />))}
    {details && <><path d="M19 -64 V-72 M16 -68 H22" fill="none" stroke={cream} strokeWidth={1.5} /><circle cx={9} cy={-80} r={1.3} fill={cream} stroke="none" /></>}
    {stage !== 'clean' && <g clipPath={`url(#${glassClip})`}>
      {dustSpecks([[11, -73, 2.5], [17, -85, 1.8]], 0.85)}
      {stage === 'messy2' && <>
        {cobweb({ x: 8, y: -99 }, { x: 20, y: -96 }, { x: 8, y: -82 }, 3)}
        {dustSpecks([[16, -62, 3], [10, -81, 2]], 0.85)}
      </>}
    </g>}
  </g>)
}
