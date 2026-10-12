import { Children, cloneElement, isValidElement, useId, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'
import { SLOT_RENDER_ORDER, type CharacterSlot, type Mood, type Species } from '../domain/types'
import './Character.css'
import { StrokeScaleContext } from './strokeScale'
import { ITEMS } from './items'
import { DEFAULT_LOOK, LookContext, type Look } from './look'
import { poseFor, poseNameFor, type PoseName } from './poses'
import type { Anchor, Item, Pose } from './slots'
import { FaceBodyColour } from './parts'

/** A stable 0..1 from an id, so each pet on screen idles out of step with the others. */
function phaseOf(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h % 1000) / 1000
}

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
  /**
   * Multiplies every outline the character draws (body, parts, outfit re-ink, item lines, face lines).
   * Default 1. A pet drawn small, like the room's, passes about 1.5 so its line matches the objects'.
   */
  strokeScale?: number
  size?: number
  title?: string
}

/** Scope literal item clips too, such as the bandana's species-specific clip. */
function scopedClips(children: ReactNode, prefix: string): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    const element = child as ReactElement<{ id?: string; clipPath?: string; children?: ReactNode }>
    const props = element.props
    return cloneElement(element, {
      ...(element.type === 'clipPath' && props.id ? { id: `${prefix}-${props.id}` } : {}),
      ...(props.clipPath ? { clipPath: props.clipPath.replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`) } : {}),
      ...(props.children !== undefined ? { children: scopedClips(props.children, prefix) } : {}),
    })
  })
}

/** One wardrobe order and clipping implementation for static and sampled art. */
export function CharacterLayers({ species, mood, bodyColour, equipped = {}, items = ITEMS, look, strokeScale = 1, p }: Omit<CharacterProps, 'size' | 'title' | 'pose'> & { p: Pose }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const clip = `outfit${id}`
  const { d, transform } = p.silhouette
  const worn = (slot: CharacterSlot) => (p.hides?.includes(slot) ? undefined : items.find((i) => i.id === equipped[slot] && i.slot === slot))
  const itemArt = (slot: CharacterSlot, art: ReactNode) => placed(p.anchors[slot], scopedClips(art, `item${id}-${slot}`))
  return (
    <StrokeScaleContext.Provider value={strokeScale}>
      <LookContext.Provider value={{ ...DEFAULT_LOOK, ...look }}>
        {SLOT_RENDER_ORDER.map((slot) => {
          if (slot === 'body') return <g key={slot} data-slot={slot}><FaceBodyColour colour={bodyColour}>{p.renderBody(bodyColour, mood)}</FaceBodyColour></g>
          const item = worn(slot)
          const art = item && itemArt(slot, item.render({ species }))
          // Front parts go over the outfit, under the neck, face and head items.
          const fronts = slot === 'outfit' && SLOT_RENDER_ORDER.map((s) => {
            const front = worn(s)?.front
            return front ? <g key={`front-${s}`} data-slot-front={s}>{itemArt(s, front({ species }))}</g> : null
          })
          if (slot !== 'outfit') return art ? <g key={slot} data-slot={slot}>{art}</g> : null
          return (
            <g key={slot} data-slot={art ? slot : undefined}>
              {art && <>
                <clipPath id={clip}><path d={d} transform={transform} /></clipPath>
                <g clipPath={`url(#${clip})`}>{art}</g>
                <path d={d} transform={transform} fill="none" stroke={PALETTE.ink} strokeWidth={CHARACTER_STROKE * strokeScale} strokeLinejoin="round" />
              </>}
              {fronts}
            </g>
          )
        })}
      </LookContext.Provider>
    </StrokeScaleContext.Provider>
  )
}

/** The pet as SVG content in its 200x200 box (feet near y = 180), for use inside another SVG. */
export function CharacterArt({ species, mood, pose, ...props }: Omit<CharacterProps, 'size' | 'title'>) {
  const poseName = pose ?? poseNameFor(mood)
  const id = useId()
  const phase = { '--ch-phase': phaseOf(id) } as CSSProperties
  return (
    <g className={poseName === 'sleeping' ? 'ch-breathe ch-breathe-sleep' : 'ch-breathe'} style={phase}>
      <CharacterLayers {...props} species={species} mood={mood} p={poseFor(species, poseName)} />
    </g>
  )
}

export function Character({ size = 200, title, ...art }: CharacterProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={title ?? `Pet, feeling ${art.mood}`}>
      <CharacterArt {...art} />
    </svg>
  )
}
