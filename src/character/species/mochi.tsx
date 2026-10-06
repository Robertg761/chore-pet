import { CHARACTER_STROKE, PALETTE } from '../../art/palette'
import type { Pose } from '../slots'
import { Cheeks, Face, MoodTint, Nub, Shadow } from '../parts'

// Mochi: a soft dumpling with a little pinched top.

export const BODY = 'M32 150 C32 104 62 72 100 72 C138 72 168 104 168 150 C168 172 140 181 100 181 C60 181 32 172 32 150 Z'
export const PINCH = 'M88 80 C88 64 96 54 108 56 C114 58 114 66 106 68 C102 70 104 76 110 80 Z'

export const mochiIdle: Pose = {
  id: 'mochi-idle',
  renderBody: (bodyColour, mood) => (
    <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round" strokeLinecap="round">
      <Shadow rx={62} />
      <Nub cx={74} cy={178} rx={15} ry={9} fill={bodyColour} />
      <Nub cx={126} cy={178} rx={15} ry={9} fill={bodyColour} />
      <Nub cx={36} cy={142} rx={11} ry={14} rotate={-20} fill={bodyColour} />
      <Nub cx={164} cy={142} rx={11} ry={14} rotate={20} fill={bodyColour} />
      <path d={PINCH} fill={bodyColour} />
      <path d={BODY} fill={bodyColour} />
      <g fill="none" strokeWidth={3} opacity={0.35}>
        <path d="M88 80 q-3 7 -1 13" />
        <path d="M112 80 q3 7 1 13" />
      </g>
      <MoodTint d={BODY} mood={mood} smudges={[[58, 158], [140, 112], [128, 166]]} />
      <Cheeks y={140} spread={40} />
      <Face mood={mood} eyeY={124} mouthY={138} />
    </g>
  ),
  anchors: {
    back: { x: 100, y: 132 },
    body: { x: 100, y: 132 },
    outfit: { x: 100, y: 160 },
    neck: { x: 100, y: 152 },
    face: { x: 100, y: 124 },
    head: { x: 100, y: 78 },
  },
}
