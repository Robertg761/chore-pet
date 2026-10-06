import type { ReactNode } from 'react'
import { PALETTE } from '../../art/palette'
import { iso, isoPoints, type Point } from '../iso'

// Local helpers shared by the batch 2 objects (recycling, bed, washer, toilet).
// Everything assumes it is rendered inside a group that already sets the ink
// stroke, ROOM_STROKE and round joins, exactly like sink.tsx.

const { ink, white, warmRed, fabricBlue, blush, leaf, sky } = PALETTE

export function poly(...pts: Point[]) {
  return pts.map((p) => `${p.x},${p.y}`).join(' ')
}

interface BoxSpec {
  x0: number
  x1: number
  y0: number
  y1: number
  z0: number
  z1: number
  top: string
  right: string
  left: string
  /** Darken the left face by overlaying ink at this opacity instead of using a second colour. */
  shade?: number
}

/** An axis-aligned box in tile units: left-front face (ty = y1), right-front face (tx = x1), top. */
export function box({ x0, x1, y0, y1, z0, z1, top, right, left, shade }: BoxSpec) {
  const leftFace = isoPoints([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0])
  return (
    <g>
      <polygon points={leftFace} fill={left} />
      {shade !== undefined && <polygon points={leftFace} fill={ink} opacity={shade} stroke="none" />}
      <polygon points={isoPoints([x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0])} fill={right} />
      <polygon points={isoPoints([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1])} fill={top} />
    </g>
  )
}

/**
 * Draw on the right-front face (the plane tx = w). Children use local pixels:
 * x runs left to right along the face (0 at the front corner), y = -height.
 */
export function onRight(w: number, d: number, children: ReactNode) {
  const o = iso(w, d, 0)
  return <g transform={`translate(${o.x} ${o.y}) matrix(1 -0.5 0 1 0 0)`}>{children}</g>
}

/** Draw on the left-front face (the plane ty = d); x runs left to right, y = -height. */
export function onLeft(d: number, children: ReactNode) {
  const o = iso(0, d, 0)
  return <g transform={`translate(${o.x} ${o.y}) matrix(1 0.5 0 1 0 0)`}>{children}</g>
}

const RING_STEPS = 28

function ringPoints(cx: number, cy: number, a: number, b: number, z: number): Point[] {
  return Array.from({ length: RING_STEPS }, (_, k) => {
    const t = (k / RING_STEPS) * Math.PI * 2
    return iso(cx + a * Math.cos(t), cy + b * Math.sin(t), z)
  })
}

/** An ellipse lying flat on the floor/top plane, as an SVG points string. */
export function ring(cx: number, cy: number, a: number, b: number, z: number) {
  return poly(...ringPoints(cx, cy, a, b, z))
}

interface DrumSpec {
  cx: number
  cy: number
  /** Semi-axes in tile units along tx and ty. */
  a: number
  b: number
  z0: number
  z1: number
  top: string
  side: string
  /** Colour for the left half of the side; default is `side` darkened with ink. */
  leftSide?: string
  shade?: number
}

/** A round drum (bin, toilet bowl): shaded left and right halves, then the top. */
export function drum({ cx, cy, a, b, z0, z1, top, side, leftSide, shade = 0.16 }: DrumSpec) {
  const lo = ringPoints(cx, cy, a, b, z0)
  const hi = ringPoints(cx, cy, a, b, z1)
  const n = lo.length
  let minI = 0
  let maxI = 0
  lo.forEach((p, i) => {
    if (p.x < lo[minI].x) minI = i
    if (p.x > lo[maxI].x) maxI = i
  })
  const arc = (step: 1 | -1) => {
    const out: number[] = []
    for (let i = minI; ; i = (i + step + n) % n) {
      out.push(i)
      if (i === maxI) break
    }
    return out
  }
  const fwd = arc(1)
  const back = arc(-1)
  const mean = (idx: number[]) => idx.reduce((s, i) => s + lo[i].y, 0) / idx.length
  const front = mean(fwd) > mean(back) ? fwd : back
  const xc = iso(cx, cy, 0).x
  let mid = front[0]
  front.forEach((i) => {
    if (Math.abs(lo[i].x - xc) < Math.abs(lo[mid].x - xc)) mid = i
  })
  const midPos = front.indexOf(mid)
  const leftIdx = front.slice(0, midPos + 1)
  const rightIdx = front.slice(midPos)
  const half = (idx: number[]) => {
    const bottom = idx.map((i) => `${lo[i].x},${lo[i].y}`).join(' L')
    const first = idx[0]
    const last = idx[idx.length - 1]
    return `M${hi[first].x},${hi[first].y} L${bottom} L${hi[last].x},${hi[last].y} Z`
  }
  const outline = `M${hi[front[0]].x},${hi[front[0]].y} L${front.map((i) => `${lo[i].x},${lo[i].y}`).join(' L')} L${hi[front[front.length - 1]].x},${hi[front[front.length - 1]].y}`
  return (
    <g>
      <path d={half(leftIdx)} fill={leftSide ?? side} stroke="none" />
      {!leftSide && <path d={half(leftIdx)} fill={ink} opacity={shade} stroke="none" />}
      <path d={half(rightIdx)} fill={side} stroke="none" />
      <path d={outline} fill="none" />
      <polygon points={poly(...hi)} fill={top} />
    </g>
  )
}

/**
 * A soft cushion lying on a top plane: a rounded quad through the given tile
 * corners with a darker under-edge so it reads as thick.
 */
export function cushion(corners: [number, number][], z: number, topFill: string, sideFill: string, lift = 3) {
  const pts = (zz: number) => corners.map(([tx, ty]) => iso(tx, ty, zz))
  const path = (ps: Point[]) => {
    const mid = (p: Point, q: Point) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
    const m0 = mid(ps[ps.length - 1], ps[0])
    let d = `M${m0.x},${m0.y}`
    ps.forEach((p, i) => {
      const m = mid(p, ps[(i + 1) % ps.length])
      d += ` Q${p.x},${p.y} ${m.x},${m.y}`
    })
    return d + ' Z'
  }
  return (
    <g>
      <path d={path(pts(z))} fill={sideFill} />
      <path d={path(pts(z + lift))} fill={topFill} />
    </g>
  )
}

/** Tile-space corners of a rectangle centred at (cx, cy), rotated by `angle` radians. */
export function rectCorners(cx: number, cy: number, hw: number, hh: number, angle = 0): [number, number][] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as [number, number])
}

/** A lumpy pile of laundry in screen space, base centred on (x, y). */
export function laundryPile(x: number, y: number, k = 1) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} strokeWidth={2.2 / k}>
      <path d="M-13 0 Q-15 -7 -7 -9 Q0 -11 8 -8 Q16 -6 14 0 Q0 4 -13 0 Z" fill={warmRed} />
      <path d="M-8 -8 Q-6 -15 1 -14 Q9 -14 9 -8 Q0 -5 -8 -8 Z" fill={fabricBlue} />
      <path d="M-3 -13 Q-1 -19 5 -17 Q9 -15 7 -11 Q2 -9 -3 -13 Z" fill={blush} />
      {/* a sleeve flopping out and a stripe on the blue top */}
      <path d="M12 -2 Q19 -1 18 4 Q15 6 12 3" fill={warmRed} />
      <path d="M-5 -10 Q0 -8 6 -10" fill="none" stroke={white} strokeWidth={1.5} />
    </g>
  )
}

/** A lone sock, toe pointing right (flip to point left). */
export function sock(x: number, y: number, colour: string, flip = false, rotate = 0) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${flip ? -1 : 1} 1)`} strokeWidth={2}>
      <path d="M-3.5 -9 H3.5 V-1 Q3.5 1.5 6.5 1.5 Q10 1.5 10 4 Q10 6.5 6.5 6.5 H-1 Q-3.5 6.5 -3.5 3.5 Z" fill={colour} />
      <path d="M-3.5 -9 H3.5 V-5.5 H-3.5 Z" fill={white} />
    </g>
  )
}

/** A soap bubble. */
export function bubble(x: number, y: number, r: number, key?: string | number) {
  return (
    <g key={key}>
      <circle cx={x} cy={y} r={r} fill={sky} fillOpacity={0.55} strokeWidth={1.5} />
      <path d={`M${x - r * 0.5} ${y - r * 0.15} q0 ${-r * 0.4} ${r * 0.4} ${-r * 0.5}`} fill="none" stroke={white} strokeWidth={1.5} />
    </g>
  )
}

/** A drink can standing on (x, y). */
export function can(x: number, y: number, band: string = warmRed, rotate = 0, key?: string | number) {
  return (
    <g key={key} transform={`rotate(${rotate} ${x} ${y})`} strokeWidth={2}>
      <path d={`M${x - 4.5} ${y - 12} V${y} a4.5 2.2 0 0 0 9 0 V${y - 12} Z`} fill={PALETTE.steel} stroke="none" />
      <path d={`M${x - 4.5} ${y - 9} a4.5 2.2 0 0 0 9 0 V${y - 4.5} a4.5 2.2 0 0 1 -9 0 Z`} fill={band} stroke="none" />
      <path d={`M${x - 4.5} ${y - 12} V${y} a4.5 2.2 0 0 0 9 0 V${y - 12}`} fill="none" />
      <ellipse cx={x} cy={y - 12} rx={4.5} ry={2.2} fill={PALETTE.steelDark} />
    </g>
  )
}

/** A bottle standing on (x, y), about 30 tall. */
export function bottle(x: number, y: number, colour: string = leaf, rotate = 0, key?: string | number) {
  return (
    <g key={key} transform={`rotate(${rotate} ${x} ${y})`} strokeWidth={2}>
      <path
        d={`M${x - 5} ${y - 2} Q${x - 5} ${y} ${x - 3} ${y} H${x + 3} Q${x + 5} ${y} ${x + 5} ${y - 2} V${y - 14} Q${x + 5} ${y - 18} ${x + 2.5} ${y - 20} V${y - 27} H${x - 2.5} V${y - 20} Q${x - 5} ${y - 18} ${x - 5} ${y - 14} Z`}
        fill={colour}
      />
      <rect x={x - 3.2} y={y - 31} width={6.4} height={4.5} rx={1.5} fill={warmRed} />
      <path d={`M${x - 2.4} ${y - 4} V${y - 13}`} stroke={white} strokeWidth={1.5} opacity={0.7} fill="none" />
    </g>
  )
}
