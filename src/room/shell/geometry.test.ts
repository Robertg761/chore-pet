import { describe, expect, it } from 'vitest'
import { TILE_W } from '../iso'
import {
  OBJECT_SCALE,
  ROOM_ORIGIN,
  ROOM_TILES,
  ROOM_TILE_H,
  ROOM_TILE_W,
  ROOM_WIDTH,
  roomPoint,
  roomPoints,
  tileCorner,
} from './geometry'

describe('room constants', () => {
  it('is a 6x6 room whose floor spans 340 px', () => {
    expect(ROOM_TILES).toBe(6)
    expect(ROOM_TILE_W * ROOM_TILES).toBeCloseTo(340)
  })

  it('keeps tiles 2:1 (twice as wide as tall)', () => {
    expect(ROOM_TILE_W / ROOM_TILE_H).toBeCloseTo(2)
  })

  it('centres the floor in the room width', () => {
    expect(ROOM_ORIGIN.x).toBe(ROOM_WIDTH / 2)
  })

  it('scales 64 px object art to room tiles', () => {
    expect(OBJECT_SCALE).toBeCloseTo(ROOM_TILE_W / TILE_W)
    expect(OBJECT_SCALE).toBeLessThan(1)
  })
})

describe('roomPoint', () => {
  it('puts tile (0, 0) at the origin', () => {
    expect(roomPoint(0, 0)).toEqual(ROOM_ORIGIN)
  })

  it('moves +tx toward the lower right and +ty toward the lower left', () => {
    const origin = roomPoint(0, 0)
    const right = roomPoint(1, 0)
    const left = roomPoint(0, 1)
    expect(right.x - origin.x).toBeCloseTo(ROOM_TILE_W / 2)
    expect(right.y - origin.y).toBeCloseTo(ROOM_TILE_H / 2)
    expect(left.x - origin.x).toBeCloseTo(-ROOM_TILE_W / 2)
    expect(left.y - origin.y).toBeCloseTo(ROOM_TILE_H / 2)
  })

  it('places the floor corners on the 2:1 diamond', () => {
    const half = ROOM_TILE_W * 3 // 170
    const right = roomPoint(6, 0)
    const left = roomPoint(0, 6)
    const front = roomPoint(6, 6)
    expect(right.x).toBeCloseTo(ROOM_ORIGIN.x + half)
    expect(left.x).toBeCloseTo(ROOM_ORIGIN.x - half)
    expect(right.y).toBeCloseTo(left.y)
    expect(front.x).toBeCloseTo(ROOM_ORIGIN.x)
    expect(front.y).toBeCloseTo(ROOM_ORIGIN.y + 12 * (ROOM_TILE_H / 2))
  })

  it('lifts a point up the screen by z', () => {
    const base = roomPoint(2, 3)
    const up = roomPoint(2, 3, 40)
    expect(up.x).toBe(base.x)
    expect(up.y).toBe(base.y - 40)
  })

  it('supports fractional tiles (the midpoint of two tiles is the midpoint of their points)', () => {
    const a = roomPoint(1, 2)
    const b = roomPoint(2, 3)
    const mid = roomPoint(1.5, 2.5)
    expect(mid.x).toBeCloseTo((a.x + b.x) / 2)
    expect(mid.y).toBeCloseTo((a.y + b.y) / 2)
  })

  it('is mirrored left-right when tx and ty swap', () => {
    const a = roomPoint(4, 1)
    const b = roomPoint(1, 4)
    expect(a.x - ROOM_ORIGIN.x).toBeCloseTo(-(b.x - ROOM_ORIGIN.x))
    expect(a.y).toBeCloseTo(b.y)
  })
})

describe('tileCorner', () => {
  it('is roomPoint at z = 0', () => {
    expect(tileCorner(3, 2)).toEqual(roomPoint(3, 2))
  })
})

describe('roomPoints', () => {
  it('joins points as "x,y" pairs separated by spaces', () => {
    expect(roomPoints([0, 0, 0], [0, 0, 10])).toBe(`${ROOM_ORIGIN.x},${ROOM_ORIGIN.y} ${ROOM_ORIGIN.x},${ROOM_ORIGIN.y - 10}`)
  })

  it('treats a missing z as 0', () => {
    expect(roomPoints([0, 0])).toBe(roomPoints([0, 0, 0]))
  })

  it('rounds to two decimals', () => {
    const [x, y] = roomPoints([1, 0]).split(',').map(Number)
    expect(x).toBeCloseTo(roomPoint(1, 0).x, 2)
    expect(y).toBeCloseTo(roomPoint(1, 0).y, 2)
    for (const part of roomPoints([1, 0]).split(',')) {
      expect(part.split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
    }
  })

  it('returns an empty string for no corners', () => {
    expect(roomPoints()).toBe('')
  })
})
