import { useId, useState } from 'react'
import type { CatalogEntry } from '../catalog/types'
import { CATALOG, DECOR } from '../catalog/objects'
import { furnitureCategory, type FurnitureCategory } from '../catalog/customization'
import type { PlacedObject, RoomType } from '../domain/types'
import type { Footprint } from '../room/grid'
import { fitsSomewhere } from '../room/placement'
import { choreCountLabel, groupCatalog, splitCatalog } from './buildModel'
import { ObjectThumb } from './ObjectThumb'
import './CatalogTray.css'

const CATEGORIES: { id: FurnitureCategory | 'all'; name: string }[] = [
  { id: 'all', name: 'All furniture' },
  { id: 'seating', name: 'Seating' },
  { id: 'tables', name: 'Tables' },
  { id: 'storage', name: 'Storage' },
  { id: 'bedroom', name: 'Bedroom' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'bathroom', name: 'Bathroom' },
  { id: 'decor', name: 'Decor' },
]

export interface CatalogTrayProps {
  roomType: RoomType
  /** The room's placed objects, to tell what still fits. */
  objects: PlacedObject[]
  /** Doorway approaches that furniture must leave clear. */
  reserved?: Footprint[]
  hasWestWindow?: boolean
  onPick: (entry: CatalogEntry) => void
  /** Unlock ids earned so far (progress.unlockedItems): decor shows up once earned. */
  unlocked?: string[]
  /** One scrolling row, grouped by room (this room's things first), instead of a block per kind. */
  oneRow?: boolean
}

export function CatalogTray({ roomType, objects, reserved, hasWestWindow = true, onPick, unlocked = [], oneRow = false }: CatalogTrayProps) {
  const uid = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FurnitureCategory | 'all'>('all')
  const [onlyFits, setOnlyFits] = useState(false)
  const earnedDecor = DECOR.filter((e) => e.unlock && unlocked.includes(e.unlock))
  const available = [...CATALOG, ...earnedDecor]
  const fitsById = new Map(available.map((entry) => [entry.id, fitsSomewhere(entry, objects, reserved, hasWestWindow)]))
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const filtered = available.filter((entry) => {
    if (category !== 'all' && furnitureCategory(entry) !== category) return false
    if (onlyFits && !fitsById.get(entry.id)) return false
    const searchable = `${entry.name} ${entry.description ?? ''} ${furnitureCategory(entry)}`.toLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
  const { suited, others } = splitCatalog(filtered, roomType)
  const filtering = terms.length > 0 || category !== 'all' || onlyFits
  const clearFilters = () => {
    setQuery('')
    setCategory('all')
    setOnlyFits(false)
  }

  const row = (entries: CatalogEntry[], className = 'tray-row') => (
    <ul className={className}>
      {entries.map((e) => {
        const fits = fitsById.get(e.id)
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
      <h2 className={oneRow ? 'tray-title sr-only' : 'tray-title'} id={`${uid}-title`}>
        Add to your room
      </h2>
      <div className="tray-filters">
        <div className="tray-search-row">
          <label className="tray-search">
            <span className="sr-only">Search furniture</span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="m15 15 5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <input type="search" placeholder="Search furniture" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select className="tray-category" aria-label="Furniture category" value={category} onChange={(event) => setCategory(event.target.value as FurnitureCategory | 'all')}>
            {CATEGORIES.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </div>
        <div className="tray-filter-meta">
          <label className="tray-fit-toggle">
            <input type="checkbox" aria-label="Only show what fits" checked={onlyFits} onChange={(event) => setOnlyFits(event.target.checked)} />
            Only show what fits
          </label>
          <span className="tray-count" role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</span>
          {filtering && <button type="button" className="tray-clear" aria-label="Clear furniture filters" onClick={clearFilters}>Clear</button>}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="tray-empty">No furniture matches. Try another search or clear the filters.</p>
      ) : oneRow ? (
        // Each room's things behind a small sideways label, so a long row still reads as Kitchen, Bathroom, ...
        <div className="tray-row tray-scroller">
          {groupCatalog([...suited, ...others], roomType).map((g) => (
            <div key={g.key} className="tray-section" role="group" aria-labelledby={`${uid}-g-${g.key}`}>
              <h3 className="tray-section-label" id={`${uid}-g-${g.key}`}>
                {g.label}
              </h3>
              {row(g.entries, 'tray-section-items')}
            </div>
          ))}
        </div>
      ) : (
        <>
          {group('For this room', suited, 'suited')}
          {group(suited.length > 0 ? 'Everything else' : 'All things', others, 'others')}
        </>
      )}
    </section>
  )
}
