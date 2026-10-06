import { catalogEntry } from '../catalog/objects'
import type { CatalogEntry } from '../catalog/types'
import type { PlacedObject } from '../domain/types'
import { findFreeSpot } from './grid'

/** Catalog lookup for the grid's placement checks. */
export const lookup = (id: string) => catalogEntry(id)

/** Whether `entry` fits anywhere in the room right now (the tray greys out the rest). */
export function fitsSomewhere(entry: CatalogEntry, objects: PlacedObject[]): boolean {
  return findFreeSpot(entry, objects, lookup) !== null
}
