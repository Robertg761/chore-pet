import type { ReactNode } from 'react'
import type { MessStage } from '../../domain/types'

/** Hand-drawn art for one catalog object, in object-local iso units (see ../iso.ts). */
export interface ObjectArt {
  catalogId: string
  /** Tiles along +tx (w) and +ty (d). Must match the catalog entry. */
  footprint: { w: number; d: number }
  /** Shared by every mess stage, so swapping stages never shifts the object. */
  bounds: { x: number; y: number; width: number; height: number }
  render: (stage: MessStage) => ReactNode
}
