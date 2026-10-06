import { describe, expect, it } from 'vitest'
import { PALETTE } from '../art/palette'
import { catalogEntry } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import { ROOM_TILE_W } from '../room/shell/geometry'
import { healthColour, sparkleSpot } from './doneMoment'

const placed = (catalogId: string, tileX: number, tileY: number): PlacedObject => ({ id: 'o', roomId: 'r', catalogId, tileX, tileY, rotation: 0 })

describe('sparkleSpot', () => {
  it('sits above the footprint centre and is at least a tile wide', () => {
    const sink = catalogEntry('sink')!
    const spot = sparkleSpot(placed('sink', 0, 2), sink)
    expect(spot.size).toBeGreaterThanOrEqual(ROOM_TILE_W)
    expect(spot.x).toBeGreaterThan(0)
  })

  it('lifts the fridge higher than a counter', () => {
    const fridge = sparkleSpot(placed('fridge', 2, 2), catalogEntry('fridge')!)
    const sink = sparkleSpot(placed('sink', 2, 2), catalogEntry('sink')!)
    expect(fridge.y).toBeLessThan(sink.y)
  })
})

describe('healthColour', () => {
  it('runs blush to yellow to leaf', () => {
    expect(healthColour(0).toLowerCase()).toBe(PALETTE.blush.toLowerCase())
    expect(healthColour(50).toLowerCase()).toBe(PALETTE.petDefault.toLowerCase())
    expect(healthColour(100).toLowerCase()).toBe(PALETTE.leaf.toLowerCase())
  })
  it('clamps out-of-range values', () => {
    expect(healthColour(-20)).toBe(healthColour(0))
    expect(healthColour(300)).toBe(healthColour(100))
  })
})
