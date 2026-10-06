import { iso, type Point } from '../iso'

// Local helpers shared by the batch 3 objects (shower, couch, rug, table).
// Everything here draws in object-local iso units (see ../iso.ts).

export function poly(...pts: Point[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ')
}

/** Closed path through `pts` with every corner rounded by up to `r`. */
export function roundedPath(pts: Point[], r: number): string {
  const n = pts.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n]
    const cur = pts[i]
    const next = pts[(i + 1) % n]
    const lp = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    const ln = Math.hypot(next.x - cur.x, next.y - cur.y)
    const rp = Math.min(r, lp / 2) / lp
    const rn = Math.min(r, ln / 2) / ln
    const a = { x: cur.x + (prev.x - cur.x) * rp, y: cur.y + (prev.y - cur.y) * rp }
    const b = { x: cur.x + (next.x - cur.x) * rn, y: cur.y + (next.y - cur.y) * rn }
    d += `${i === 0 ? 'M' : 'L'}${a.x} ${a.y} Q${cur.x} ${cur.y} ${b.x} ${b.y} `
  }
  return d + 'Z'
}

export interface BoxSpec {
  x0: number
  x1: number
  y0: number
  y1: number
  z0: number
  z1: number
  /** Face fills: top lightest, left-front (the ty = y1 face) darkest. */
  top: string
  left: string
  right: string
  /** Corner rounding of the outline, in units. */
  r?: number
}

/**
 * A soft box: three shaded faces with a rounded silhouette outline and the
 * three inner edges. Draw back to front. Inherits stroke from its parent.
 */
export function softBox({ x0, x1, y0, y1, z0, z1, top, left, right, r = 3 }: BoxSpec) {
  const A = iso(x0, y0, z1)
  const B = iso(x1, y0, z1)
  const C = iso(x1, y0, z0)
  const D = iso(x1, y1, z0)
  const E = iso(x0, y1, z0)
  const F = iso(x0, y1, z1)
  const M = iso(x1, y1, z1)
  // Pull the inner edges back from the rounded silhouette corners so no stub pokes out.
  const back = (p: Point) => {
    const len = Math.hypot(p.x - M.x, p.y - M.y)
    const t = Math.max(0, len - r * 0.45) / len
    return { x: M.x + (p.x - M.x) * t, y: M.y + (p.y - M.y) * t }
  }
  const Fb = back(F)
  const Bb = back(B)
  return (
    <g>
      <g stroke="none">
        <polygon points={poly(F, M, D, E)} fill={left} />
        <polygon points={poly(B, M, D, C)} fill={right} />
        <polygon points={poly(A, B, M, F)} fill={top} />
      </g>
      <path d={`M${Fb.x} ${Fb.y} L${M.x} ${M.y} L${Bb.x} ${Bb.y} M${M.x} ${M.y} L${D.x} ${D.y}`} fill="none" />
      <path d={roundedPath([A, B, C, D, E, F], r)} fill="none" />
    </g>
  )
}

/** A flat diamond on a horizontal plane at height z. */
export function slab(x0: number, x1: number, y0: number, y1: number, z: number) {
  return poly(iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z))
}
