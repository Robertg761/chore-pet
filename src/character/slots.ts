import type { ReactNode } from 'react'
import type { CharacterSlot, Mood, Species } from '../domain/types'

/**
 * Where an item attaches in a given pose, in the pose's 200x200 viewBox.
 * Items are drawn centred on (0,0) and transformed onto the anchor, so one
 * hat works in every pose that defines a `head` anchor.
 */
export interface Anchor {
  x: number
  y: number
  scale?: number
  rotate?: number // degrees
}

export interface Pose {
  id: string
  /** Body and face for this pose, already coloured. */
  renderBody: (bodyColour: string, mood: Mood) => ReactNode
  anchors: Record<CharacterSlot, Anchor>
  /**
   * The body outline in pose space (the body path plus the transform the pose
   * draws it with). Outfits are clipped to it, so they hug the body exactly in
   * every pose, and the outline is redrawn over them.
   */
  silhouette: { d: string; transform?: string }
  /** Slots this pose covers up, so their items aren't drawn (in bed, the outfit, backpack and neck items are under the covers). */
  hides?: CharacterSlot[]
}

export interface Item {
  id: string
  slot: Exclude<CharacterSlot, 'body'>
  name: string
  /**
   * Drawn around (0,0) at roughly 100% scale of a 200x200 character. Gets the
   * species so an item can be cut to fit each pet (ears, a stem, a dome).
   * Outfit items are clipped to the body silhouette, so they can be drawn
   * generously wide and simply need a neckline.
   */
  render: (fit: { species: Species }) => ReactNode
}
