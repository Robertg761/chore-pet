import type { ReactNode } from 'react'
import type { CharacterSlot, Mood } from '../domain/types'

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
}

export interface Item {
  id: string
  slot: Exclude<CharacterSlot, 'body'>
  name: string
  /** Drawn around (0,0) at roughly 100% scale of a 200x200 character. */
  render: () => ReactNode
}
