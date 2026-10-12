import { catalogEntry } from '../catalog/objects'
import type { MessStage, PlacedObject } from '../domain/types'
import { footprintOf, type Footprint } from '../room/grid'

/** Pet clearance can exceed a placement footprint when a fixture opens. */
export function petObstacles(objects: readonly PlacedObject[], stages: Readonly<Record<string, MessStage>>): Footprint[] {
  return objects.flatMap((object) => {
    const entry = catalogEntry(object.catalogId)
    if (!entry || entry.layer !== 'solid') return []
    const footprint = footprintOf(object, entry)
    const stage = Object.prototype.hasOwnProperty.call(stages, object.id) ? stages[object.id] : 'clean'
    // The folded dishwasher door reaches tx1.45 in its local art. Reserve
    // the adjacent tile for feet/body clearance; the room mirrors that axis.
    if (entry.id === 'dishwasher' && stage === 'messy2') {
      return [object.rotation % 2 ? { ...footprint, d: footprint.d + 0.45 } : { ...footprint, w: footprint.w + 0.45 }]
    }
    return [footprint]
  })
}
