import { catalogEntry } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import type { RoomConnection, RoomSide } from '../room/connections'
import { footprintOf, overlaps, ROOM_SIZE, type Footprint } from '../room/grid'
import type { HomeLayout } from '../room/homeLayout'
import { ROOM_VIEWBOX, roomPoint } from '../room/shell/geometry'

/** Tile coordinates locate tile centres, just like the room's wandering pet. */
export interface RoomWaypoint {
  roomId: string
  tx: number
  ty: number
}

/** Keep continuous floor coordinates while room ownership changes at a doorway. */
export function homePositionBetween(layout: HomeLayout, from: RoomWaypoint, to: RoomWaypoint, progress: number): RoomWaypoint {
  const a = layout.rooms.find((room) => room.id === from.roomId)
  const b = layout.rooms.find((room) => room.id === to.roomId)
  if (!a || !b) return from
  const fraction = Math.min(1, Math.max(0, progress))
  const tx = a.col * ROOM_SIZE + from.tx + (b.col * ROOM_SIZE + to.tx - a.col * ROOM_SIZE - from.tx) * fraction
  const ty = a.row * ROOM_SIZE + from.ty + (b.row * ROOM_SIZE + to.ty - a.row * ROOM_SIZE - from.ty) * fraction
  const inDestination = { roomId: b.id, tx: tx - b.col * ROOM_SIZE, ty: ty - b.row * ROOM_SIZE }
  return insideFloor(inDestination) ? inDestination : { roomId: a.id, tx: tx - a.col * ROOM_SIZE, ty: ty - a.row * ROOM_SIZE }
}

const key = ({ roomId, tx, ty }: RoomWaypoint) => JSON.stringify([roomId, tx, ty])
const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const
const directions: Record<RoomSide, { col: number; row: number; opposite: RoomSide }> = {
  east: { col: 1, row: 0, opposite: 'west' }, west: { col: -1, row: 0, opposite: 'east' },
  south: { col: 0, row: 1, opposite: 'north' }, north: { col: 0, row: -1, opposite: 'south' },
}

function inside({ tx, ty }: RoomWaypoint): boolean {
  return Number.isFinite(tx) && Number.isFinite(ty) && tx >= 0 && ty >= 0 && tx <= ROOM_SIZE - 1 && ty <= ROOM_SIZE - 1
}

function insideFloor({ tx, ty }: RoomWaypoint): boolean {
  return Number.isFinite(tx) && Number.isFinite(ty) && tx >= -0.5 && ty >= -0.5 && tx <= ROOM_SIZE - 0.5 && ty <= ROOM_SIZE - 0.5
}

function doorTile(roomId: string, side: RoomSide, lane: number): RoomWaypoint {
  switch (side) {
    case 'west': return { roomId, tx: 0, ty: lane }
    case 'east': return { roomId, tx: ROOM_SIZE - 1, ty: lane }
    case 'north': return { roomId, tx: lane, ty: 0 }
    case 'south': return { roomId, tx: lane, ty: ROOM_SIZE - 1 }
  }
}

/** Whether a short initial move from the drawn position enters solid furniture. */
function crossesSolid(from: RoomWaypoint, to: RoomWaypoint, solid: Footprint): boolean {
  let enter = 0
  let exit = 1
  for (const [start, delta, min, max] of [
    [from.tx + 0.5, to.tx - from.tx, solid.tx, solid.tx + solid.w],
    [from.ty + 0.5, to.ty - from.ty, solid.ty, solid.ty + solid.d],
  ]) {
    if (delta === 0) {
      if (start <= min || start >= max) return false
      continue
    }
    const a = (min - start) / delta
    const b = (max - start) / delta
    enter = Math.max(enter, Math.min(a, b))
    exit = Math.min(exit, Math.max(a, b))
    if (enter >= exit) return false
  }
  return enter < exit
}

function tracePath(to: RoomWaypoint, previous: Map<string, RoomWaypoint | null>): RoomWaypoint[] {
  const path: RoomWaypoint[] = []
  for (let cursor: RoomWaypoint | null = to; cursor; cursor = previous.get(key(cursor)) ?? null) path.push(cursor)
  return path.reverse()
}

/** Pick clear floor near the centre from the tiles reachable through the chosen entrance. */
function intoRoom(entry: RoomWaypoint, free: (point: RoomWaypoint) => boolean): RoomWaypoint[] {
  const previous = new Map<string, RoomWaypoint | null>([[key(entry), null]])
  const queue = [entry]
  const centre = (ROOM_SIZE - 1) / 2
  const distance = ({ tx, ty }: RoomWaypoint) => Math.abs(tx - centre) + Math.abs(ty - centre)
  let goal = entry
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index]
    if (distance(point) < distance(goal)) goal = point
    for (const [dx, dy] of steps) {
      const next = { roomId: point.roomId, tx: point.tx + dx, ty: point.ty + dy }
      if (!free(next) || previous.has(key(next))) continue
      previous.set(key(next), point)
      queue.push(next)
    }
  }
  return tracePath(goal, previous).slice(1)
}

/** Shortest tile route through actual door openings, including the exact starting position. */
export function findHomePath(
  layout: HomeLayout,
  connections: readonly RoomConnection[],
  objects: readonly PlacedObject[],
  from: RoomWaypoint,
  toRoomId: string,
): RoomWaypoint[] | null {
  const rooms = new Map(layout.rooms.map((room) => [room.id, room]))
  if (!rooms.has(from.roomId) || !rooms.has(toRoomId) || !insideFloor(from)) return null

  const solids = new Map<string, Footprint[]>()
  for (const object of objects) {
    const entry = catalogEntry(object.catalogId)
    if (!entry || entry.layer !== 'solid') continue
    const roomSolids = solids.get(object.roomId) ?? []
    roomSolids.push(footprintOf(object, entry))
    solids.set(object.roomId, roomSolids)
  }
  const free = (point: RoomWaypoint) => inside(point) && !(solids.get(point.roomId) ?? []).some((solid) => overlaps(solid, { ...point, w: 1, d: 1 }))
  if (from.roomId === toRoomId && Number.isInteger(from.tx) && Number.isInteger(from.ty) && free(from)) return [from]

  const crossings = new Map<string, RoomWaypoint[]>()
  for (const connection of connections) {
    if (connection.blocked) continue
    const aRoom = rooms.get(connection.aRoomId)
    const bRoom = rooms.get(connection.bRoomId)
    const direction = directions[connection.aSide]
    if (!aRoom || !bRoom || connection.bSide !== direction.opposite || bRoom.col - aRoom.col !== direction.col || bRoom.row - aRoom.row !== direction.row) continue
    for (let lane = 0; lane < ROOM_SIZE; lane++) {
      if (lane + 0.5 < connection.start || lane + 0.5 >= connection.end) continue
      const a = doorTile(aRoom.id, connection.aSide, lane)
      const b = doorTile(bRoom.id, connection.bSide, lane)
      if (!free(a) || !free(b)) continue
      crossings.set(key(a), [...(crossings.get(key(a)) ?? []), b])
      crossings.set(key(b), [...(crossings.get(key(b)) ?? []), a])
    }
  }

  // Join either adjacent tile from a fractional position. At a threshold, the
  // second tile belongs to the neighbour and still needs a real clear doorway.
  const previous = new Map<string, RoomWaypoint | null>()
  const costs = new Map<string, number>()
  const queue: RoomWaypoint[] = []
  for (const tx of new Set([Math.floor(from.tx), Math.ceil(from.tx)])) for (const ty of new Set([Math.floor(from.ty), Math.ceil(from.ty)])) {
    const local = { roomId: from.roomId, tx, ty }
    let candidate = local
    if (!inside(local)) {
      const edge = { roomId: from.roomId, tx: Math.max(0, Math.min(ROOM_SIZE - 1, tx)), ty: Math.max(0, Math.min(ROOM_SIZE - 1, ty)) }
      const sourceRoom = rooms.get(from.roomId)!
      const across = (crossings.get(key(edge)) ?? []).find((point) => {
        const room = rooms.get(point.roomId)!
        return point.tx + (room.col - sourceRoom.col) * ROOM_SIZE === tx && point.ty + (room.row - sourceRoom.row) * ROOM_SIZE === ty
      })
      if (!across) continue
      candidate = across
    }
    if (!free(candidate) || (solids.get(from.roomId) ?? []).some((solid) => crossesSolid(from, local, solid))) continue
    previous.set(key(candidate), null)
    costs.set(key(candidate), Math.hypot(tx - from.tx, ty - from.ty))
    queue.push(candidate)
  }

  const visited = new Set<string>()
  while (queue.length) {
    queue.sort((a, b) => costs.get(key(a))! - costs.get(key(b))!)
    const point = queue.shift()!
    if (visited.has(key(point))) continue
    visited.add(key(point))
    if (point.roomId === toRoomId) {
      const path = tracePath(point, previous)
      if (key(path[0]) !== key(from)) path.unshift(from)
      if (from.roomId !== toRoomId) path.push(...intoRoom(point, free))
      return path
    }
    const neighbours = [
      ...steps.map(([dx, dy]) => ({ roomId: point.roomId, tx: point.tx + dx, ty: point.ty + dy })),
      ...(crossings.get(key(point)) ?? []),
    ]
    for (const next of neighbours) {
      const cost = costs.get(key(point))! + 1
      if (!free(next) || visited.has(key(next)) || cost >= (costs.get(key(next)) ?? Infinity)) continue
      previous.set(key(next), point)
      costs.set(key(next), cost)
      queue.push(next)
    }
  }
  return null
}

/** The feet's scene coordinates, accounting for each room SVG's viewBox origin. */
export function homeWaypointPoint(layout: HomeLayout, point: RoomWaypoint): { x: number; y: number } | null {
  const room = layout.rooms.find((room) => room.id === point.roomId)
  if (!room) return null
  const feet = roomPoint(point.tx + 0.5, point.ty + 0.5)
  return { x: room.x + feet.x - ROOM_VIEWBOX.x, y: room.y + feet.y - ROOM_VIEWBOX.y }
}
