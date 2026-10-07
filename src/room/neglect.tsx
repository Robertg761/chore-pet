import { createContext, memo, useContext, type CSSProperties, type ReactNode } from 'react'
import { mix } from '../art/color'
import { PALETTE, ROOM_STROKE } from '../art/palette'
import type { MessKind } from '../catalog/types'
import { CUE_SIZE, type CueLevel } from './cuePlan'
import { fly } from './objects/mess'
import './neglect.css'

// Neglect cues: overlays that float above a room object and get worse the
// longer its chores go undone. Drawn around (0,0), the top-centre of the
// object, in reference-room px (the room scales them by TILE_SCALE). They rise
// from y = 0 and ignore pointer events. Level 1 is a hint, 2 is clearly a
// problem, 3 is visible from across the room. Levels 2 and 3 are drawn smaller
// than designed (CUE_SIZE in ./cuePlan) with outlines kept at full width.
// Which cues show, and which animate, is decided in ./cuePlan.
// Funny and colourful, never gross (docs/ART.md).

const { ink, white, sickTint, steel, steelDark, dirt, cream, creamDark, sky, blush, petDefault } = PALETTE

export type { CueLevel } from './cuePlan'

/**
 * Outline multiplier inside a shrunk cue: 1 / its drawn size, so every line
 * keeps the room's outline width however small the cue is drawn.
 */
const InkScale = createContext(1)
function useInk() {
  const m = useContext(InkScale)
  return (n: number) => n * m
}

type Vars = CSSProperties & Record<`--${string}`, string | number>
const vars = (v: Vars): Vars => v
/** Animation timing: duration (s) and delay (s, negative to start mid-loop). */
const timing = (dur: number, delay = 0): Vars => vars({ '--nc-dur': `${dur}s`, '--nc-delay': `${delay}s` })

// Per-kind colours: [light face, one darker shade].
const STINK_FACE = [mix(sickTint, white, 0.5), sickTint] as const
const DUST_FACE = [mix(steel, white, 0.35), steelDark] as const
const EARTH_FACE = [mix(dirt, cream, 0.55), mix(dirt, cream, 0.15)] as const
const LEAF = mix(petDefault, dirt, 0.4)
const LEAF_DARK = mix(petDefault, dirt, 0.65)

/** One ring of overlapping circles: [cx, cy, r]. */
type Blob = [number, number, number][]

/**
 * A puffy cloud made of circles. The ink layer is the circles grown by the
 * outline width, so the silhouette gets one clean wavy outline with no seams
 * inside. A shade layer and a slightly smaller, offset light layer give the
 * one darker shade along the lower right.
 */
function Puff({ blob, face, outline: base = ROOM_STROKE }: { blob: Blob; face: readonly [string, string]; outline?: number }) {
  const outline = useInk()(base)
  return (
    <g>
      {blob.map(([x, y, r], i) => (
        <circle key={'o' + i} cx={x} cy={y} r={r + outline / 2} fill={ink} />
      ))}
      {blob.map(([x, y, r], i) => (
        <circle key={'s' + i} cx={x} cy={y} r={r - outline / 2} fill={face[1]} />
      ))}
      {blob.map(([x, y, r], i) => (
        <circle key={'l' + i} cx={x - 1} cy={y - 1.6} r={Math.max(1, r - outline / 2 - 2.4)} fill={face[0]} />
      ))}
    </g>
  )
}

/** Wavy vertical wisp from (x, y) upward: ink tube with a coloured core. */
function Wisp({ x, y, waves, seg = 9, amp = 4, core = 2.6, colour = sickTint, dur, delay, flip = false, still = 1 }: {
  x: number
  y: number
  waves: number
  seg?: number
  amp?: number
  core?: number
  colour?: string
  dur: number
  delay: number
  flip?: boolean
  /** Opacity when static (reduced motion); animation fades it in and out. */
  still?: number
}) {
  const w = useInk()
  let d = `M${x} ${y}`
  for (let i = 0; i < waves * 2; i++) d += ` q${(i % 2 === 0) !== flip ? -amp * 2 : amp * 2} ${-seg / 2} 0 ${-seg}`
  return (
    <g className="nc-rise" style={timing(dur, delay)} opacity={still}>
      <path d={d} fill="none" stroke={ink} strokeWidth={core + w(2.6)} strokeLinecap="round" />
      <path d={d} fill="none" stroke={colour} strokeWidth={core} strokeLinecap="round" />
    </g>
  )
}

/** A fly with no flight-path squiggle (the orbit ring draws the path). Centred on (0,0). */
function FlyBody() {
  return (
    <g stroke={ink} strokeWidth={useInk()(1.6)}>
      <ellipse cx={-3} cy={-3.2} rx={3.6} ry={2.2} fill={white} transform="rotate(-30 -3 -3.2)" />
      <ellipse cx={3} cy={-3.2} rx={3.6} ry={2.2} fill={white} transform="rotate(30 3 -3.2)" />
      <ellipse cx={0} cy={0} rx={3.1} ry={2.6} fill={ink} />
    </g>
  )
}

/** Flies circling (cx, cy) on an ellipse of radius rx. Static, they sit spread around the dotted ring. */
function Orbit({ cx, cy, rx, squash = 0.7, angles, dur = 5, children }: {
  cx: number
  cy: number
  rx: number
  squash?: number
  angles: number[]
  dur?: number
  children?: ReactNode
}) {
  const w = useInk()
  return (
    <g transform={`translate(${cx} ${cy}) scale(1 ${squash})`}>
      <ellipse cx={0} cy={0} rx={rx} ry={rx} fill="none" stroke={ink} strokeWidth={w(1.4)} strokeDasharray="2 4" strokeLinecap="round" opacity={0.35} />
      {angles.map((a, i) => (
        // The ring circle has the group's box centred on the cloud, so the group
        // can rotate about its own centre. The counter-rotation keeps each fly upright.
        <g key={i} className="nc-orbit" style={vars({ '--a0': `${a}deg`, '--nc-dur': `${dur * (i === 1 ? 1.15 : 1)}s` })}>
          <circle r={rx + 6} fill="none" />
          <g transform={`translate(${rx} 0)`}>
            <g className="nc-counter" style={vars({ '--a0': `${a}deg`, '--nc-dur': `${dur * (i === 1 ? 1.15 : 1)}s` })}>
              <g transform={`scale(1 ${1 / squash})`}>
                <FlyBody />
              </g>
            </g>
          </g>
        </g>
      ))}
      {children}
    </g>
  )
}

/** A wavy-mouthed queasy face for the big stink cloud. */
function QueasyFace({ x, y }: { x: number; y: number }) {
  const w = useInk()
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={-7} cy={0} r={2.6} fill={ink} />
      <circle cx={7} cy={0} r={2.6} fill={ink} />
      <circle cx={-6.2} cy={-0.9} r={0.9} fill={white} />
      <circle cx={7.8} cy={-0.9} r={0.9} fill={white} />
      <path d="M-5 7 q2.5 -3 5 0 q2.5 3 5 0" fill="none" stroke={ink} strokeWidth={w(2)} strokeLinecap="round" />
      <ellipse cx={-12} cy={5} rx={3} ry={2} fill={blush} opacity={0.7} />
      <ellipse cx={12} cy={5} rx={3} ry={2} fill={blush} opacity={0.7} />
    </g>
  )
}

/** A tiny dizzy spiral. */
function Swirl({ x, y, r = 6 }: { x: number; y: number; r?: number }) {
  const w = useInk()
  let d = ''
  for (let i = 0; i <= 28; i++) {
    const t = i / 28
    const a = t * Math.PI * 4.2
    const rr = r * t
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)} `
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="nc-swirl" style={timing(2.4)}>
        <path d={d} fill="none" stroke={ink} strokeWidth={2 + w(2.4)} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle r={r + 1} fill="none" />
      </g>
    </g>
  )
}

// ---- stink ---------------------------------------------------------------

// Seven circles: a puffy outline with as few nodes as reads as a cloud.
const STINK_CLOUD: Blob = [
  [0, -27, 18],
  [-17, -15, 10],
  [0, -10, 11],
  [17, -15, 10],
  [20, -33, 10],
  [3, -44, 12],
  [-17, -36, 10],
]

function Stink({ level }: { level: CueLevel }) {
  if (level === 1) return <Wisp x={0} y={-3} waves={2} seg={9} dur={3} delay={0} still={0.9} />
  if (level === 2) {
    return (
      <>
        <Wisp x={-14} y={-3} waves={2} seg={9} core={3} dur={2.8} delay={-0.3} />
        <Wisp x={0} y={-5} waves={3} seg={9} core={3.2} dur={3.2} delay={-1.5} flip />
        <Wisp x={14} y={-3} waves={2} seg={9} core={3} dur={2.9} delay={-2.2} />
        <g transform="translate(18 -42)">
          <g className="nc-bob" style={timing(1.6)}>
            {fly(0, 0, 'f')}
          </g>
        </g>
      </>
    )
  }
  return (
    <>
      <g className="nc-breathe" style={timing(2.6)}>
        <Puff blob={STINK_CLOUD} face={STINK_FACE} />
        <QueasyFace x={1} y={-27} />
      </g>
      <Orbit cx={1} cy={-27} rx={32} squash={0.68} angles={[0, 130, 250]} dur={5.5} />
      <Swirl x={25} y={-52} />
    </>
  )
}

// ---- dust ----------------------------------------------------------------

/** A dust speck: a small ink-outlined grain. */
function Speck({ x, y, r = 2.4, fill = steelDark, dur, delay }: { x: number; y: number; r?: number; fill?: string; dur: number; delay: number }) {
  return (
    <g className="nc-drift" style={timing(dur, delay)}>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={ink} strokeWidth={useInk()(1.5)} />
    </g>
  )
}

/** A corner cobweb hung from (x, y): radial threads with sagging rings. `s` is its reach in px. */
function Cobweb({ x, y, s = 16, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  const f = flip ? -1 : 1
  const pt = (u: number, v: number) => `${(u * f * s).toFixed(1)} ${(v * s).toFixed(1)}`
  const rays: [number, number][] = [
    [-1, 0.25],
    [-0.75, 0.8],
    [-0.2, 1.1],
  ]
  const ring = (k: number) => {
    let d = `M${pt(rays[0][0] * k, rays[0][1] * k)}`
    for (let i = 1; i < rays.length; i++) {
      const [ax, ay] = rays[i - 1]
      const [bx, by] = rays[i]
      d += ` Q${pt(((ax + bx) / 2) * k * 0.8, ((ay + by) / 2) * k * 0.8)} ${pt(bx * k, by * k)}`
    }
    return d
  }
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={ink} strokeWidth={useInk()(1.4)} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
      <path d={rays.map(([u, v]) => `M0 0 L${pt(u, v)}`).join(' ')} />
      <path d={ring(0.5)} />
      <path d={ring(0.85)} fill={white} fillOpacity={0.5} />
    </g>
  )
}

/** A smiling dust bunny: a little grey fluffball with eyes, cheeks and a grin. */
function DustBunny({ x, y, s = 1, dur, delay }: { x: number; y: number; s?: number; dur: number; delay: number }) {
  const ring: Blob = [
    [0, 0, 6.4],
    [-5.6, 1.2, 4.2],
    [5.6, 1.2, 4.2],
    [-3.6, -4.6, 4.2],
    [3.6, -4.6, 4.2],
    [-3.2, 5, 3.8],
    [3.2, 5, 3.8],
  ]
  const w = useInk()
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="nc-hop" style={timing(dur, delay)}>
        <Puff blob={ring} face={DUST_FACE} outline={2.2} />
        <circle cx={-2.7} cy={-0.8} r={1.25} fill={ink} />
        <circle cx={2.7} cy={-0.8} r={1.25} fill={ink} />
        <path d="M-2 2 q2 2.4 4 0" fill="none" stroke={ink} strokeWidth={w(1.2)} strokeLinecap="round" />
        <circle cx={-5} cy={2} r={1.2} fill={blush} opacity={0.8} />
        <circle cx={5} cy={2} r={1.2} fill={blush} opacity={0.8} />
      </g>
    </g>
  )
}

const DUST_PUFF_SMALL: Blob = [
  [0, -14, 8],
  [-8, -10, 6],
  [8, -10, 6],
  [-4, -19, 6],
  [5, -19, 6],
]

const DUST_CLOUD: Blob = [
  [0, -24, 17],
  [-18, -14, 10],
  [1, -9, 11],
  [18, -13, 10],
  [20, -30, 10],
  [1, -40, 12],
  [-18, -33, 10],
]

function Dust({ level }: { level: CueLevel }) {
  if (level === 1) {
    return (
      <>
        <Speck x={-10} y={-8} dur={3.4} delay={0} />
        <Speck x={5} y={-14} r={2.8} fill={creamDark} dur={3.8} delay={-1.2} />
        <Speck x={14} y={-5} r={2} dur={3} delay={-2} />
        <Speck x={-3} y={-24} r={2.2} fill={creamDark} dur={4} delay={-0.6} />
      </>
    )
  }
  if (level === 2) {
    return (
      <>
        <g className="nc-breathe" style={timing(3)}>
          <Puff blob={DUST_PUFF_SMALL} face={DUST_FACE} />
        </g>
        <Cobweb x={10} y={-42} s={16} />
        <Speck x={-18} y={-8} dur={3.4} delay={0} />
        <Speck x={17} y={-8} r={2.8} fill={creamDark} dur={3.8} delay={-1.2} />
        <Speck x={-14} y={-30} r={2} fill={creamDark} dur={3.3} delay={-2} />
        <Speck x={21} y={-22} r={2.2} dur={4} delay={-0.6} />
      </>
    )
  }
  return (
    <>
      <g className="nc-breathe" style={timing(3.2)}>
        <Puff blob={DUST_CLOUD} face={DUST_FACE} />
      </g>
      <Cobweb x={-30} y={-58} s={26} flip />
      
      <DustBunny x={-18} y={-4} s={1.15} dur={1.6} delay={0} />
      <DustBunny x={19} y={-5} s={0.95} dur={1.9} delay={-0.8} />
      <Speck x={27} y={-38} r={2.4} fill={creamDark} dur={3.4} delay={0} />
      <Speck x={-28} y={-10} r={2.2} dur={3.8} delay={-1.2} />
      <Speck x={2} y={-52} r={2.8} dur={3.1} delay={-2} />
    </>
  )
}

// ---- wilt ----------------------------------------------------------------

/** A dry leaf with a midrib and a little curl, centred on (0,0), about 15 px long. */
function Leaf({ x, y, rot = 0, s = 1, dur, delay, fall = true }: { x: number; y: number; rot?: number; s?: number; dur: number; delay: number; fall?: boolean }) {
  const w = useInk()
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <g className={fall ? 'nc-fall' : 'nc-bob'} style={timing(dur, delay)}>
        <path d="M-8 1 Q-3 -8 8 -3 Q4 8 -8 1 Z" fill={LEAF} stroke={ink} strokeWidth={w(2)} strokeLinejoin="round" />
        <path d="M-1 3 Q4 7 8 -3 Q4 8 -1 3 Z" fill={LEAF_DARK} />
        <path d="M-8 1 Q-1 0 6 -2" fill="none" stroke={ink} strokeWidth={w(1.3)} strokeLinecap="round" />
        <path d="M-1.5 0.4 l2.5 3.2 M2.4 -0.8 l2.4 -3" fill="none" stroke={ink} strokeWidth={w(1)} strokeLinecap="round" />
      </g>
    </g>
  )
}

/** A droplet outline, sky blue, dashed when `empty`. */
function Droplet({ empty = false, s = 1 }: { empty?: boolean; s?: number }) {
  const d = 'M0 -10 C5 -3 8 1 8 4.5 A8 8 0 0 1 -8 4.5 C-8 1 -5 -3 0 -10 Z'
  const w = useInk()
  return (
    <g transform={`scale(${s})`}>
      <path d={d} fill={empty ? 'none' : white} fillOpacity={0.7} stroke={ink} strokeWidth={w(ROOM_STROKE - (empty ? 0.6 : 0))} strokeLinejoin="round" />
      {!empty && <path d={d} fill="none" stroke={sky} strokeWidth={1.4} strokeDasharray="3 3.4" transform="scale(0.62)" />}
      {empty && <path d={d} fill="none" stroke={sky} strokeWidth={1.8} strokeDasharray="3 3.4" transform="scale(0.72)" />}
    </g>
  )
}

/** A bubble with an empty droplet inside: the plant is thirsty. */
function ThirstBubble({ x, y }: { x: number; y: number }) {
  const w = useInk()
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="nc-bob" style={timing(2.2)}>
        <circle r={12} fill={white} fillOpacity={0.85} stroke={ink} strokeWidth={w(ROOM_STROKE)} />
        <path d="M-6 -7 q-3 3 -2.4 7" fill="none" stroke={white} strokeWidth={2} strokeLinecap="round" />
        <g transform="translate(0 1)">
          <Droplet empty s={0.85} />
        </g>
        <circle cx={-9} cy={13.5} r={2.6} fill={white} fillOpacity={0.85} stroke={ink} strokeWidth={w(2)} />
        <circle cx={-14} cy={19} r={1.6} fill={white} fillOpacity={0.85} stroke={ink} strokeWidth={w(1.6)} />
      </g>
    </g>
  )
}

const EARTH_PUFF: Blob = [
  [0, -19, 13],
  [-11, -12, 8],
  [7, -10, 8],
  [13, -21, 8],
  [3, -29, 9],
  [-12, -25, 7.5],
]

function Wilt({ level }: { level: CueLevel }) {
  const w = useInk()
  if (level === 1) return <Leaf x={4} y={-12} rot={-20} dur={4} delay={0} />
  if (level === 2) {
    return (
      <>
        <Leaf x={-16} y={-8} rot={-30} dur={3.6} delay={-0.4} />
        <Leaf x={-2} y={-24} rot={15} s={0.9} dur={4.2} delay={-1.8} />
        <Leaf x={9} y={-6} rot={40} s={0.85} dur={3.9} delay={-2.6} />
        <g transform="translate(22 -34)">
          <g className="nc-bob" style={timing(2.4)}>
            <Droplet empty />
          </g>
        </g>
      </>
    )
  }
  return (
    <>
      <g className="nc-breathe" style={timing(3.2)}>
        <g transform="scale(1.3)">
          <Puff blob={EARTH_PUFF} face={EARTH_FACE} />
          <g fill="none" stroke={ink} strokeWidth={w(1.8)} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
            <path d="M-8 -14 l4 -5 l-2 -5 l5 -4" />
            <path d="M2 -9 l-1 -6 l5 -3 l1 -6" />
            <path d="M11 -22 l-4 2 l1 5" />
          </g>
        </g>
      </g>
      <Leaf x={-27} y={-16} rot={-40} dur={3.4} delay={-0.2} />
      <Leaf x={-12} y={-44} rot={20} s={0.9} dur={4} delay={-1.6} />
      <Leaf x={4} y={-3} rot={60} s={0.9} dur={3.7} delay={-2.4} />
      <Leaf x={-4} y={-52} rot={-10} s={0.8} dur={4.4} delay={-0.9} />
      <ThirstBubble x={19} y={-56} />
    </>
  )
}

// ---- entry ---------------------------------------------------------------

export interface NeglectCueProps {
  kind: MessKind
  level: CueLevel
  /** A still picture: only the most neglected cues in the room animate. */
  still?: boolean
}

/**
 * One cue, drawn at its level's size (CUE_SIZE). Memoised: the room re-renders
 * as the pet walks, the cues only when their level changes.
 */
export const NeglectCue = memo(function NeglectCue({ kind, level, still = false }: NeglectCueProps) {
  const size = CUE_SIZE[level]
  return (
    <g className={still ? 'nc-cue nc-still' : 'nc-cue'} data-kind={kind} data-level={level} style={{ pointerEvents: 'none' }} aria-hidden="true">
      <g transform={size === 1 ? undefined : `scale(${size})`}>
        <InkScale.Provider value={1 / size}>
          {kind === 'stink' && <Stink level={level} />}
          {kind === 'dust' && <Dust level={level} />}
          {kind === 'wilt' && <Wilt level={level} />}
        </InkScale.Provider>
      </g>
    </g>
  )
})
