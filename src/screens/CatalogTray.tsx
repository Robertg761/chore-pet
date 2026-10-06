import type { CatalogEntry } from '../catalog/types'
import { CATALOG } from '../catalog/objects'
import type { PlacedObject, RoomType } from '../domain/types'
import { fitsSomewhere } from '../room/placement'

// PLACEHOLDER (Phase 2 batch C: catalog tray). Keep the props.

export interface CatalogTrayProps {
  roomType: RoomType
  /** The room's placed objects, to tell what still fits. */
  objects: PlacedObject[]
  onPick: (entry: CatalogEntry) => void
}

export function CatalogTray({ objects, onPick }: CatalogTrayProps) {
  return (
    <section aria-label="Add things">
      {CATALOG.map((e) => (
        <button key={e.id} type="button" disabled={!fitsSomewhere(e, objects)} onClick={() => onPick(e)}>
          {e.name}
        </button>
      ))}
    </section>
  )
}
