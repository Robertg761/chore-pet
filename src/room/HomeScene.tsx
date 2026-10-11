import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { NeglectLevel } from '../domain/neglect'
import type { MessStage, PlacedObject, Room as RoomRow } from '../domain/types'
import { homeLayout, fitHome } from './homeLayout'
import { Room } from './Room'
import { roomNames } from './roomFocus'
import { SceneContext } from './sceneContext'
import { ROOM_VIEWBOX } from './shell/geometry'
import { RoomDoorControls } from './shell/RoomShell'
import { doorsForRoom, type RoomConnection } from './connections'
import './HomeScene.css'

interface HomeSceneProps {
  rooms: RoomRow[]
  objects: PlacedObject[]
  focusedRoomId: string
  onFocus: (id: string) => void
  /** The single living pet or room editor. Other rooms are quiet previews. */
  focusedRoom: ReactNode
  residentRoomId?: string
  residentRoom?: ReactNode
  overlay?: ReactNode
  connections: RoomConnection[]
  travelNotice?: string
  stages: Record<string, MessStage>
  neglect: Record<string, NeglectLevel>
  overdue: Record<string, number>
}

export function HomeScene({ rooms, objects, focusedRoomId, onFocus, focusedRoom, residentRoomId, residentRoom, overlay, connections, travelNotice, stages, neglect, overdue }: HomeSceneProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const roomLabels = useRef(new Map<string, HTMLButtonElement>())
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [bubbleContainer, setBubbleContainer] = useState<HTMLDivElement | null>(null)
  const roomKey = JSON.stringify(rooms.map((room) => room.id))
  const layout = useMemo(() => homeLayout(JSON.parse(roomKey) as string[]), [roomKey])
  const names = roomNames(rooms)
  // Labels keep their touch size while the room art shrinks.
  const labelSpace = 44
  const fit = fitHome(size.width, Math.max(0, size.height - labelSpace), layout)
  const scale = fit * zoom
  const compact = scale < 0.5
  const maxZoom = fit > 0 ? Math.max(3, 320 / (fit * ROOM_VIEWBOX.width)) : 3
  const width = layout.width * scale
  const height = layout.height * scale + labelSpace
  const focusedPosition = layout.rooms.find((room) => room.id === focusedRoomId)
  const focusedDoors = doorsForRoom(connections, focusedRoomId)

  function enterDoor(id: string) {
    onFocus(id)
    // The old doorway leaves the tab order on entry. Keep keyboard focus in the home.
    requestAnimationFrame(() => roomLabels.current.get(id)?.focus({ preventScroll: true }))
  }

  useLayoutEffect(() => {
    const node = viewport.current
    if (!node) return
    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Centre a selected room when zoomed in; at Fit home every room is already visible.
  useLayoutEffect(() => {
    const node = viewport.current
    const at = layout.rooms.find((room) => room.id === focusedRoomId)
    if (!node || !at) return
    node.scrollTo({
      left: zoom === 1 ? 0 : (at.x + ROOM_VIEWBOX.width / 2) * scale - size.width / 2,
      top: zoom === 1 ? 0 : (at.y + ROOM_VIEWBOX.height / 2) * scale - size.height / 2,
      behavior: 'instant',
    })
  }, [focusedRoomId, zoom, scale, size.width, size.height, layout])

  return (
    <div className="home-scene" role="group" aria-label="Your home" data-compact={compact}>
      <div className="home-scene-tools" role="group" aria-label="Home view">
        <span className="home-scene-hint">Tap a room to focus</span>
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))}>−</button>
        <button type="button" onClick={() => setZoom(1)}>Fit home</button>
        <button type="button" aria-label="Zoom in" disabled={zoom >= maxZoom} onClick={() => setZoom((value) => Math.min(maxZoom, value + 0.5))}>+</button>
      </div>
      {compact && focusedDoors.length > 0 && (
        <div className="home-scene-door-links" role="group" aria-label="Room doors">
          {focusedDoors.map((door) => (
            <button
              key={`${door.side}-${door.toRoomId}`}
              type="button"
              className="room-door room-door-hit room-door-link"
              data-door-to={door.toRoomId}
              aria-label={`Door to ${names[door.toRoomId]}${door.blocked ? ', blocked by furniture' : ''}`}
              aria-disabled={door.blocked || undefined}
              onClick={() => { if (!door.blocked) enterDoor(door.toRoomId) }}
            >
              <span aria-hidden="true">{door.blocked ? '×' : '→'}</span> {names[door.toRoomId]}
            </button>
          ))}
        </div>
      )}
      <div className="home-scene-viewport" ref={viewport}>
        <div className="home-scene-space" style={{ width: Math.max(size.width, width), height: Math.max(size.height, height) }}>
          <div className="home-scene-world" style={{
            width: layout.width, height: layout.height,
            left: Math.max(0, (size.width - width) / 2), top: Math.max(0, (size.height - height) / 2),
            transform: `scale(${scale})`, '--scene-scale': scale || 1,
          } as CSSProperties}>
            {layout.rooms.map((position) => {
              const room = rooms.find((row) => row.id === position.id)!
              const focused = room.id === focusedRoomId
              return (
                <div
                  key={room.id}
                  className="home-scene-room"
                  data-room-id={room.id}
                  data-focused={focused}
                  style={{ left: position.x, top: position.y, width: ROOM_VIEWBOX.width, height: ROOM_VIEWBOX.height, zIndex: position.depth }}
                >
                  <div className="home-scene-art" onClick={focused ? undefined : () => onFocus(room.id)}>
                    <SceneContext.Provider value={{ scale, bubbleContainer, doors: doorsForRoom(connections, room.id), focused, doorLabel: (id) => names[id] }}>
                    {residentRoom && residentRoomId === room.id ? residentRoom : focused ? focusedRoom : (
                      <Room
                        room={room}
                        objects={objects.filter((object) => object.roomId === room.id)}
                        stages={stages}
                        neglect={neglect}
                        overdue={overdue}
                        svgProps={{ 'aria-hidden': true }}
                      />
                    )}
                    </SceneContext.Provider>
                  </div>
                  <button ref={(node) => { if (node) roomLabels.current.set(room.id, node); else roomLabels.current.delete(room.id) }} type="button" className="home-scene-label" aria-label={`Focus ${names[room.id]}`} aria-pressed={focused} onClick={() => onFocus(room.id)}>
                    {focused && <span className="home-scene-diamond" aria-hidden="true" />}
                    {names[room.id]}
                  </button>
                </div>
              )
            })}
            {!compact && focusedPosition && focusedDoors.length > 0 && (
              <svg className="home-scene-doors" viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="group" aria-label="Room doors">
                <g transform={`translate(${focusedPosition.x - ROOM_VIEWBOX.x} ${focusedPosition.y - ROOM_VIEWBOX.y})`}>
                  <RoomDoorControls doors={focusedDoors} onDoor={enterDoor} doorLabel={(id) => names[id]} interactionScale={scale} />
                </g>
              </svg>
            )}
            {overlay}
          </div>
        </div>
      </div>
      <div className="home-scene-dialogue" ref={setBubbleContainer} />
      <p className="home-scene-travel-status" role="status">{travelNotice || '\u00a0'}</p>
      <p className="visually-hidden" role="status">{names[focusedRoomId]} focused</p>
    </div>
  )
}
