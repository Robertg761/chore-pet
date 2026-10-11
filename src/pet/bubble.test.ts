import { describe, expect, it } from 'vitest'
import type { PlacedObject } from '../domain/types'
import { ROOM_VIEWBOX, ROOM_WIDTH } from '../room/shell/geometry'
import { bubbleSpot, headSpot, objectBoxes, type Box } from './bubble'

const placed = (catalogId: string, tileX: number, tileY: number): PlacedObject => ({ id: catalogId, roomId: 'r', catalogId, tileX, tileY, rotation: 0 })
const SIZE = { w: 110, h: 34 }
const area = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))
const rectOf = (s: { x: number; y: number }, size = SIZE): Box => ({ x0: s.x - size.w / 2, x1: s.x + size.w / 2, y0: s.y - size.h, y1: s.y })

describe('objectBoxes', () => {
  it('gives each object with art a box inside the room picture', () => {
    const boxes = objectBoxes([placed('table', 3, 3), placed('fridge', 0, 2), placed('not-a-thing', 1, 1)])
    expect(boxes).toHaveLength(2)
    for (const b of boxes) {
      expect(b.x1).toBeGreaterThan(b.x0)
      expect(b.y1).toBeGreaterThan(b.y0)
    }
  })
})

describe('bubbleSpot', () => {
  it('floats over the pet when nothing is in the way', () => {
    const spot = bubbleSpot({ tx: 4, ty: 3 }, SIZE, [])
    const home = headSpot({ tx: 4, ty: 3 })
    expect(spot.x).toBeCloseTo(home.x)
    expect(spot.y).toBeCloseTo(home.y)
    expect(spot.tail).toBeCloseTo(0)
  })

  it('moves off a table it would otherwise cover', () => {
    const boxes = objectBoxes([placed('table', 3, 3)])
    let better = 0
    for (let tx = 0; tx < 8; tx++) {
      for (let ty = 0; ty < 8; ty++) {
        const home = headSpot({ tx, ty })
        const spot = bubbleSpot({ tx, ty }, SIZE, boxes)
        const before = boxes.reduce((n, b) => n + area(rectOf(home), b), 0)
        const after = boxes.reduce((n, b) => n + area(rectOf(spot), b), 0)
        expect(after).toBeLessThanOrEqual(before + 1e-6)
        if (after < before) better++
      }
    }
    expect(better).toBeGreaterThan(0)
  })

  it('stays inside the picture and keeps its tail on the bubble', () => {
    const boxes = objectBoxes([placed('table', 3, 3), placed('rug', 2, 2)])
    for (let tx = 0; tx < 8; tx++) {
      for (let ty = 0; ty < 8; ty++) {
        const spot = bubbleSpot({ tx, ty }, SIZE, boxes)
        expect(spot.x - SIZE.w / 2).toBeGreaterThanOrEqual(0)
        expect(spot.x + SIZE.w / 2).toBeLessThanOrEqual(ROOM_WIDTH)
        expect(spot.y - SIZE.h).toBeGreaterThanOrEqual(ROOM_VIEWBOX.y)
        expect(Math.abs(spot.tail)).toBeLessThanOrEqual(SIZE.w / 2)
      }
    }
  })
})
