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
