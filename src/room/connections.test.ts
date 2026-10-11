import { describe, expect, it } from 'vitest'
import type { PlacedObject } from '../domain/types'
import { doorwayFootprint, doorsForRoom, roomConnections } from './connections'
import { homeLayout } from './homeLayout'

const object = (id: string, roomId: string, catalogId: string, tileX: number, tileY: number, rotation: PlacedObject['rotation'] = 0): PlacedObject =>
  ({ id, roomId, catalogId, tileX, tileY, rotation })

describe('room connections', () => {
  it('connects each shared wall once and leaves diagonal neighbours separate', () => {
    const connections = roomConnections(homeLayout(['a', 'b', 'c', 'd']), [])
    expect(connections.map(({ aRoomId, bRoomId, aSide, bSide }) => [aRoomId, bRoomId, aSide, bSide])).toEqual([
      ['a', 'b', 'east', 'west'],
      ['a', 'c', 'south', 'north'],
      ['b', 'd', 'south', 'north'],
      ['c', 'd', 'east', 'west'],
    ])
    expect(new Set(connections.map(({ id }) => id)).size).toBe(4)
    expect(connections.every(({ blocked, blockerIds }) => !blocked && blockerIds.length === 0)).toBe(true)
  })

  it('returns reciprocal doorways for the two rooms sharing each opening', () => {
    const connections = roomConnections(homeLayout(['a', 'b', 'c']), [])
    expect(doorsForRoom(connections, 'a')).toEqual([
      { side: 'east', toRoomId: 'b', start: 4, end: 6, blocked: false },
      { side: 'south', toRoomId: 'c', start: 4, end: 6, blocked: false },
    ])
    expect(doorsForRoom(connections, 'b')).toEqual([
      { side: 'west', toRoomId: 'a', start: 4, end: 6, blocked: false },
    ])
    expect(doorsForRoom(connections, 'c')).toEqual([
      { side: 'north', toRoomId: 'a', start: 4, end: 6, blocked: false },
    ])
    expect(doorsForRoom(connections, 'missing')).toEqual([])
  })

  it('reports furniture on either approach without moving the doorway or the furniture', () => {
    const layout = homeLayout(['a', 'b'])
    const objects = [object('near', 'a', 'plant', 7, 4), object('far', 'b', 'couch', 0, 4)]
    const before = structuredClone(objects)
    const open = roomConnections(layout, [])[0]
    const blocked = roomConnections(layout, objects)[0]
    expect(blocked).toEqual({ ...open, blocked: true, blockerIds: ['near', 'far'] })
    expect(objects).toEqual(before)
    expect(doorsForRoom([blocked], 'b')[0].blocked).toBe(true)
  })

  it('allows rugs, other rooms, and objects beside the doorway', () => {
    const objects = [
      object('rug', 'b', 'rug', 0, 4),
      object('other-room', 'c', 'plant', 0, 4),
      object('beside', 'b', 'plant', 0, 6),
      object('interior', 'b', 'plant', 1, 4),
    ]
    expect(roomConnections(homeLayout(['a', 'b']), objects)[0]).toMatchObject({ blocked: false, blockerIds: [] })
  })

  it('keeps hung decor clear of a door on the same wall', () => {
    const objects = [object('poster', 'b', 'poster', 0, 4)]
    expect(roomConnections(homeLayout(['a', 'b']), objects)[0]).toMatchObject({ blocked: true, blockerIds: ['poster'] })
  })

  it('checks rotated furniture at the north doorway', () => {
    const objects = [object('couch', 'c', 'couch', 3, 0, 1)]
    expect(roomConnections(homeLayout(['a', 'b', 'c']), objects)[1]).toMatchObject({
      aSide: 'south', bSide: 'north', blocked: true, blockerIds: ['couch'],
    })
  })

  it('has no connections for an empty or single-room home', () => {
    expect(roomConnections(homeLayout([]), [])).toEqual([])
    expect(roomConnections(homeLayout(['a']), [])).toEqual([])
  })
})

describe('doorway approach', () => {
  it.each([
    ['west', { tx: 0, ty: 4, w: 1, d: 2 }],
    ['north', { tx: 4, ty: 0, w: 2, d: 1 }],
    ['east', { tx: 7, ty: 4, w: 1, d: 2 }],
    ['south', { tx: 4, ty: 7, w: 2, d: 1 }],
  ] as const)('reserves one tile inside the %s boundary', (side, footprint) => {
    expect(doorwayFootprint({ side, start: 4, end: 6 })).toEqual(footprint)
  })
})
