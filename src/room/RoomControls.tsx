import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Room, RoomType } from '../domain/types'
import { ROOM_TYPE_NAMES, resolveFocusedRoomId, roomNames } from './roomFocus'
import './RoomControls.css'

export interface RoomControlsProps {
  rooms: Room[]
  focusedRoomId: string
  onFocus: (id: string) => void
  onAdd?: (type: RoomType) => void
}

const ROOM_TYPES: RoomType[] = ['kitchen', 'bedroom', 'bathroom', 'living', 'other']

export function RoomControls({ rooms, focusedRoomId, onFocus, onAdd }: RoomControlsProps) {
  const uid = useId()
  const names = roomNames(rooms)
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState<RoomType>('kitchen')
  const addRef = useRef<HTMLButtonElement>(null)
  const typeRef = useRef<HTMLSelectElement>(null)
  const focusRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (adding) typeRef.current?.focus()
  }, [adding])

  const close = () => {
    setAdding(false)
    addRef.current?.focus()
  }

  const toggle = () => {
    if (adding) close()
    else {
      setType(ROOM_TYPES.find((type) => !rooms.some((room) => room.type === type)) ?? 'other')
      setAdding(true)
    }
  }

  const create = (event: FormEvent) => {
    event.preventDefault()
    if (!onAdd) return
    onAdd(type)
    setAdding(false)
    focusRef.current?.focus()
  }

  const cancelOnEscape = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    close()
  }

  return (
    <section className="room-controls" aria-label="Rooms">
      <div className="room-controls-row">
        <label className="room-controls-focus" htmlFor={`${uid}-focus`}>
          <span>Focused room</span>
          <select
            ref={focusRef}
            id={`${uid}-focus`}
            className="field"
            value={resolveFocusedRoomId(rooms, focusedRoomId) ?? ''}
            disabled={rooms.length === 0}
            onChange={(event) => onFocus(event.target.value)}
          >
            {rooms.map((room) => <option key={room.id} value={room.id}>{names[room.id]}</option>)}
          </select>
        </label>
        {onAdd && (
          <button
            ref={addRef}
            type="button"
            className="btn btn-sm room-controls-add"
            aria-expanded={adding}
            aria-controls={adding ? `${uid}-create` : undefined}
            onClick={toggle}
          >
            <span aria-hidden="true">+</span> Add room
          </button>
        )}
      </div>
      {onAdd && adding && (
        <form id={`${uid}-create`} className="room-controls-create" aria-label="Add a room" onSubmit={create} onKeyDown={cancelOnEscape}>
          <label className="room-controls-type" htmlFor={`${uid}-type`}>
            <span>Room type</span>
            <select ref={typeRef} id={`${uid}-type`} className="field" value={type} onChange={(event) => setType(event.target.value as RoomType)}>
              {ROOM_TYPES.map((type) => <option key={type} value={type}>{ROOM_TYPE_NAMES[type]}</option>)}
            </select>
          </label>
          <button type="submit" className="btn btn-primary btn-sm">Create room</button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={close}>Cancel</button>
        </form>
      )}
    </section>
  )
}
