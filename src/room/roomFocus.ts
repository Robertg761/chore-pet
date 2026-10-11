import type { Room, RoomType } from '../domain/types'

export const ROOM_TYPE_NAMES: Record<RoomType, string> = {
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  living: 'Living room',
  other: 'Room',
}

export interface RoomFocusStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Names follow the home's room order, like the numbered objects in the editor. */
export function roomNames(rooms: readonly Room[]): Record<string, string> {
  const seen = new Map<RoomType, number>()
  return Object.fromEntries(rooms.map((room) => {
    const count = (seen.get(room.type) ?? 0) + 1
    seen.set(room.type, count)
    const name = ROOM_TYPE_NAMES[room.type]
    return [room.id, count > 1 ? `${name} ${count}` : name]
  }))
}

/** A deleted room, another home's preference, or first launch returns to the first room. */
export function resolveFocusedRoomId(rooms: readonly Room[], preferredId?: string | null): string | null {
  return rooms.find((room) => room.id === preferredId)?.id ?? rooms[0]?.id ?? null
}

const focusKey = (homeId: string) => `chore-pet:focused-room:${homeId}`

function defaultStorage(): RoomFocusStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readFocusedRoomId(homeId: string, storage: RoomFocusStorage | null = defaultStorage()): string | null {
  try {
    return storage?.getItem(focusKey(homeId)) || null
  } catch {
    return null
  }
}

export function writeFocusedRoomId(homeId: string, roomId: string, storage: RoomFocusStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(focusKey(homeId), roomId)
  } catch {
    // Focus still changes for this visit when this browser cannot save preferences.
  }
}

/** Existing rooms keep their places; new rooms follow them in the incoming order. */
export function orderRooms(rooms: readonly Room[], preferredIds: readonly string[]): Room[] {
  const remaining = new Map(rooms.map((room) => [room.id, room]))
  const ordered: Room[] = []
  for (const id of preferredIds) {
    const room = remaining.get(id)
    if (!room) continue
    ordered.push(room)
    remaining.delete(id)
  }
  return [...ordered, ...remaining.values()]
}

const orderKey = (homeId: string) => `chore-pet:room-order:${homeId}`

export function readRoomOrder(homeId: string, storage: RoomFocusStorage | null = defaultStorage()): string[] {
  try {
    const value: unknown = JSON.parse(storage?.getItem(orderKey(homeId)) ?? 'null')
    if (!Array.isArray(value)) return []
    return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
  } catch {
    return []
  }
}

export function writeRoomOrder(homeId: string, ids: readonly string[], storage: RoomFocusStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(orderKey(homeId), JSON.stringify(ids))
  } catch {
    // The in-memory order can still stay stable when this preference cannot be saved.
  }
}
