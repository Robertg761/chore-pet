import type { ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../../art/palette'
import type { Mood } from '../../domain/types'
import type { MoodPoses } from '../poses'
import type { Anchor, Pose } from '../slots'
import { Cheeks, Face, MoodTint, Nub, Shadow, type Expression } from '../parts'
import { BODY, WILT, sproutIdle, stemAndLeaves } from './sprout'

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
      <path d={BODY} fill={colour} />
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
const { white, cream, creamDark, woodDark, fabricBlue, sky, warmRed } = PALETTE

function bed() {
  return (
    <>
      {/* headboard and pillow sit behind the pet */}
      <path d="M24 176 V98 C24 84 36 82 50 82 H150 C164 82 176 84 176 98 V176 Z" fill={woodDark} />
      <rect x={52} y={92} width={96} height={40} rx={16} fill={cream} />
      <path d="M62 110 q38 8 76 0" fill="none" stroke={creamDark} strokeWidth={3} />
    </>
  )
}

function bedFront(colour: string) {
  return (
    <>
      <path d="M26 160 C26 142 60 140 100 144 C140 140 174 142 174 160 V176 H26 Z" fill={fabricBlue} />
            <path d="M30 153 C60 145 140 145 170 153 L172 162 C140 154 60 154 28 162 Z" fill={cream} />
      <path d="M44 168 q10 -6 20 0 M92 170 q10 -6 20 0 M138 167 q10 -6 20 0" fill="none" stroke={white} strokeWidth={2.5} opacity={0.7} />
      {/* hands rest on the blanket edge */}
      <Nub cx={68} cy={147} rx={9} ry={7} rotate={-15} fill={colour} />
      <Nub cx={132} cy={147} rx={9} ry={7} rotate={15} fill={colour} />
      {/* footboard with stubby legs */}
      <rect x={20} y={170} width={160} height={12} rx={6} fill={woodDark} />
    </>
  )
}

function thermometer() {
  return (
    <g>
      <path d="M104 132 L134 123" strokeWidth={8} fill="none" />
      <path d="M104 132 L134 123" stroke={white} strokeWidth={3.5} fill="none" />
      <path d="M118 127.8 L131.5 123.8" stroke={warmRed} strokeWidth={3.5} fill="none" />
      <circle cx={137} cy={122} r={5} fill={warmRed} />
    </g>
  )
}

function icePack() {
  return (
    <g transform="translate(112 86) rotate(14)">
      <rect x={-17} y={-11} width={34} height={22} rx={8} fill={sky} />
      <path d="M-10 -5 h20 M-10 5 h20" fill="none" stroke={white} strokeWidth={2.5} strokeDasharray="1 5" />
    </g>
  )
}

const sick: Pose = {
  id: 'sprout-sick',
  renderBody: (colour, mood) => (
    outlined(
    <>
      <Shadow rx={78} />
      {bed()}
      <g transform={tfString(SICK_TF)} strokeWidth={CHARACTER_STROKE / 0.8}>
        {stemAndLeaves(WILT.sick + 8, WILT.sick + 16, { x: 0, y: -8 })}
        <path d={BODY} fill={colour} />
        <MoodTint d={BODY} mood={mood} smudges={[[64, 160], [132, 108], [130, 166]]} />
        <Cheeks y={142} spread={36} />
        <Face mood="sick" eyeY={126} mouthY={140} />
      </g>
      {bedFront(colour)}
      {thermometer()}
      {icePack()}
    </>,
  )
  ),
  anchors: anchorsFor(SICK_TF),
}

export const sproutPoses: MoodPoses = { content, meh, scruffy, sick, sleeping, cheering }
