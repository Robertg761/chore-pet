import { drum } from '../batch2-parts'
import { book, cream, front, ink, legs, line, metalBox, plant, point, timber, topPattern, type FurnitureLook } from './parts'

function tableBase(look: FurnitureLook, w: number, d: number, height: number) {
  const { style } = look.options
  const c = look.colors
  if (style === 'modern') return <g>
    {timber(look, 0.15, 0.29, 0.13, d - 0.13, 0, height - 2, 1)}
    {timber(look, w - 0.29, w - 0.15, 0.13, d - 0.13, 0, height - 2, 1)}
  </g>
  if (style === 'playful') return <g>
    {drum({ cx: w * 0.3, cy: d * 0.5, a: w > 1 ? 0.23 : 0.18, b: d > 1 ? 0.28 : 0.2, z0: 0, z1: height - 3, top: c.woodLight, side: c.fabric })}
    {w > 1 || d > 1 ? drum({ cx: w * 0.7, cy: d * 0.7, a: 0.2, b: 0.2, z0: 0, z1: height - 3, top: c.woodLight, side: c.wood }) : null}
  </g>
  return <g>
    {legs(look, w, d, height - 3, 0.17)}
    {style === 'industrial' && <>
      {line([0.17, 0.17, 3], [w - 0.17, 0.17, height - 4], c.metal, 3)}
      {line([0.17, 0.17, height - 4], [w - 0.17, 0.17, 3], c.metal, 3)}
      {line([0.17, d - 0.17, 3], [w - 0.17, d - 0.17, 3], c.metal, 3)}
    </>}
    {style === 'cottage' && timber(look, 0.12, w - 0.12, 0.12, d - 0.12, 7, 10, 3)}
    {style === 'classic' && timber(look, 0.13, w - 0.13, 0.13, d - 0.13, height - 12, height - 4, 2)}
    {style === 'nordic' && line([w * 0.5, 0.15, height - 8], [w * 0.5, d - 0.15, height - 8], c.wood, 5)}
  </g>
}

function tableTop(look: FurnitureLook, w: number, d: number, z: number) {
  const { style } = look.options
  const c = look.colors
  if (style === 'playful') return drum({ cx: w / 2, cy: d / 2, a: w * 0.49, b: d * 0.48, z0: z - 7, z1: z, top: c.woodLight, side: c.wood })
  return timber(look, 0.02, w - 0.02, 0.02, d - 0.02, z - (style === 'modern' ? 8 : 4), z, style === 'nordic' ? 5 : style === 'modern' ? 1 : 3)
}

function runner(look: FurnitureLook, w: number, d: number, z: number) {
  return <g>
    <polygon points={[point(w * 0.26, d * 0.15, z), point(w * 0.61, d * 0.15, z), point(w * 0.61, d * 0.84, z), point(w * 0.26, d * 0.84, z)].map((p) => `${p.x},${p.y}`).join(' ')} fill={look.colors.fabric} strokeWidth={1.2} />
    {topPattern(look, w * 0.3, w * 0.57, d * 0.2, d * 0.79, z + 0.1)}
  </g>
}

export function coffeeTable(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  return <g>
    {tableBase(look, 2, 1, 26)}
    {style === 'nordic' && timber(look, 0.18, 1.82, 0.16, 0.84, 9, 12, 2)}
    {tableTop(look, 2, 1, 27)}
    {style === 'cottage' && front(1.99, 0.04, 0.96, <path d="M0 -24 Q5 -14 10 -23 Q15 -14 20 -23 Q25 -14 29 -24" fill={c.wood} strokeWidth={1.5} />)}
    {runner(look, 2, 1, 27.2)}
    {details && <>
      {book(look, 1.48, 0.3, 27.5, c.fabric, 3)}
      {book(look, 1.44, 0.34, 31, cream, 2)}
      {plant(look, 0.3, 0.34, 27.5)}
    </>}
    {style === 'industrial' && [0.12, 1.88].flatMap((x) => [0.12, 0.88].map((y) => { const p = point(x, y, 27.3); return <ellipse key={`${x}-${y}`} cx={p.x} cy={p.y} rx={1.4} ry={0.8} fill={c.metal} strokeWidth={0.7} /> }))}
  </g>
}

export function sideTable(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  const pedestal = style === 'classic' || style === 'playful'
  return <g>
    {pedestal ? <>
      {drum({ cx: 0.5, cy: 0.5, a: style === 'playful' ? 0.32 : 0.29, b: style === 'playful' ? 0.32 : 0.29, z0: 0, z1: 5, top: c.woodLight, side: c.woodDark })}
      {drum({ cx: 0.5, cy: 0.5, a: style === 'playful' ? 0.27 : 0.095, b: style === 'playful' ? 0.27 : 0.095, z0: 4, z1: 33, top: c.woodLight, side: c.wood })}
    </> : tableBase(look, 1, 1, 34)}
    {style === 'classic' ? drum({ cx: 0.5, cy: 0.5, a: 0.47, b: 0.47, z0: 31, z1: 35, top: c.woodLight, side: c.wood }) : tableTop(look, 1, 1, 35)}
    {style === 'nordic' && timber(look, 0.13, 0.87, 0.13, 0.87, 12, 15)}
    {runner(look, 1, 1, 35.2)}
    {details && plant(look, 0.6, 0.44, 35.5)}
  </g>
}

export function desk(look: FurnitureLook) {
  const { style, details } = look.options
  const c = look.colors
  return <g>
    {tableBase(look, 1, 2, 48)}
    {style === 'classic' && <>{timber(look, 0.15, 0.95, 1.34, 1.84, 11, 44)}{front(0.96, 1.34, 1.84, <g><path d="M1 -29 H15 M1 -16 H15" fill="none" strokeWidth={1.5} /><circle cx={8} cy={-36} r={1.5} fill={c.metal} /><circle cx={8} cy={-22} r={1.5} fill={c.metal} /></g>)}</>}
    {style === 'cottage' && <>{timber(look, 0.02, 0.13, 0.04, 1.96, 48, 62)}{timber(look, 0.03, 0.29, 0.08, 1.92, 60, 64)}{[0.45, 1.3].map((y) => <g key={y}>{timber(look, 0.04, 0.29, y, y + 0.05, 49, 60)}</g>)}</>}
    {style === 'modern' && timber(look, 0.15, 0.92, 1.34, 1.91, 4, 45, 1)}
    {style === 'industrial' && <>{metalBox(look, 0.07, 0.14, 0.05, 1.94, 7, 10)}{metalBox(look, 0.07, 0.14, 1.3, 1.38, 8, 46)}</>}
    {tableTop(look, 1, 2, 49)}
    {runner(look, 1, 2, 49.2)}
    {details && <>
      {book(look, 0.15, 1.48, 49.3, c.fabric, 4)}
      {book(look, 0.12, 1.51, 53.5, cream, 3)}
      {front(0.56, 0.53, 1.21, <g>
        <rect x={0} y={-69} width={21.76} height={17} rx={2} fill={c.metal} />
        <rect x={2} y={-67} width={17.76} height={12} rx={0.6} fill={c.fabricLight} strokeWidth={1} />
        <path d="M8 -52 V-49 H15" fill="none" stroke={ink} strokeWidth={2} />
      </g>)}
      {plant(look, 0.22, 0.25, 49.5)}
    </>}
  </g>
}
