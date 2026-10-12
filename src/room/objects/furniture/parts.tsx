import type { ReactNode } from 'react'
import { PALETTE } from '../../../art/palette'
import { mix } from '../../../art/color'
import type { appearanceColors, normalizeAppearance } from '../../../catalog/customization'
import type { MessStage } from '../../../domain/types'
import { iso, isoPoints } from '../../iso'
import { drum } from '../batch2-parts'
import { dustSpecks } from '../decorParts'
import { cobweb, dustBunny } from '../lamp'
import { roundedPath, softBox } from '../shapes3'

export interface FurnitureLook {
  options: ReturnType<typeof normalizeAppearance>
  colors: ReturnType<typeof appearanceColors>
}
export type FurnitureDrawing = (look: FurnitureLook, stage: MessStage) => ReactNode
export const { ink, cream, creamDark, white, steel, steelDark, leaf, leafDark, warmRed, petDefault } = PALETTE
export const pts = (...points: [number, number, number][]) => isoPoints(...points)
export const point = iso

export function timber(look: FurnitureLook, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 2) {
  const c = look.colors
  return softBox({ x0, x1, y0, y1, z0, z1, top: c.woodLight, right: c.wood, left: c.woodDark, r })
}

export function upholstered(look: FurnitureLook, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 6) {
  const c = look.colors
  return softBox({ x0, x1, y0, y1, z0, z1, top: c.fabricLight, right: c.fabric, left: c.fabricDark, r })
}

export function metalBox(look: FurnitureLook, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  return softBox({ x0, x1, y0, y1, z0, z1, top: mix(look.colors.metal, white, 0.2), right: look.colors.metal, left: mix(look.colors.metal, ink, 0.2), r: 1 })
}

export function line(a: [number, number, number], b: [number, number, number], color: string = ink, width = 2) {
  const p = iso(...a)
  const q = iso(...b)
  return <path d={`M${p.x} ${p.y} L${q.x} ${q.y}`} fill="none" stroke={color} strokeWidth={width} />
}

/** Tapered and splayed wooden legs, steel tube legs, or rounded ball feet. */
export function leg(look: FurnitureLook, x: number, y: number, h: number, sx = 0, sy = 0) {
  const { style } = look.options
  const c = look.colors
  if (style === 'playful') {
    return drum({ cx: x, cy: y, a: 0.105, b: 0.105, z0: 0, z1: h, top: c.woodLight, side: c.wood })
  }
  if (style === 'modern') return timber(look, x - 0.09, x + 0.09, y - 0.09, y + 0.09, 0, h, 1)
  const spread = style === 'nordic' ? 0.09 : style === 'cottage' ? 0.04 : 0
  const bottom = iso(x + sx * spread, y + sy * spread, 1)
  const top = iso(x, y, h)
  const width = style === 'industrial' ? 5 : style === 'nordic' ? 7 : 6
  return <g>
    <path d={`M${bottom.x - width * 0.28} ${bottom.y} L${top.x - width * 0.5} ${top.y} L${top.x + width * 0.5} ${top.y} L${bottom.x + width * 0.28} ${bottom.y} Z`} fill={style === 'industrial' ? c.metal : c.wood} strokeWidth={2} />
    {style === 'classic' && <ellipse cx={top.x} cy={top.y + h * 0.58} rx={3.5} ry={2.3} fill={c.woodLight} strokeWidth={1.4} />}
    {style === 'cottage' && <path d={`M${top.x - 2} ${top.y + 4} L${bottom.x - 1} ${bottom.y - 2}`} fill="none" stroke={c.woodLight} strokeWidth={1.2} />}
  </g>
}

export function legs(look: FurnitureLook, w: number, d: number, h: number, inset = 0.14) {
  return <g>{leg(look, inset, inset, h, -1, -1)}{leg(look, w - inset, inset, h, 1, -1)}{leg(look, inset, d - inset, h, -1, 1)}{leg(look, w - inset, d - inset, h, 1, 1)}</g>
}

/** Coordinates on the right-facing plane. Local x grows from the near end toward the far end. */
export function front(x: number, y0: number, y1: number, children: ReactNode) {
  const p = iso(x, y1)
  return <g transform={`translate(${p.x} ${p.y}) matrix(1 -0.5 0 1 0 0)`} data-face-width={(y1 - y0) * 32}>{children}</g>
}

/** A rounded rear panel at constant tile x. */
export function panel(look: FurnitureLook, x: number, y0: number, y1: number, z0: number, z1: number, fabric = false, arch = false) {
  const width = (y1 - y0) * 32
  const height = z1 - z0
  return front(x, y0, y1, <g>
    {arch ? <path d={`M0 ${-z0} V${-z1 + width * 0.42} Q${width * 0.5} ${-z1 - width * 0.28} ${width} ${-z1 + width * 0.42} V${-z0} Z`} fill={fabric ? look.colors.fabric : look.colors.wood} /> : <rect x={0} y={-z1} width={width} height={height} rx={look.options.style === 'modern' ? 1 : 5} fill={fabric ? look.colors.fabric : look.colors.wood} />}
  </g>)
}

/** Fine upholstery motifs stay within the cushion's top plane. */
export function topPattern(look: FurnitureLook, x0: number, x1: number, y0: number, y1: number, z: number) {
  const { pattern } = look.options
  if (pattern === 'plain') return null
  const dx = x1 - x0
  const dy = y1 - y0
  const accent = mix(look.colors.fabric, cream, 0.72)
  const xs = Array.from({ length: 4 }, (_, i) => x0 + dx * (i + 0.5) / 4)
  const ys = Array.from({ length: 5 }, (_, i) => y0 + dy * (i + 0.5) / 5)
  return <g stroke="none" fill={accent}>
    {pattern === 'stripes' && xs.map((x, i) => <polygon key={i} points={pts([x - dx * 0.035, y0, z], [x + dx * 0.035, y0, z], [x + dx * 0.035, y1, z], [x - dx * 0.035, y1, z])} />)}
    {pattern === 'checks' && xs.flatMap((x, i) => ys.filter((_, j) => (i + j) % 2 === 0).map((y, j) => <polygon key={`${i}-${j}`} points={pts([x - dx * 0.07, y - dy * 0.065, z], [x + dx * 0.07, y - dy * 0.065, z], [x + dx * 0.07, y + dy * 0.065, z], [x - dx * 0.07, y + dy * 0.065, z])} />))}
    {pattern === 'dots' && xs.flatMap((x, i) => ys.map((y, j) => { const p = iso(x, y, z); return <ellipse key={`${i}-${j}`} cx={p.x} cy={p.y} rx={1.45} ry={0.8} /> }))}
  </g>
}

export function frontPattern(look: FurnitureLook, x: number, y0: number, y1: number, z0: number, z1: number) {
  if (look.options.pattern === 'plain') return null
  const w = (y1 - y0) * 32
  const h = z1 - z0
  const color = mix(look.colors.fabric, cream, 0.64)
  return front(x, y0, y1, <g stroke="none" fill={color}>
    {look.options.pattern === 'stripes' && [0.22, 0.48, 0.74].map((t) => <rect key={t} x={w * t} y={-z1 + 2} width={2} height={h - 4} rx={1} />)}
    {look.options.pattern === 'checks' && [0.15, 0.45, 0.75].flatMap((t, i) => [0.2, 0.5, 0.8].filter((_, j) => (i + j) % 2 === 0).map((u) => <rect key={`${t}-${u}`} x={w * t} y={-z1 + h * u - 2} width={4} height={4} rx={0.5} />))}
    {look.options.pattern === 'dots' && [0.2, 0.5, 0.8].flatMap((t) => [0.25, 0.55, 0.8].map((u) => <circle key={`${t}-${u}`} cx={w * t} cy={-z1 + h * u} r={1.3} />))}
  </g>)
}

export function knob(look: FurnitureLook, x: number, y: number, z: number) {
  const p = iso(x, y, z)
  const playful = look.options.style === 'playful'
  return <circle cx={p.x} cy={p.y} r={playful ? 3.4 : 2.1} fill={playful ? look.colors.fabric : look.colors.metal} strokeWidth={1.5} />
}

export function book(look: FurnitureLook, x: number, y: number, z: number, color: string = look.colors.fabric, height = 12) {
  return softBox({ x0: x, x1: x + 0.24, y0: y, y1: y + 0.12, z0: z, z1: z + height, top: cream, right: color, left: mix(color, ink, 0.2), r: 0.7 })
}

export function plant(look: FurnitureLook, x: number, y: number, z: number) {
  const p = iso(x, y, z)
  return <g transform={`translate(${p.x} ${p.y})`} strokeWidth={1.5}>
    <path d="M0 -7 V-19 M0 -12 Q-9 -12 -7 -20 Q0 -21 0 -12 M0 -16 Q8 -24 9 -17 Q8 -12 0 -13" fill={leaf} />
    <path d="M-6 -9 H6 L4 -1 Q0 3 -4 -1 Z" fill={look.colors.fabric} />
    <ellipse cx={0} cy={-9} rx={6} ry={2} fill={look.colors.fabricLight} />
  </g>
}

export function roundedTop(x0: number, x1: number, y0: number, y1: number, z: number, r: number, fill: string) {
  return <path d={roundedPath([iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z)], r)} fill={fill} />
}

export function furnitureMess(stage: MessStage, w: number, d: number, h: number, wall = false) {
  if (stage === 'clean') return null
  const top = iso(w * 0.55, d * 0.55, h)
  const ground = iso(w * 0.85, d * 0.83, wall ? h - 26 : 1)
  return <g>
    {dustSpecks([[top.x - 8, top.y + 2, 3], [top.x + 6, top.y - 1, 2], [top.x + 2, top.y + 5, 1.8]])}
    {stage === 'messy2' && <>
      {cobweb({ x: top.x - 13, y: top.y - 6 }, { x: top.x + 1, y: top.y + 1 }, { x: top.x - 12, y: top.y + 10 }, 3)}
      {dustBunny(ground.x, ground.y, 0.65)}
      {dustSpecks([[top.x - 2, top.y + 8, 3], [ground.x - 10, ground.y + 2, 2.5]])}
    </>}
  </g>
}
