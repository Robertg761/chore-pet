import { useEffect, useRef, type CSSProperties } from 'react'
import { PALETTE, ROOM_STROKE } from '../art/palette'
import { mix } from '../art/color'
import './effects.css'
import { prefersReducedMotion, starPath } from './shapes'

// The "cleaned" sparkle: drawn in room coordinates at (x, y), plays once, then
// calls onDone. Four ink-outlined stars, a cream puff ring and a few glints.

const { ink, white, sky, blush, cream } = PALETTE
const PUFF = mix(cream, white, 0.4)
const STAR_STROKE = ROOM_STROKE - 1

const DURATION = 900
const REDUCED_DURATION = 600

// Offsets are fractions of `size`: [dx, dy, radius, fill, delay ms].
const STARS: [number, number, number, string, number][] = [
  [0.02, -0.34, 0.22, white, 0],
  [-0.42, -0.42, 0.16, sky, 90],
  [0.43, -0.34, 0.16, blush, 150],
  [0.3, 0.14, 0.11, white, 210],
]
const GLINTS: [number, number, number][] = [
  [-0.52, -0.02, 120],
  [0.12, -0.66, 60],
  [0.58, -0.08, 240],
]
const PUFFS = 8

export interface SparkleProps {
  /** Room-coordinate centre of the effect. */
  x: number
  y: number
  /** About one object's width, in room px. */
  size: number
  onDone?: () => void
}

type Vars = CSSProperties & Record<`--fx-${string}`, string>

export function Sparkle({ x, y, size, onDone }: SparkleProps) {
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    const t = setTimeout(() => done.current?.(), prefersReducedMotion() ? REDUCED_DURATION : DURATION)
    return () => clearTimeout(t)
  }, [])

  const timing = (delay: number): Vars => ({ '--fx-delay': `${delay}ms`, '--fx-dur': `${DURATION - delay}ms`, '--fx-rise': `${-size * 0.12}px` })

  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }} aria-hidden="true">
      <g transform={`translate(0 ${size * 0.1})`}>
        <g className="fx-sparkle-ring" style={timing(0)} fill={PUFF}>
          {Array.from({ length: PUFFS }, (_, i) => {
            const a = (i / PUFFS) * Math.PI * 2 + 0.3
            return <circle key={i} cx={Math.cos(a) * size * 0.5} cy={Math.sin(a) * size * 0.25} r={size * (i % 2 ? 0.09 : 0.11)} />
          })}
        </g>
      </g>
      {STARS.map(([dx, dy, r, fill, delay], i) => (
        // CSS transforms replace the transform attribute, so the offset sits on an outer <g>.
        <g key={i} transform={`translate(${dx * size} ${dy * size})`}>
          <path className="fx-sparkle-star" style={timing(delay)} d={starPath(r * size)} fill={fill} stroke={ink} strokeWidth={STAR_STROKE} strokeLinejoin="round" />
        </g>
      ))}
      {GLINTS.map(([dx, dy, delay], i) => (
        <g key={i} transform={`translate(${dx * size} ${dy * size})`}>
          <path className="fx-sparkle-glint" style={timing(delay)} d={starPath(size * 0.08, 0.12)} fill={white} />
        </g>
      ))}
    </g>
  )
}
