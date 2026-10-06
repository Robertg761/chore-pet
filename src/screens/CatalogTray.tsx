import { useId } from 'react'
import type { CatalogEntry } from '../catalog/types'
import { CATALOG, DECOR } from '../catalog/objects'
import type { PlacedObject, RoomType } from '../domain/types'
import { fitsSomewhere } from '../room/placement'
import { choreCountLabel, splitCatalog } from './buildModel'
import { ObjectThumb } from './ObjectThumb'
import './CatalogTray.css'

export interface CatalogTrayProps {
  roomType: RoomType
  /** The room's placed objects, to tell what still fits. */
  objects: PlacedObject[]
  onPick: (entry: CatalogEntry) => void
  /** Unlock ids earned so far (progress.unlockedItems): decor shows up once earned. */
  unlocked?: string[]
  /** One scrolling row (things for this room first) instead of a group per kind. */
  oneRow?: boolean
}

export function CatalogTray({ roomType, objects, onPick, unlocked = [], oneRow = false }: CatalogTrayProps) {
  const uid = useId()
  const earnedDecor = DECOR.filter((e) => e.unlock && unlocked.includes(e.unlock))
  const { suited, others } = splitCatalog([...CATALOG, ...earnedDecor], roomType)

  const row = (entries: CatalogEntry[]) => (
    <ul className="tray-row">
      {entries.map((e) => {
        const fits = fitsSomewhere(e, objects)
        return (
          <li key={e.id}>
            <button type="button" className="tray-tile" disabled={!fits} onClick={() => onPick(e)}>
              <ObjectThumb entry={e} className="tray-art" />
              <span className="tray-name">{e.name}</span>
              <span className="tray-meta">{fits ? choreCountLabel(e.chores.length) : 'No space'}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
  const group = (title: string, entries: CatalogEntry[], key: string) =>
    entries.length > 0 && (
      <div className="tray-group" role="group" aria-labelledby={`${uid}-${key}`}>
        <h3 className="tray-subheading" id={`${uid}-${key}`}>
          {title}
        </h3>
        {row(entries)}
      </div>
    )

  return (
    <section className={oneRow ? 'tray tray-one-row' : 'tray'} aria-labelledby={`${uid}-title`}>
      <h2 className="tray-title" id={`${uid}-title`}>
        Add to your room
      </h2>
      {oneRow ? (
        row([...suited, ...others])
      ) : (
        <>
          {group('For this room', suited, 'suited')}
          {group(suited.length > 0 ? 'Everything else' : 'All things', others, 'others')}
        </>
      )}
    </section>
  )
}
