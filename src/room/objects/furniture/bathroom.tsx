import { PALETTE } from '../../../art/palette'
import { mix } from '../../../art/color'
import { drum, ring } from '../batch2-parts'
import { cream, creamDark, front, frontPattern, ink, knob, legs, line, metalBox, plant, point, pts, timber, topPattern, upholstered, type FurnitureLook } from './parts'

function tap(look: FurnitureLook, x: number, y: number, z: number, big = false) {
  const p = point(x, y, z)
  const h = big ? 25 : 16
  return <g transform={`translate(${p.x} ${p.y})`} fill="none">
    <path d={`M0 0 V${-h + 4} Q0 ${-h - 5} 8 ${-h - 5} Q15 ${-h - 5} 15 ${-h + 2}`} stroke={ink} strokeWidth={6} />
    <path d={`M0 0 V${-h + 4} Q0 ${-h - 5} 8 ${-h - 5} Q15 ${-h - 5} 15 ${-h + 2}`} stroke={look.colors.metal} strokeWidth={3} />
    <path d="M-7 -3 H7 M-5 -6 V0 M5 -6 V0" stroke={ink} strokeWidth={3} />
  </g>
}

export function bathtub(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const angular = style === 'modern' || style === 'industrial' || style === 'nordic'
  const towelX = angular ? 1.96 : 1.87
  return <g>
    {style === 'classic' || style === 'playful' ? legs(look, 1.94, 1.94, 16, 0.3) : timber(look, 0.3, 1.7, 0.3, 1.7, 0, 12, 3)}
    {angular ? <>
      {timber(look, 0.05, 1.95, 0.06, 1.94, 8, style === 'modern' ? 40 : 38, style === 'modern' ? 8 : 3)}
      {style === 'industrial' && [8, 32].map((z) => <g key={z}>
        <polygon points={pts([0.05, 1.95, z], [1.95, 1.95, z], [1.95, 1.95, z + 4], [0.05, 1.95, z + 4])} fill={mix(c.metal, ink, 0.2)} />
        <polygon points={pts([1.96, 0.05, z], [1.96, 1.95, z], [1.96, 1.95, z + 4], [1.96, 0.05, z + 4])} fill={c.metal} />
      </g>)}
      {style === 'nordic' && [0.24, 0.49, 0.74, 0.99, 1.24, 1.49, 1.74].map((y) => <g key={y}>{line([1.96, y, 11], [1.96, y, 35], c.woodDark, 1.5)}</g>)}
    </> : drum({ cx: 1, cy: 1, a: 0.94, b: 0.9, z0: style === 'classic' ? 13 : 7, z1: 39, top: cream, side: c.wood, leftSide: c.woodDark })}
    {drum({ cx: 1, cy: 1, a: 0.96, b: 0.92, z0: 36, z1: 41, top: cream, side: creamDark })}
    <polygon points={ring(1, 1, 0.79, 0.7, 41.2)} fill={mix(creamDark, ink, 0.18)} strokeWidth={2} />
    <polygon points={ring(1.04, 1.01, 0.68, 0.58, 38)} fill={PALETTE.sky} strokeWidth={1.5} />
    <polygon points={ring(1.04, 1.01, 0.61, 0.49, 38.1)} fill="none" stroke={PALETTE.white} strokeWidth={1.5} opacity={0.6} />
    {style === 'cottage' && <>{timber(look, 0.18, 0.5, 0.25, 1.73, 39, 51, 8)}{line([0.5, 0.35, 47], [0.5, 1.62, 47], c.woodLight, 1.5)}</>}
    {style === 'playful' && front(1.92, 0.6, 1.4, <g fill={c.fabric} strokeWidth={1.2}><circle cx={7} cy={-23} r={3} /><circle cx={19} cy={-23} r={3} /><path d="M9 -17 Q13 -12 17 -17" fill="none" /></g>)}
    {tap(look, 0.19, 0.39, 41, true)}
    <>
      {front(towelX, 0.96, 1.45, <g><rect x={0} y={-42} width={15.7} height={25} rx={3} fill={c.fabric} strokeWidth={1.5} /><path d="M2 -20 H14 M2 -23 H14" stroke={c.fabricLight} strokeWidth={1.3} /></g>)}
      {frontPattern(look, towelX + 0.005, 1, 1.4, 23, 38)}
      {details && [0, 1, 2].map((i) => { const p = point(0.89 + i * 0.2, 0.75, 43 + (i % 2) * 4); return <circle key={i} cx={p.x} cy={p.y} r={3 - i * 0.3} fill={cream} stroke={PALETTE.steel} strokeWidth={1} /> })}
    </>
  </g>
}

export function bathroomVanity(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const open = style === 'nordic' || style === 'industrial'
  const counter = style === 'modern' ? 51 : 49
  const basin = counter + (style === 'modern' || style === 'playful' ? 8 : 4)
  return <g>
    {legs(look, 0.91, 2, open ? 48 : 14)}
    {open ? <>
      {timber(look, 0.03, 0.97, 0.03, 1.97, 14, 18)}
      {upholstered(look, 0.38, 0.87, 0.27, 0.72, 18, 23, 2)}
      {upholstered(look, 0.36, 0.87, 0.29, 0.73, 23, 27, 2)}
      {upholstered(look, 0.4, 0.88, 1.2, 1.73, 18, 24, 2)}
      {style === 'industrial' && <>{line([0.07, 0.05, 18], [0.07, 1.95, 43], c.metal, 3)}{line([0.07, 0.05, 43], [0.07, 1.95, 18], c.metal, 3)}</>}
    </> : <>
      {timber(look, 0.05, 0.94, 0.05, 1.95, style === 'modern' ? 4 : 12, 45, style === 'playful' ? 7 : 2)}
      {front(0.95, 0.14, 1.86, <g>
        <rect x={0} y={-42} width={25.5} height={26} rx={style === 'playful' ? 5 : 1.5} fill={c.woodLight} strokeWidth={1.5} />
        <rect x={29.5} y={-42} width={25.5} height={26} rx={style === 'playful' ? 5 : 1.5} fill={c.woodLight} strokeWidth={1.5} />
        {style === 'cottage' && <path d="M5 -37 H20 V-21 H5 Z M35 -37 H50 V-21 H35 Z" fill="none" stroke={c.woodDark} strokeWidth={1.2} />}
        {style === 'modern' ? <path d="M9 -39 H21 M34 -39 H46" strokeWidth={1.4} /> : <><circle cx={20} cy={-30} r={2} fill={c.fabric} /><circle cx={35} cy={-30} r={2} fill={c.fabric} /></>}
      </g>)}
    </>}
    {timber(look, 0.01, 0.99, 0.01, 1.99, 45, style === 'modern' ? 51 : 49, style === 'playful' ? 6 : 3)}
    {style === 'classic' && timber(look, 0.01, 0.12, 0.01, 1.99, 49, 59, 3)}
    {[0.56, 1.44].map((y) => <g key={y}>
      {drum({ cx: 0.58, cy: y, a: 0.31, b: 0.36, z0: counter, z1: basin, top: cream, side: creamDark })}
      <polygon points={ring(0.59, y, 0.24, 0.27, basin + 0.2)} fill={PALETTE.sky} strokeWidth={1.5} />
      {tap(look, 0.2, y, counter)}
    </g>)}
    {style === 'classic' && knob(look, 0.94, 1, 20)}
    <>
      {front(0.97, 1.62, 1.96, <rect x={0} y={-46} width={10.9} height={23} rx={2} fill={c.fabric} strokeWidth={1.5} />)}
      {frontPattern(look, 0.975, 1.66, 1.92, 26, 43)}
      {details && plant(look, 0.14, 1.87, counter + 1)}
    </>
  </g>
}

export function laundryHamper(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const round = style === 'classic' || style === 'playful' || style === 'cottage'
  const h = style === 'playful' ? 39 : 45
  const lid = h + (style === 'nordic' || style === 'industrial' ? 2 : 4)
  return <g>
    {style === 'nordic' && <>
      {line([0.04, 0.05, 0], [0.94, 0.05, h + 7], ink, 7)}
      {line([0.04, 0.05, 0], [0.94, 0.05, h + 7], c.wood, 4)}
    </>}
    {round ? <>
      {drum({ cx: 0.5, cy: 0.5, a: 0.42, b: 0.42, z0: 2, z1: h, top: c.fabricLight, side: c.wood, leftSide: c.woodDark })}
      {[12, 22, 32].map((z) => {
        // Only the near semicircle is visible on the opaque basket.
        const arc = Array.from({ length: 15 }, (_, i) => {
          const angle = Math.PI * (0.75 - i / 14)
          const p = point(0.5 + 0.42 * Math.cos(angle), 0.5 + 0.42 * Math.sin(angle), z)
          return `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`
        }).join(' ')
        return <path key={z} d={arc} fill="none" stroke={c.woodDark} strokeWidth={style === 'cottage' ? 2 : 1} />
      })}
      {style === 'cottage' && [-0.3, 0.25, 0.8, 1.35, 1.8].map((angle) => {
        const x = 0.5 + 0.42 * Math.cos(angle)
        const y = 0.5 + 0.42 * Math.sin(angle)
        return <g key={angle}>{line([x, y, 7], [x, y, h - 3], c.woodLight, 1.3)}</g>
      })}
    </> : <>
      {upholstered(look, 0.08, 0.88, 0.08, 0.88, 4, h, style === 'modern' ? 8 : 4)}
      {frontPattern(look, 0.885, 0.18, 0.78, 10, 36)}
      {style === 'nordic' ? <>
        {line([0.94, 0.94, 0], [0.04, 0.94, h + 7], ink, 7)}{line([0.94, 0.94, 0], [0.04, 0.94, h + 7], c.wood, 4)}
        {line([0.04, 0.05, h + 7], [0.04, 0.94, h + 7], c.wood, 5)}
      </> : style === 'industrial' ? <>
        {metalBox(look, 0.05, 0.12, 0.05, 0.12, 1, h + 2)}{metalBox(look, 0.82, 0.9, 0.82, 0.9, 1, h + 2)}
        {[0.24, 0.44, 0.65].map((y) => <g key={y}>{line([0.9, y, 5], [0.9, y, h - 2], c.metal, 1.4)}</g>)}
        {[12, 23, 34].map((z) => <g key={z}>{line([0.9, 0.13, z], [0.9, 0.8, z], c.metal, 1.4)}</g>)}
      </> : front(0.89, 0.32, 0.68, <rect x={0} y={-h + 7} width={11.5} height={4} rx={2} fill={c.woodDark} strokeWidth={1} />)}
    </>}
    {style === 'modern' ? timber(look, 0.06, 0.9, 0.06, 0.9, h, h + 4, 7) : round ? drum({ cx: 0.5, cy: 0.5, a: 0.44, b: 0.44, z0: h - 1, z1: h + 4, top: c.fabricLight, side: c.wood }) : timber(look, 0.04, 0.94, 0.04, 0.94, h - 2, h + 2, 3)}
    {topPattern(look, 0.24, 0.76, 0.24, 0.76, lid + 0.2)}
    {style === 'playful' && <>{knob(look, 0.48, 0.48, h + 7)}{front(0.9, 0.26, 0.74, <g fill={c.fabric}><circle cx={3} cy={-26} r={2} /><circle cx={12} cy={-26} r={2} /><path d="M6 -20 Q8 -17 10 -20" fill="none" strokeWidth={1.3} /></g>)}</>}
    {details && <>{front(0.91, 0.62, 0.91, <path d={`M0 ${-h - 3} H9 V${-h + 17} Q4 ${-h + 21} 0 ${-h + 17} Z`} fill={c.fabric} strokeWidth={1.4} />)}{frontPattern(look, 0.915, 0.65, 0.88, h - 14, h)}</>}
  </g>
}
