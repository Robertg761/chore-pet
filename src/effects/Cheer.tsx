import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'
import './effects.css'
import { heartPath, prefersReducedMotion, starPath } from './shapes'

// The pet's celebration, in its own 200x200 box: the art hops twice (squash,
// stretch, squash) while two waves of hearts and stars pop around it.

const { ink, blush, warmRed, sky, petDefault } = PALETTE

const HOP_MS = 700
const HOPS = 2
const DURATION = 1750
const REDUCED_DURATION = 1200

// [x, y, kind, size, fill, delay ms]. Absolute spots in the 200 box, round the pet, clear of the face.
type Burst = [number, number, 'heart' | 'star', number, string, number]
const BURSTS: Burst[] = [
  [28, 62, 'heart', 28, blush, 40],
  [176, 54, 'star', 22, petDefault, 90],
  [60, 18, 'star', 18, sky, 150],
  [150, 16, 'heart', 22, warmRed, 110],
  [100, 6, 'heart', 20, blush, 190],
  [20, 124, 'star', 16, sky, 230],
  [184, 120, 'heart', 20, warmRed, 250],
  [42, 30, 'heart', 22, warmRed, 740],
  [164, 30, 'heart', 26, blush, 770],
  [128, 4, 'star', 20, sky, 820],
  [12, 90, 'star', 20, petDefault, 800],
  [190, 88, 'star', 16, sky, 880],
]

export interface CheerProps {
  /** The pet art in its 200x200 box, e.g. <CharacterArt pose="cheering" />. */
  children: ReactNode
  onDone?: () => void
}

type Vars = CSSProperties & Record<`--fx-${string}`, string>

export function Cheer({ children, onDone }: CheerProps) {
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    const t = setTimeout(() => done.current?.(), prefersReducedMotion() ? REDUCED_DURATION : DURATION)
    return () => clearTimeout(t)
  }, [])

  return (
    <g>
      <g className="fx-cheer-hop" style={{ '--fx-hop': `${HOP_MS}ms`, '--fx-hops': `${HOPS}` } as Vars}>
        {children}
      </g>
      <g style={{ pointerEvents: 'none' }} aria-hidden="true" stroke={ink} strokeWidth={CHARACTER_STROKE - 1} strokeLinejoin="round">
        {BURSTS.map(([x, y, kind, size, fill, delay], i) => {
          // Start pulled toward the pet's middle so each one pops outward.
          const style = { '--fx-delay': `${delay}ms`, '--fx-sx': `${(100 - x) * 0.6}px`, '--fx-sy': `${(104 - y) * 0.6}px`, '--fx-spin': `${i % 2 ? 14 : -14}deg` } as Vars
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path className="fx-cheer-pop" style={style} d={kind === 'heart' ? heartPath(size) : starPath(size / 2, 0.26)} fill={fill} />
            </g>
          )
        })}
      </g>
    </g>
  )
}
