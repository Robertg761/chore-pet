import { Ink } from '../ink'
import type { Pose } from '../slots'
import { Body, Cheeks, Face, MoodTint, Nub, Shadow } from '../parts'

// Mochi: a soft steamed dumpling with a pinched knot on top.

export const BODY = 'M32 150 C32 104 62 72 100 72 C138 72 168 104 168 150 C168 172 140 181 100 181 C60 181 32 172 32 150 Z'
/** Where light catches the body (top left). */
export const HIGHLIGHT: [number, number] = [64, 104]

/**
 * The pinched knot on top, like a steamed bun's twist. Drawn before the body
 * so the body overlaps its base. `tilt` (degrees) flops it sideways when Mochi
 * is tired.
 */
export function mochiKnot(colour: string, tilt = 0) {
  return (
    <g transform={`rotate(${tilt} 100 76)`}>
      <path d="M89 78 C88 67 94 60 100 60 C106 60 112 67 111 78 Z" fill={colour} />
      <path d="M100 60 C100 55 104 53 106 55" fill="none" strokeWidth={3.5} />
    </g>
  )
}

/** Soft pleats fanning out from the knot, drawn over the body. */
export function mochiPleats(weight = 3) {
  return (
    <g fill="none" strokeWidth={weight} opacity={0.28}>
      <path d="M91 77 Q82 83 78 93" />
      <path d="M96 78 Q92 86 91 94" />
      <path d="M104 78 Q108 86 109 94" />
      <path d="M109 77 Q118 83 122 93" />
    </g>
  )
}

export const mochiIdle: Pose = {
  id: 'mochi-idle',
  renderBody: (bodyColour, mood) => (
    <Ink>
      <Shadow rx={62} />
      <Nub cx={74} cy={178} rx={15} ry={9} fill={bodyColour} />
      <Nub cx={126} cy={178} rx={15} ry={9} fill={bodyColour} />
      <Nub cx={37} cy={152} rx={10} ry={13} rotate={-10} fill={bodyColour} />
      <Nub cx={163} cy={152} rx={10} ry={13} rotate={10} fill={bodyColour} />
      {mochiKnot(bodyColour)}
      <Body d={BODY} colour={bodyColour} highlight={HIGHLIGHT} />
      {mochiPleats()}
      <MoodTint d={BODY} mood={mood} colour={bodyColour} smudges={[[58, 158], [140, 112], [128, 166]]} />
      <Cheeks y={140} spread={40} />
      <Face mood={mood} eyeY={124} mouthY={138} />
    </Ink>
  ),
  silhouette: { d: BODY },
  anchors: {
    back: { x: 100, y: 132 },
    body: { x: 100, y: 132 },
    // Mochi is the widest pet, so outfits are drawn a little bigger.
    outfit: { x: 100, y: 160, scale: 1.1 },
    neck: { x: 100, y: 152 },
    face: { x: 100, y: 124 },
    head: { x: 100, y: 78 },
  },
}
