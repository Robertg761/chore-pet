import { catalogEntry } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import { footprintOf, overlaps, type Footprint } from './grid'
import type { HomeLayout } from './homeLayout'
import { ROOM_TILES } from './shell/geometry'

/** Room-local tile boundaries: west is tx=0, north is ty=0. */
export type RoomSide = 'west' | 'north' | 'east' | 'south'

export interface RoomConnection {
  id: string
  aRoomId: string
  bRoomId: string
  aSide: RoomSide
  bSide: RoomSide
  start: number
  end: number
  blocked: boolean
  blockerIds: string[]
}

export interface RoomDoor {
  side: RoomSide
  toRoomId: string
  start: number
  end: number
  blocked: boolean
}

/** Each neighbouring pair shares one fixed opening; furniture never relocates it. */
export function roomConnections(layout: HomeLayout, objects: readonly PlacedObject[]): RoomConnection[] {
  const cells = new Map(layout.rooms.map((room) => [`${room.col},${room.row}`, room]))
  const obstacles = new Map<string, { id: string; footprint: Footprint }[]>()
  for (const object of objects) {
    const entry = catalogEntry(object.catalogId)
    if (!entry || entry.layer === 'flat') continue
    const roomObjects = obstacles.get(object.roomId) ?? []
    roomObjects.push({ id: object.id, footprint: footprintOf(object, entry) })
    obstacles.set(object.roomId, roomObjects)
  }
  const connections: RoomConnection[] = []
  for (const room of layout.rooms) {
    for (const [dc, dr, aSide, bSide] of [[1, 0, 'east', 'west'], [0, 1, 'south', 'north']] as const) {
      const neighbour = cells.get(`${room.col + dc},${room.row + dr}`)
      if (!neighbour) continue
      // 4..6 leaves the west-wall window at 1.8..3.6 intact.
      const start = 4
      const end = 6
      const blockerIds = [
        ...(obstacles.get(room.id) ?? []).filter(({ footprint }) => overlaps(footprint, doorwayFootprint({ side: aSide, start, end }))),
        ...(obstacles.get(neighbour.id) ?? []).filter(({ footprint }) => overlaps(footprint, doorwayFootprint({ side: bSide, start, end }))),
      ].map(({ id }) => id)
      connections.push({
        id: JSON.stringify([room.id, neighbour.id]),
        aRoomId: room.id, bRoomId: neighbour.id, aSide, bSide, start, end,
        blocked: blockerIds.length > 0, blockerIds,
      })
    }
  }
  return connections
}

/** Describe the same opening in each room's local tile coordinates. */
export function doorsForRoom(connections: readonly RoomConnection[], roomId: string): RoomDoor[] {
  return connections.flatMap(({ aRoomId, bRoomId, aSide, bSide, start, end, blocked }) => {
    if (aRoomId === roomId) return [{ side: aSide, toRoomId: bRoomId, start, end, blocked }]
    if (bRoomId === roomId) return [{ side: bSide, toRoomId: aRoomId, start, end, blocked }]
    return []
  })
}

/** Keep a full tile of floor clear inside the doorway for entering or leaving. */
export function doorwayFootprint({ side, start, end }: Pick<RoomDoor, 'side' | 'start' | 'end'>): Footprint {
  switch (side) {
    case 'west': return { tx: 0, ty: start, w: 1, d: end - start }
    case 'north': return { tx: start, ty: 0, w: end - start, d: 1 }
    case 'east': return { tx: ROOM_TILES - 1, ty: start, w: 1, d: end - start }
    case 'south': return { tx: start, ty: ROOM_TILES - 1, w: end - start, d: 1 }
  }
}
