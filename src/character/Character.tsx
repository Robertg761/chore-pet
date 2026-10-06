import { SLOT_RENDER_ORDER, type CharacterSlot, type Mood } from '../domain/types'
import type { ReactNode } from 'react'
import type { Anchor, Item, Pose } from './slots'

// PLACEHOLDER ART. The final character is chosen in Phase 0 (see docs/ART.md).
// Swap this pose out; keep the anchor contract.

const OUTLINE = '#2B1E2F'
const BODY_PATH = 'M40 140 C40 92 68 62 100 62 C132 62 160 92 160 140 C160 166 134 178 100 178 C66 178 40 166 40 140 Z'

function Face({ mood }: { mood: Mood }) {
  const sad = mood === 'scruffy' || mood === 'sick'
  return (
    <g stroke={OUTLINE} strokeWidth={3.5} strokeLinecap="round" fill="none">
      {mood === 'sick' ? (
        <>
          <path d="M76 112 L88 124 M88 112 L76 124" />
          <path d="M112 112 L124 124 M124 112 L112 124" />
        </>
      ) : sad ? (
        <>
          <path d="M74 120 q8 5 16 0" />
          <path d="M110 120 q8 5 16 0" />
        </>
      ) : (
        <>
          <ellipse cx={82} cy={118} rx={7} ry={9} fill={OUTLINE} stroke="none" />
          <ellipse cx={118} cy={118} rx={7} ry={9} fill={OUTLINE} stroke="none" />
        </>
      )}
      {mood === 'happy' || mood === 'content' ? (
        <path d="M92 134 q8 8 16 0" />
      ) : (
        <path d="M88 140 q6 -5 12 0 q6 5 12 0" />
      )}
    </g>
  )
}

export const placeholderPose: Pose = {
  id: 'placeholder-idle',
  renderBody: (bodyColour, mood) => (
    <g stroke={OUTLINE} strokeWidth={4} strokeLinejoin="round">
      <ellipse cx={100} cy={185} rx={52} ry={8} fill={OUTLINE} opacity={0.15} stroke="none" />
      <ellipse cx={78} cy={178} rx={13} ry={8} fill={bodyColour} />
      <ellipse cx={122} cy={178} rx={13} ry={8} fill={bodyColour} />
      <path d={BODY_PATH} fill={bodyColour} />
      {(mood === 'scruffy' || mood === 'sick') && (
        <path d={BODY_PATH} fill="#7BAE3A" opacity={mood === 'sick' ? 0.32 : 0.18} stroke="none" />
      )}
      <Face mood={mood} />
    </g>
  ),
  anchors: {
    body: { x: 100, y: 120 },
    outfit: { x: 100, y: 150 },
    neck: { x: 100, y: 140 },
    face: { x: 100, y: 118 },
    head: { x: 100, y: 66 },
    back: { x: 100, y: 130 },
  },
}

export const sampleItems: Item[] = [
  {
    id: 'beanie-red',
    slot: 'head',
    name: 'Red beanie',
    render: () => (
      <g stroke={OUTLINE} strokeWidth={4} strokeLinejoin="round">
        <path d="M-38 18 C-38 -26 38 -26 38 18 Z" fill="#E86A4A" />
        <rect x={-42} y={10} width={84} height={14} rx={7} fill="#F4A08A" />
        <circle cx={0} cy={-28} r={9} fill="#FFFFFF" />
      </g>
    ),
  },
]

function placed(anchor: Anchor, children: ReactNode) {
  const t = `translate(${anchor.x} ${anchor.y}) rotate(${anchor.rotate ?? 0}) scale(${anchor.scale ?? 1})`
  return <g transform={t}>{children}</g>
}

export interface CharacterProps {
  mood: Mood
  bodyColour: string
  equipped?: Partial<Record<CharacterSlot, string>>
  pose?: Pose
  items?: Item[]
  size?: number
  title?: string
}

export function Character({
  mood,
  bodyColour,
  equipped = {},
  pose = placeholderPose,
  items = sampleItems,
  size = 200,
  title,
}: CharacterProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={title ?? `Pet, feeling ${mood}`}>
      {SLOT_RENDER_ORDER.map((slot) => {
        if (slot === 'body') return <g key={slot}>{pose.renderBody(bodyColour, mood)}</g>
        const item = items.find((i) => i.id === equipped[slot] && i.slot === slot)
        return item ? <g key={slot}>{placed(pose.anchors[slot], item.render())}</g> : null
      })}
    </svg>
  )
}
