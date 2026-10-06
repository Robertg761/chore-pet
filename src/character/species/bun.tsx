import { CHARACTER_STROKE, PALETTE } from '../../art/palette'
import type { Mood } from '../../domain/types'
import type { Pose } from '../slots'
import { Cheeks, Face, MoodTint, Nub, Shadow } from '../parts'

// Bun: a round bunny whose ears show how it feels.

const BODY = 'M44 146 C44 106 70 86 100 86 C130 86 156 106 156 146 C156 170 132 181 100 181 C68 181 44 170 44 146 Z'

/** Outward droop in degrees for the [left, right] ear. 0 is straight up. */
const EAR_DROOP: Record<Mood, [number, number]> = {
  happy: [6, 6],
  content: [14, 14],
  meh: [12, 80],
  scruffy: [116, 116],
  sick: [128, 128],
}

/** The left ear, pivoting at its base. The right ear is this mirrored. */
const EAR = 'M70 100 C58 72 58 32 72 26 C86 20 96 60 94 98 Z'

function ear(droop: number, fill: string, tint: number) {
  return (
    <g transform={`rotate(${-droop} 82 98)`}>
      <path d={EAR} fill={fill} />
      {tint > 0 && <path d={EAR} fill={PALETTE.sickTint} opacity={tint} stroke="none" />}
      <path d="M75 90 C67 68 67 44 74 39 C81 35 87 62 86 90 Z" fill={PALETTE.blush} stroke="none" />
    </g>
  )
}

export const bunIdle: Pose = {
  id: 'bun-idle',
  renderBody: (bodyColour, mood) => {
    const [left, right] = EAR_DROOP[mood]
    const tint = mood === 'sick' ? 0.32 : mood === 'scruffy' ? 0.18 : 0
    return (
      <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round" strokeLinecap="round">
        <Shadow rx={56} />
        {ear(left, bodyColour, tint)}
        <g transform="translate(200 0) scale(-1 1)">
          {ear(right, bodyColour, tint)}
        </g>
        <Nub cx={78} cy={178} rx={16} ry={9} fill={bodyColour} />
        <Nub cx={122} cy={178} rx={16} ry={9} fill={bodyColour} />
        <Nub cx={48} cy={148} rx={10} ry={13} rotate={-20} fill={bodyColour} />
        <Nub cx={152} cy={148} rx={10} ry={13} rotate={20} fill={bodyColour} />
        <path d={BODY} fill={bodyColour} />
        <MoodTint d={BODY} mood={mood} smudges={[[66, 160], [134, 118], [126, 168]]} />
        <Cheeks y={143} spread={36} />
        <Face mood={mood} eyeY={126} mouthY={145} />
        <path d="M95.5 134.5 h9 l-4.5 4.5 Z" fill={PALETTE.blush} strokeWidth={2.5} />
      </g>
    )
  },
  anchors: {
    back: { x: 100, y: 140 },
    body: { x: 100, y: 140 },
    outfit: { x: 100, y: 162 },
    neck: { x: 100, y: 157 },
    face: { x: 100, y: 126 },
    head: { x: 100, y: 92, scale: 0.95 },
  },
}
