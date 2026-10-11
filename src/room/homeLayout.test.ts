import { describe, expect, it } from 'vitest'
import { homeLayout, fitHome } from './homeLayout'
import { ROOM_TILES, ROOM_VIEWBOX, roomPoint } from './shell/geometry'

describe('home layout', () => {
  it('joins neighbouring floor edges without gaps or overlap', () => {
    const [a, east, south] = homeLayout(['a', 'east', 'south']).rooms
    const at = (room: typeof a, tx: number, ty: number) => {
      const point = roomPoint(tx, ty)
      return { x: room.x + point.x, y: room.y + point.y }
    }
    for (const along of [0, 4, ROOM_TILES]) {
      expect(at(a, ROOM_TILES, along)).toEqual(at(east, 0, along))
      expect(at(a, along, ROOM_TILES)).toEqual(at(south, along, 0))
    }
  })

  it('keeps grid coordinates stable as its outside edges expand', () => {
    const before = homeLayout(['a', 'b', 'c', 'd'])
    const after = homeLayout(['a', 'b', 'c', 'd', 'e'])
    expect(before.rooms.map(({ col, row }) => [col, row])).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]])
    expect(after.rooms.slice(0, 4).map(({ col, row }) => [col, row])).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]])
  })

  it('keeps every room within the scene, with distinct floor positions', () => {
    for (const count of [0, 1, 2, 3, 4, 5, 12, 40]) {
      const layout = homeLayout(Array.from({ length: count }, (_, i) => `room-${i}`))
      expect(layout.rooms).toHaveLength(count)
      expect(new Set(layout.rooms.map((r) => `${r.x},${r.y}`)).size).toBe(count)
      for (const room of layout.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(0)
        expect(room.y).toBeGreaterThanOrEqual(0)
        expect(room.x + ROOM_VIEWBOX.width).toBeLessThanOrEqual(layout.width)
        expect(room.y + ROOM_VIEWBOX.height).toBeLessThanOrEqual(layout.height)
      }
    }
  })

  it('adds rooms without rearranging existing neighbours', () => {
    const before = homeLayout(['a', 'b', 'c', 'd'])
    const after = homeLayout(['a', 'b', 'c', 'd', 'e'])
    for (let i = 1; i < before.rooms.length; i++) {
      expect(after.rooms[i].x - after.rooms[0].x).toBe(before.rooms[i].x - before.rooms[0].x)
      expect(after.rooms[i].y - after.rooms[0].y).toBe(before.rooms[i].y - before.rooms[0].y)
    }
  })

  it('fits the whole home on a phone and a short landscape screen', () => {
    const layout = homeLayout(['a', 'b', 'c', 'd'])
    for (const [width, height] of [[320, 240], [800, 180], [720, 800]]) {
      const scale = fitHome(width, height, layout)
      expect(scale).toBeGreaterThan(0)
      expect(layout.width * scale).toBeLessThanOrEqual(width)
      expect(layout.height * scale).toBeLessThanOrEqual(height)
    }
  })
})
