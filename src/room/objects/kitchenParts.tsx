import { PALETTE } from '../../art/palette'
import { iso, isoPoints, type Point } from '../iso'

// Shared building blocks for the kitchen appliances (stove, fridge, dishwasher,
// trash). Same structure as the sink: box faces, then fixtures, then mess.

const { ink, steel, creamDark, white } = PALETTE

export const COUNTER_H = 34 // matches the sink so counters line up
export const LIP = 6 // countertop thickness

export function poly(...pts: Point[]) {
  return pts.map((p) => `${p.x},${p.y}`).join(' ')
}

/** A point on the right-front (door) face of a box of height h: u back to front, v top to bottom. */
export function rightFace(h: number) {
  return (u: number, v: number) => iso(1, u, h * (1 - v))
}

/** The two visible side faces plus the top of a 1x1 box. `lip` adds a counter-edge band to both sides. */
export function box(h: number, c: { left: string; right: string; top: string; lip?: boolean }) {
  return (
    <g>
      <polygon points={isoPoints([0, 1, h], [1, 1, h], [1, 1, 0], [0, 1, 0])} fill={c.left} />
      <polygon points={isoPoints([1, 0, h], [1, 1, h], [1, 1, 0], [1, 0, 0])} fill={c.right} />
      {c.lip && (
        <>
          <polygon points={isoPoints([0, 1, h], [1, 1, h], [1, 1, h - LIP], [0, 1, h - LIP])} fill={creamDark} />
          <polygon points={isoPoints([1, 0, h], [1, 1, h], [1, 1, h - LIP], [1, 0, h - LIP])} fill={creamDark} />
        </>
      )}
      <polygon points={isoPoints([0, 0, h], [1, 0, h], [1, 1, h], [0, 1, h])} fill={c.top} />
    </g>
  )
}

/** A chunky metal handle bar between two points (ink rim, steel core, like the sink tap). */
export function handleBar(a: Point, b: Point) {
  const d = `M${a.x} ${a.y} L${b.x} ${b.y}`
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={ink} strokeWidth={5.5} />
      <path d={d} stroke={steel} strokeWidth={2} />
    </g>
  )
}

/** A little dial or button. */
export function knob(p: Point, fill: string = ink, r = 1.8, key?: string | number) {
  return <circle key={key} cx={p.x} cy={p.y} r={r} fill={fill} strokeWidth={1.5} />
}

/** A drip hanging down from (x, y): a rounded tail with a bead at the bottom. */
export function drip(x: number, y: number, fill: string, len = 7) {
  return <path d={`M${x - 2.5} ${y} v${len} q0 4 2.5 4 q2.5 0 2.5 -4 v${-len} Z`} fill={fill} strokeWidth={2} />
}

/** A round fridge magnet. */
export function magnet(p: Point, fill: string) {
  return (
    <g strokeWidth={1.5}>
      <circle cx={p.x} cy={p.y} r={2.8} fill={fill} />
      <circle cx={p.x - 0.8} cy={p.y - 0.9} r={0.8} fill={white} stroke="none" />
    </g>
  )
}

/** A cartoon puff of smoke or steam. */
export function puff(x: number, y: number, r = 4) {
  return (
    <g strokeWidth={1.5} fill={steel} opacity={0.9}>
      <circle cx={x} cy={y} r={r} />
      <circle cx={x + r * 0.9} cy={y + r * 0.35} r={r * 0.75} />
    </g>
  )
}
