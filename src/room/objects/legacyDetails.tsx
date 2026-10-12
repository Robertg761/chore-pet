import { PALETTE } from '../../art/palette'
import type { MessStage } from '../../domain/types'
import { isoPoints } from '../iso'
import { onLeft, onRight } from './batch2-parts'
import type { LegacyStyle } from './legacyFurniture'
import { softBox } from './shapes3'

/** Small panels use local face coordinates and inherit the world's ink outline. */
function panel(s: LegacyStyle, width: number, height: number) {
  const { a, c } = s
  const w = width
  const h = height
  if (a.style === 'cottage') return <g>
    <rect x={3} y={-h + 3} width={w - 6} height={h - 6} rx={3} fill="none" strokeWidth={1.5} />
    {a.details && <><rect x={6} y={-h + 6} width={w - 12} height={h - 12} rx={2} fill="none" stroke={c.woodLight} strokeWidth={1.5} /><path d={`M${w / 2 - 3} ${-h / 2} q3 -4 6 0 q-3 4 -6 0 Z`} fill={c.fabric} strokeWidth={1} /></>}
  </g>
  if (a.style === 'modern') return <g><path d={`M3 ${-h + 5} H${w - 3}`} stroke={c.woodDark} strokeWidth={3} />{a.details && <rect x={w - 10} y={-h + 10} width={5} height={2} rx={1} fill={c.fabric} stroke="none" />}</g>
  if (a.style === 'nordic') return <g fill="none" stroke={c.woodDark} strokeWidth={1.5}>
    {Array.from({ length: Math.max(3, Math.floor(w / 5)) }, (_, i) => <path key={i} d={`M${4 + i * 4.5} ${-h + 4} V-4`} />)}
    {a.details && <path d={`M4 ${-h / 2} H${w - 4}`} stroke={c.woodLight} />}
  </g>
  if (a.style === 'industrial') return <g><path d={`M3 -3 L${w - 3} ${-h + 3} M3 ${-h + 3} L${w - 3} -3`} fill="none" stroke={c.metal} strokeWidth={3} />{a.details && [4, w - 4].flatMap((x) => [-4, -h + 4].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.7} fill={PALETTE.cream} strokeWidth={1} />))}</g>
  if (a.style === 'playful') return <g><path d={`M3 -5 Q${w / 2} ${-h + 1} ${w - 3} -5`} fill="none" stroke={c.fabric} strokeWidth={4} />{a.details && <circle cx={w / 2} cy={-h * 0.6} r={Math.min(w, h) * 0.12} fill={c.fabricLight} strokeWidth={1.5} />}</g>
  return null
}

export function styledCabinet(s: LegacyStyle, depth: number) {
  const { a, c } = s
  return <g>
    {softBox({ x0: 0, x1: 1, y0: 0, y1: depth, z0: 0, z1: 28, top: c.woodLight, left: c.woodDark, right: c.wood, r: a.style === 'playful' ? 6 : a.style === 'modern' ? 4 : 1 })}
    {onLeft(depth, panel(s, 32, 27))}
    {onRight(1.01, depth, <g>
      {Array.from({ length: depth * 2 }, (_, i) => <g key={i} transform={`translate(${i * 16} 0)`}>
        <path d="M0 -27 V-2" fill="none" strokeWidth={1.3} />
        {panel(s, 16, 27)}
        {a.style !== 'modern' && (a.style === 'cottage' || a.style === 'playful' ? <circle cx={8} cy={-21} r={a.style === 'playful' ? 2.8 : 1.8} fill={c.fabric} strokeWidth={1.5} /> : <path d="M5 -21 H11" fill="none" stroke={a.style === 'industrial' ? c.metal : PALETTE.ink} strokeWidth={2.5} />)}
      </g>)}
    </g>)}
    {softBox({ x0: 0, x1: 1, y0: 0, y1: depth, z0: 28, z1: 34, top: PALETTE.cream, left: PALETTE.creamDark, right: PALETTE.creamDark, r: a.style === 'modern' ? 4 : 2 })}
  </g>
}

/** Applied before mess where the original has a separate mess layer. */
export function legacyDetails(id: string, s: LegacyStyle, stage: MessStage) {
  const { a, c } = s
  if (a.style === 'classic') return null
  if (['fridge', 'stove', 'washer', 'dishwasher'].includes(id)) {
    const height = id === 'fridge' ? 80 : 28
    return <g>
      {onLeft(1.002, panel(s, 32, height))}
      {id === 'fridge' && stage !== 'messy2' && onRight(1.002, 1, <g><path d={a.style === 'cottage' ? 'M13 -46 q5 -6 10 0' : a.style === 'modern' ? 'M13 -47 H25' : a.style === 'nordic' ? 'M24 -45 V-16' : a.style === 'industrial' ? 'M23 -45 H28 M23 -19 H28 M26 -45 V-19' : 'M13 -43 Q24 -49 22 -33'} fill="none" stroke={c.fabric} strokeWidth={3} />{a.details && <circle cx={22} cy={-70} r={3} fill={c.fabric} strokeWidth={1.3} />}</g>)}
    </g>
  }
  if (id === 'toilet') return <g>
    {onRight(0.37, 0.88, <g transform="translate(0 -7)">{panel(s, 23, 28)}</g>)}
    {a.details && <polyline points={isoPoints([0.36, 0.15, 22], [0.36, 0.82, 22])} fill="none" stroke={c.fabric} strokeWidth={2.5} />}
  </g>
  if (id === 'plant') return <g>
    {a.style === 'modern' ? <path d="M-12 7 Q0 13 12 7 V13 Q0 21 -12 13 Z" fill={c.fabric} strokeWidth={1.5} /> : a.style === 'nordic' ? <g fill="none" stroke={c.woodDark} strokeWidth={2}>{[-7, -2, 3, 8].map((x) => <path key={x} d={`M${x} 4 L${x * 0.75} 16`} />)}</g> : a.style === 'industrial' ? <><path d="M-12 4 Q0 11 12 4 M-11 13 Q0 20 11 13" fill="none" stroke={c.metal} strokeWidth={3} />{a.details && <g fill={PALETTE.cream} strokeWidth={1}><circle cx={-8} cy={9} r={1.5} /><circle cx={8} cy={9} r={1.5} /></g>}</> : a.style === 'cottage' ? <path d="M-12 5 Q-8 10 -4 6 Q0 12 4 6 Q8 10 12 5" fill="none" stroke={c.fabric} strokeWidth={3} /> : <g fill={c.fabricLight} strokeWidth={1.3}><circle cx={-5} cy={10} r={3} /><circle cx={5} cy={12} r={3} /></g>}
    {a.details && a.style === 'cottage' && <path d="M-3 13 Q0 8 3 13 Q0 17 -3 13 Z" fill={c.fabricLight} strokeWidth={1} />}
  </g>
  if (id === 'trash' || id === 'recycling') return <g>
    <g transform={id === 'recycling' ? 'translate(-11 19) scale(.8 .85)' : 'translate(-10 17) scale(.72 .85)'}>{panel(s, 28, 29)}</g>
    {a.style === 'industrial' && <path d="M-12 -4 H-17 V4 H-12 M12 -4 H17 V4 H12" fill="none" stroke={c.metal} strokeWidth={3} />}
    {a.style === 'playful' && <ellipse cx={7} cy={23} rx={6} ry={2.5} fill={c.fabric} strokeWidth={1.5} />}
  </g>
  if (id === 'fish-tank') return <g>
    {a.style === 'modern' || a.style === 'cottage' || a.style === 'playful' ? <>
      <polygon points={isoPoints([0.9, 0.14, 20], [0.9, 0.86, 20], [0.9, 0.86, 3], [0.9, 0.14, 3])} fill={c.wood} strokeWidth={2} />
      {onRight(0.91, 0.86, <g transform="translate(0 -2) scale(.75 .7)">{panel(s, 30, 26)}</g>)}
    </> : <g fill="none" stroke={a.style === 'industrial' ? c.metal : c.woodDark} strokeWidth={3}>
      <polyline points={isoPoints([0.88, 0.15, 3], [0.88, 0.85, 21])} />
      {a.style === 'industrial' && <polyline points={isoPoints([0.88, 0.15, 21], [0.88, 0.85, 3])} />}
    </g>}
    {a.details && <polyline points={isoPoints([0.08, 0.08, 58], [0.92, 0.08, 58], [0.92, 0.92, 58])} fill="none" stroke={c.fabric} strokeWidth={3} />}
  </g>
  if (id === 'shower') return <g>
    {a.style === 'cottage' ? onRight(0.19, 2, <path d="M0 -96 H63 V-85 Q55 -78 47 -85 Q39 -78 31 -85 Q23 -78 15 -85 Q7 -78 0 -85 Z" fill={s.fabricFill} strokeWidth={2} />) : <polyline points={isoPoints([0.19, 0.05, 94], [0.19, 1.96, 94])} stroke={a.style === 'industrial' ? c.metal : c.wood} strokeWidth={a.style === 'playful' ? 8 : 5} fill="none" />}
    {a.style === 'nordic' && onRight(0.19, 2, <g stroke={c.woodDark} strokeWidth={2}>{[6, 15, 24, 33, 42, 51, 60].map((x) => <path key={x} d={`M${x} -12 V-88`} />)}</g>)}
    {a.style === 'industrial' && <polyline points={isoPoints([2, 0.08, 8], [2, 0.08, 90], [2, 1.95, 90], [2, 1.95, 8])} fill="none" stroke={c.metal} strokeWidth={3} />}
    {a.details && a.style === 'playful' && onRight(0.2, 2, <g fill={c.fabric} fillOpacity={0.45} strokeWidth={1.5}>{[[8, -78, 4], [53, -65, 6], [12, -43, 7], [44, -24, 4]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}</g>)}
  </g>
  if (id === 'poster') return onRight(0, 1, <g strokeWidth={1.5}>
    {a.style === 'cottage' ? <path d="M1 -104 Q8 -110 16 -104 Q24 -110 31 -104 M1 -64 Q8 -58 16 -64 Q24 -58 31 -64" fill={c.woodLight} /> : a.style === 'modern' ? <rect x={4.5} y={-100.5} width={23} height={33} rx={5} fill="none" stroke={c.fabric} strokeWidth={2.5} /> : a.style === 'nordic' ? <><path d="M1 -105 H31 M1 -63 H31" stroke={c.woodDark} strokeWidth={4} /><path d="M2 -108 L16 -112 L30 -108" fill="none" /></> : a.style === 'industrial' ? <g fill={c.metal}>{[3, 29].flatMap((x) => [-102, -66].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />))}</g> : <path d="M1 -105 Q-3 -99 1 -93 Q-3 -87 1 -81 Q-3 -75 1 -65 M31 -105 Q35 -99 31 -93 Q35 -87 31 -81 Q35 -75 31 -65" fill="none" stroke={c.fabric} strokeWidth={3} />}
  </g>)
  if (id === 'wall-clock') return onRight(0, 1, <g strokeWidth={1.5}>
    {a.style === 'cottage' ? <><path d="M3 -94 L16 -104 L29 -94" fill={c.woodLight} /><path d="M16 -71 V-63" fill="none" /><circle cx={16} cy={-63} r={3} fill={c.wood} /></> : a.style === 'modern' ? <rect x={2} y={-98} width={28} height={28} rx={6} fill="none" stroke={c.wood} strokeWidth={3} /> : a.style === 'nordic' ? <><path d="M5 -73 L1 -68 M27 -73 L31 -68" fill="none" stroke={c.wood} strokeWidth={3} /><path d="M8 -100 H24" stroke={c.woodLight} strokeWidth={4} /></> : a.style === 'industrial' ? <g fill={c.metal}>{[3, 29].flatMap((x) => [-96, -72].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />))}</g> : <><path d="M4 -94 Q-3 -104 6 -105 Q13 -102 10 -96 M22 -96 Q20 -104 28 -105 Q36 -101 28 -93" fill={c.fabric} /><path d="M7 -70 Q16 -64 25 -70" fill="none" stroke={c.wood} strokeWidth={3} /></>}
  </g>)
  return null
}

/** A material-bearing inset keeps accent and pattern choices usable on hard furniture. */
export function legacyAccent(id: string, s: LegacyStyle) {
  const { a, c, fabricFill } = s
  const accent = (width: number, height: number) => <g><rect x={0} y={-height} width={width} height={height} rx={2} fill={fabricFill} strokeWidth={1.2} />{a.details && <path d={`M2 ${-height + 2} H${width - 2}`} fill="none" stroke={PALETTE.cream} strokeWidth={1} />}</g>
  if (id === 'sink' || id === 'counter') return onRight(1.015, id === 'counter' ? 2 : 1, <g transform="translate(6 -5)">{accent(10, 16)}<path d="M6 -19 H18" strokeWidth={2} /></g>)
  if (['fridge', 'stove', 'washer', 'dishwasher'].includes(id)) return onLeft(1.004, <g transform={`translate(4 ${id === 'fridge' ? -48 : -10})`}>{accent(24, id === 'fridge' ? 12 : 8)}</g>)
  if (id === 'toilet') return onRight(0.375, 0.88, <g transform="translate(5 -19)">{accent(15, 7)}</g>)
  if (id === 'plant') return <g><path d="M-12 8 Q0 14 12 8 L10 15 Q0 20 -10 15 Z" fill={fabricFill} strokeWidth={1.2} />{a.details && <circle cx={0} cy={15} r={2} fill={PALETTE.cream} strokeWidth={1} />}</g>
  if (id === 'trash' || id === 'recycling') return <g transform="translate(-8 10)">{accent(16, 7)}</g>
  if (id === 'fish-tank') return onRight(0.965, 0.96, <g transform="translate(5 -20.5)">{accent(20, 3.8)}</g>)
  if (id === 'shower') return onRight(0.185, 2, <g transform="translate(3 -10)">{accent(58, 8)}</g>)
  if (id === 'table' || id === 'dining-table') {
    const z = id === 'table' ? 34.2 : 40.2
    return <g><polygon points={isoPoints([0.65, 0.17, z], [0.99, 0.17, z], [0.99, 1.82, z], [0.65, 1.82, z])} fill={fabricFill} strokeWidth={1.2} />{a.details && <polygon points={isoPoints([1.34, 0.45, z], [1.66, 0.45, z], [1.66, 0.77, z], [1.34, 0.77, z])} fill={c.woodDark} strokeWidth={1.2} />}</g>
  }
  if (id === 'bed') return a.details ? <polyline points={isoPoints([1.32, 0.24, 19.2], [2.56, 0.24, 19.2], [2.56, 1.61, 19.2])} fill="none" stroke={c.fabricLight} strokeWidth={1.6} strokeDasharray="2 3" /> : null
  if (id === 'rug') return <g><polyline points={isoPoints([0.4, 2.2, 5.4], [0.55, 2.2, 5.4])} stroke={c.wood} strokeWidth={5} />{a.details && <polyline points={isoPoints([0.58, 2.2, 5.4], [0.73, 2.2, 5.4])} stroke={c.woodLight} strokeWidth={3} />}</g>
  if (id === 'bean-bag') return <g><path d="M15 24 l8 -3" fill="none" stroke={c.woodDark} strokeWidth={2} />{a.details && <rect x={15} y={23} width={4} height={3} rx={1} fill={c.woodLight} strokeWidth={1} />}</g>
  if (id === 'lamp') return a.details ? <path d="M-6 20 Q0 23 6 20" fill="none" stroke={c.woodLight} strokeWidth={2} /> : null
  return null
}
