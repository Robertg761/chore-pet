import type { ReactNode } from 'react'
import { SLOT_RENDER_ORDER, type CharacterSlot, type Mood, type Species } from '../domain/types'
import { ITEMS } from './items'
import { DEFAULT_LOOK, LookContext, type Look } from './look'
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
  /** Face options; defaults to classic eyes and round cheeks. */
  look?: Partial<Look>
  size?: number
  title?: string
}

/** The pet as SVG content in its 200x200 box (feet near y = 180), for use inside another SVG. */
export function CharacterArt({ species, mood, bodyColour, equipped = {}, pose, items = ITEMS, look }: Omit<CharacterProps, 'size' | 'title'>) {
  const p = poseFor(species, pose ?? poseNameFor(mood))
  return (
    <LookContext.Provider value={{ ...DEFAULT_LOOK, ...look }}>
      {SLOT_RENDER_ORDER.map((slot) => {
        if (slot === 'body') return <g key={slot}>{p.renderBody(bodyColour, mood)}</g>
        if (p.hides?.includes(slot)) return null
        const item = items.find((i) => i.id === equipped[slot] && i.slot === slot)
        return item ? <g key={slot}>{placed(p.anchors[slot], item.render())}</g> : null
      })}
    </LookContext.Provider>
  )
}

export function Character({ size = 200, title, ...art }: CharacterProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={title ?? `Pet, feeling ${art.mood}`}>
      <CharacterArt {...art} />
    </svg>
  )
}
