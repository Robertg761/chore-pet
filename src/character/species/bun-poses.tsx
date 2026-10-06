import type { ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../../art/palette'
import type { Mood } from '../../domain/types'
import type { MoodPoses } from '../poses'
import type { Anchor, Pose } from '../slots'
import { Body, Cheeks, Face, IcePack, MoodTint, Nub, Shadow, SickBedBack, SickBedFront, Thermometer, type Expression } from '../parts'
import { BODY, HIGHLIGHT, ear } from './bun'

// Bun mood poses. Ears carry the mood (see EAR_DROOP in bun.tsx); posture does
// the rest by squashing, tilting and lowering the same idle silhouette.

const { ink } = PALETTE

/** Scruffy and sick are always tinted: the pose itself implies the mood. */
const EAR_TINT: Partial<Record<Mood, number>> = { scruffy: 0.18, sick: 0.32 }

/** Posture of the idle silhouette: squash about the ground point, tilt, then lift. */
interface Posture {
  sx: number
  sy: number
  tilt: number
  dy: number
}

const GROUND = 181

/** Idle y coordinate -> y after squashing (before tilt). */
const squashY = (y: number, p: Posture) => GROUND - (GROUND - y) * p.sy

function figureTransform(p: Posture) {
  return `translate(0 ${p.dy}) rotate(${p.tilt} 100 ${GROUND})`
}

/** Where an idle-space point lands after the posture, as an anchor. */
function anchorFor(x: number, y: number, p: Posture, scale?: number): Anchor {
  const px = 100 + (x - 100) * p.sx
  const py = squashY(y, p)
  const a = (p.tilt * Math.PI) / 180
  const dx = px - 100
  const dyy = py - GROUND
  return {
    x: Math.round((100 + dx * Math.cos(a) - dyy * Math.sin(a)) * 10) / 10,
    y: Math.round((GROUND + dx * Math.sin(a) + dyy * Math.cos(a) + p.dy) * 10) / 10,
    rotate: p.tilt || undefined,
    scale,
  }
}

function anchorsFor(p: Posture, headY = 92): Pose['anchors'] {
  return {
    back: anchorFor(100, 140, p),
    body: anchorFor(100, 140, p),
    outfit: anchorFor(100, 162, p),
    neck: anchorFor(100, 157, p),
    face: anchorFor(100, 126, p),
    head: anchorFor(100, headY, p, 0.95),
  }
}

interface FigureProps {
  colour: string
  posture: Posture
  droop: [number, number]
  /** Mood used for tinting; the face is set separately by `expression`. */
  mood: Mood
  expression: Expression
  /** Eye and mouth rows in idle space (idle is 126 / 145). */
  eyeY: number
  mouthY: number
  shadowRx?: number
  /** Arms and feet drawn behind the body. */
  behind: ReactNode
  /** Paws drawn on top of the body. */
  front?: ReactNode
  smudges?: [number, number][]
  /** Drawn last, outside the posture (sparkles, z's). */
  extras?: ReactNode
}

function feet(fill: string, spread = 22) {
  return (
    <>
      <Nub cx={100 - spread} cy={178} rx={16} ry={9} fill={fill} />
      <Nub cx={100 + spread} cy={178} rx={16} ry={9} fill={fill} />
    </>
  )
}

function figure(props: FigureProps) {
  const { colour, posture, droop, mood, expression, eyeY, mouthY, shadowRx = 56, behind, front, smudges, extras } = props
  const tint = EAR_TINT[mood] ?? 0
  const ey = squashY(eyeY, posture)
  const my = squashY(mouthY, posture)
  const cy = squashY(mouthY - 2, posture)
  return (
    <g stroke={ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round" strokeLinecap="round">
      <Shadow rx={shadowRx} />
      <g transform={figureTransform(posture)}>
        <g transform={`translate(100 ${GROUND}) scale(${posture.sx} ${posture.sy}) translate(-100 ${-GROUND})`}>
          {ear(droop[0], colour, tint)}
          <g transform="translate(200 0) scale(-1 1)">{ear(droop[1], colour, tint)}</g>
          {behind}
          <Body d={BODY} colour={colour} highlight={HIGHLIGHT} />
          <MoodTint d={BODY} mood={mood} smudges={smudges ?? [[66, 160], [134, 118], [126, 168]]} />
          {front}
        </g>
        <Cheeks y={cy} spread={36} />
        <Face mood={expression} eyeY={ey} mouthY={my} />
        <path d="M95.5 134.5 h9 l-4.5 4.5 Z" fill={PALETTE.blush} strokeWidth={2.5} transform={`translate(0 ${squashY(134.5, posture) - 134.5})`} />
      </g>
      {extras}
    </g>
  )
}

// content: relaxed, a soft lean, paws resting on the belly.
const CONTENT: Posture = { sx: 1.02, sy: 0.97, tilt: 3, dy: 0 }

const bunContent: Pose = {
  id: 'bun-content',
  renderBody: (colour) =>
    figure({
      colour,
      posture: CONTENT,
      droop: [12, 20],
      mood: 'content',
      expression: 'content',
      eyeY: 127,
      mouthY: 146,
      behind: feet(colour),
      front: (
        <>
          <Nub cx={90} cy={167} rx={10} ry={7} rotate={14} fill={colour} />
          <Nub cx={110} cy={167} rx={10} ry={7} rotate={-14} fill={colour} />
        </>
      ),
    }),
  anchors: anchorsFor(CONTENT, 93),
}

// meh: a little slumped, arms hanging, one ear flopped.
const MEH: Posture = { sx: 1.04, sy: 0.95, tilt: -4, dy: 0 }

const bunMeh: Pose = {
  id: 'bun-meh',
  renderBody: (colour) =>
    figure({
      colour,
      posture: MEH,
      droop: [12, 80],
      mood: 'meh',
      expression: 'meh',
      eyeY: 130,
      mouthY: 148,
      behind: (
        <>
          {feet(colour)}
          <Nub cx={47} cy={158} rx={10} ry={14} rotate={-6} fill={colour} />
          <Nub cx={153} cy={160} rx={10} ry={14} rotate={6} fill={colour} />
        </>
      ),
    }),
  anchors: anchorsFor(MEH, 95),
}

// scruffy: sagging, ears drooping, tired and tinted.
const SCRUFFY: Posture = { sx: 1.07, sy: 0.91, tilt: 5, dy: 0 }

const bunScruffy: Pose = {
  id: 'bun-scruffy',
  renderBody: (colour) =>
    figure({
      colour,
      posture: SCRUFFY,
      droop: [116, 116],
      mood: 'scruffy',
      expression: 'scruffy',
      eyeY: 133,
      mouthY: 151,
      shadowRx: 60,
      behind: (
        <>
          {feet(colour, 26)}
          <Nub cx={46} cy={164} rx={10} ry={13} rotate={-4} fill={colour} />
          <Nub cx={154} cy={164} rx={10} ry={13} rotate={4} fill={colour} />
        </>
      ),
      smudges: [[64, 158], [136, 126], [124, 170]],
    }),
  anchors: anchorsFor(SCRUFFY, 96),
}

/** A drawn Z: three strokes, no text. `s` is its size. */
function zed(x: number, y: number, s: number, rotate = 0) {
  return (
    <path
      d={`M${-s} ${-s} H${s} L${-s} ${s} H${s}`}
      fill="none"
      transform={`translate(${x} ${y}) rotate(${rotate})`}
      strokeWidth={3.5}
    />
  )
}

// sleeping: settled low and wide, ears relaxed down, tucked paws, drifting z's.
const SLEEPING: Posture = { sx: 1.04, sy: 0.88, tilt: 6, dy: 0 }

const bunSleeping: Pose = {
  id: 'bun-sleeping',
  renderBody: (colour) =>
    figure({
      colour,
      posture: SLEEPING,
      droop: [120, 120],
      mood: 'content',
      expression: 'sleeping',
      eyeY: 129,
      mouthY: 148,
      shadowRx: 62,
      behind: feet(colour, 26),
      front: (
        <>
          <Nub cx={70} cy={163} rx={11} ry={9} rotate={-15} fill={colour} />
          <Nub cx={130} cy={163} rx={11} ry={9} rotate={15} fill={colour} />
        </>
      ),
      extras: (
        <>
          {zed(150, 70, 9, 8)}
          {zed(168, 44, 6, 8)}
        </>
      ),
    }),
  anchors: anchorsFor(SLEEPING, 95),
}

// cheering: arms up, ears fully perked, a little hop with a smaller shadow.
const CHEERING: Posture = { sx: 0.98, sy: 1, tilt: 0, dy: -13 }

function sparkle(x: number, y: number, s: number) {
  return <path d={`M${x} ${y - s} V${y + s} M${x - s} ${y} H${x + s}`} fill="none" strokeWidth={3.5} />
}

const bunCheering: Pose = {
  id: 'bun-cheering',
  renderBody: (colour) =>
    figure({
      colour,
      posture: CHEERING,
      droop: [2, 2],
      mood: 'happy',
      expression: 'cheering',
      eyeY: 125,
      mouthY: 145,
      shadowRx: 40,
      behind: (
        <>
          <Nub cx={39} cy={113} rx={10} ry={17} rotate={-28} fill={colour} />
          <Nub cx={161} cy={113} rx={10} ry={17} rotate={28} fill={colour} />
          <Nub cx={80} cy={176} rx={14} ry={9} rotate={-8} fill={colour} />
          <Nub cx={120} cy={176} rx={14} ry={9} rotate={8} fill={colour} />
        </>
      ),
      extras: (
        <>
          {sparkle(22, 70, 7)}
          {sparkle(178, 52, 8)}
        </>
      ),
    }),
  anchors: anchorsFor(CHEERING, 92),
}

// sick: propped up in a little bed under a blanket, thermometer in mouth, ice
// pack on the head, ears flopped over the pillow.
const SICK_SCALE = 0.86
const SICK_BOTTOM = 168
/** Idle space -> sick-bed space. */
const sickY = (y: number) => SICK_BOTTOM - (GROUND - y) * SICK_SCALE

const bunSick: Pose = {
  id: 'bun-sick',
  renderBody: (colour) => (
    <g stroke={ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round" strokeLinecap="round">
      <Shadow rx={80} />
      <SickBedBack />
      {/* Bun, shrunk into the bed */}
      <g transform={`translate(100 ${SICK_BOTTOM}) scale(${SICK_SCALE}) translate(-100 ${-GROUND})`}>
        {ear(128, colour, 0.32)}
        <g transform="translate(200 0) scale(-1 1)">{ear(128, colour, 0.32)}</g>
        <Body d={BODY} colour={colour} highlight={HIGHLIGHT} />
        <MoodTint d={BODY} mood="sick" smudges={[[62, 128], [140, 116], [118, 104]]} />
      </g>
      <Cheeks y={sickY(143)} spread={31} />
      <Face mood="sick" eyeY={sickY(126)} mouthY={sickY(145)} />
      <path d="M95.5 134.5 h9 l-4.5 4.5 Z" fill={PALETTE.blush} strokeWidth={2.5} transform={`translate(0 ${sickY(134.5) - 134.5})`} />
      <IcePack x={100} y={86} rotate={-8} />
      <SickBedFront />
      <Nub cx={54} cy={151} rx={11} ry={8} rotate={-10} fill={colour} />
      <Nub cx={152} cy={152} rx={11} ry={8} rotate={10} fill={colour} />
      <Thermometer x={103} y={139} rotate={18} />
    </g>
  ),
  anchors: {
    back: { x: 100, y: 120 },
    body: { x: 100, y: 130 },
    outfit: { x: 100, y: 150 },
    neck: { x: 100, y: 146 },
    face: { x: 100, y: sickY(126) },
    head: { x: 100, y: sickY(92), scale: 0.85 },
  },
}

export const bunPoses: MoodPoses = {
  content: bunContent,
  meh: bunMeh,
  scruffy: bunScruffy,
  sick: bunSick,
  sleeping: bunSleeping,
  cheering: bunCheering,
}
