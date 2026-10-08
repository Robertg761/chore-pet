import { useRef, useState } from 'react'
import type { Room, RoomType } from '../domain/types'
import { MAX_ROOMS, ROOM_CHOICES, ROOM_LABEL } from './roomsModel'
import './RoomsSheet.css'

// The home's rooms: switch between them, add one, or remove one. Shown in a
// sheet from the room pill on the home and build screens.

export interface RoomsSheetProps {
  /** In order (orderRooms). */
  rooms: Room[]
  names: Map<string, string>
  currentId: string
  /** Things placed in each room, by room id. */
  things: Map<string, number>
  /** Late chores in each room, by room id. */
  late: Map<string, number>
  onPick: (roomId: string) => void
  onAdd: (type: RoomType) => void
  onRemove: (roomId: string) => void
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function RoomsSheet({ rooms, names, currentId, things, late, onPick, onAdd, onRemove }: RoomsSheetProps) {
  const [removing, setRemoving] = useState<string | null>(null)
  const full = rooms.length >= MAX_ROOMS
  const listRef = useRef<HTMLUListElement>(null)
  // After the question closes, focus goes back to the row it came from (Keep it) or the room on show (Remove).
  const focusSoon = (selector: string) => requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(selector)?.focus())

  return (
    <div className="rooms">
      <ul ref={listRef} className="rooms-list">
        {rooms.map((r) => {
          const name = names.get(r.id) ?? 'Room'
          const n = things.get(r.id) ?? 0
          const behind = late.get(r.id) ?? 0
          const current = r.id === currentId
          return (
            <li key={r.id} className="rooms-item">
              {removing === r.id ? (
                <div className="confirm" role="group" aria-label={`Remove the ${name.toLowerCase()}`}>
                  <p>Remove the {name.toLowerCase()}? Its things and their chores go; your past work and rewards stay.</p>
                  <div className="confirm-actions">
                    <button type="button" className="btn btn-danger" onClick={() => (setRemoving(null), onRemove(r.id), focusSoon('.rooms-pick-current'))}>
                      Remove
                    </button>
                    {/* The safe choice takes focus. */}
                    <button type="button" className="btn" autoFocus onClick={() => (setRemoving(null), focusSoon(`[data-remove="${r.id}"]`))}>
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={current ? 'rooms-pick rooms-pick-current' : 'rooms-pick'}
                    aria-current={current ? 'true' : undefined}
                    aria-label={`Show the ${name.toLowerCase()}: ${n ? plural(n, 'thing', 'things') : 'empty'}${behind ? `, ${behind} late` : ''}`}
                    onClick={() => onPick(r.id)}
                  >
                    <span className="rooms-name">{name}</span>
                    <span className="rooms-meta">{n ? plural(n, 'thing', 'things') : 'Empty'}</span>
                    {behind > 0 && <span className="tag tag-overdue rooms-late">{behind} late</span>}
                  </button>
                  {rooms.length > 1 && (
                    <button type="button" className="btn btn-quiet btn-danger rooms-remove" data-remove={r.id} aria-label={`Remove the ${name.toLowerCase()}`} onClick={() => setRemoving(r.id)}>
                      Remove
                    </button>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>

      <section className="rooms-add" aria-labelledby="rooms-add-title">
        <h3 id="rooms-add-title" className="rooms-add-title">
          {full ? `That's ${MAX_ROOMS} rooms, the most a home can have` : 'Add a room'}
        </h3>
        {!full && (
          <div className="rooms-add-row">
            {ROOM_CHOICES.map((type) => {
              // A kind the home already has reads "Another bedroom", so it never looks like a duplicate by mistake.
              const again = rooms.some((r) => r.type === type)
              const label = again ? `Another ${ROOM_LABEL[type].toLowerCase()}` : ROOM_LABEL[type]
              return (
                <button key={type} type="button" className="btn rooms-add-btn" aria-label={`Add ${again ? 'another' : 'a'} ${ROOM_LABEL[type].toLowerCase()}`} onClick={() => onAdd(type)}>
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

/** The current room's name over the room picture; opens the rooms sheet. Late chores in other rooms show as a count. */
export function RoomPill({ name, lateElsewhere, onOpen }: { name: string; lateElsewhere: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="room-pill"
      title={lateElsewhere ? `${plural(lateElsewhere, 'chore', 'chores')} late in other rooms` : undefined}
      aria-label={`Rooms: ${name}${lateElsewhere ? `. ${plural(lateElsewhere, 'chore', 'chores')} late in other rooms` : ''}`}
      onClick={onOpen}
    >
      <span>{name}</span>
      <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true" focusable="false">
        <path d="M1.5 1.5L6 6l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {lateElsewhere > 0 && (
        <span className="room-pill-late" aria-hidden="true">
          {lateElsewhere}
        </span>
      )}
    </button>
  )
}
