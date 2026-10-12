import { PALETTE } from '../../../art/palette'
import { mix } from '../../../art/color'
import { book, cream, front, frontPattern, ink, knob, legs, line, metalBox, panel, plant, point, timber, topPattern, upholstered, type FurnitureLook } from './parts'

function cabinet(look: FurnitureLook, d: number, h: number, x = 0.84) {
  const { style } = look.options
  const c = look.colors
  return <g>
    {style === 'modern' ? timber(look, 0.1, x - 0.03, 0.1, d - 0.1, 0, 7, 1) : legs(look, x, d, style === 'nordic' ? 14 : 9)}
    {timber(look, 0.04, x, 0.04, d - 0.04, style === 'nordic' ? 13 : 8, h, style === 'playful' ? 9 : style === 'modern' ? 1 : 3)}
    {style === 'classic' && timber(look, 0.01, x + 0.035, 0.01, d - 0.01, h - 1, h + 3, 2)}
    {style === 'cottage' && <>
      {timber(look, 0.01, x + 0.05, 0.01, d - 0.01, h, h + 4, 4)}
      {front(x + 0.01, 0.05, d - 0.05, <path d={`M0 -13 ${Array.from({ length: d === 1 ? 3 : 6 }, (_, i) => { const w = (d - 0.1) * 32 / (d === 1 ? 3 : 6); return `Q${(i + 0.5) * w} -5 ${(i + 1) * w} -13` }).join(' ')}`} fill={c.woodLight} strokeWidth={1.5} />)}
    </>}
    {style === 'industrial' && <>
      {metalBox(look, x - 0.04, x + 0.02, 0.035, 0.11, 7, h + 1)}
      {metalBox(look, x - 0.04, x + 0.02, d - 0.11, d - 0.035, 7, h + 1)}
      {metalBox(look, 0.025, x + 0.02, 0.035, d - 0.035, h - 2, h + 1)}
    </>}
    {front(x + 0.025, 0.08, d - 0.08, <rect x={0} y={-h + 2} width={(d - 0.16) * 32} height={2.5} rx={1} fill={c.fabric} strokeWidth={0.7} />)}
    {style === 'playful' && <>{knob(look, x * 0.35, 0.05, h + 1)}{knob(look, x * 0.35, d - 0.05, h + 1)}</>}
  </g>
}

function drawer(look: FurnitureLook, x: number, y0: number, y1: number, z0: number, z1: number) {
  const { style, details } = look.options
  const c = look.colors
  const width = (y1 - y0) * 32
  const height = z1 - z0
  return <g>
    {front(x, y0, y1, <g>
      <rect x={0} y={-z1} width={width} height={height} rx={style === 'playful' ? 5 : style === 'modern' ? 0 : 1.5} fill={style === 'playful' ? c.fabricLight : c.wood} strokeWidth={1.5} />
      {details && (style === 'classic' || style === 'cottage') && <rect x={2} y={-z1 + 2} width={Math.max(1, width - 4)} height={Math.max(1, height - 4)} rx={1.5} fill="none" stroke={c.woodDark} strokeWidth={1} />}
      {style === 'nordic' ? <path d={`M${width / 2 - 3} ${-z1 + 1} q3 5 6 0`} fill={c.woodDark} strokeWidth={1} /> : style === 'modern' ? <path d={`M${width * 0.2} ${-z1 + 2} H${width * 0.8}`} stroke={c.woodDark} strokeWidth={1.1} /> : style === 'industrial' ? <path d={`M${width / 2 - 3} ${-(z0 + z1) / 2 + 1} v-3 h6 v3`} fill="none" stroke={c.metal} strokeWidth={2} /> : <circle cx={width / 2} cy={-(z0 + z1) / 2} r={style === 'playful' ? 2.8 : 1.7} fill={style === 'playful' ? c.wood : c.fabric} strokeWidth={1} />}
    </g>)}
    {frontPattern(look, x + 0.002, y0 + 0.075, y1 - 0.075, z0 + 1, z1 - 1)}
  </g>
}

function opening(look: FurnitureLook, x: number, y0: number, y1: number, z0: number, z1: number) {
  const c = look.colors
  return front(x, y0, y1, <g><rect x={0} y={-z1} width={(y1 - y0) * 32} height={z1 - z0} rx={1} fill={mix(c.woodDark, ink, 0.38)} strokeWidth={1.5} /><path d={`M1 ${-z0 - 2} H${(y1 - y0) * 32 - 1}`} stroke={c.woodLight} strokeWidth={2} /></g>)
}

export function nightstand(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  return <g>
    {cabinet(look, 1, 39)}
    {drawer(look, 0.85, 0.13, 0.87, 26, 35)}
    {style === 'modern' || style === 'playful' ? drawer(look, 0.85, 0.13, 0.87, 13, 24) : <>
      {opening(look, 0.85, 0.13, 0.87, 13, 24)}
      {details && <>{book(look, 0.6, 0.28, 13, c.fabric, 8)}{book(look, 0.6, 0.44, 13, cream, 9)}</>}
    </>}
    {details && <>{plant(look, 0.25, 0.28, 43)}{book(look, 0.41, 0.64, 43, c.fabric, 3)}</>}
  </g>
}

export function dresser(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const h = style === 'nordic' ? 55 : style === 'modern' ? 46 : 51
  const split = style !== 'modern'
  return <g>
    {cabinet(look, 2, h)}
    {[0, 1, 2].map((i) => {
      const bottom = 14 + i * ((h - 17) / 3)
      const top = bottom + (h - 17) / 3 - 2
      return <g key={i}>{split ? <>{drawer(look, 0.855, 0.13, 0.97, bottom, top)}{drawer(look, 0.855, 1.03, 1.87, bottom, top)}</> : drawer(look, 0.855, 0.13, 1.87, bottom, top)}</g>
    })}
    {details && <>{plant(look, 0.35, 0.31, h + 4)}{book(look, 0.24, 1.51, h + 4, c.fabric, 3)}</>}
    {style === 'playful' && panel(look, 0.12, 0.68, 1.32, h + 1, h + 16, false, true)}
  </g>
}

export function wardrobe(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const h = style === 'modern' ? 103 : 110
  return <g>
    {cabinet(look, 2, h, 0.86)}
    {style === 'cottage' || style === 'playful' ? <>
      {panel(look, 0.875, 0.14, 0.94, 18, h - 8, style === 'playful', true)}
      {panel(look, 0.875, 1.06, 1.86, 18, h - 8, false, true)}
      {frontPattern(look, 0.88, 0.24, 0.84, 24, h - 26)}
      {frontPattern(look, 0.88, 1.16, 1.76, 24, h - 26)}
      {knob(look, 0.89, 0.82, 53)}{knob(look, 0.89, 1.18, 53)}
      {style === 'cottage' && [0.34, 0.56, 1.31, 1.54].map((y) => <g key={y}>{line([0.88, y, 23], [0.88, y, h - 22], c.woodDark, 1)}</g>)}
    </> : style === 'nordic' ? <>
      {opening(look, 0.875, 0.13, 0.95, 17, h - 8)}
      {line([0.88, 0.23, 89], [0.88, 0.84, 89], c.woodLight, 2.4)}
      {front(0.88, 0.13, 0.95, <g fill={c.fabric} strokeWidth={1.2}><path d="M5 -81 L10 -88 L16 -81 L20 -64 H13 V-46 H5 V-64 H1 Z" /><path d="M15 -84 Q18 -91 20 -86" fill="none" /></g>)}
      {drawer(look, 0.875, 1.06, 1.86, 18, h - 8)}
    </> : <>
      {drawer(look, 0.875, 0.13, 0.97, 18, h - 8)}
      {drawer(look, 0.875, 1.03, 1.87, 18, h - 8)}
      {style === 'industrial' && [0.29, 1.18].flatMap((y) => [27, 33, 39].map((z) => <g key={`${y}-${z}`}>{line([0.88, y, z], [0.88, y + 0.45, z], c.metal, 2)}</g>))}
    </>}
    {details && front(0.89, 1.12, 1.43, <g strokeWidth={1.1}><path d="M4 -61 V-48" fill="none" stroke={c.metal} /><path d="M4 -51 Q-1 -47 1 -41 H7 Q9 -47 4 -51 Z" fill={c.fabric} /><path d="M2 -45 V-41 M4 -46 V-41 M6 -45 V-41" stroke={c.fabricLight} fill="none" /></g>)}
    {details && style === 'classic' && <>{timber(look, 0.03, 0.9, 0.02, 1.98, 109, 115, 2)}{panel(look, 0.5, 0.65, 1.35, 111, 123, false, true)}</>}
    {details && style === 'modern' && front(0.88, 0.21, 0.78, <rect x={0} y={-95} width={18.2} height={62} rx={1} fill={PALETTE.sky} strokeWidth={1.1} />)}
  </g>
}

export function tvStand(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const h = style === 'modern' ? 26 : 34
  return <g>
    {cabinet(look, 2, h)}
    {drawer(look, 0.855, 0.13, 0.6, 13, h - 5)}
    {opening(look, 0.855, 0.68, 1.31, 13, h - 5)}
    {drawer(look, 0.855, 1.39, 1.87, 13, h - 5)}
    {details && <>{book(look, 0.62, 0.76, 13, c.fabric, 7)}{book(look, 0.62, 0.92, 13, cream, 8)}</>}
    {line([0.42, 0.55, h + 3], [0.28, 0.74, h + 10], c.metal, 3)}
    {line([0.42, 1.45, h + 3], [0.28, 1.26, h + 10], c.metal, 3)}
    {front(0.31, 0.2, 1.8, <g>
      <rect x={-1} y={-h - 51} width={53.2} height={43} rx={style === 'playful' ? 9 : style === 'classic' ? 4 : 2} fill={style === 'cottage' ? c.wood : ink} />
      <rect x={3} y={-h - 47} width={45.2} height={34} rx={style === 'playful' ? 6 : 1} fill={c.fabricLight} strokeWidth={1.2} />
      <circle cx={35} cy={-h - 38} r={5} fill={cream} stroke="none" />
      <path d={`M3 ${-h - 20} Q15 ${-h - 38} 26 ${-h - 22} Q37 ${-h - 33} 48 ${-h - 20} V${-h - 13} H3 Z`} fill={c.fabricDark} stroke="none" />
      <circle cx={25.6} cy={-h - 10} r={1} fill={cream} stroke="none" />
    </g>)}
  </g>
}

export function shoeRack(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const h = style === 'playful' ? 34 : 39
  return <g>
    {legs(look, 0.83, 2, h, 0.09)}
    {style === 'modern' && <>{timber(look, 0.06, 0.85, 0.03, 0.14, 1, h, 1)}{timber(look, 0.06, 0.85, 1.86, 1.97, 1, h, 1)}</>}
    {[7, 21, h].map((z) => <g key={z}>{timber(look, 0.03, 0.9, 0.02, 1.98, z, z + 3, style === 'playful' ? 8 : 2)}{style === 'industrial' && line([0.89, 0.05, z - 1], [0.89, 1.95, z - 1], c.metal, 2)}</g>)}
    {style === 'cottage' && <>{panel(look, 0.05, 0.05, 1.95, h, h + 12, false, true)}{line([0.03, 1.94, 10], [0.82, 1.94, 33], c.wood, 3)}</>}
    {style === 'nordic' && <>{line([0.02, 0.1, 9], [0.02, 1.9, 36], c.woodDark, 2)}{line([0.02, 0.1, 36], [0.02, 1.9, 9], c.woodDark, 2)}</>}
    {style === 'classic' && timber(look, 0.84, 0.91, 0.04, 1.96, h - 5, h + 3)}
    {upholstered(look, 0.1, 0.85, 0.13, 1.87, h + 3, h + 6, 3)}
    {topPattern(look, 0.18, 0.76, 0.24, 1.76, h + 6.1)}
    {details && [8, 22].flatMap((z, row) => [0.25, 0.78, 1.34].map((y, i) => {
      const p = point(0.75, y, z + 3)
      return <g key={`${z}-${y}`} transform={`translate(${p.x} ${p.y})`} strokeWidth={1.4}>
        <path d="M-9 -3 Q-10 -10 -5 -10 L-1 -6 Q4 -6 7 -2 Q9 2 4 3 H-8 Z" fill={(i + row) % 2 ? c.fabricDark : c.fabric} />
        <path d="M-8 1 H6 M-3 -5 L1 -3" fill="none" stroke={cream} strokeWidth={1.4} />
      </g>
    }))}
  </g>
}
