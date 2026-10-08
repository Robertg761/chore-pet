import { catalogEntry } from '../catalog/objects'
import { choreActiveOn } from '../domain/schedule'
import type { Chore, ISODate, PlacedObject, Schedule } from '../domain/types'

// The chores screen: every chore grouped by where it lives, and chores that
// were removed, so one can be added again.

/** Names for the objects in a room, as the catalog names them; duplicates are numbered ("Rug 2"). */
export function placeNames(objects: PlacedObject[]): { id: string; name: string }[] {
  const seen = new Map<string, number>()
  return objects.flatMap((o) => {
    const name = catalogEntry(o.catalogId)?.name
    if (!name) return []
    const n = (seen.get(name) ?? 0) + 1
    seen.set(name, n)
    return [{ id: o.id, name: n > 1 ? `${name} ${n}` : name }]
  })
}

export interface ChoreGroup {
  /** The object's id, or "anywhere" for chores tied to no object in the room. */
  id: string
  title: string
  chores: Chore[]
}

const byName = (a: Chore, b: Chore) => a.name.localeCompare(b.name)

/** Today's chores by object, in the room's order, then those tied to nothing. Empty groups are left out. */
export function choreGroups(chores: Chore[], objects: PlacedObject[], today: ISODate): ChoreGroup[] {
  const active = chores.filter((c) => choreActiveOn(c, today))
  const places = placeNames(objects)
  const placed = new Set(places.map((p) => p.id))
  const groups: ChoreGroup[] = places.map((p) => ({ id: p.id, title: p.name, chores: active.filter((c) => c.objectId === p.id).sort(byName) }))
  groups.push({ id: 'anywhere', title: 'Anywhere', chores: active.filter((c) => !c.objectId || !placed.has(c.objectId)).sort(byName) })
  return groups.filter((g) => g.chores.length > 0)
}

const key = (name: string) => name.trim().toLocaleLowerCase()

/** How many past chores to offer; the list is for picking a few back, not an archive. */
export const PAST_LIMIT = 30

/**
 * Chores that were removed, most recent first, once per name, leaving out
 * names that are on the list today (adding those again would make a twin).
 */
export function pastChores(chores: Chore[], today: ISODate): Chore[] {
  const current = new Set(chores.filter((c) => choreActiveOn(c, today)).map((c) => key(c.name)))
  const seen = new Set<string>()
  return chores
    .filter((c) => c.archivedOn && c.archivedOn <= today)
    .sort((a, b) => b.archivedOn!.localeCompare(a.archivedOn!) || byName(a, b))
    .filter((c) => {
      const k = key(c.name)
      if (current.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, PAST_LIMIT)
}

/** A past chore as a new one: same name and rule, a fresh schedule history, and its object if it's still in the room. */
export function againInput(chore: Chore, objects: PlacedObject[]): { name: string; schedule: Schedule; objectId: string | null } {
  const { since: _since, before: _before, ...rule } = chore.schedule
  const objectId = chore.objectId && objects.some((o) => o.id === chore.objectId) ? chore.objectId : null
  return { name: chore.name, schedule: rule as Schedule, objectId }
}
