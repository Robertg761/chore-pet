import { CHARACTER_STROKE, PALETTE } from '../../art/palette'
import type { Mood } from '../../domain/types'
import type { Pose } from '../slots'
import { Cheeks, Face, MoodTint, Nub, Shadow } from '../parts'

// Sprout: a round little seedling whose leaves wilt when chores slip.

const BODY = 'M100 70 C124 70 158 104 158 146 C158 170 134 181 100 181 C66 181 42 170 42 146 C42 104 76 70 100 70 Z'
const STEM_TOP = { x: 101, y: 46 }

/** How far the leaves have wilted, in degrees. 0 is perky. */
const WILT: Record<Mood, number> = { happy: 0, content: 8, meh: 22, scruffy: 40, sick: 60 }

function leaves(wilt: number) {
  const { x, y } = STEM_TOP
  return (
    <g fill={PALETTE.leaf}>
      <g transform={`rotate(${-wilt} ${x} ${y})`}>
        <path d="M101 46 C94 32 78 26 64 32 C70 46 86 52 101 46 Z" />
        <path d="M97 44 C88 39 80 36 72 34" fill="none" strokeWidth={2.5} />
      </g>
      <g transform={`rotate(${wilt} ${x} ${y})`}>
        <path d="M101 46 C108 30 126 22 142 28 C136 44 118 52 101 46 Z" />
        <path d="M105 44 C115 38 124 34 133 31" fill="none" strokeWidth={2.5} />
      </g>
    </g>
  )
}

export const sproutIdle: Pose = {
  id: 'sprout-idle',
  renderBody: (bodyColour, mood) => (
    <g stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round" strokeLinecap="round">
      <Shadow rx={58} />
      <path d="M100 74 C100 62 98 54 101 46" fill="none" strokeWidth={11} />
      <path d="M100 74 C100 62 98 54 101 46" fill="none" stroke={PALETTE.leaf} strokeWidth={4} />
      {leaves(WILT[mood])}
      <Nub cx={78} cy={178} rx={15} ry={9} fill={bodyColour} />
      <Nub cx={122} cy={178} rx={15} ry={9} fill={bodyColour} />
      <Nub cx={46} cy={148} rx={10} ry={13} rotate={-20} fill={bodyColour} />
      <Nub cx={154} cy={148} rx={10} ry={13} rotate={20} fill={bodyColour} />
      <path d={BODY} fill={bodyColour} />
      <MoodTint d={BODY} mood={mood} smudges={[[64, 160], [132, 108], [130, 166]]} />
      <Cheeks y={142} spread={36} />
      <Face mood={mood} eyeY={126} mouthY={140} />
    </g>
  ),
  anchors: {
    back: { x: 100, y: 138 },
    body: { x: 100, y: 138 },
    outfit: { x: 100, y: 162 },
    neck: { x: 100, y: 156 },
    face: { x: 100, y: 126 },
    head: { x: 100, y: 76, scale: 0.95 },
  },
}
