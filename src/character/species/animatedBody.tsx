import type { ReactNode } from 'react'
import { PALETTE } from '../../art/palette'
import type { Species } from '../../domain/types'
import { Ink, Tube } from '../ink'
import { eyeCentreOffset } from '../eyeGeometry'
import type { MotionFrame } from '../motion'
import { Body, Cheeks, Face, MoodTint, Nub } from '../parts'
import { poseFor, type PoseName } from '../poses'
import type { Pose } from '../slots'
import { BODY as BUN_BODY, HIGHLIGHT as BUN_LIGHT, EAR_DROOP, ear } from './bun'
import { BODY as MOCHI_BODY, HIGHLIGHT as MOCHI_LIGHT, mochiKnot, mochiPleats } from './mochi'
import { BODY as SPROUT_BODY, HIGHLIGHT as SPROUT_LIGHT, STEM_TOP, WILT, leaves } from './sprout'

/** All geometry, clips, and anchors stay in local pose space under one torso matrix. */
const RIG = {
  bun: { d: BUN_BODY, light: BUN_LIGHT, feet: [78, 122], footRx: 16, arms: [48, 152], armY: 148, armTilt: 20, eyeY: 126, mouthY: 145, cheekY: 143, spread: 36, smudges: [[66, 160], [134, 118], [126, 168]] },
  mochi: { d: MOCHI_BODY, light: MOCHI_LIGHT, feet: [74, 126], footRx: 15, arms: [37, 163], armY: 152, armTilt: 10, eyeY: 124, mouthY: 138, cheekY: 140, spread: 40, smudges: [[58, 158], [140, 112], [128, 166]] },
  sprout: { d: SPROUT_BODY, light: SPROUT_LIGHT, feet: [78, 122], footRx: 15, arms: [46, 154], armY: 148, armTilt: 20, eyeY: 126, mouthY: 140, cheekY: 142, spread: 36, smudges: [[64, 160], [132, 108], [130, 166]] },
} satisfies Record<Species, { d: string; light: [number, number]; feet: [number, number]; footRx: number; arms: [number, number]; armY: number; armTilt: number; eyeY: number; mouthY: number; cheekY: number; spread: number; smudges: [number, number][] }>

// Existing mood posture constants, retained independently of the reaction expression.
const POSTURE = {
  bun: { idle: [1, 1, 0], content: [1.02, 0.97, 3], meh: [1.04, 0.95, -4], scruffy: [1.07, 0.91, 5] },
  mochi: { idle: [1, 1, 0], content: [1.02, 0.98, 3], meh: [1.05, 0.93, -2], scruffy: [1.09, 0.88, -4] },
  sprout: { idle: [1, 1, 0], content: [1.01, 0.98, 3], meh: [1.02, 0.96, -3], scruffy: [1.04, 0.92, -5] },
} as const

type UprightPose = keyof typeof POSTURE.bun

/** Guard the SVG boundary as well as the sampler; no invalid or singular matrices. */
export function finiteMotionFrame(frame: MotionFrame): MotionFrame {
  const n = (value: number, fallback = 0, min = -90, max = 90) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
  return {
    bodyX: n(frame.bodyX, 0, -24, 24), bodyY: n(frame.bodyY, 0, -24, 24),
    scaleX: n(frame.scaleX, 1, 0.85, 1.15), scaleY: n(frame.scaleY, 1, 0.85, 1.15), lean: n(frame.lean),
    leftFoot: n(frame.leftFoot, 0, 0, 24), rightFoot: n(frame.rightFoot, 0, 0, 24),
    leftGroundX: n(frame.leftGroundX ?? 0, 0, -48, 48), leftGroundY: n(frame.leftGroundY ?? 0, 0, -48, 48),
    rightGroundX: n(frame.rightGroundX ?? 0, 0, -48, 48), rightGroundY: n(frame.rightGroundY ?? 0, 0, -48, 48),
    leftArm: n(frame.leftArm), rightArm: n(frame.rightArm), leftAppendage: n(frame.leftAppendage), rightAppendage: n(frame.rightAppendage),
    gazeX: n(frame.gazeX, 0, -4, 4), gazeY: n(frame.gazeY, 0, -4, 4),
    eyeOpen: n(frame.eyeOpen ?? 1, 1, 0, 1),
    shadowScale: n(frame.shadowScale, 1, 0, 1.5), shadowOpacity: n(frame.shadowOpacity, 1, 0, 1), accentOpacity: n(frame.accentOpacity, 0, 0, 1),
    expression: frame.expression === 'pleased' || frame.expression === 'alert' ? frame.expression : 'mood',
  }
}

function torso(species: Species, frame: MotionFrame, pose: PoseName) {
  const [sx, sy, tilt] = POSTURE[species][pose in POSTURE[species] ? pose as UprightPose : 'idle']
  return { sx: sx * frame.scaleX, sy: sy * frame.scaleY, tilt: tilt + frame.lean }
}

function articulatedEyeY(species: Species, poseName: PoseName): number {
  return species === 'bun' ? ({ idle: 126, content: 127, meh: 130, scruffy: 133 }[poseName as UprightPose] ?? 125)
    : species === 'mochi' && poseName === 'scruffy' ? 128 : RIG[species].eyeY
}

/** Invert the rendered torso: target is in unmirrored character-container space,
 * result is a vector from the unshifted eye centre in local face coordinates. */
export function articulatedFaceDelta(species: Species, input: MotionFrame, pose: PoseName, target: { x: number; y: number }): { x: number; y: number } {
  if (pose === 'sick' || pose === 'sleeping') {
    const face = poseFor(species, pose).anchors.face
    return { x: target.x - face.x, y: target.y - face.y }
  }
  const frame = finiteMotionFrame(input)
  const { sx, sy, tilt } = torso(species, frame, pose)
  const x = target.x - frame.bodyX - 100, y = target.y - frame.bodyY - 181
  const angle = tilt * Math.PI / 180
  return {
    x: (x * Math.cos(angle) + y * Math.sin(angle)) / sx,
    y: (-x * Math.sin(angle) + y * Math.cos(angle)) / sy + 181 - articulatedEyeY(species, pose) - eyeCentreOffset(pose === 'idle' ? 'happy' : pose),
  }
}

export function articulatedTransform(species: Species, input: MotionFrame, pose: PoseName): string {
  const frame = finiteMotionFrame(input)
  const { sx, sy, tilt } = torso(species, frame, pose)
  return `translate(${frame.bodyX} ${frame.bodyY}) rotate(${tilt} 100 181) translate(100 181) scale(${sx} ${sy}) translate(-100 -181)`
}

/** Inverse of the enclosing torso transform, so feet can use ground-space coordinates. */
function groundTransform(species: Species, frame: MotionFrame, pose: PoseName): string {
  const { sx, sy, tilt } = torso(species, frame, pose)
  return `translate(100 181) scale(${1 / sx} ${1 / sy}) translate(-100 -181) rotate(${-tilt} 100 181) translate(${-frame.bodyX} ${-frame.bodyY})`
}

export function characterShadowRadius(species: Species, pose: PoseName): number {
  if (pose === 'sick') return { bun: 80, mochi: 84, sprout: 78 }[species]
  if (pose === 'sleeping') return { bun: 62, mochi: 68, sprout: 62 }[species]
  if (pose === 'scruffy') return { bun: 60, mochi: 70, sprout: 62 }[species]
  if (pose === 'meh') return { bun: 56, mochi: 66, sprout: 60 }[species]
  return { bun: 56, mochi: 62, sprout: 58 }[species]
}

/** Optional pose preserves the existing caller override; two-argument consumers use idle. */
export function articulatedPose(species: Species, input: MotionFrame, poseName: PoseName = 'idle'): Pose {
  if (poseName === 'sick' || poseName === 'sleeping') return poseFor(species, poseName)
  const frame = finiteMotionFrame(input)
  const rig = RIG[species]
  const low = poseName === 'meh' || poseName === 'scruffy'
  const eyeY = articulatedEyeY(species, poseName)
  const mouthY = species === 'bun' ? ({ idle: 145, content: 146, meh: 148, scruffy: 151 }[poseName as UprightPose] ?? 145) : species === 'mochi' && poseName === 'scruffy' ? 142 : rig.mouthY
  const armY = low ? poseName === 'scruffy' ? 160 : 156 : rig.armY
  const anchors = { ...poseFor(species, 'idle').anchors, face: { x: 100, y: eyeY } }
  if (species === 'bun') anchors.head = { ...anchors.head, y: { idle: 92, content: 93, meh: 95, scruffy: 96 }[poseName as UprightPose] ?? 92 }
  return {
    id: `${species}-articulated-${poseName}`,
    anchors,
    silhouette: { d: rig.d },
    renderBody: (colour, mood) => {
      const appendageMood = poseName === 'idle' || poseName === 'cheering' ? mood : poseName
      const footLift = frame.leftFoot > 0 || frame.rightFoot > 0
      const groundContact = frame.leftGroundX !== 0 || frame.leftGroundY !== 0 || frame.rightGroundX !== 0 || frame.rightGroundY !== 0
      // A supported walk can have both soles down at handoff despite torso bob.
      const hop = footLift || groundContact ? 0 : Math.min(0, frame.bodyY)
      const feet = (['left', 'right'] as const).map((side, i) => (
        <g key={side} data-foot={side} transform={groundTransform(species, frame, poseName)}>
          <Nub cx={rig.feet[i] + frame.bodyX + (i === 0 ? frame.leftGroundX! : frame.rightGroundX!)} cy={178 + hop + (i === 0 ? frame.leftGroundY! - frame.leftFoot : frame.rightGroundY! - frame.rightFoot)} rx={rig.footRx} ry={9} fill={colour} />
        </g>
      ))
      const arms = (['left', 'right'] as const).map((side, i) => {
        const sign = i === 0 ? -1 : 1
        const angle = (i === 0 ? frame.leftArm : frame.rightArm) + (poseName === 'cheering' ? -sign * 44 : 0)
        const extension = Math.min(1, Math.abs(angle) / 30)
        // Wide postures and landing squash shorten Mochi's reach without changing normal waves.
        const reach = species === 'mochi' ? poseName !== 'idle' ? 9 : 15 - 6 * Math.max(0, Math.min(1, (frame.scaleX - 1) / 0.06)) : 15
        const cx = rig.arms[i] + sign * reach * extension
        const pivotX = rig.arms[i] - sign * 7
        const pivotY = armY - 8
        return (
          <g key={side} data-arm={side} data-pivot={`${pivotX} ${pivotY}`} transform={`rotate(${angle} ${pivotX} ${pivotY})`}>
            <Tube d={`M${pivotX} ${pivotY} L${cx} ${armY}`} outer={17} inner={9} colour={colour} />
            <Nub cx={cx} cy={armY} rx={10} ry={13 + 3 * extension} rotate={sign * (low ? 4 : rig.armTilt)} fill={colour} />
          </g>
        )
      })
      let appendages: ReactNode
      if (species === 'bun') {
        const [l, r] = EAR_DROOP[appendageMood]
        // Splay at hop height so the long ear tips remain inside the 200-unit art box.
        const hopDroop = Math.max(0, -frame.bodyY) * 1.3
        appendages = <>
          <g data-appendage="left-ear" data-pivot="82 98" transform={`rotate(${frame.leftAppendage} 82 98)`}>{ear(l + hopDroop, colour, mood)}</g>
          <g data-appendage="right-ear" data-pivot="118 98" transform={`rotate(${frame.rightAppendage} 118 98)`}><g transform="translate(200 0) scale(-1 1)">{ear(r + hopDroop + (poseName === 'meh' ? 36 : poseName === 'scruffy' ? 24 : 0), colour, mood)}</g></g>
        </>
      } else if (species === 'mochi') {
        const tilt = poseName === 'scruffy' ? 38 : poseName === 'meh' || poseName === 'content' ? 16 : 0
        appendages = <g data-appendage="knot" data-pivot="100 76">{mochiKnot(colour, tilt + frame.leftAppendage)}</g>
      } else {
        const wilt = WILT[appendageMood]
        const bend = poseName === 'scruffy' ? { x: -6, y: 0 } : poseName === 'meh' ? { x: -3, y: 3 } : poseName === 'content' ? { x: 2, y: 1 } : { x: 0, y: 0 }
        const leftWilt = wilt + (poseName === 'scruffy' ? 8 : poseName === 'meh' ? 4 : poseName === 'content' ? -4 : 0)
        const rightWilt = wilt + (poseName === 'scruffy' ? 14 : poseName === 'meh' ? 10 : poseName === 'content' ? 8 : 0)
        appendages = (
          <g data-appendage="stem" data-pivot="100 74" transform={`rotate(${frame.leftAppendage * 0.4} 100 74)`}>
            <Tube d={`M100 74 C100 62 ${98 + bend.x * 0.5} ${54 + bend.y * 0.5} ${101 + bend.x} ${46 + bend.y}`} outer={11} inner={4} colour={PALETTE.leaf} />
            <g transform={`translate(${bend.x} ${bend.y})`} data-appendage="leaves" data-pivot={`${STEM_TOP.x} ${STEM_TOP.y}`}>
              {leaves(leftWilt - frame.leftAppendage, rightWilt + frame.rightAppendage)}
            </g>
          </g>
        )
      }
      return (
        <Ink>
          {appendages}
          {feet}
          {arms}
          <Body d={rig.d} colour={colour} highlight={rig.light} />
          {species === 'mochi' && mochiPleats()}
          <MoodTint d={rig.d} mood={mood} colour={colour} smudges={rig.smudges} />
          <Cheeks y={species === 'bun' ? mouthY - 2 : species === 'mochi' && poseName === 'scruffy' ? 144 : rig.cheekY} spread={rig.spread} />
          <Face mood={poseName === 'idle' ? mood : poseName} expression={frame.expression} gaze={{ x: frame.gazeX, y: frame.gazeY }} eyeOpen={frame.eyeOpen} eyeY={eyeY} mouthY={mouthY} />
          {species === 'bun' && <path d={`M95.5 ${eyeY + 8.5} h9 l-4.5 4.5 Z`} fill={PALETTE.blush} strokeWidth={2.5} />}
        </Ink>
      )
    },
  }
}
