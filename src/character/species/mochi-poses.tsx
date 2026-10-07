import { PALETTE } from '../../art/palette'
import { CheerMarks } from '../accent'
import { Ink } from '../ink'
import type { Mood } from '../../domain/types'
import type { MoodPoses } from '../poses'
import { Body, Cheeks, Face, IcePack, MoodTint, Nub, Shadow, SickBedBack, SickBedFront, Thermometer } from '../parts'
import type { Anchor, Pose } from '../slots'
import { BODY, HIGHLIGHT, mochiKnot, mochiPleats } from './mochi'

// Mochi mood poses (Phase 0 batch A). Each reuses the idle dumpling, squashed,
// leaned or lifted around the ground point, so they stay one family.

const { ink } = PALETTE

const GROUND_Y = 181
const IDLE_ANCHORS = {
  back: { x: 100, y: 132 },
  body: { x: 100, y: 132 },
  outfit: { x: 100, y: 160 },
  neck: { x: 100, y: 152 },
  face: { x: 100, y: 124 },
  head: { x: 100, y: 78 },
}

interface Shape {
  sx?: number // horizontal squash about the ground point
  sy?: number // vertical squash about the ground point
  rotate?: number // lean in degrees, about the ground point
  lift?: number // hop height
}

function transformOf({ sx = 1, sy = 1, rotate = 0, lift = 0 }: Shape) {
  return `translate(0 ${-lift}) rotate(${rotate} 100 ${GROUND_Y}) translate(100 ${GROUND_Y}) scale(${sx} ${sy}) translate(-100 -${GROUND_Y})`
}

/** The body outline after the pose's squash, lean and lift (outfits are clipped to it). */
const silhouetteFor = (shape: Shape) => ({ d: BODY, transform: transformOf(shape) })

/** Maps an idle anchor through the same squash, lean and lift as the drawing. */
function moved(a: Anchor, { sx = 1, sy = 1, rotate = 0, lift = 0 }: Shape): Anchor {
  const dx = (a.x - 100) * sx
  const dy = (a.y - GROUND_Y) * sy
  const r = (rotate * Math.PI) / 180
  const x = 100 + dx * Math.cos(r) - dy * Math.sin(r)
  const y = GROUND_Y + dx * Math.sin(r) + dy * Math.cos(r) - lift
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, rotate, ...(a.scale !== undefined && { scale: a.scale }) }
}

function anchorsFor(shape: Shape): Pose['anchors'] {
  return {
    back: moved(IDLE_ANCHORS.back, shape),
    body: moved(IDLE_ANCHORS.body, shape),
    outfit: moved(IDLE_ANCHORS.outfit, shape),
    neck: moved(IDLE_ANCHORS.neck, shape),
    face: moved(IDLE_ANCHORS.face, shape),
    head: moved(IDLE_ANCHORS.head, shape),
  }
}

// Pinch variants: upright (idle), a little bent, and drooped over.
const KNOT_BENT = 16
const KNOT_DROOP = 38

interface ArmSpec {
  cx: number
  cy: number
  rx?: number
  ry?: number
  rotate: number
}

interface FigureProps {
  colour: string
  tintMood: Mood
  faceMood: Parameters<typeof Face>[0]['mood']
  shape: Shape
  arms: [ArmSpec, ArmSpec]
  feet?: [number, number] // x of each foot
  /** How far the knot on top flops over, in degrees. */
  knotTilt?: number
  eyeY?: number
  mouthY?: number
  cheekY?: number
  smudges?: [number, number][]
  shadowRx?: number
}

/** The idle dumpling drawn through a squash/lean/lift transform. */
function figure({
  colour,
  tintMood,
  faceMood,
  shape,
  arms,
  feet = [74, 126],
  knotTilt = 0,
  eyeY = 124,
  mouthY = 138,
  cheekY = 140,
  smudges = [[58, 158], [140, 112], [128, 166]],
  shadowRx = 62,
}: FigureProps) {
  return (
    <Ink>
      <Shadow rx={shadowRx} />
      <g transform={transformOf(shape)}>
        <Nub cx={feet[0]} cy={178} rx={15} ry={9} fill={colour} />
        <Nub cx={feet[1]} cy={178} rx={15} ry={9} fill={colour} />
        {arms.map((a, i) => (
          <Nub key={i} cx={a.cx} cy={a.cy} rx={a.rx ?? 11} ry={a.ry ?? 14} rotate={a.rotate} fill={colour} />
        ))}
        {mochiKnot(colour, knotTilt)}
        <Body d={BODY} colour={colour} highlight={HIGHLIGHT} />
        {mochiPleats()}
        <MoodTint d={BODY} mood={tintMood} colour={colour} smudges={smudges} />
        <Cheeks y={cheekY} spread={40} />
        <Face mood={faceMood} eyeY={eyeY} mouthY={mouthY} />
      </g>
    </Ink>
  )
}

// ---- content: relaxed, a soft lean, arms resting low.

const CONTENT: Shape = { sx: 1.02, sy: 0.98, rotate: 3 }

const mochiContent: Pose = {
  id: 'mochi-content',
  renderBody: (colour, mood) => (
    figure({
      colour,
      tintMood: mood,
      faceMood: 'content',
      shape: CONTENT,
      arms: [
        { cx: 37, cy: 150, rotate: -10 },
        { cx: 163, cy: 150, rotate: 10 },
      ],
      knotTilt: KNOT_BENT,
    })
  ),
  silhouette: silhouetteFor(CONTENT),
  anchors: anchorsFor(CONTENT),
}

// ---- meh: slumped and squashed, arms hanging.

const MEH: Shape = { sx: 1.05, sy: 0.93, rotate: -2 }

const mochiMeh: Pose = {
  id: 'mochi-meh',
  renderBody: (colour, mood) => (
    figure({
      colour,
      tintMood: mood,
      faceMood: 'meh',
      shape: MEH,
      arms: [
        { cx: 36, cy: 156, rotate: -4 },
        { cx: 164, cy: 156, rotate: 4 },
      ],
      feet: [70, 130],
      knotTilt: KNOT_BENT,
      shadowRx: 66,
    })
  ),
  silhouette: silhouetteFor(MEH),
  anchors: anchorsFor(MEH),
}

// ---- scruffy: deflated, tired, a bit lopsided.

const SCRUFFY: Shape = { sx: 1.09, sy: 0.88, rotate: -4 }

const mochiScruffy: Pose = {
  id: 'mochi-scruffy',
  renderBody: (colour, mood) => (
    figure({
      colour,
      tintMood: mood,
      faceMood: 'scruffy',
      shape: SCRUFFY,
      arms: [
        { cx: 35, cy: 160, rotate: 2, ry: 13 },
        { cx: 165, cy: 160, rotate: -2, ry: 13 },
      ],
      feet: [68, 132],
      knotTilt: KNOT_DROOP,
      eyeY: 128,
      mouthY: 142,
      cheekY: 144,
      shadowRx: 70,
    })
  ),
  silhouette: silhouetteFor(SCRUFFY),
  anchors: anchorsFor(SCRUFFY),
}

// ---- sleeping: settled low and wide, eyes shut, drawn z's.

const SLEEPING: Shape = { sx: 1.07, sy: 0.88, rotate: 4 }

/** A z drawn as a single stroke, scaled by `s`, top-left at (x, y). */
function z(x: number, y: number, s: number) {
  return (
    <path
      d={`M${x} ${y} h${10 * s} l${-10 * s} ${12 * s} h${10 * s}`}
      fill="none"
      stroke={ink}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

const mochiSleeping: Pose = {
  id: 'mochi-sleeping',
  renderBody: (colour) => (
    <g>
      {figure({
        colour,
        tintMood: 'happy',
        faceMood: 'sleeping',
        shape: SLEEPING,
        arms: [
          { cx: 35, cy: 160, rotate: 5, ry: 13 },
          { cx: 165, cy: 160, rotate: -5, ry: 13 },
        ],
        feet: [70, 130],
        knotTilt: KNOT_DROOP,
        eyeY: 128,
        mouthY: 142,
        cheekY: 144,
        shadowRx: 68,
      })}
      {z(146, 62, 0.8)}
      {z(158, 42, 1.1)}
      {z(170, 18, 1.4)}
    </g>
  ),
  silhouette: silhouetteFor(SLEEPING),
  anchors: anchorsFor(SLEEPING),
}

// ---- cheering: arms up, a little hop, smaller shadow.

const CHEERING: Shape = { sx: 0.97, sy: 1.04, lift: 14 }

const mochiCheering: Pose = {
  id: 'mochi-cheering',
  renderBody: (colour) => (
    <g>
      {figure({
        colour,
        tintMood: 'happy',
        faceMood: 'cheering',
        shape: CHEERING,
        arms: [
          { cx: 32, cy: 100, rx: 12, ry: 16, rotate: -35 },
          { cx: 168, cy: 100, rx: 12, ry: 16, rotate: 35 },
        ],
        feet: [78, 122],
        shadowRx: 46,
      })}
      <CheerMarks heart={[26, 54, 22]} star={[176, 42, 20]} />
    </g>
  ),
  silhouette: silhouetteFor(CHEERING),
  anchors: anchorsFor(CHEERING),
}

// ---- sick: propped up in a little bed, blanket, thermometer, ice pack.

// The pet shrinks a touch so the bed reads around it; the face is drawn at full
// size in final coordinates so eyes and strokes match the other poses.
const SICK_SCALE = 0.86
const SICK: Shape = { sx: SICK_SCALE, sy: SICK_SCALE, rotate: -3, lift: 6 }
const sickAnchors = anchorsFor(SICK)

const mochiSick: Pose = {
  id: 'mochi-sick',
  renderBody: (colour) => (
    <Ink>
      <Shadow rx={84} />
      <SickBedBack />
      {/* Mochi, propped up on the pillow */}
      <Ink k={1 / SICK_SCALE} transform={transformOf(SICK)}>
        {mochiKnot(colour, KNOT_DROOP)}
        <Body d={BODY} colour={colour} highlight={HIGHLIGHT} />
        {mochiPleats(3 / SICK_SCALE)}
        <MoodTint d={BODY} mood="sick" colour={colour} smudges={[[54, 126], [142, 108], [128, 140]]} />
      </Ink>
      <g transform="rotate(-3 100 132)">
        <Cheeks y={139} spread={34} />
        <Face mood="sick" eyeY={126} mouthY={138} />
      </g>
      <IcePack x={62} y={100} rotate={-24} />
      <SickBedFront />
      <Nub cx={54} cy={153} rx={12} ry={9} rotate={-15} fill={colour} />
      <Nub cx={150} cy={153} rx={12} ry={9} rotate={15} fill={colour} />
      <Thermometer x={101} y={138} rotate={12} />
    </Ink>
  ),
  // Tucked in bed: the outfit, backpack and scarf or bow tie are under the covers.
  hides: ['outfit', 'back', 'neck'],
  silhouette: silhouetteFor(SICK),
  anchors: { ...sickAnchors, head: { x: sickAnchors.head.x + 8, y: sickAnchors.head.y, scale: 0.88, rotate: 8 } },
}

export const mochiPoses: MoodPoses = {
  content: mochiContent,
  meh: mochiMeh,
  scruffy: mochiScruffy,
  sick: mochiSick,
  sleeping: mochiSleeping,
  cheering: mochiCheering,
}
