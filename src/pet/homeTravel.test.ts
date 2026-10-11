import { describe, expect, it } from 'vitest'
import type { PlacedObject } from '../domain/types'
import { findHomePath, homePositionBetween, homeWaypointPoint } from './homeTravel'

const layout = {
  rooms: [
    { id: 'a', col: 0, row: 0, x: 186, y: 16, depth: 0 },
    { id: 'b', col: 1, row: 0, x: 356, y: 101, depth: 1 },
    { id: 'c', col: 0, row: 1, x: 16, y: 101, depth: 1 },
    { id: 'd', col: 1, row: 1, x: 186, y: 186, depth: 2 },
  ],
  width: 780,
  height: 600,
}
type Side = 'west' | 'north' | 'east' | 'south'
const door = (aRoomId: string, bRoomId: string, aSide: Side = 'east', bSide: Side = 'west', blocked = false) => ({
  id: `${aRoomId}-${bRoomId}`, aRoomId, bRoomId, aSide, bSide, start: 4, end: 6, blocked, blockerIds: [],
})
const object = (roomId: string, tileX: number, tileY: number, catalogId = 'trash', rotation: PlacedObject['rotation'] = 0): PlacedObject => ({
  id: `${roomId}-${tileX}-${tileY}`, roomId, catalogId, tileX, tileY, rotation,
})

describe('home routes', () => {
  it('crosses the connecting door through adjacent floor tiles', () => {
    expect(findHomePath(layout, [door('a', 'b')], [], { roomId: 'a', tx: 6, ty: 4 }, 'b')?.slice(0, 3)).toEqual([
      { roomId: 'a', tx: 6, ty: 4 },
      { roomId: 'a', tx: 7, ty: 4 },
      { roomId: 'b', tx: 0, ty: 4 },
    ])
  })

  it('uses the same doorway in the other direction', () => {
    expect(findHomePath(layout, [door('a', 'b')], [], { roomId: 'b', tx: 0, ty: 5 }, 'a')?.slice(0, 2)).toEqual([
      { roomId: 'b', tx: 0, ty: 5 }, { roomId: 'a', tx: 7, ty: 5 },
    ])
  })

  it('crosses south and north doors with the correct tile axis', () => {
    const connections = [door('a', 'c', 'south', 'north')]
    expect(findHomePath(layout, connections, [], { roomId: 'a', tx: 5, ty: 7 }, 'c')?.slice(0, 2)).toEqual([
      { roomId: 'a', tx: 5, ty: 7 }, { roomId: 'c', tx: 5, ty: 0 },
    ])
    expect(findHomePath(layout, connections, [], { roomId: 'c', tx: 4, ty: 0 }, 'a')?.slice(0, 2)).toEqual([
      { roomId: 'c', tx: 4, ty: 0 }, { roomId: 'a', tx: 4, ty: 7 },
    ])
  })

  it('walks to the opening instead of crossing the wall beside it', () => {
    const path = findHomePath(layout, [door('a', 'b')], [], { roomId: 'a', tx: 7, ty: 1 }, 'b')!
    expect(path.slice(3, 5)).toEqual([{ roomId: 'a', tx: 7, ty: 4 }, { roomId: 'b', tx: 0, ty: 4 }])
    expect(path.at(-1)).toEqual({ roomId: 'b', tx: 3, ty: 4 })
  })

  it('never crosses rooms with missing, blocked, or physically mismatched doors', () => {
    const from = { roomId: 'a', tx: 7, ty: 4 }
    expect(findHomePath(layout, [], [], from, 'b')).toBeNull()
    expect(findHomePath(layout, [door('a', 'b', 'east', 'west', true)], [], from, 'b')).toBeNull()
    expect(findHomePath(layout, [door('a', 'd')], [], from, 'd')).toBeNull()
  })

  it('takes another connected room when the direct doorway is blocked', () => {
    const connections = [door('a', 'b', 'east', 'west', true), door('a', 'c', 'south', 'north'), door('c', 'd'), door('b', 'd', 'south', 'north')]
    const path = findHomePath(layout, connections, [], { roomId: 'a', tx: 4, ty: 7 }, 'b')!
    expect([...new Set(path.map((point) => point.roomId))]).toEqual(['a', 'c', 'd', 'b'])
    expect(path.find((point) => point.roomId === 'b')).toEqual({ roomId: 'b', tx: 4, ty: 7 })
  })

  it('walks around solid furniture and can cross a rug', () => {
    const objects = [object('a', 6, 4), object('a', 6, 5), object('a', 6, 2, 'rug')]
    const path = findHomePath(layout, [door('a', 'b')], objects, { roomId: 'a', tx: 5, ty: 4 }, 'b')!
    expect(path.findIndex((point) => point.roomId === 'b')).toBe(5)
    expect(path).toContainEqual({ roomId: 'a', tx: 6, ty: 3 })
    expect(path).not.toContainEqual({ roomId: 'a', tx: 6, ty: 4 })
    expect(path.find((point) => point.roomId === 'b')).toEqual({ roomId: 'b', tx: 0, ty: 4 })
  })

  it('cannot walk through furniture covering both destination door tiles', () => {
    expect(findHomePath(layout, [door('a', 'b')], [object('b', 0, 4), object('b', 0, 5)], { roomId: 'a', tx: 7, ty: 4 }, 'b')).toBeNull()
  })

  it('respects rotated footprints when choosing a door lane', () => {
    // Turning the couch makes it reach the east wall and block lane 4.
    const objects = [object('a', 6, 4, 'couch', 1)]
    const path = findHomePath(layout, [door('a', 'b')], objects, { roomId: 'a', tx: 5, ty: 4 }, 'b')!
    expect(path.find((point) => point.roomId === 'b')).toEqual({ roomId: 'b', tx: 0, ty: 5 })
    expect(path).not.toContainEqual({ roomId: 'a', tx: 7, ty: 4 })
  })

  it('starts at the exact drawn position and keeps moving toward the door', () => {
    expect(findHomePath(layout, [door('a', 'b')], [], { roomId: 'a', tx: 6.3, ty: 4 }, 'b')?.slice(0, 3)).toEqual([
      { roomId: 'a', tx: 6.3, ty: 4 },
      { roomId: 'a', tx: 7, ty: 4 }, { roomId: 'b', tx: 0, ty: 4 },
    ])
  })

  it('runs into the destination room after crossing its doorway', () => {
    const path = findHomePath(layout, [door('a', 'b')], [], { roomId: 'a', tx: 7, ty: 4 }, 'b')!
    expect(path.slice(1)).toEqual([
      { roomId: 'b', tx: 0, ty: 4 }, { roomId: 'b', tx: 1, ty: 4 },
      { roomId: 'b', tx: 2, ty: 4 }, { roomId: 'b', tx: 3, ty: 4 },
    ])
  })

  it('stops on reachable clear floor if furniture walls off the room center', () => {
    const objects = Array.from({ length: 8 }, (_, ty) => object('b', 2, ty))
    const path = findHomePath(layout, [door('a', 'b')], objects, { roomId: 'a', tx: 7, ty: 4 }, 'b')!
    expect(path.at(-1)).toEqual({ roomId: 'b', tx: 1, ty: 4 })
    expect(path.filter((point) => point.roomId === 'b').every((point) => point.tx < 2)).toBe(true)
  })

  it('retargets from either half of a shared doorway without snapping backward', () => {
    const connections = [door('a', 'b')]
    const leaving = { roomId: 'a', tx: 7.25, ty: 4 }
    const entering = { roomId: 'b', tx: -0.25, ty: 4 }
    expect(findHomePath(layout, connections, [], leaving, 'b')?.slice(0, 2)).toEqual([leaving, { roomId: 'b', tx: 0, ty: 4 }])
    expect(findHomePath(layout, connections, [], entering, 'a')?.slice(0, 2)).toEqual([entering, { roomId: 'a', tx: 7, ty: 4 }])
    expect(findHomePath(layout, connections, [], entering, 'b')).toEqual([entering, { roomId: 'b', tx: 0, ty: 4 }])
  })

  it('does not cross a missing door from a fractional position beside the wall', () => {
    expect(findHomePath(layout, [], [], { roomId: 'a', tx: 7.25, ty: 4 }, 'b')).toBeNull()
    expect(findHomePath(layout, [door('a', 'b')], [object('a', 7, 4)], { roomId: 'a', tx: 7.25, ty: 4 }, 'b')).toBeNull()
  })

  it('does not route out of furniture or a disconnected floor pocket', () => {
    expect(findHomePath(layout, [door('a', 'b')], [object('a', 6, 4)], { roomId: 'a', tx: 6.2, ty: 4 }, 'b')).toBeNull()
    expect(findHomePath(layout, [door('a', 'b')], [object('a', 1, 0), object('a', 0, 1)], { roomId: 'a', tx: 0, ty: 0 }, 'b')).toBeNull()
  })

  it('does not invent a journey when already there or given missing rooms', () => {
    const from = { roomId: 'a', tx: 6, ty: 4 }
    expect(findHomePath(layout, [], [], from, 'a')).toEqual([from])
    expect(findHomePath(layout, [], [], from, 'missing')).toBeNull()
    expect(findHomePath(layout, [], [], { ...from, roomId: 'missing' }, 'a')).toBeNull()
  })
})

describe('home waypoint projection', () => {
  it('reports the drawn position in the room containing its feet throughout a crossing', () => {
    const a = { roomId: 'a', tx: 7, ty: 4 }
    const b = { roomId: 'b', tx: 0, ty: 4 }
    expect(homePositionBetween(layout, a, b, 0.25)).toEqual({ roomId: 'a', tx: 7.25, ty: 4 })
    expect(homePositionBetween(layout, a, b, 0.5)).toEqual({ roomId: 'b', tx: -0.5, ty: 4 })
    expect(homePositionBetween(layout, a, b, 0.75)).toEqual({ roomId: 'b', tx: -0.25, ty: 4 })
    expect(homeWaypointPoint(layout, homePositionBetween(layout, a, b, 0.75))?.x).toBe(460.6875)
  })

  it('keeps one tile of screen distance when stepping through a shared door', () => {
    const from = homeWaypointPoint(layout, { roomId: 'a', tx: 7, ty: 4 })!
    const to = homeWaypointPoint(layout, { roomId: 'b', tx: 0, ty: 4 })!
    expect(from).toEqual({ x: 444.75, y: 277.5 })
    expect(to.x - from.x).toBe(21.25)
    expect(to.y - from.y).toBe(10.625)
  })
})
