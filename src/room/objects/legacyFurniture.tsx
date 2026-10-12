import { PALETTE } from '../../art/palette'
import type { appearanceColors, FurnitureAppearance } from '../../catalog/customization'
import type { MessStage } from '../../domain/types'
import { iso, isoPoints } from '../iso'
import { drum, onRight, ring } from './batch2-parts'
import { dustSpecks } from './decorParts'
import { cobweb } from './lamp'
import { softBox, roundedPath, slab } from './shapes3'

export interface LegacyStyle {
  a: Required<FurnitureAppearance>
  c: ReturnType<typeof appearanceColors>
  fabricFill: string
}
const { ink, cream } = PALETTE
const line = (a: [number, number, number], b: [number, number, number]) => isoPoints(a, b)
const woods = (s: LegacyStyle) => ({ top: s.c.woodLight, left: s.c.woodDark, right: s.c.wood })
const fabrics = (s: LegacyStyle) => ({ top: s.fabricFill, left: s.c.fabricDark, right: s.fabricFill })

/** Original mattress and mess stay in place; only the wooden frame changes. */
export function styledBedFrame(s: LegacyStyle, foot = false) {
  const { a, c } = s
  const metal = a.style === 'industrial'
  const frame = metal ? { top: c.metal, left: c.woodDark, right: c.metal } : woods(s)
  if (foot) {
    if (a.style === 'modern' || a.style === 'nordic') return null
    return <g>
      {softBox({ x0: 2.8, x1: 2.91, y0: 0.07, y1: 1.8, z0: 0, z1: a.style === 'playful' ? 21 : 23, ...frame, r: a.style === 'playful' ? 7 : 2 })}
      {a.details && onRight(2.92, 1.8, <path d={a.style === 'cottage' ? 'M6 -6 V-17 H48 V-6 Z' : a.style === 'industrial' ? 'M5 -5 L48 -19 M5 -19 L48 -5' : 'M8 -9 Q16 -21 24 -9 T44 -9'} fill="none" strokeWidth={1.5} />)}
    </g>
  }
  const low = a.style === 'modern'
  return <g>
    {softBox({ x0: 0.02, x1: 2.93, y0: 0.09, y1: 1.8, z0: low ? 0 : 3, z1: 8, ...frame, r: low ? 5 : 2 })}
    {!low && [0.1, 2.72].flatMap((x) => [0.14, 1.6].map((y) => <g key={`${x}-${y}`}>{softBox({ x0: x, x1: x + 0.14, y0: y, y1: y + 0.14, z0: 0, z1: 9, ...frame, r: a.style === 'cottage' ? 3 : 1 })}</g>))}
    {a.style === 'cottage' ? <>
      {softBox({ x0: 0, x1: 0.15, y0: 0.06, y1: 1.8, z0: 0, z1: 37, ...frame, r: 2 })}
      {onRight(0.16, 1.8, <g><path d="M0 -24 V-38 Q27 -54 55 -38 V-24 Z" fill={c.woodLight} /><path d="M6 -27 V-35 Q27 -46 49 -35 V-27" fill="none" strokeWidth={1.5} />{a.details && [12, 23, 34, 45].map((x) => <path key={x} d={`M${x} -28 V-38`} fill="none" strokeWidth={1.2} />)}</g>)}
    </> : a.style === 'nordic' || metal ? <>
      {[0.09, 1.7].map((y) => <g key={y}>{softBox({ x0: 0.03, x1: 0.17, y0: y, y1: y + 0.13, z0: 2, z1: 42, ...frame, r: 2 })}</g>)}
      {softBox({ x0: 0.03, x1: 0.17, y0: 0.09, y1: 1.83, z0: 36, z1: 42, ...frame, r: 2 })}
      {[0.38, 0.69, 1.0, 1.31, 1.59].map((y) => <polyline key={y} points={line([0.12, y, 13], [0.12, y, 36])} stroke={metal ? c.metal : c.wood} strokeWidth={metal ? 3 : 4} />)}
      {metal && a.details && onRight(0.18, 1.8, <g fill={cream} strokeWidth={1}>{[3, 51].map((x) => <circle key={x} cx={x} cy={-39} r={1.8} />)}</g>)}
    </> : a.style === 'playful' ? <>
      {softBox({ x0: 0, x1: 0.17, y0: 0.06, y1: 1.8, z0: 0, z1: 31, ...frame, r: 4 })}
      {onRight(0.18, 1.8, <path d="M0 -25 V-34 Q0 -46 10 -43 Q17 -54 27 -44 Q39 -53 46 -42 Q55 -44 55 -33 V-25 Z" fill={s.fabricFill} />)}
    </> : softBox({ x0: 0, x1: 0.19, y0: 0.06, y1: 1.8, z0: 0, z1: 31, ...frame, r: 6 })}
  </g>
}

export function styledCouch(s: LegacyStyle, stage: MessStage) {
  const { a, c } = s
  const airy = a.style === 'nordic' || a.style === 'industrial'
  const modern = a.style === 'modern'
  const playful = a.style === 'playful'
  const back = modern ? 42 : playful ? 51 : 54
  const frame = a.style === 'industrial' ? { top: c.metal, left: c.woodDark, right: c.metal } : woods(s)
  const upholstery = fabrics(s)
  const arm = airy ? frame : upholstery
  return <g>
    {[0.06, 0.63].flatMap((x) => [0.05, 1.8].map((y) => <g key={`${x}-${y}`}>{softBox({ x0: x, x1: x + 0.12, y0: y, y1: y + 0.13, z0: 0, z1: modern ? 4 : 11, ...frame, r: 1.5 })}</g>))}
    {softBox({ x0: 0, x1: 0.8, y0: 0, y1: 2, z0: modern ? 3 : 9, z1: 18, ...(airy || modern ? frame : upholstery), r: modern ? 2 : 6 })}
    {softBox({ x0: 0, x1: 0.24, y0: 0.18, y1: 1.82, z0: 17, z1: back, ...(airy ? frame : upholstery), r: playful ? 14 : modern ? 2 : 5 })}
    {airy && [0.42, 0.78, 1.14, 1.5].map((y) => <polyline key={y} points={line([0.26, y, 24], [0.26, y, back - 3])} stroke={c.woodDark} strokeWidth={3} />)}
    {softBox({ x0: 0, x1: 0.82, y0: 0, y1: 0.24, z0: airy ? 22 : 9, z1: modern ? 29 : 34, ...arm, r: a.style === 'cottage' ? 10 : modern ? 2 : 5 })}
    {stage !== 'messy2' && [0.26, 1].map((y) => <g key={y}>
      {softBox({ x0: 0.25, x1: 0.44, y0: y, y1: y + 0.71, z0: 23, z1: back - 3, ...upholstery, r: playful ? 12 : 5 })}
      {a.details && onRight(0.45, 2, a.style === 'cottage' ? <g fill={c.fabricDark} stroke="none">{[y + 0.24, y + 0.49].map((t) => <circle key={t} cx={(2 - t) * 32} cy={-38} r={1.8} />)}</g> : a.style === 'playful' ? <path d={`M${(2 - y - 0.38) * 32 - 5} -37 q5 -7 10 0 q-5 7 -10 0 Z`} fill={c.fabricLight} strokeWidth={1.5} /> : null)}
    </g>)}
    {softBox({ x0: 0.26, x1: 0.8, y0: 0.26, y1: 1, z0: 18, z1: 26, ...upholstery, r: playful ? 8 : 4 })}
    {stage !== 'messy2' && <g transform={stage === 'messy1' ? 'translate(4 -2) rotate(-8 -28 3)' : undefined}>{softBox({ x0: 0.26, x1: 0.8, y0: 1, y1: 1.74, z0: 18, z1: 26, ...upholstery, r: playful ? 8 : 4 })}</g>}
    {softBox({ x0: 0, x1: 0.82, y0: 1.76, y1: 2, z0: airy ? 22 : 9, z1: modern ? 29 : 34, ...arm, r: a.style === 'cottage' ? 10 : modern ? 2 : 5 })}
    {a.style === 'industrial' && <polyline points={line([0.1, 2, 25], [0.72, 2, 5])} fill="none" stroke={c.metal} strokeWidth={3} />}
    {airy && <polyline points={line([0.1, 2, 5], [0.72, 2, 25])} fill="none" stroke={c.woodDark} strokeWidth={3} />}
    {a.details && modern && onRight(0.83, 2, <path d="M4 -23 H60" fill="none" stroke={c.fabricLight} strokeWidth={1.5} />)}
    {a.details && airy && onRight(0.83, 2, <g fill={a.style === 'industrial' ? cream : c.woodLight} strokeWidth={1}>{[4, 60].map((x) => <circle key={x} cx={x} cy={-28} r={2} />)}</g>)}
  </g>
}

function chair(s: LegacyStyle, side: 'tx' | 'ty') {
  const { a, c } = s
  const at = (x0: number, x1: number, y0: number, y1: number) => side === 'tx' ? { x0, x1, y0, y1 } : { x0: y0, x1: y1, y0: x0, y1: x1 }
  const frame = a.style === 'industrial' ? { top: c.metal, left: c.woodDark, right: c.metal } : woods(s)
  return <g strokeWidth={2}>
    {[0.06, 0.48].flatMap((x) => [0.72, 1.17].map((y) => <g key={`${x}-${y}`}>{softBox({ ...at(x, x + 0.11, y, y + 0.11), z0: 0, z1: x < 0.1 ? 56 : 21, ...frame, r: 1.5 })}</g>))}
    {softBox({ ...at(0.05, 0.17, 0.71, 1.29), z0: a.style === 'modern' || a.style === 'playful' ? 34 : 47, z1: 56, ...(a.style === 'playful' ? fabrics(s) : frame), r: a.style === 'playful' ? 9 : 3 })}
    {a.style === 'cottage' && [0.86, 1, 1.14].map((y) => <g key={y}>{softBox({ ...at(0.07, 0.13, y, y + 0.04), z0: 24, z1: 47, ...frame, r: 1 })}</g>)}
    {softBox({ ...at(0.06, 0.6, 0.71, 1.29), z0: 18, z1: 24, ...fabrics(s), r: 3 })}
  </g>
}

export function styledTable(s: LegacyStyle, dining: boolean) {
  const { a, c } = s
  const z = dining ? 40 : 34
  const metal = a.style === 'industrial'
  const modern = a.style === 'modern'
  const rounded = modern || a.style === 'playful'
  const leg = (x: number, y: number) => softBox({ x0: x, x1: x + (a.style === 'playful' ? 0.24 : 0.15), y0: y, y1: y + (a.style === 'playful' ? 0.24 : 0.15), z0: 0, z1: z - 4, ...(metal ? { top: c.metal, left: c.woodDark, right: c.metal } : woods(s)), r: a.style === 'cottage' ? 3 : 1 })
  return <g>
    <polygon points={slab(0.3, 1.7, 0.3, 1.7, 0)} fill={ink} fillOpacity={0.15} stroke="none" />
    {dining && <>{chair(s, 'tx')}{chair(s, 'ty')}</>}
    {modern ? <>
      {drum({ cx: 1, cy: 1, a: 0.42, b: 0.42, z0: 0, z1: 4, top: c.woodLight, side: c.woodDark })}
      {drum({ cx: 1, cy: 1, a: 0.17, b: 0.17, z0: 3, z1: z - 4, top: c.woodLight, side: c.wood })}
    </> : <>
      {[0.2, 1.57].flatMap((x) => [0.2, 1.57].map((y) => <g key={`${x}-${y}`}>{leg(x, y)}</g>))}
      {a.style === 'cottage' && <>
        {softBox({ x0: 0.22, x1: 1.78, y0: 0.92, y1: 1.08, z0: 9, z1: 13, ...woods(s), r: 2 })}
        {softBox({ x0: 0.14, x1: 1.86, y0: 0.14, y1: 1.86, z0: z - 10, z1: z - 4, ...woods(s), r: 2 })}
      </>}
      {(a.style === 'nordic' || metal) && <g stroke={metal ? c.metal : c.woodDark} strokeWidth={metal ? 4 : 3} fill="none">
        <polyline points={line([0.26, 1.74, 2], [1.7, 1.74, z - 7])} />
        {metal && <polyline points={line([0.26, 1.74, z - 7], [1.7, 1.74, 2])} />}
      </g>}
    </>}
    {rounded ? drum({ cx: 1, cy: 1, a: 0.95, b: 0.95, z0: z - 5, z1: z, top: a.style === 'playful' ? s.fabricFill : c.woodLight, side: c.wood, leftSide: c.woodDark }) : softBox({ x0: 0.06, x1: 1.94, y0: 0.06, y1: 1.94, z0: z - 5, z1: z, ...woods(s), r: a.style === 'nordic' ? 7 : 3 })}
    {a.details && a.style === 'cottage' && [0.67, 1.33].map((y) => <polyline key={y} points={line([0.14, y, z], [1.86, y, z])} fill="none" stroke={c.woodDark} strokeWidth={1.2} />)}
    {a.details && metal && [[0.17, 0.17], [0.17, 1.83], [1.83, 0.17], [1.83, 1.83]].map(([x, y]) => { const p = iso(x, y, z); return <circle key={`${x}-${y}`} cx={p.x} cy={p.y} r={1.8} fill={c.metal} strokeWidth={1} /> })}
  </g>
}

export function styledBookshelf(s: LegacyStyle) {
  const { a, c } = s
  const metal = a.style === 'industrial'
  const open = metal || a.style === 'nordic'
  const frame = metal ? { top: c.metal, left: c.woodDark, right: c.metal } : woods(s)
  const heights = a.style === 'modern' ? [5, 23, 41, 60] : [5, 31, 60]
  return <g>
    {!open && softBox({ x0: 0.02, x1: 0.56, y0: 0.02, y1: 0.98, z0: 2, z1: 60, ...woods(s), r: a.style === 'playful' ? 8 : 2 })}
    {!open && onRight(0.57, 0.98, <rect x={3} y={-56} width={25} height={49} rx={a.style === 'cottage' ? 9 : 1} fill={c.woodDark} />)}
    {[0.03, 0.86].map((y) => <g key={y}>{softBox({ x0: 0.12, x1: 0.64, y0: y, y1: y + 0.1, z0: 0, z1: 60, ...frame, r: a.style === 'playful' ? 4 : 1 })}</g>)}
    {heights.map((z) => <g key={z}>
      {softBox({ x0: 0.06, x1: 0.65, y0: 0.02, y1: 0.98, z0: z - 4, z1: z, ...frame, r: a.style === 'playful' ? 4 : 1.5 })}
      {z < 50 && [0.2, 0.36, 0.52, 0.68].map((y, i) => <g key={y}>
        {softBox({ x0: 0.32, x1: 0.59, y0: y, y1: y + 0.12, z0: z, z1: z + (a.style === 'modern' ? 11 + i % 2 * 2 : 16 + i % 2 * 3), top: [c.fabricLight, cream, PALETTE.petDefault, PALETTE.wallMintRight][i], left: c.fabricDark, right: [c.fabric, c.woodLight, PALETTE.petDefault, PALETTE.wallMintLeft][i], r: 1 })}
      </g>)}
    </g>)}
    {a.style === 'cottage' && onRight(0.66, 0.98, <path d="M0 -59 Q15 -74 31 -59 Z" fill={c.woodLight} />)}
    {a.style === 'modern' && [0.45, 0.66].map((y, i) => <g key={y}>{softBox({ x0: 0.25, x1: 0.65, y0: y, y1: y + 0.055, z0: i ? 41 : 23, z1: i ? 56 : 38, ...woods(s), r: 1 })}</g>)}
    {a.details && metal && onRight(0.67, 0.98, <g fill={cream} strokeWidth={1}>{[4, 29].flatMap((x) => [8, 34, 57].map((y) => <circle key={`${x}-${y}`} cx={x} cy={-y} r={1.3} />))}</g>)}
    {a.details && a.style === 'playful' && onRight(0.67, 0.98, <path d="M12 -59 L15 -65 L18 -59 L24 -58 L19 -54 L20 -48 L15 -51 L10 -48 L11 -54 L6 -58 Z" fill={c.fabric} strokeWidth={1.5} />)}
  </g>
}

export function styledLamp(s: LegacyStyle) {
  const { a, c } = s
  const shade = s.fabricFill
  const tripod = a.style === 'nordic'
  const mushroom = a.style === 'playful'
  const industrial = a.style === 'industrial'
  return <g>
    <ellipse cx={0} cy={16} rx={27} ry={13} fill={PALETTE.petDefault} fillOpacity={0.18} stroke="none" />
    {a.details && <circle cx={0} cy={-46} r={31} fill={PALETTE.petDefault} opacity={0.13} stroke="none" />}
    {tripod ? <g fill="none"><path d="M0 -42 L-16 21 M0 -42 L18 20 M0 -42 L-1 29" stroke={ink} strokeWidth={7} /><path d="M0 -42 L-16 21 M0 -42 L18 20 M0 -42 L-1 29" stroke={c.wood} strokeWidth={3.5} /></g> : <>
      <ellipse cx={0} cy={17} rx={mushroom ? 17 : 12} ry={6} fill={c.woodDark} />
      <path d={industrial ? 'M0 15 V-37 L14 -52 L4 -62' : a.style === 'modern' ? 'M0 14 V-33 Q0 -61 17 -60' : mushroom ? 'M-7 13 Q-11 -17 -7 -42 H7 Q5 -10 9 13 Z' : 'M0 12 V-42'} fill={mushroom ? c.woodLight : 'none'} stroke={ink} strokeWidth={mushroom ? 3 : 7} />
      {!mushroom && <path d={industrial ? 'M0 15 V-37 L14 -52 L4 -62' : a.style === 'modern' ? 'M0 14 V-33 Q0 -61 17 -60' : 'M0 12 V-42'} fill="none" stroke={industrial ? c.metal : c.wood} strokeWidth={3.5} />}
    </>}
    {mushroom ? <><path d="M-25 -43 Q-23 -75 0 -75 Q23 -75 25 -43 Q0 -31 -25 -43 Z" fill={shade} /><ellipse cx={0} cy={-43} rx={25} ry={7} fill={c.fabricDark} />{a.details && <g fill={cream} strokeWidth={1.5}><ellipse cx={-10} cy={-59} rx={5} ry={4} /><ellipse cx={9} cy={-66} rx={4} ry={3} /><ellipse cx={15} cy={-51} rx={3} ry={2.5} /></g>}</> : industrial ? <>
      <path d="M-18 -48 Q-20 -70 0 -71 Q18 -69 20 -48 Z" fill={shade} /><ellipse cx={1} cy={-48} rx={19} ry={5} fill={PALETTE.petDefault} />
      {a.details && <g fill="none" strokeWidth={1.3}><path d="M-13 -50 Q-16 -64 -7 -67 M-4 -49 V-67 M5 -49 V-67 M14 -50 Q16 -64 8 -67" /></g>}
    </> : a.style === 'modern' ? <><rect x={-9} y={-72} width={28} height={24} rx={6} fill={shade} /><ellipse cx={5} cy={-48} rx={14} ry={4} fill={c.fabricDark} /></> : <>
      <path d={a.style === 'cottage' ? 'M-10 -70 Q-12 -51 -23 -44 Q-20 -37 -15 -41 Q-8 -34 0 -40 Q8 -34 15 -41 Q20 -37 23 -44 Q12 -51 10 -70 Z' : 'M-14 -70 L-20 -45 Q0 -37 20 -45 L14 -70 Z'} fill={shade} />
      <ellipse cx={0} cy={-70} rx={a.style === 'cottage' ? 10 : 14} ry={4} fill={c.fabricDark} />
      {a.details && a.style === 'cottage' && <g stroke={c.fabricDark} strokeWidth={1.5} fill="none"><path d="M-6 -65 L-11 -44 M0 -65 V-42 M6 -65 L11 -44" /></g>}
    </>}
    {a.details && !industrial && !mushroom && <g strokeWidth={1.5}><path d="M11 -40 V-28" fill="none" /><circle cx={11} cy={-26} r={2} fill={c.fabric} /></g>}
  </g>
}

export function styledRug(s: LegacyStyle) {
  const { a, c } = s
  const rounded = a.style === 'modern' || a.style === 'playful'
  const outer = [iso(0.04, 0.08, 5), iso(1.96, 0.08, 5), iso(1.96, 2.86, 5), iso(0.04, 2.86, 5)]
  const contour = rounded ? ring(1, 1.48, 0.96, 1.4, 5) : undefined
  return <g>
    {rounded ? <><polygon points={ring(1, 1.48, 0.96, 1.4, 0)} fill={c.fabricDark} /><polygon points={contour} fill={s.fabricFill} /></> : <><path d={roundedPath(outer.map((p) => ({ x: p.x, y: p.y + 5 })), a.style === 'nordic' ? 3 : 9)} fill={c.fabricDark} /><path d={roundedPath(outer, a.style === 'nordic' ? 3 : 9)} fill={s.fabricFill} /></>}
    {a.style === 'cottage' && <><polygon points={slab(0.2, 1.8, 0.24, 2.65, 5.2)} fill="none" stroke={cream} strokeWidth={4} />{[0.2, 0.44, 0.68, 0.92, 1.16, 1.4, 1.64, 1.88].map((x) => <polyline key={x} points={line([x, 2.82, 2], [x, 2.97, 1])} stroke={cream} strokeWidth={3} />)}</>}
    {a.style === 'nordic' && <g stroke={cream} strokeWidth={6} opacity={0.8}><polyline points={line([0.14, 0.4, 5.3], [1.86, 0.4, 5.3])} /><polyline points={line([0.14, 2.52, 5.3], [1.86, 2.52, 5.3])} /></g>}
    {a.style === 'industrial' && <polygon points={slab(0.17, 1.83, 0.21, 2.71, 5.2)} fill="none" stroke={c.woodDark} strokeWidth={3} />}
    {a.style === 'playful' && <g fill="none" stroke={c.fabricLight} strokeWidth={7}><polygon points={ring(1, 1.48, 0.65, 0.95, 5.3)} /><polygon points={ring(1, 1.48, 0.34, 0.5, 5.3)} /></g>}
    {a.details && a.style === 'modern' && <polygon points={ring(1, 1.48, 0.8, 1.17, 5.3)} fill="none" stroke={c.fabricLight} strokeWidth={2} />}
    {a.details && (a.style === 'cottage' || a.style === 'nordic') && <polygon points={isoPoints([1, 0.95, 5.4], [1.42, 1.47, 5.4], [1, 2, 5.4], [0.58, 1.47, 5.4])} fill={c.fabricLight} strokeWidth={1.5} />}
    {a.details && a.style === 'industrial' && [[0.22, 0.28], [1.78, 0.28], [0.22, 2.64], [1.78, 2.64]].map(([x, y]) => { const p = iso(x, y, 5.4); return <circle key={`${x}-${y}`} cx={p.x} cy={p.y} r={2.5} fill={c.metal} strokeWidth={1} /> })}
  </g>
}

/** Local bean-bag coordinates, with the same origin as the original bag. */
export function styledBeanBag(s: LegacyStyle) {
  const { a, c } = s
  const round = a.style === 'nordic'
  const ottoman = a.style === 'modern' || a.style === 'industrial'
  return <g>
    {ottoman ? <>
      <path d={a.style === 'modern' ? 'M-26 -13 Q0 -26 26 -13 V0 Q0 15 -26 0 Z' : 'M-27 -15 L0 -27 L27 -15 V1 L0 11 L-27 1 Z'} fill={c.fabricDark} />
      {a.style === 'modern' ? <ellipse cx={0} cy={-13} rx={26} ry={11} fill={s.fabricFill} /> : <path d="M-27 -15 L0 -27 L27 -15 L0 -4 Z" fill={s.fabricFill} />}
      {a.details && <path d={a.style === 'modern' ? 'M-22 -2 Q0 9 22 -2' : 'M0 -3 V8 M-23 -14 L0 -24 L23 -14'} fill="none" stroke={cream} strokeWidth={1.4} strokeDasharray={a.style === 'industrial' ? '2 3' : undefined} />}
    </> : round ? <>
      <path d="M-29 -5 Q-30 -26 0 -27 Q30 -26 29 -5 Q28 9 0 9 Q-28 9 -29 -5 Z" fill={s.fabricFill} />
      <path d="M-28 -4 Q0 14 28 -4" fill="none" stroke={c.fabricDark} strokeWidth={4} />
      {a.details && [-18, -9, 0, 9, 18].map((x) => <path key={x} d={`M${x * 0.6} -25 Q${x * 1.4} -7 ${x} 6`} fill="none" stroke={c.fabricLight} strokeWidth={2} />)}
    </> : a.style === 'cottage' ? <>
      <path d="M-28 -2 Q-29 -18 -12 -23 L-6 -30 L5 -30 L11 -23 Q30 -18 28 0 Q20 11 0 9 Q-23 10 -28 -2 Z" fill={s.fabricFill} />
      <path d="M-7 -25 Q-14 -16 -16 1 M5 -25 Q12 -15 14 2" fill="none" stroke={c.fabricDark} strokeWidth={2} />
      {a.details && <path d="M-4 -28 Q-14 -38 -14 -29 Q-11 -24 -3 -27 Q6 -36 9 -30 Q10 -24 -3 -27" fill={cream} strokeWidth={1.5} />}
    </> : <>
      <path d="M-28 -1 Q-31 -18 -18 -22 Q-18 -37 -6 -32 Q3 -27 5 -20 Q18 -29 25 -20 Q34 -9 28 1 Q20 10 0 9 Q-22 10 -28 -1 Z" fill={s.fabricFill} />
      <path d="M-18 -9 Q-6 -14 2 -7 Q15 -15 22 -9" fill="none" stroke={c.fabricDark} strokeWidth={3} />
      {a.details && <g fill={cream} strokeWidth={1.3}><path d="M-17 -21 L-14 -26 L-12 -20 L-7 -18 L-13 -16 L-16 -11 L-18 -17 L-23 -18 Z" /><circle cx={17} cy={-15} r={3} /></g>}
    </>}
  </g>
}

/** The shorter ottoman styles collect dust on their top instead of the old bag's back lobe. */
export function styledBeanBagSurfaceMess(stage: MessStage) {
  const lift = stage === 'messy1' ? -3 : 0
  return <g>
    {dustSpecks([[-15, -17 + lift, 2.4], [-5, -19 + lift, 2], [17, -12 + lift, 2.2], [-19, -8 + lift, 1.8], [6, -14 + lift, 1.6], [20, -4 + lift, 1.6]], 0.6)}
    {stage === 'messy2' && cobweb({ x: -14, y: -14 }, { x: 0, y: -19 }, { x: -8, y: -4 }, 3)}
  </g>
}
