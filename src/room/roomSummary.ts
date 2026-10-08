import { catalogEntry } from '../catalog/objects'
import type { NeglectLevel } from '../domain/neglect'
import type { PlacedObject } from '../domain/types'
import { depthOrder, footprintOf } from './grid'

// Words for the room, for screen readers: what each placed thing is called,
// the order to step through them, and what is messy, so the neglect cues are
// not only visual.

/** Each placed object's name from the catalog, numbered when there are several of a kind ("Potted plant 2"). */
export function objectNames(objects: Pick<PlacedObject, 'id' | 'catalogId'>[]): Record<string, string> {
  const total = new Map<string, number>()
  for (const o of objects) total.set(o.catalogId, (total.get(o.catalogId) ?? 0) + 1)
  const seen = new Map<string, number>()
  const out: Record<string, string> = {}
  for (const o of objects) {
    const name = catalogEntry(o.catalogId)?.name ?? 'Thing'
    const n = (seen.get(o.catalogId) ?? 0) + 1
    seen.set(o.catalogId, n)
    out[o.id] = (total.get(o.catalogId) ?? 0) > 1 ? `${name} ${n}` : name
  }
  return out
}

export const MESS_WORDS: Record<1 | 2 | 3, string> = { 1: 'needs a little tidy', 2: 'needs a tidy', 3: 'needs a big tidy' }

/** "The sink needs a big tidy, the trash can needs a little tidy." Messiest first; empty when nothing is late. */
export function neglectSummary(objects: Pick<PlacedObject, 'id' | 'catalogId'>[], neglect: Record<string, NeglectLevel>): string {
  const names = objectNames(objects)
  const late = objects
    .map((o, i) => ({ o, i, level: neglect[o.id] ?? 0 }))
    .filter((x): x is typeof x & { level: 1 | 2 | 3 } => x.level > 0)
    .sort((a, b) => b.level - a.level || a.i - b.i)
  if (!late.length) return ''
  const parts = late.map(({ o, level }) => {
    const name = names[o.id].toLowerCase()
    // "the sink needs a tidy", "the fairy lights need a tidy".
    const plural = /[^s]s$/.test(names[o.id].replace(/ \d+$/, ''))
    const words = plural ? MESS_WORDS[level].replace(/^needs/, 'need') : MESS_WORDS[level]
    return `the ${name} ${words}`
  })
  const text = parts.join(', ')
  return `${text[0].toUpperCase()}${text.slice(1)}.`
}

/**
 * Placed objects back to front, the order the build room's Left/Right keys
 * step through them (and the order to list "Things in your room").
 */
export function objectsBackToFront<T extends PlacedObject>(objects: T[]): T[] {
  return depthOrder(
    objects.flatMap((o) => {
      const entry = catalogEntry(o.catalogId)
      return entry ? [{ id: o.id, footprint: footprintOf(o, entry), layer: entry.layer, o }] : []
    }),
  ).map((i) => i.o)
}
