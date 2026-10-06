import type { ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../../art/palette'
import type { Mood } from '../../domain/types'
import type { MoodPoses } from '../poses'
import type { Anchor, Pose } from '../slots'
import { Body, Cheeks, Face, IcePack, MoodTint, Nub, Shadow, SickBedBack, SickBedFront, Thermometer, type Expression } from '../parts'
import { BODY, HIGHLIGHT, WILT, sproutIdle, stemAndLeaves } from './sprout'

// Sprout mood poses (Phase 0 batch A). Leaves do the mood work: they sway when
// content, droop when meh, wilt when scruffy, fold up for sleep and fly wide
// when cheering. Missing entries fall back to the idle pose.

const PIVOT = { x: 100, y: 181 }

/** Whole-body transform about the feet: squash/stretch, tilt, then shift. */
interface Tf {
  dx?: number
  dy?: number
  rotate?: number
  sx?: number
  sy?: number
}

function tfString({ dx = 0, dy = 0, rotate = 0, sx = 1, sy = 1 }: Tf) {
  const { x, y } = PIVOT
  return `translate(${dx} ${dy}) rotate(${rotate} ${x} ${y}) translate(${x} ${y}) scale(${sx} ${sy}) translate(${-x} ${-y})`
}

/** The same transform applied to an anchor point, so items follow the body. */
function follow(a: Anchor, { dx = 0, dy = 0, rotate = 0, sx = 1, sy = 1 }: Tf): Anchor {
  const px = PIVOT.x + (a.x - PIVOT.x) * sx
  const py = PIVOT.y + (a.y - PIVOT.y) * sy
  const r = (rotate * Math.PI) / 180
  const vx = px - PIVOT.x
  const vy = py - PIVOT.y
  return {
    x: round(PIVOT.x + vx * Math.cos(r) - vy * Math.sin(r) + dx),
    y: round(PIVOT.y + vx * Math.sin(r) + vy * Math.cos(r) + dy),
    scale: round((a.scale ?? 1) * Math.sqrt(sx * sy)),
    rotate: round((a.rotate ?? 0) + rotate),
  }
}

const round = (n: number) => Math.round(n * 10) / 10

const IDLE_ANCHORS = sproutIdle.anchors
function anchorsFor(tf: Tf): Pose['anchors'] {
  return {
    back: follow(IDLE_ANCHORS.back, tf),
    body: follow(IDLE_ANCHORS.body, tf),
    outfit: follow(IDLE_ANCHORS.outfit, tf),
    neck: follow(IDLE_ANCHORS.neck, tf),
    face: follow(IDLE_ANCHORS.face, tf),
    head: follow(IDLE_ANCHORS.head, tf),
  }
}

interface Arms {
  /** Horizontal distance of each arm nub from the centre line. */
  dx: number
  cy: number
  ry: number
  /** Tilt in degrees; positive swings the tips outward. */
  rot: number
}

interface BodyProps {
  colour: string
  face: Expression
  /** Mood whose tint (if any) goes over the body. */
  tint?: Mood
  tf?: Tf
  wilt: number
  wiltRight?: number
  bend?: { x: number; y: number }
  arms: Arms
}

/** The Sprout figure: stem, leaves, feet, arms, body, tint and face. */
function figure({ colour, face, tint, tf = {}, wilt, wiltRight, bend, arms }: BodyProps) {
  return (
    <g transform={tfString(tf)}>
      {stemAndLeaves(wilt, wiltRight, bend)}
      <Nub cx={78} cy={178} rx={15} ry={9} fill={colour} />
      <Nub cx={122} cy={178} rx={15} ry={9} fill={colour} />
      <Nub cx={100 - arms.dx} cy={arms.cy} rx={10} ry={arms.ry} rotate={-arms.rot} fill={colour} />
      <Nub cx={100 + arms.dx} cy={arms.cy} rx={10} ry={arms.ry} rotate={arms.rot} fill={colour} />
      <Body d={BODY} colour={colour} highlight={HIGHLIGHT} />
      {tint && <MoodTint d={BODY} mood={tint} smudges={[[64, 160], [132, 108], [130, 166]]} />}
      <Cheeks y={142} spread={36} />
      <Face mood={face} eyeY={126} mouthY={140} />
    </g>
  )
}

function outlined(children: ReactNode) {
  return (
    <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </g>
  )
}

// content: a relaxed, soft lean with the leaves swaying unevenly.
const CONTENT_TF: Tf = { rotate: 3, sy: 0.98, sx: 1.01 }
const content: Pose = {
  id: 'sprout-content',
  renderBody: (colour, mood) => (
    outlined(
    <>
      <Shadow rx={58} />
      {figure({
        colour,
        face: 'content',
        tint: mood,
        tf: CONTENT_TF,
        wilt: WILT.content - 4,
        wiltRight: WILT.content + 8,
        bend: { x: 2, y: 1 },
        arms: { dx: 53, cy: 150, ry: 13, rot: 16 },
      })}
    </>,
  )
  ),
  anchors: anchorsFor(CONTENT_TF),
}

// meh: a little slumped, arms hanging, leaves drooping.
const MEH_TF: Tf = { rotate: -3, sy: 0.96, sx: 1.02 }
const meh: Pose = {
  id: 'sprout-meh',
  renderBody: (colour, mood) => (
    outlined(
    <>
      <Shadow rx={60} />
      {figure({
        colour,
        face: 'meh',
        tint: mood,
        tf: MEH_TF,
        wilt: WILT.meh + 4,
        wiltRight: WILT.meh + 10,
        bend: { x: -3, y: 3 },
        arms: { dx: 52, cy: 157, ry: 13, rot: 6 },
      })}
    </>,
  )
  ),
  anchors: anchorsFor(MEH_TF),
}

// scruffy: more slumped, stem bent over, leaves wilted. Tired, not cross.
const SCRUFFY_TF: Tf = { rotate: -5, sy: 0.92, sx: 1.04 }
const scruffy: Pose = {
  id: 'sprout-scruffy',
  renderBody: (colour, mood) => (
    outlined(
    <>
      <Shadow rx={62} />
      {figure({
        colour,
        face: 'scruffy',
        tint: mood,
        tf: SCRUFFY_TF,
        wilt: WILT.scruffy + 8,
        wiltRight: WILT.scruffy + 14,
        bend: { x: -6, y: 0 },
        arms: { dx: 53, cy: 160, ry: 12, rot: 2 },
      })}
    </>,
  )
  ),
  anchors: anchorsFor(SCRUFFY_TF),
}

// sleeping: settled low and wide, leaves folded up like a plant at night.
const SLEEP_TF: Tf = { rotate: 2, sy: 0.93, sx: 1.04 }

/** A drawn "z" for the sleep indicator. */
function zed(x: number, y: number, s: number, rotate: number) {
  return (
    <path
      d="M-7 -8 h14 l-14 16 h14"
      fill="none"
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`}
      strokeWidth={3.5 / s}
    />
  )
}

const sleeping: Pose = {
  id: 'sprout-sleeping',
  renderBody: (colour) => (
    outlined(
    <>
      <Shadow rx={62} />
      {figure({
        colour,
        face: 'sleeping',
        tf: SLEEP_TF,
        wilt: -50,
        bend: { x: 4, y: 3 },
        arms: { dx: 53, cy: 156, ry: 12, rot: 8 },
      })}
      {zed(152, 62, 1.1, 8)}
      {zed(170, 38, 0.75, 8)}
    </>,
  )
  ),
  anchors: anchorsFor(SLEEP_TF),
}

// cheering: arms up, leaves spread and perky, a little hop off the ground.
const CHEER_TF: Tf = { dy: -11, sx: 0.98, sy: 1.03 }
const cheering: Pose = {
  id: 'sprout-cheering',
  renderBody: (colour) => (
    outlined(
    <>
      <Shadow rx={44} />
      {figure({
        colour,
        face: 'cheering',
        tf: CHEER_TF,
        wilt: -22,
        wiltRight: -14,
        arms: { dx: 55, cy: 112, ry: 15, rot: 32 },
      })}
      <g fill="none" strokeWidth={3}>
        <path d="M70 187 l-6 5" />
        <path d="M100 191 v7" />
        <path d="M130 187 l6 5" />
      </g>
    </>,
  )
  ),
  anchors: anchorsFor(CHEER_TF),
}

// sick: propped up in a little bed under a blue blanket, thermometer in mouth,
// ice pack on the head, leaves limp. Cosy and recoverable.
const SICK_TF: Tf = { dy: -18, sx: 0.8, sy: 0.8 }
/** Idle y -> y inside the sick bed (the scale and lift of SICK_TF). */
const sickY = (y: number) => PIVOT.y - (PIVOT.y - y) * 0.8 - 18
const sick: Pose = {
  id: 'sprout-sick',
  renderBody: (colour) => (
    outlined(
    <>
      <Shadow rx={78} />
      <SickBedBack />
      <g transform={tfString(SICK_TF)} strokeWidth={CHARACTER_STROKE / 0.8}>
        {stemAndLeaves(WILT.sick + 8, WILT.sick + 16, { x: 0, y: -8 })}
        <Body d={BODY} colour={colour} highlight={HIGHLIGHT} />
        <MoodTint d={BODY} mood="sick" smudges={[[64, 160], [132, 108], [130, 166]]} />
      </g>
      {/* face drawn at full size in final coordinates so its strokes match the other poses */}
      <Cheeks y={sickY(142)} spread={32} />
      <Face mood="sick" eyeY={sickY(126)} mouthY={sickY(140)} />
      <IcePack x={112} y={92} rotate={14} />
      <SickBedFront />
      <Nub cx={56} cy={151} rx={10} ry={8} rotate={-15} fill={colour} />
      <Nub cx={144} cy={151} rx={10} ry={8} rotate={15} fill={colour} />
      <Thermometer x={104} y={131} rotate={12} />
    </>,
  )
  ),
  // The face is drawn full size in the bed (see sickY), so face items keep full size too.
  // Tucked in bed: the outfit, backpack and scarf or bow tie are under the covers.
  hides: ['outfit', 'back', 'neck'],
  anchors: { ...anchorsFor(SICK_TF), face: { x: 100, y: sickY(126), scale: 1 } },
}

export const sproutPoses: MoodPoses = { content, meh, scruffy, sick, sleeping, cheering }
