import type { ReactNode } from 'react'
import { SLOT_RENDER_ORDER, type CharacterSlot, type Mood, type Species } from '../domain/types'
import { ITEMS } from './items'
import { poseFor, poseNameFor, type PoseName } from './poses'
import type { Anchor, Item } from './slots'

function placed(anchor: Anchor, children: ReactNode) {
  const t = `translate(${anchor.x} ${anchor.y}) rotate(${anchor.rotate ?? 0}) scale(${anchor.scale ?? 1})`
  return <g transform={t}>{children}</g>
}

export interface CharacterProps {
  species: Species
  mood: Mood
  bodyColour: string
  equipped?: Partial<Record<CharacterSlot, string>>
  /** Defaults to the pose for the mood. */
  pose?: PoseName
  items?: Item[]
  size?: number
  title?: string
}

export function Character({ species, mood, bodyColour, equipped = {}, pose, items = ITEMS, size = 200, title }: CharacterProps) {
  const p = poseFor(species, pose ?? poseNameFor(mood))
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={title ?? `Pet, feeling ${mood}`}>
      {SLOT_RENDER_ORDER.map((slot) => {
        if (slot === 'body') return <g key={slot}>{p.renderBody(bodyColour, mood)}</g>
        const item = items.find((i) => i.id === equipped[slot] && i.slot === slot)
        return item ? <g key={slot}>{placed(p.anchors[slot], item.render())}</g> : null
      })}
    </svg>
  )
}
