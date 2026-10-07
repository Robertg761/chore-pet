import type { ReactNode } from 'react'
import type { MessStage } from '../../domain/types'

/** Hand-drawn art for one catalog object, in object-local iso units (see ../iso.ts). */
export interface ObjectArt {
  catalogId: string
  /** Tiles along +tx (w) and +ty (d). Must match the catalog entry. */
  footprint: { w: number; d: number }
  /** Shared by every mess stage, so swapping stages never shifts the object. */
  bounds: { x: number; y: number; width: number; height: number }
  /**
   * The visual top of the clean drawing (object-local y). `bounds` leaves
   * headroom for the messiest stage, so this is where neglect cues sit and
   * where catalog thumbnails are cropped. Without it, cleanTop() in ./index.ts estimates one.
   */
  cueY?: number
  render: (stage: MessStage) => ReactNode
}
