import { batch1 } from './batch1'
import { batch2 } from './batch2'
import { batch3 } from './batch3'
import { decor } from './decor'
import { sinkArt } from './sink'
import type { ObjectArt } from './types'

/** Hand-drawn art for every catalog object, by catalog id. */
export const OBJECT_ART: Record<string, ObjectArt> = Object.fromEntries(
  [sinkArt, ...batch1, ...batch2, ...batch3, ...decor].map((art) => [art.catalogId, art]),
)

/** Object-local y of an art's clean top: its `cueY`, or an estimate a third of the way down its bounds. */
export function cleanTop(art: Pick<ObjectArt, 'bounds' | 'cueY'>): number {
  return art.cueY ?? art.bounds.y + 0.35 * art.bounds.height
}
