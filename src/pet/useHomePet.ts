import { useLayoutEffect, useRef, useState } from 'react'
import { catalogEntry } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import type { RoomConnection } from '../room/connections'
import { footprintOf, freeTile } from '../room/grid'
import type { HomeLayout } from '../room/homeLayout'
import { findHomePath, type RoomWaypoint } from './homeTravel'

interface Journey { id: number; homeId: string; path: RoomWaypoint[]; arrivalNotice?: string }

/** The pet has a position of its own; selecting a room requests a route to it. */
export function useHomePet(homeId: string | undefined, targetId: string | null, layout: HomeLayout, connections: RoomConnection[], objects: PlacedObject[], names: Record<string, string>, petName: string, view: string) {
  const [settled, setSettled] = useState<{ homeId: string; at: RoomWaypoint } | null>(null)
  const [journey, setJourney] = useState<Journey | null>(null)
  const [notice, setNotice] = useState('')
  const current = useRef<{ homeId: string; at: RoomWaypoint } | null>(null)
  const serial = useRef(0)
  const fallbackId = targetId ?? layout.rooms[0]?.id
  const fallbackTile = freeTile(objects.filter((object) => object.roomId === fallbackId).flatMap((object) => {
    const entry = catalogEntry(object.catalogId)
    return entry?.layer === 'solid' ? [footprintOf(object, entry)] : []
  }))
  const position = settled && settled.homeId === homeId && layout.rooms.some((room) => room.id === settled.at.roomId)
    ? settled.at : fallbackId && fallbackTile ? { roomId: fallbackId, ...fallbackTile } : null

  function onPosition(at: RoomWaypoint) {
    if (homeId) current.current = { homeId, at }
  }

  function go(toRoomId: string, source?: RoomWaypoint) {
    if (!homeId || !position) return
    const live = current.current
    const from = source ?? (live?.homeId === homeId && layout.rooms.some((room) => room.id === live.at.roomId) ? live.at : position)
    const path = findHomePath(layout, connections, objects, from, toRoomId)
    serial.current++
    setSettled({ homeId, at: from })
    if (!path) {
      const blocked = `${petName}'s path to ${names[toRoomId]} is blocked. Move furniture out of the way.`
      // A cancelled run can leave the pet between tiles. Finish that small step
      // before handing it back to the room's tile-based wandering behaviour.
      const settle = findHomePath(layout, connections, objects, from, from.roomId)
      setJourney(settle && settle.length > 1 ? { id: serial.current, homeId, path: settle, arrivalNotice: blocked } : null)
      setNotice(blocked)
    } else if (path.length <= 1) {
      setJourney(null)
      setNotice('')
    } else {
      setJourney({ id: serial.current, homeId, path })
      setNotice(`${petName} is running to ${names[toRoomId]}.`)
    }
  }

  function arrive(id: number, at: RoomWaypoint) {
    if (!homeId || id !== serial.current) return
    onPosition(at)
    setSettled({ homeId, at })
    setJourney(null)
    setNotice(journey?.arrivalNotice ?? `${petName} arrived in ${names[at.roomId]}.`)
  }

  function pause() {
    const live = current.current
    serial.current++
    if (homeId && live?.homeId === homeId) setSettled(live)
    setJourney(null)
    setNotice('')
  }

  // Re-plan after room/furniture changes commit and before painting: an old
  // traveller must not draw its departure point again when the layout changes.
  const worldKey = JSON.stringify([homeId, targetId, view, layout.rooms.map((room) => room.id), objects.map((object) => [object.id, object.roomId, object.catalogId, object.tileX, object.tileY, object.rotation])])
  useLayoutEffect(() => {
    if (!targetId || (view !== 'home' && view !== 'build')) return
    const live = current.current
    const source = live && live.homeId === homeId && layout.rooms.some((room) => room.id === live.at.roomId) ? live.at : position
    go(targetId, source ?? undefined)
    // worldKey includes all routing inputs; animation updates must not restart the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldKey])

  const activeJourney = journey && journey.homeId === homeId && journey.path.every((point) => layout.rooms.some((room) => room.id === point.roomId)) ? journey : null
  return { position, journey: activeJourney, notice, onPosition, go, arrive, pause }
}
