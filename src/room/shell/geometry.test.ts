import { describe, expect, it } from 'vitest'
import { TILE_W } from '../iso'
import { PET_SCALE } from './geometry'
import {
  OBJECT_SCALE,
  ROOM_ORIGIN,
  ROOM_TILES,
  ROOM_TILE_H,
  ROOM_TILE_W,
  ROOM_VIEWBOX,
  ROOM_WIDTH,
  SLAB_DEPTH,
  TILE_SCALE,
  WALL_HEIGHT,
  WINDOW,
  roomPoint,
  roomPoints,
  tileCorner,
} from './geometry'

describe('room constants', () => {
  it('is a square room of whole tiles whose floor spans 340 px', () => {
    expect(Number.isInteger(ROOM_TILES)).toBe(true)
    expect(ROOM_TILES).toBeGreaterThan(0)
    expect(ROOM_TILE_W * ROOM_TILES).toBeCloseTo(340)
  })

  it('makes a tile 340 / ROOM_TILES px wide', () => {
    expect(ROOM_TILE_W).toBeCloseTo(340 / ROOM_TILES)
  })

  it('fits the floor diamond inside the room width', () => {
    expect(ROOM_TILE_W * ROOM_TILES).toBeLessThanOrEqual(ROOM_WIDTH)
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

describe('tile scale (the art was drawn for a 6x6 reference room)', () => {
  it('shrinks tiles so that TILE_SCALE x ROOM_TILES is always 6', () => {
    expect(TILE_SCALE * ROOM_TILES).toBeCloseTo(6)
  })

  it('is the size of a tile against a 340 / 6 px reference tile', () => {
    expect(ROOM_TILE_W / (340 / 6)).toBeCloseTo(TILE_SCALE)
  })

  it('scales the wall height from the 160 px reference', () => {
    expect(WALL_HEIGHT).toBe(Math.round(160 * TILE_SCALE))
    expect(Math.abs(WALL_HEIGHT - 160 * TILE_SCALE)).toBeLessThanOrEqual(0.5)
  })

  it('sits the floor origin just below the wall top', () => {
    expect(ROOM_ORIGIN.y).toBe(WALL_HEIGHT + 10)
  })

  it('scales the pet with the tiles, so it stays about one tile wide', () => {
    expect(PET_SCALE).toBeCloseTo(0.44 * TILE_SCALE)
    // the pet's art is 200 px wide; the reference pet was 0.44 x 200 px against a 340 / 6 px tile
    expect((PET_SCALE * 200) / ROOM_TILE_W).toBeCloseTo((0.44 * 200) / (340 / 6))
  })
})

describe('the window', () => {
  it('stays inside the left wall along its length', () => {
    expect(WINDOW.u0).toBeGreaterThan(0)
    expect(WINDOW.u0).toBeLessThan(WINDOW.u1)
    expect(WINDOW.u1).toBeLessThan(ROOM_TILES)
  })

  it('stays inside the wall in height', () => {
    expect(WINDOW.z0).toBeGreaterThan(0)
    expect(WINDOW.z0).toBeLessThan(WINDOW.z1)
    expect(WINDOW.z1).toBeLessThan(WALL_HEIGHT)
  })

  it('keeps the window the same size on screen: tiles divided by the scale, px times it', () => {
    expect(WINDOW.u0 * TILE_SCALE).toBeCloseTo(1.8)
    expect(WINDOW.u1 * TILE_SCALE).toBeCloseTo(3.6)
    expect(WINDOW.z0).toBe(Math.round(76 * TILE_SCALE))
    expect(WINDOW.z1).toBe(Math.round(140 * TILE_SCALE))
  })
})

describe('the viewBox', () => {
  const frontCorner = roomPoint(ROOM_TILES, ROOM_TILES)
  const floorBottom = ROOM_ORIGIN.y + ROOM_TILES * ROOM_TILE_H

  it('puts the floor front corner at origin.y + ROOM_TILES x tile height', () => {
    expect(frontCorner.y).toBeCloseTo(floorBottom)
  })

  it('contains the whole floor plus the slab underneath', () => {
    const bottom = ROOM_VIEWBOX.y + ROOM_VIEWBOX.height
    expect(floorBottom + SLAB_DEPTH).toBeLessThanOrEqual(bottom)
    expect(roomPoint(0, 0).y).toBeGreaterThanOrEqual(ROOM_VIEWBOX.y)
    expect(roomPoint(ROOM_TILES, 0).x).toBeLessThanOrEqual(ROOM_VIEWBOX.x + ROOM_VIEWBOX.width)
    expect(roomPoint(0, ROOM_TILES).x).toBeGreaterThanOrEqual(ROOM_VIEWBOX.x)
  })

  it('contains the top of the walls', () => {
    expect(ROOM_ORIGIN.y - WALL_HEIGHT).toBeGreaterThanOrEqual(ROOM_VIEWBOX.y)
  })

  it('is as wide as the room', () => {
    expect(ROOM_VIEWBOX.width).toBe(ROOM_WIDTH)
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
    const half = (ROOM_TILE_W * ROOM_TILES) / 2 // 170
    const right = roomPoint(ROOM_TILES, 0)
    const left = roomPoint(0, ROOM_TILES)
    const front = roomPoint(ROOM_TILES, ROOM_TILES)
    expect(right.x).toBeCloseTo(ROOM_ORIGIN.x + half)
    expect(left.x).toBeCloseTo(ROOM_ORIGIN.x - half)
    expect(right.y).toBeCloseTo(left.y)
    expect(front.x).toBeCloseTo(ROOM_ORIGIN.x)
    expect(front.y).toBeCloseTo(ROOM_ORIGIN.y + ROOM_TILES * ROOM_TILE_H)
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
