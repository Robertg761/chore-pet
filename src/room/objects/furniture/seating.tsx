import { drum } from '../batch2-parts'
import { softBox } from '../shapes3'
import { cream, front, frontPattern, ink, leg, legs, line, metalBox, panel, point, timber, topPattern, upholstered, type FurnitureLook } from './parts'

function back(look: FurnitureLook, d: number, z: number, high: number, dining = false) {
  const { style, details } = look.options
  const c = look.colors
  if (style === 'cottage') return <g>
    {timber(look, 0.09, 0.18, 0.08, 0.18, z - 4, high + 2)}
    {timber(look, 0.09, 0.18, d - 0.18, d - 0.08, z - 4, high + 2)}
    {panel(look, 0.18, 0.08, d - 0.08, high - 10, high + 3, false, true)}
    {Array.from({ length: dining ? 3 : 4 }, (_, i) => { const y = 0.24 + (d - 0.48) * i / (dining ? 2 : 3); return <g key={y}>{line([0.145, y, z + 5], [0.145, y, high - 6], c.wood, 5)}{line([0.145, y, z + 5], [0.145, y, high - 6], ink, 1)}</g> })}
  </g>
  if (style === 'industrial') return <g>
    {metalBox(look, 0.08, 0.16, 0.09, 0.17, z - 10, high)}
    {metalBox(look, 0.08, 0.16, d - 0.17, d - 0.09, z - 10, high)}
    {[high - 10, high - 22].map((h) => <g key={h}>{timber(look, 0.12, 0.22, 0.08, d - 0.08, h, h + 8, 1)}{details && <>{line([0.23, 0.13, h + 4], [0.23, 0.13, h + 4.05], c.metal, 3)}{line([0.23, d - 0.13, h + 4], [0.23, d - 0.13, h + 4.05], c.metal, 3)}</>}</g>)}
  </g>
  if (style === 'nordic') return <g>
    {timber(look, 0.09, 0.15, 0.09, 0.17, z, high - 1)}
    {timber(look, 0.09, 0.15, d - 0.17, d - 0.09, z, high - 1)}
    {panel(look, 0.19, 0.12, d - 0.12, high - 22, high + 1, dining)}
    {dining && frontPattern(look, 0.195, 0.17, d - 0.17, high - 18, high - 3)}
  </g>
  if (style === 'playful') return <g>
    {panel(look, 0.14, 0.02, d - 0.02, z - 1, high + 7, true, true)}
    {frontPattern(look, 0.145, 0.14, d - 0.14, z + 8, high - 5)}
    {details && front(0.15, 0, d, <g fill={cream} stroke="none"><circle cx={d * 10} cy={-high + 9} r={2.5} /><circle cx={d * 22} cy={-high + 9} r={2.5} /></g>)}
  </g>
  const tall = style === 'classic'
  return <g>
    {upholstered(look, 0.03, tall ? 0.29 : 0.22, 0.07, d - 0.07, z - 2, tall ? high : high - 10, tall ? 8 : 2)}
    {frontPattern(look, tall ? 0.295 : 0.225, 0.15, d - 0.15, z + 6, high - (tall ? 7 : 15))}
    {details && tall && [0.32, 0.66].map((t) => { const p = point(0.3, d * t, high - 16); return <circle key={t} cx={p.x} cy={p.y} r={1.6} fill={c.fabricDark} strokeWidth={1} /> })}
  </g>
}

export function armchair(look: FurnitureLook) {
  const { style, details } = look.options
  const open = style === 'nordic' || style === 'industrial' || style === 'cottage'
  const playful = style === 'playful'
  const seat = style === 'modern' ? 24 : 27
  return <g>
    {legs(look, 0.92, 1, style === 'modern' ? 5 : 13)}
    {back(look, 1, 17, style === 'classic' ? 65 : 57)}
    {timber(look, 0.07, 0.87, 0.08, 0.92, 12, 18, 3)}
    {open ? <>
      {timber(look, 0.14, 0.9, 0.04, 0.16, 34, 38, 3)}
      {leg(look, 0.8, 0.1, 36)}
    </> : upholstered(look, 0.03, 0.94, 0.02, 0.2, 6, playful ? 39 : 36, playful ? 12 : 7)}
    {upholstered(look, 0.27, 0.94, 0.18, 0.82, 17, seat, playful ? 10 : 5)}
    {topPattern(look, 0.34, 0.86, 0.25, 0.75, seat + 0.2)}
    {open ? <>
      {leg(look, 0.8, 0.9, 36)}
      {timber(look, 0.14, 0.9, 0.84, 0.96, 34, 38, 3)}
    </> : upholstered(look, 0.03, 0.94, 0.8, 0.98, 6, playful ? 39 : 36, playful ? 12 : 7)}
    {details && upholstered(look, 0.29, 0.49, 0.3, 0.71, seat, seat + 13, 6)}
    {details && style === 'classic' && <>{line([0.33, 0.98, 31], [0.83, 0.98, 31], look.colors.fabricLight, 1.3)}</>}
  </g>
}

export function diningChair(look: FurnitureLook) {
  const { style, details } = look.options
  const z = style === 'playful' ? 27 : 31
  return <g>
    {legs(look, 0.85, 0.92, z - 3, 0.14)}
    {back(look, 0.92, z, 65, true)}
    {style === 'industrial' && <>{line([0.15, 0.15, 10], [0.72, 0.15, 10], look.colors.metal, 3)}{line([0.73, 0.15, 12], [0.73, 0.78, 12], look.colors.metal, 3)}</>}
    {timber(look, 0.08, 0.9, 0.04, 0.9, z - 4, z, style === 'modern' ? 1 : 4)}
    {upholstered(look, 0.2, 0.86, 0.1, 0.84, z, z + 5, style === 'playful' ? 9 : 3)}
    {topPattern(look, 0.28, 0.78, 0.18, 0.75, z + 5.1)}
    {details && <>{line([0.28, 0.15, z + 5.2], [0.78, 0.15, z + 5.2], look.colors.fabricLight, 1)}{line([0.79, 0.15, z + 5.2], [0.79, 0.78, z + 5.2], look.colors.fabricLight, 1)}</>}
    {details && style === 'cottage' && front(0.91, 0.04, 0.9, <path d={`M2 ${-z + 1} Q7 ${-z + 7} 13 ${-z + 2} Q18 ${-z + 7} 25 ${-z + 1}`} fill="none" stroke={look.colors.woodDark} strokeWidth={1.3} />)}
  </g>
}

export function bench(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const narrowCushion = style === 'industrial' || style === 'nordic'
  const surface = style === 'playful' ? 27 : narrowCushion ? 30 : 33
  return <g>
    {style === 'modern' ? <>{timber(look, 0.12, 0.87, 0.1, 0.26, 0, 24, 1)}{timber(look, 0.12, 0.87, 1.74, 1.9, 0, 24, 1)}</> : style === 'playful' ? <>{leg(look, 0.25, 0.4, 23)}{leg(look, 0.73, 0.4, 23)}{leg(look, 0.25, 1.6, 23)}{leg(look, 0.73, 1.6, 23)}</> : legs(look, 0.94, 2, 23)}
    {style === 'industrial' && <>{line([0.13, 0.12, 5], [0.13, 1.88, 19], c.metal, 3)}{line([0.13, 0.12, 19], [0.13, 1.88, 5], c.metal, 3)}</>}
    {style === 'cottage' && <>{back(look, 2, 23, 56)}{timber(look, 0.1, 0.95, 0.04, 0.16, 33, 37)}</>}
    {style === 'playful' ? drum({ cx: 0.49, cy: 1, a: 0.42, b: 0.93, z0: 17, z1: 27, top: c.fabricLight, side: c.fabric }) : timber(look, 0.03, 0.97, 0.02, 1.98, 22, 27, 3)}
    {(style === 'industrial' || style === 'nordic') && [0.25, 0.49, 0.73].map((x) => <g key={x}>{line([x, 0.08, 27.1], [x, 1.92, 27.1], c.woodDark, 1.3)}</g>)}
    {style !== 'industrial' && style !== 'nordic' && style !== 'playful' && upholstered(look, 0.13, 0.9, 0.16, 1.84, 27, 33, 5)}
    {(style === 'industrial' || style === 'nordic') && upholstered(look, 0.18, 0.87, 0.49, 1.51, 27, 30, 3)}
    {topPattern(look, style === 'playful' ? 0.25 : 0.22, style === 'playful' ? 0.74 : 0.81, narrowCushion ? 0.55 : style === 'playful' ? 0.37 : 0.26, narrowCushion ? 1.45 : style === 'playful' ? 1.63 : 1.74, surface + 0.2)}
    {style === 'cottage' && timber(look, 0.1, 0.95, 1.84, 1.96, 33, 37)}
    {details && upholstered(look, 0.23, style === 'playful' ? 0.74 : 0.85, narrowCushion ? 1.08 : 1.35, narrowCushion ? 1.45 : style === 'playful' ? 1.63 : 1.74, surface, surface + 4, 3)}
    {details && style === 'classic' && <>{panel(look, 0.9, 0.04, 0.24, 27, 43, true, true)}{panel(look, 0.9, 1.76, 1.96, 27, 43, true, true)}</>}
  </g>
}

export function ottoman(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const round = style === 'playful' || style === 'modern'
  return <g>
    {style === 'industrial' ? <>{legs(look, 0.94, 0.94, 18)}{metalBox(look, 0.08, 0.87, 0.08, 0.87, 12, 16)}</> : legs(look, 0.92, 0.92, style === 'nordic' ? 12 : 5, round ? 0.25 : 0.14)}
    {round ? <>
      {drum({ cx: 0.48, cy: 0.48, a: 0.44, b: 0.44, z0: 4, z1: style === 'playful' ? 31 : 26, top: c.fabricLight, side: c.fabric })}
      {style === 'playful' && drum({ cx: 0.48, cy: 0.48, a: 0.47, b: 0.47, z0: 25, z1: 33, top: c.fabricLight, side: c.fabricDark })}
    </> : <>
      {timber(look, 0.06, 0.9, 0.06, 0.9, style === 'nordic' ? 10 : 4, 19, style === 'cottage' ? 6 : 2)}
      {upholstered(look, 0.03, 0.94, 0.03, 0.94, 17, 29, style === 'classic' ? 8 : 4)}
      {frontPattern(look, 0.945, 0.12, 0.83, 20, 26)}
    </>}
    {topPattern(look, 0.21, 0.75, 0.21, 0.75, style === 'playful' ? 33.2 : round ? 26.2 : 29.2)}
    {details && <>{line([0.29, 0.29, style === 'playful' ? 33.3 : round ? 26.3 : 29.3], [0.68, 0.29, style === 'playful' ? 33.3 : round ? 26.3 : 29.3], c.fabricDark, 1)}{line([0.68, 0.29, style === 'playful' ? 33.3 : round ? 26.3 : 29.3], [0.68, 0.68, style === 'playful' ? 33.3 : round ? 26.3 : 29.3], c.fabricDark, 1)}</>}
    {details && style === 'classic' && [0.34, 0.65].flatMap((x) => [0.34, 0.65].map((y) => { const p = point(x, y, 29.3); return <ellipse key={`${x}-${y}`} cx={p.x} cy={p.y} rx={1.8} ry={1} fill={c.fabricDark} strokeWidth={1} /> }))}
    {details && style === 'cottage' && front(0.91, 0.06, 0.9, <path d="M2 -12 Q7 -5 12 -12 Q17 -5 23 -12" fill="none" stroke={c.woodDark} strokeWidth={1.5} />)}
  </g>
}

export function petBed(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const round = style === 'playful' || style === 'cottage'
  return <g>
    {round ? <>{leg(look, 0.35, 0.28, 4)}{leg(look, 1.65, 0.28, 4)}{leg(look, 0.35, 0.72, 4)}{leg(look, 1.65, 0.72, 4)}</> : legs(look, 1.94, 0.96, style === 'nordic' || style === 'industrial' ? 10 : 4)}
    {round ? drum({ cx: 1, cy: 0.5, a: 0.92, b: 0.45, z0: 3, z1: 18, top: c.woodLight, side: c.wood }) : timber(look, 0.03, 1.97, 0.02, 0.98, 5, 13, style === 'modern' ? 2 : 6)}
    {style === 'industrial' && <>{metalBox(look, 0.04, 0.12, 0.03, 0.95, 9, 20)}{metalBox(look, 1.88, 1.96, 0.03, 0.95, 9, 20)}</>}
    {style === 'cottage' && [6, 10, 14].map((z) => {
      const edge = Math.atan2(0.45, 0.92)
      const arc = Array.from({ length: 21 }, (_, i) => {
        const angle = Math.PI - edge - Math.PI * i / 20
        const p = point(1 + 0.92 * Math.cos(angle), 0.5 + 0.45 * Math.sin(angle), z)
        return `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`
      }).join(' ')
      return <path key={z} d={arc} fill="none" stroke={c.woodDark} strokeWidth={1} />
    })}
    {style === 'classic' && <>{upholstered(look, 0.1, 1.91, 0.02, 0.18, 12, 27, 7)}{upholstered(look, 0.03, 0.24, 0.06, 0.94, 11, 31, 9)}</>}
    {style === 'modern' && timber(look, 0.04, 0.17, 0.02, 0.98, 10, 28, 2)}
    {style === 'nordic' && timber(look, 0.03, 0.1, 0.04, 0.96, 15, 30)}
    {upholstered(look, 0.18, 1.82, 0.14, 0.85, 12, 21, round ? 13 : 5)}
    {topPattern(look, 0.3, 1.7, 0.25, 0.75, 21.2)}
    {style === 'modern' && timber(look, 1.83, 1.96, 0.02, 0.98, 10, 28, 2)}
    {style === 'nordic' && timber(look, 1.9, 1.97, 0.04, 0.96, 15, 30)}
    {style === 'playful' && <>
      {panel(look, 0.18, 0.08, 0.92, 17, 49, true, true)}
      {front(0.185, 0.08, 0.92, <g fill={c.fabricLight}><ellipse cx={5} cy={-44} rx={4} ry={10} /><ellipse cx={22} cy={-44} rx={4} ry={10} /></g>)}
    </>}
    {details && <g>{softBox({ x0: 1.22, x1: 1.63, y0: 0.36, y1: 0.7, z0: 21, z1: 26, top: cream, left: c.fabricDark, right: cream, r: 5 })}{line([1.34, 0.4, 26.5], [1.54, 0.4, 26.5], c.fabric, 1.2)}</g>}
  </g>
}
