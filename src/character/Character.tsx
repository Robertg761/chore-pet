import { useId, type ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'
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
  const clip = `body${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const { d, transform } = p.silhouette
  /** The item worn in a slot, unless this pose hides that slot (tucked in bed). */
  const worn = (slot: CharacterSlot) => (p.hides?.includes(slot) ? undefined : items.find((i) => i.id === equipped[slot] && i.slot === slot))
  return (
    <LookContext.Provider value={{ ...DEFAULT_LOOK, ...look }}>
      {SLOT_RENDER_ORDER.map((slot) => {
        if (slot === 'body') return <g key={slot}>{p.renderBody(bodyColour, mood)}</g>
        const item = worn(slot)
        const art = item && placed(p.anchors[slot], item.render({ species }))
        // Front parts (a backpack's straps) go over the outfit, under the neck, face and head items.
        const fronts =
          slot === 'outfit' &&
          SLOT_RENDER_ORDER.map((s) => {
            const front = worn(s)?.front
            return front ? <g key={`front-${s}`}>{placed(p.anchors[s], front({ species }))}</g> : null
          })
        if (slot !== 'outfit') return art ? <g key={slot}>{art}</g> : null
        // Outfits are cut to the body outline, and the outline is inked again on top.
        return (
          <g key={slot}>
            {art && (
              <>
                <clipPath id={clip}>
                  <path d={d} transform={transform} />
                </clipPath>
                <g clipPath={`url(#${clip})`}>{art}</g>
                <path d={d} transform={transform} fill="none" stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE} strokeLinejoin="round" />
              </>
            )}
            {fronts}
          </g>
        )
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
