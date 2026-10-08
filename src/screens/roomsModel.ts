import type { ChoreStatus } from '../domain/schedule'
import type { Chore, PlacedObject, Room, RoomType } from '../domain/types'
import { placeNames } from './manageModel'

// A home can have several rooms. These are the pure rules for naming,
// ordering and summing them up; the UI only lays them out.

/** Most rooms a home can have: plenty for a flat, and the switcher stays one short list. */
export const MAX_ROOMS = 6

/** The kinds of room a player can add, in the order they're offered. */
export const ROOM_CHOICES: RoomType[] = ['kitchen', 'bathroom', 'bedroom', 'living']

export const ROOM_LABEL: Record<RoomType, string> = { kitchen: 'Kitchen', bathroom: 'Bathroom', bedroom: 'Bedroom', living: 'Living room', other: 'Room' }

const ORDER: RoomType[] = ['kitchen', 'living', 'bedroom', 'bathroom', 'other']
/** A kind this version doesn't know sorts last. */
const rank = (t: RoomType) => (ORDER.includes(t) ? ORDER.indexOf(t) : ORDER.length)

/** Rooms in a stable order every device agrees on: by kind (kitchen first, as every home starts), then by id. */
export function orderRooms(rooms: readonly Room[]): Room[] {
  return [...rooms].sort((a, b) => rank(a.type) - rank(b.type) || a.id.localeCompare(b.id))
}

/** "Kitchen", "Bedroom", "Bedroom 2": each room's name by kind, numbered when a kind repeats. */
export function roomNames(rooms: readonly Room[]): Map<string, string> {
  const seen = new Map<RoomType, number>()
  const names = new Map<string, string>()
  for (const r of rooms) {
    const n = (seen.get(r.type) ?? 0) + 1
    seen.set(r.type, n)
    names.set(r.id, n > 1 ? `${ROOM_LABEL[r.type] ?? 'Room'} ${n}` : (ROOM_LABEL[r.type] ?? 'Room'))
  }
  return names
}

/** The room on show: the one picked before if it still exists, else the first. */
export function currentRoom(rooms: readonly Room[], pickedId: string | null): Room | undefined {
  return rooms.find((r) => r.id === pickedId) ?? rooms[0]
}

/** How many late chores sit on each room's things, by room id (rooms with none are left out). */
export function lateByRoom(objects: readonly PlacedObject[], chores: readonly Chore[], statuses: readonly ChoreStatus[]): Map<string, number> {
  const roomOf = new Map(objects.map((o) => [o.id, o.roomId]))
  const choreRoom = new Map(chores.map((c) => [c.id, c.objectId ? roomOf.get(c.objectId) : undefined]))
  const late = new Map<string, number>()
  for (const s of statuses) {
    if (s.state !== 'overdue') continue
    const room = choreRoom.get(s.choreId)
    if (room) late.set(room, (late.get(room) ?? 0) + 1)
  }
  return late
}

/**
 * Places a chore can belong to, across every room: named like the catalog
 * ("Rug 2" when one room has two), with the room added once there are several
 * ("Sink, Kitchen").
 */
export function placesAcrossRooms(rooms: readonly Room[], objects: readonly PlacedObject[]): { id: string; name: string }[] {
  const names = roomNames(rooms)
  return rooms.flatMap((r) => {
    const here = placeNames(objects.filter((o) => o.roomId === r.id))
    return rooms.length > 1 ? here.map((p) => ({ ...p, name: `${p.name}, ${names.get(r.id)}` })) : here
  })
}
