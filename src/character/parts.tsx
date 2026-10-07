import { useContext, useId, type ReactNode } from 'react'
import { bodyShade, mix } from '../art/color'
import { PALETTE } from '../art/palette'
import type { EyeStyle, Mood } from '../domain/types'
import { useStrokeScale } from './strokeScale'
import { LookContext } from './look'

// Shared building blocks for every species, so Mochi, Bun and Sprout read as
// one family: same body shading, eyes, cheeks, feet, shadow and mood tint.

const { ink, blush, sickTint, dirt, white, sky, woodDark, floorWood, cream, creamDark, fabricBlue, warmRed } = PALETTE

/** Soft ground shadow under the feet. */
export function Shadow({ rx }: { rx: number }) {
  return <ellipse cx={100} cy={186} rx={rx} ry={7} fill={ink} opacity={0.15} stroke="none" />
}

/** A rounded nub (foot or arm), drawn before the body so the body overlaps it. */
export function Nub({ cx, cy, rx, ry, rotate = 0, fill }: { cx: number; cy: number; rx: number; ry: number; rotate?: number; fill: string }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} transform={`rotate(${rotate} ${cx} ${cy})`} />
}

/**
 * The pet's body with its one shade and a soft highlight, then the outline.
 * The shade is the body colour blended warm (see art/color.ts), showing as a
 * crescent along the bottom and right where the lit body is nudged up-left.
 * `highlight` is the top-left spot where light catches the body.
 */
export function Body({ d, colour, highlight }: { d: string; colour: string; highlight?: [number, number] }) {
  const clip = `body${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <g>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${clip})`} stroke="none">
        <path d={d} fill={bodyShade(colour)} />
        <path d={d} fill={colour} transform="translate(-6 -9)" />
        {highlight && (
          <g fill={white} opacity={0.7}>
            <ellipse cx={highlight[0]} cy={highlight[1]} rx={9} ry={5.5} transform={`rotate(-38 ${highlight[0]} ${highlight[1]})`} />
            <circle cx={highlight[0] + 11} cy={highlight[1] - 8} r={2.6} />
          </g>
        )}
      </g>
      <path d={d} fill="none" />
    </g>
  )
}

/** A small blush heart centred on (x, y), about 18 wide. */
function BlushHeart({ x, y, tilt }: { x: number; y: number; tilt: number }) {
  return <path d="M0 5 C-10 -1.5 -6.5 -7.5 -3.2 -6.4 C-1.6 -5.9 0 -4.3 0 -3 C0 -4.3 1.6 -5.9 3.2 -6.4 C6.5 -7.5 10 -1.5 0 5 Z" transform={`translate(${x} ${y}) rotate(${tilt}) scale(1.2)`} />
}

/** Blush on both cheeks, in the style chosen in the character creator (see look.ts). */
export function Cheeks({ y, spread = 34 }: { y: number; spread?: number }) {
  const { cheeks } = useContext(LookContext)
  const [l, r] = [100 - spread, 100 + spread]
  switch (cheeks) {
    case 'none':
      return null
    case 'hearts':
      return (
        <g fill={blush} stroke="none" opacity={0.9}>
          <BlushHeart x={l} y={y} tilt={-10} />
          <BlushHeart x={r} y={y} tilt={10} />
        </g>
      )
    case 'freckles':
      return (
        <g stroke="none">
          <g fill={blush} opacity={0.4}>
            <ellipse cx={l} cy={y} rx={9.5} ry={5.5} />
            <ellipse cx={r} cy={y} rx={9.5} ry={5.5} />
          </g>
          <g fill={dirt} opacity={0.7}>
            {[l, r].flatMap((cx) =>
              [[-5, -1.5], [0.5, 2.5], [5.5, -1]].map(([dx, dy]) => <circle key={`${cx}${dx}`} cx={cx + dx} cy={y + dy} r={1.8} />),
            )}
          </g>
        </g>
      )
    case 'round':
      return (
        <g fill={blush} stroke="none" opacity={0.85}>
          <ellipse cx={l} cy={y} rx={9.5} ry={5.5} />
          <ellipse cx={r} cy={y} rx={9.5} ry={5.5} />
        </g>
      )
  }
}

/** A mood, or one of the two special moments that override the face. */
export type Expression = Mood | 'sleeping' | 'cheering'

/** Eye centres sit this far either side of x = 100. */
const EYE_SPREAD = 20

/** A four-point glint, concave sides, `r` from centre to tip. */
function Glint({ x, y, r }: { x: number; y: number; r: number }) {
  const k = r * 0.22
  return <path d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`} fill={white} />
}

/** A big glossy eye: two highlights make it read as wet and alive. */
function OpenEye({ x, y, scale = 1, drop = 0, style, children }: { x: number; y: number; scale?: number; drop?: number; style: EyeStyle; children?: ReactNode }) {
  // `drop` sinks the main highlight toward the middle of the eye: a softer, wetter, sadder gaze.
  // The whole eye (and any `children`, like lashes) blinks as one; see Character.css.
  let drawing: ReactNode
  if (style === 'button') {
    // Smaller, perfectly round and shiny: a bead of ink.
    drawing = (
      <g stroke="none">
        <circle cx={x} cy={y} r={7.8 * scale} fill={ink} />
        <circle cx={x + 2.4 * scale} cy={y - (2.8 - drop) * scale} r={2.7 * scale} fill={white} />
        <circle cx={x - 2.3 * scale} cy={y + 2.6 * scale} r={1.2 * scale} fill={white} />
      </g>
    )
  } else if (style === 'sparkly') {
    // A touch taller, a big shine, a star glint and a pinprick of extra light.
    drawing = (
      <g stroke="none">
        <ellipse cx={x} cy={y} rx={9 * scale} ry={11 * scale} fill={ink} />
        <circle cx={x + 3 * scale} cy={y - (4.6 - drop) * scale} r={4.2 * scale} fill={white} />
        <Glint x={x - 3.2 * scale} y={y + 4 * scale} r={3.4 * scale} />
        <circle cx={x + 4.6 * scale} cy={y + 3.4 * scale} r={0.9 * scale} fill={white} />
      </g>
    )
  } else {
    drawing = (
      <g stroke="none">
        <ellipse cx={x} cy={y} rx={8.5 * scale} ry={10.5 * scale} fill={ink} />
        <circle cx={x + 2.9 * scale} cy={y - (4.2 - drop) * scale} r={3.3 * scale} fill={white} />
        <circle cx={x - 2.8 * scale} cy={y + 4 * scale} r={1.5 * scale} fill={white} />
      </g>
    )
  }
  return (
    <g className="ch-eye">
      {drawing}
      {children}
    </g>
  )
}

/** Two short ink lashes flicking off the outer corner of whichever eye shape is showing. */
function Lashes({ x, y, mood, side }: { x: number; y: number; mood: Expression; side: -1 | 1 }) {
  // Each lash is [from dx, from dy, to dx, to dy], dx measured outward from the eye centre.
  const lashes: Record<Expression, [number, number, number, number][]> = {
    happy: [[7.2, -6, 12.8, -9.4], [8.4, -1.8, 14.2, -3.4]],
    content: [[7.2, -6, 12.8, -9.4], [8.4, -1.8, 14.2, -3.4]],
    meh: [[6, -4.6, 11, -7.6], [7, -1, 12.4, -2.4]],
    sleeping: [[7.2, 2.2, 12.2, 4.6], [5.4, 4.4, 9.4, 8]],
    cheering: [[7.4, 2.4, 12.8, 0.4], [7, 4.4, 12.2, 5.8]],
    scruffy: [[7.6, -2, 13, -5], [8, 0.6, 13.6, 0.4]],
    sick: [[6, -6, 11.4, -9.2], [6, 6, 11.4, 9.2]],
  }
  const d = lashes[mood].map(([a, b, c, e]) => `M${x + a * side} ${y + b} L${x + c * side} ${y + e}`).join(' ')
  return <path d={d} strokeWidth={3 * useStrokeScale()} />
}

/** Worried brows: the inner end sits higher, which reads as sad, never cross. */
function Brow({ x, y, side }: { x: number; y: number; side: -1 | 1 }) {
  return <path d={`M${x + 7 * side} ${y - 13} Q${x} ${y - 17} ${x - 6 * side} ${y - 18}`} strokeWidth={3 * useStrokeScale()} />
}

function Eye({ x, y, mood, side }: { x: number; y: number; mood: Expression; side: -1 | 1 }) {
  const { eyes } = useContext(LookContext)
  // Lashes go inside an open eye so they blink with it.
  const lashes = eyes === 'lashes' ? <Lashes x={x} y={y} mood={mood} side={side} /> : null
  return <EyeShape x={x} y={y} mood={mood} side={side} style={eyes} lashes={lashes} />
}

function EyeShape({ x, y, mood, side, style, lashes }: { x: number; y: number; mood: Expression; side: -1 | 1; style: EyeStyle; lashes: ReactNode }) {
  switch (mood) {
    case 'sleeping':
      // Peacefully shut: soft downward curves.
      return (
        <g>
          <path d={`M${x - 7.5} ${y} q7.5 6.5 15 0`} />
          {lashes}
        </g>
      )
    case 'cheering':
      // Squeezed happy: ^ ^
      return (
        <g>
          <path d={`M${x - 7.5} ${y + 3} q7.5 -12 15 0`} />
          {lashes}
        </g>
      )
    case 'happy':
    case 'content':
      return <OpenEye x={x} y={y} style={style}>{lashes}</OpenEye>
    case 'meh':
      // Still bright, a touch smaller: "hm, okay". No lids, so it never looks unimpressed.
      return <OpenEye x={x} y={y + 1} scale={0.82} style={style}>{lashes}</OpenEye>
    case 'scruffy':
      // Tired and a bit sad, but hopeful: the same open eye as meh (smaller, glossy, no lid,
      // so never smug or cross) with its main highlight sunk lower, under worried brows.
      return (
        <g>
          <Brow x={x} y={y} side={side} />
          <OpenEye x={x} y={y + 1.5} scale={0.78} drop={2.4} style={style}>{lashes}</OpenEye>
        </g>
      )
    case 'sick':
      // Squeezed shut under worried brows: > <
      return (
        <g>
          <Brow x={x} y={y + 1} side={side} />
          <path d={`M${x + 6 * side} ${y - 6} L${x - 5 * side} ${y} L${x + 6 * side} ${y + 6}`} />
          {lashes}
        </g>
      )
  }
}

function Mouth({ y, mood }: { y: number; mood: Expression }) {
  switch (mood) {
    case 'sleeping':
      return <ellipse cx={100} cy={y + 1} rx={3} ry={2.5} fill={ink} stroke="none" />
    case 'happy':
    case 'cheering':
      return (
        <g>
          <path d={`M91.5 ${y - 2} q8.5 12 17 0 Z`} fill={ink} />
          <path d={`M95.5 ${y + 3.6} q4.5 -3.6 9 0 q-4.5 2.2 -9 0 Z`} fill={blush} stroke="none" />
        </g>
      )
    case 'content':
      return <path d={`M94 ${y} q6 5.5 12 0`} />
    case 'meh':
      return <path d={`M95.5 ${y + 1.5} q4.5 -1.2 9 0`} />
    case 'scruffy':
      return <path d={`M93 ${y + 2.5} q3.5 -3.5 7 0 q3.5 3.5 7 0`} />
    case 'sick':
      return <path d={`M90 ${y + 2} q5 -4.5 10 0 q5 4.5 10 0`} />
  }
}

/** Eyes and mouth. Eyes sit at (100 +/- EYE_SPREAD, eyeY). */
export function Face({ mood, eyeY, mouthY }: { mood: Expression; eyeY: number; mouthY: number }) {
  const scale = useStrokeScale()
  return (
    <g stroke={ink} strokeWidth={3.5 * scale} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Eye x={100 - EYE_SPREAD} y={eyeY} mood={mood} side={-1} />
      <Eye x={100 + EYE_SPREAD} y={eyeY} mood={mood} side={1} />
      <Mouth y={mouthY} mood={mood} />
      {mood === 'sick' && (
        <path d={`M151 ${eyeY - 16} q-6 9 0 12 q6 -3 0 -12 Z`} fill={sky} strokeWidth={2.5} />
      )}
      {mood === 'scruffy' && (
        <path d={`M148 ${eyeY - 14} q-4.5 6.5 0 8.5 q4.5 -2.2 0 -8.5 Z`} fill={sky} strokeWidth={2.2} />
      )}
    </g>
  )
}

/** A light, cool, minty green: sick-tint pulled toward sky so it never drifts olive on warm bodies. */
const MINT = mix(sickTint, sky, 0.45)
/** The sick wash: that mint lightened toward white. */
const SICK_WASH = mix(MINT, white, 0.4)
/** The scruffy cast: the same mint, a little paler, so a yellow body goes lime-pastel rather than khaki. */
const SCRUFFY_WASH = mix(MINT, white, 0.4)

/**
 * How scruffy and sick show on the body, kept funny rather than gross:
 * scruffy gets a faint minty cast and a few smudges of dirt blended into the body
 * colour; sick goes pale with a light minty wash. `d` is the body outline path and
 * `colour` the body colour the smudges are blended with.
 */
export function MoodTint({ d, mood, smudges, colour }: { d: string; mood: Mood; smudges: [number, number][]; colour: string }) {
  if (mood !== 'scruffy' && mood !== 'sick') return null
  const smudge = mix(dirt, colour, 0.5)
  return (
    <g stroke="none">
      {mood === 'sick' && <path d={d} fill={white} opacity={0.36} />}
      <path d={d} fill={mood === 'sick' ? SICK_WASH : SCRUFFY_WASH} opacity={mood === 'sick' ? 0.28 : 0.16} />
      <g fill={smudge} opacity={0.55}>
        {smudges.map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={i % 2 ? 5 : 7} ry={i % 2 ? 3.5 : 4.5} transform={`rotate(${i % 2 ? 20 : -15} ${x} ${y})`} />
        ))}
      </g>
    </g>
  )
}

// ---- Shared sick bed. Every species lies in the same bed with the same props;
// only the pet differs. Draw order: SickBedBack, the pet, IcePack, SickBedFront,
// the pet's paws, Thermometer. Draw inside a group that already has the ink
// stroke (CHARACTER_STROKE, round joins) set, and add <Shadow rx={84} /> first.

const BLANKET = 'M16 156 C16 148 40 146 66 149 C86 144 114 144 134 149 C160 146 184 148 184 156 L184 170 C184 176 176 178 168 178 L32 178 C24 178 16 176 16 170 Z'
const BLANKET_FOLD = 'M18 154 C18 147 42 145 66 148 C86 143 114 143 134 148 C158 145 182 147 182 154 C182 162 170 160 160 158 C130 155 108 160 98 158 C80 155 50 160 36 160 C26 160 18 160 18 154 Z'

/** Headboard, legs, mattress and pillow: everything behind the pet. */
export function SickBedBack() {
  return (
    <g>
      <rect x={20} y={88} width={160} height={84} rx={22} fill={woodDark} />
      <rect x={26} y={170} width={14} height={11} rx={4} fill={woodDark} />
      <rect x={160} y={170} width={14} height={11} rx={4} fill={woodDark} />
      <rect x={14} y={152} width={172} height={22} rx={11} fill={floorWood} />
      <rect x={30} y={108} width={140} height={44} rx={22} fill={cream} />
    </g>
  )
}

/** Blanket with a turned-down sheet, tucked in at the bed base. Paws go on top. */
export function SickBedFront() {
  return (
    <g>
      <path d={BLANKET} fill={fabricBlue} />
      <path d={BLANKET_FOLD} fill={cream} />
      <g fill="none" stroke={creamDark} strokeWidth={3}>
        <path d="M34 170 q6 -5 12 0" />
        <path d="M150 170 q6 -5 12 0" />
      </g>
    </g>
  )
}

/** Thermometer with its mouth end at (x, y), pointing right, turned by `rotate` degrees. */
export function Thermometer({ x, y, rotate = 10 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x={0} y={-4.5} width={28} height={9} rx={4.5} fill={white} />
      <path d="M2.5 0 h12" stroke={warmRed} strokeWidth={4} />
      <path d="M18.5 -4.5 v3 M23 -4.5 v3" strokeWidth={2} />
      <circle cx={31} cy={0} r={5.5} fill={warmRed} strokeWidth={3} />
    </g>
  )
}

/** Ice pack centred on (x, y), turned by `rotate` degrees. */
export function IcePack({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x={-21} y={-11} width={42} height={22} rx={8} fill={sky} />
      <path d="M-13 -3 H4" stroke={white} strokeWidth={3} fill="none" opacity={0.9} />
      <path d="M-13 3 H-6" stroke={white} strokeWidth={3} fill="none" opacity={0.9} />
    </g>
  )
}
