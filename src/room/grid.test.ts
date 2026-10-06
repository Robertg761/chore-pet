import { describe, expect, it } from 'vitest'
import { catalogEntry } from '../catalog/objects'
import type { CatalogEntry } from '../catalog/types'
import type { PlacedObject } from '../domain/types'
import {
  ROOM_SIZE,
  againstWall,
  checkPlacement,
  depthOrder,
  findFreeSpot,
  footprintOf,
  freeTile,
  insideRoom,
  overlaps,
  rotatedSize,
  rotationsFor,
  screenToTile,
  snapDrag,
  tilesOf,
  turned,
  type Footprint,
  type Placement,
  type Rotation,
  type Sortable,
} from './grid'
import { roomPoint } from './shell/geometry'

function entry(id: string): CatalogEntry {
  const e = catalogEntry(id)
  if (!e) throw new Error(`missing catalog entry ${id}`)
  return e
}

const sink = entry('sink') // 1x1 wall solid
const bed = entry('bed') // 3x2 wall solid
const couch = entry('couch') // 1x2 wall solid
const rug = entry('rug') // 2x3 floor flat
const table = entry('table') // 2x2 floor solid
const trash = entry('trash') // 1x1 floor solid

const lookup = (id: string) => catalogEntry(id)

let nextId = 0
function placed(catalogId: string, tileX: number, tileY: number, rotation: Rotation = 0, id?: string): PlacedObject {
  return { id: id ?? `o${nextId++}`, roomId: 'r1', catalogId, tileX, tileY, rotation }
}

const fp = (tx: number, ty: number, w: number, d: number): Footprint => ({ tx, ty, w, d })

describe('ROOM_SIZE', () => {
  it('is the 6x6 room', () => {
    expect(ROOM_SIZE).toBe(6)
  })
})

describe('rotatedSize', () => {
  it('keeps w and d at rotations 0 and 2', () => {
    expect(rotatedSize(bed, 0)).toEqual({ w: 3, d: 2 })
    expect(rotatedSize(bed, 2)).toEqual({ w: 3, d: 2 })
  })

  it('swaps w and d at rotations 1 and 3', () => {
    expect(rotatedSize(bed, 1)).toEqual({ w: 2, d: 3 })
    expect(rotatedSize(bed, 3)).toEqual({ w: 2, d: 3 })
  })

  it('leaves square footprints unchanged at every rotation', () => {
    for (const r of [0, 1, 2, 3] as Rotation[]) {
      expect(rotatedSize(table, r)).toEqual({ w: 2, d: 2 })
      expect(rotatedSize(sink, r)).toEqual({ w: 1, d: 1 })
    }
  })

  it('handles the rug (2x3) and couch (1x2)', () => {
    expect(rotatedSize(rug, 0)).toEqual({ w: 2, d: 3 })
    expect(rotatedSize(rug, 1)).toEqual({ w: 3, d: 2 })
    expect(rotatedSize(couch, 0)).toEqual({ w: 1, d: 2 })
    expect(rotatedSize(couch, 1)).toEqual({ w: 2, d: 1 })
  })
})

describe('footprintOf', () => {
  it('maps tileX/tileY to tx/ty and rotates the size', () => {
    expect(footprintOf({ tileX: 1, tileY: 2, rotation: 0 }, bed)).toEqual({ tx: 1, ty: 2, w: 3, d: 2 })
    expect(footprintOf({ tileX: 1, tileY: 2, rotation: 1 }, bed)).toEqual({ tx: 1, ty: 2, w: 2, d: 3 })
    expect(footprintOf({ tileX: 1, tileY: 2, rotation: 2 }, bed)).toEqual({ tx: 1, ty: 2, w: 3, d: 2 })
    expect(footprintOf({ tileX: 1, tileY: 2, rotation: 3 }, bed)).toEqual({ tx: 1, ty: 2, w: 2, d: 3 })
  })
})

describe('tilesOf', () => {
  it('lists every covered tile', () => {
    const tiles = tilesOf(fp(1, 2, 2, 3))
    expect(tiles).toHaveLength(6)
    expect(tiles).toContainEqual({ tx: 1, ty: 2 })
    expect(tiles).toContainEqual({ tx: 2, ty: 4 })
    expect(tiles).not.toContainEqual({ tx: 3, ty: 2 })
  })

  it('is empty for a zero-size footprint', () => {
    expect(tilesOf(fp(0, 0, 0, 2))).toEqual([])
  })
})

describe('overlaps', () => {
  it('is true for identical footprints', () => {
    expect(overlaps(fp(1, 1, 2, 2), fp(1, 1, 2, 2))).toBe(true)
  })

  it('is false when edges only touch along tx', () => {
    expect(overlaps(fp(0, 0, 2, 2), fp(2, 0, 2, 2))).toBe(false)
    expect(overlaps(fp(2, 0, 2, 2), fp(0, 0, 2, 2))).toBe(false)
  })

  it('is false when edges only touch along ty', () => {
    expect(overlaps(fp(0, 0, 2, 2), fp(0, 2, 2, 2))).toBe(false)
    expect(overlaps(fp(0, 2, 2, 2), fp(0, 0, 2, 2))).toBe(false)
  })

  it('is false when only a corner touches', () => {
    expect(overlaps(fp(0, 0, 2, 2), fp(2, 2, 1, 1))).toBe(false)
    expect(overlaps(fp(2, 2, 1, 1), fp(0, 0, 2, 2))).toBe(false)
    expect(overlaps(fp(0, 2, 2, 2), fp(2, 0, 2, 2))).toBe(false)
  })

  it('is true when they share a single corner tile', () => {
    expect(overlaps(fp(0, 0, 2, 2), fp(1, 1, 2, 2))).toBe(true)
    expect(overlaps(fp(1, 1, 2, 2), fp(0, 0, 2, 2))).toBe(true)
  })

  it('is true when one contains the other', () => {
    expect(overlaps(fp(0, 0, 6, 6), fp(2, 2, 1, 1))).toBe(true)
    expect(overlaps(fp(2, 2, 1, 1), fp(0, 0, 6, 6))).toBe(true)
  })

  it('is true for a cross shape (overlap in the middle, neither contains the other)', () => {
    expect(overlaps(fp(0, 2, 6, 1), fp(2, 0, 1, 6))).toBe(true)
  })

  it('is false when separated by a gap', () => {
    expect(overlaps(fp(0, 0, 1, 1), fp(3, 3, 1, 1))).toBe(false)
    expect(overlaps(fp(0, 0, 1, 1), fp(0, 3, 1, 1))).toBe(false)
  })

  it('is symmetric over a grid of 1x1 tiles against a 2x2', () => {
    const big = fp(2, 2, 2, 2)
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 6; y++) {
        const t = fp(x, y, 1, 1)
        const expected = x >= 2 && x < 4 && y >= 2 && y < 4
        expect(overlaps(big, t)).toBe(expected)
        expect(overlaps(t, big)).toBe(expected)
      }
    }
  })
})

describe('insideRoom', () => {
  it('accepts a footprint filling the whole room', () => {
    expect(insideRoom(fp(0, 0, 6, 6))).toBe(true)
  })

  it('accepts 1x1 tiles at all four corners', () => {
    expect(insideRoom(fp(0, 0, 1, 1))).toBe(true)
    expect(insideRoom(fp(5, 0, 1, 1))).toBe(true)
    expect(insideRoom(fp(0, 5, 1, 1))).toBe(true)
    expect(insideRoom(fp(5, 5, 1, 1))).toBe(true)
  })

  it('rejects negative origins', () => {
    expect(insideRoom(fp(-1, 0, 1, 1))).toBe(false)
    expect(insideRoom(fp(0, -1, 1, 1))).toBe(false)
  })

  it('rejects 1x1 tiles just past the far edges', () => {
    expect(insideRoom(fp(6, 0, 1, 1))).toBe(false)
    expect(insideRoom(fp(0, 6, 1, 1))).toBe(false)
  })

  it('handles multi-tile objects at every edge (the bed, 3x2)', () => {
    // tx edge: 3 wide, so tx 3 is the last that fits
    expect(insideRoom(fp(3, 0, 3, 2))).toBe(true)
    expect(insideRoom(fp(4, 0, 3, 2))).toBe(false)
    // ty edge: 2 deep, so ty 4 is the last that fits
    expect(insideRoom(fp(0, 4, 3, 2))).toBe(true)
    expect(insideRoom(fp(0, 5, 3, 2))).toBe(false)
    // far corner
    expect(insideRoom(fp(3, 4, 3, 2))).toBe(true)
    expect(insideRoom(fp(4, 5, 3, 2))).toBe(false)
  })

  it('handles the rotated bed (2x3)', () => {
    expect(insideRoom(fp(4, 3, 2, 3))).toBe(true)
    expect(insideRoom(fp(5, 3, 2, 3))).toBe(false)
    expect(insideRoom(fp(4, 4, 2, 3))).toBe(false)
  })

  it('handles the table (2x2) and rug (2x3) at the far edges', () => {
    expect(insideRoom(fp(4, 4, 2, 2))).toBe(true)
    expect(insideRoom(fp(5, 4, 2, 2))).toBe(false)
    expect(insideRoom(fp(4, 3, 2, 3))).toBe(true)
    expect(insideRoom(fp(4, 4, 2, 3))).toBe(false)
  })

  it('works through footprintOf for every rotation of the bed at the origin', () => {
    for (const r of [0, 1, 2, 3] as Rotation[]) {
      expect(insideRoom(footprintOf({ tileX: 0, tileY: 0, rotation: r }, bed))).toBe(true)
    }
  })
})

describe('againstWall', () => {
  it('rotation 0 needs tileX = 0', () => {
    expect(againstWall({ tileX: 0, tileY: 0, rotation: 0 })).toBe(true)
    expect(againstWall({ tileX: 0, tileY: 4, rotation: 0 })).toBe(true)
    expect(againstWall({ tileX: 1, tileY: 0, rotation: 0 })).toBe(false)
  })

  it('rotation 1 needs tileY = 0', () => {
    expect(againstWall({ tileX: 0, tileY: 0, rotation: 1 })).toBe(true)
    expect(againstWall({ tileX: 4, tileY: 0, rotation: 1 })).toBe(true)
    expect(againstWall({ tileX: 0, tileY: 1, rotation: 1 })).toBe(false)
  })

  it('rotations 2 and 3 are never against a wall', () => {
    for (const r of [2, 3] as Rotation[]) {
      expect(againstWall({ tileX: 0, tileY: 0, rotation: r })).toBe(false)
      expect(againstWall({ tileX: 0, tileY: 3, rotation: r })).toBe(false)
      expect(againstWall({ tileX: 3, tileY: 0, rotation: r })).toBe(false)
    }
  })
})

describe('checkPlacement', () => {
  const none: PlacedObject[] = []

  it('accepts a wall object against the left wall at rotation 0', () => {
    expect(checkPlacement(sink, { tileX: 0, tileY: 3, rotation: 0 }, none, lookup)).toEqual({ ok: true, problem: null, blockers: [] })
  })

  it('accepts a wall object against the right wall at rotation 1', () => {
    expect(checkPlacement(sink, { tileX: 3, tileY: 0, rotation: 1 }, none, lookup)).toEqual({ ok: true, problem: null, blockers: [] })
  })

  it('rejects a wall object away from its wall with needsWall', () => {
    expect(checkPlacement(sink, { tileX: 1, tileY: 3, rotation: 0 }, none, lookup)).toEqual({ ok: false, problem: 'needsWall', blockers: [] })
    expect(checkPlacement(sink, { tileX: 3, tileY: 1, rotation: 1 }, none, lookup)).toEqual({ ok: false, problem: 'needsWall', blockers: [] })
  })

  it('rejects a rotation-0 wall object that is on the other wall (ty = 0 only)', () => {
    expect(checkPlacement(sink, { tileX: 3, tileY: 0, rotation: 0 }, none, lookup).problem).toBe('needsWall')
    expect(checkPlacement(sink, { tileX: 0, tileY: 3, rotation: 1 }, none, lookup).problem).toBe('needsWall')
  })

  it('rejects wall objects at rotations 2 and 3 even in the back corner', () => {
    expect(checkPlacement(sink, { tileX: 0, tileY: 0, rotation: 2 }, none, lookup).problem).toBe('needsWall')
    expect(checkPlacement(sink, { tileX: 0, tileY: 0, rotation: 3 }, none, lookup).problem).toBe('needsWall')
    expect(checkPlacement(bed, { tileX: 0, tileY: 0, rotation: 2 }, none, lookup).ok).toBe(false)
    expect(checkPlacement(bed, { tileX: 0, tileY: 0, rotation: 3 }, none, lookup).ok).toBe(false)
  })

  it('floor objects do not need a wall at any rotation', () => {
    for (const r of [0, 1, 2, 3] as Rotation[]) {
      expect(checkPlacement(table, { tileX: 2, tileY: 2, rotation: r }, none, lookup).ok).toBe(true)
    }
  })

  it('checks the bed against both walls using its rotated footprint', () => {
    // rotation 0: 3 along tx, 2 along ty, back at tx = 0
    expect(checkPlacement(bed, { tileX: 0, tileY: 4, rotation: 0 }, none, lookup).ok).toBe(true)
    expect(checkPlacement(bed, { tileX: 0, tileY: 5, rotation: 0 }, none, lookup).problem).toBe('outside')
    // rotation 1: 2 along tx, 3 along ty, back at ty = 0
    expect(checkPlacement(bed, { tileX: 4, tileY: 0, rotation: 1 }, none, lookup).ok).toBe(true)
    expect(checkPlacement(bed, { tileX: 5, tileY: 0, rotation: 1 }, none, lookup).problem).toBe('outside')
  })

  it('checks the couch (1x2) against both walls', () => {
    expect(checkPlacement(couch, { tileX: 0, tileY: 4, rotation: 0 }, none, lookup).ok).toBe(true)
    expect(checkPlacement(couch, { tileX: 0, tileY: 5, rotation: 0 }, none, lookup).problem).toBe('outside')
    expect(checkPlacement(couch, { tileX: 4, tileY: 0, rotation: 1 }, none, lookup).ok).toBe(true)
    expect(checkPlacement(couch, { tileX: 5, tileY: 0, rotation: 1 }, none, lookup).problem).toBe('outside')
  })

  it('reports outside at every edge', () => {
    expect(checkPlacement(table, { tileX: -1, tileY: 0, rotation: 0 }, none, lookup).problem).toBe('outside')
    expect(checkPlacement(table, { tileX: 0, tileY: -1, rotation: 0 }, none, lookup).problem).toBe('outside')
    expect(checkPlacement(table, { tileX: 5, tileY: 0, rotation: 0 }, none, lookup).problem).toBe('outside')
    expect(checkPlacement(table, { tileX: 0, tileY: 5, rotation: 0 }, none, lookup).problem).toBe('outside')
    expect(checkPlacement(table, { tileX: 4, tileY: 4, rotation: 0 }, none, lookup).ok).toBe(true)
  })

  describe('problem priority', () => {
    it('outside beats needsWall', () => {
      // sink off the wall AND off the room
      const result = checkPlacement(sink, { tileX: 7, tileY: 7, rotation: 0 }, none, lookup)
      expect(result).toEqual({ ok: false, problem: 'outside', blockers: [] })
    })

    it('needsWall beats overlap', () => {
      const t = placed('table', 1, 1, 0, 'tbl')
      const result = checkPlacement(sink, { tileX: 1, tileY: 1, rotation: 0 }, [t], lookup)
      expect(result).toEqual({ ok: false, problem: 'needsWall', blockers: [] })
    })

    it('outside beats overlap', () => {
      const t = placed('table', 4, 4, 0, 'tbl')
      const result = checkPlacement(table, { tileX: 5, tileY: 5, rotation: 0 }, [t], lookup)
      expect(result.problem).toBe('outside')
      expect(result.blockers).toEqual([])
    })

    it('reports overlap once position and wall are fine', () => {
      const t = placed('table', 0, 0, 0, 'tbl')
      const result = checkPlacement(sink, { tileX: 0, tileY: 1, rotation: 0 }, [t], lookup)
      expect(result).toEqual({ ok: false, problem: 'overlap', blockers: ['tbl'] })
    })
  })

  describe('blockers', () => {
    it('lists every overlapping solid object, and only those', () => {
      const a = placed('table', 0, 0, 0, 'a')
      const b = placed('table', 2, 0, 0, 'b')
      const c = placed('table', 4, 4, 0, 'c')
      const d = placed('trash', 5, 0, 0, 'd')
      // table 2x2 at (1,0) covers tx 1..2, ty 0..1: touches a and b only
      const result = checkPlacement(table, { tileX: 1, tileY: 0, rotation: 0 }, [a, b, c, d], lookup)
      expect(result.ok).toBe(false)
      expect(result.problem).toBe('overlap')
      expect(result.blockers.sort()).toEqual(['a', 'b'])
    })

    it('does not count touching edges as overlap', () => {
      const a = placed('table', 0, 0, 0, 'a')
      expect(checkPlacement(table, { tileX: 2, tileY: 0, rotation: 0 }, [a], lookup).ok).toBe(true)
      expect(checkPlacement(table, { tileX: 0, tileY: 2, rotation: 0 }, [a], lookup).ok).toBe(true)
      expect(checkPlacement(table, { tileX: 2, tileY: 2, rotation: 0 }, [a], lookup).ok).toBe(true)
    })

    it('uses the other object\'s rotated footprint', () => {
      // bed at rotation 1 occupies tx 0..1, ty 0..2
      const b = placed('bed', 0, 0, 1, 'bed1')
      expect(checkPlacement(trash, { tileX: 0, tileY: 2, rotation: 0 }, [b], lookup).blockers).toEqual(['bed1'])
      expect(checkPlacement(trash, { tileX: 2, tileY: 0, rotation: 0 }, [b], lookup).ok).toBe(true)
      // bed at rotation 0 occupies tx 0..2, ty 0..1
      const b0 = placed('bed', 0, 0, 0, 'bed0')
      expect(checkPlacement(trash, { tileX: 2, tileY: 0, rotation: 0 }, [b0], lookup).blockers).toEqual(['bed0'])
      expect(checkPlacement(trash, { tileX: 0, tileY: 2, rotation: 0 }, [b0], lookup).ok).toBe(true)
    })

    it('ignores the object being moved', () => {
      const a = placed('table', 0, 0, 0, 'a')
      expect(checkPlacement(table, { tileX: 0, tileY: 0, rotation: 0 }, [a], lookup).ok).toBe(false)
      expect(checkPlacement(table, { tileX: 0, tileY: 0, rotation: 0 }, [a], lookup, 'a')).toEqual({ ok: true, problem: null, blockers: [] })
      expect(checkPlacement(table, { tileX: 1, tileY: 1, rotation: 0 }, [a], lookup, 'a').ok).toBe(true)
    })

    it('still blocks on others when moving one object', () => {
      const a = placed('table', 0, 0, 0, 'a')
      const b = placed('table', 2, 0, 0, 'b')
      const result = checkPlacement(table, { tileX: 1, tileY: 0, rotation: 0 }, [a, b], lookup, 'a')
      expect(result.blockers).toEqual(['b'])
    })

    it('ignores objects whose catalog id is unknown', () => {
      const ghost = placed('does-not-exist', 0, 0, 0, 'ghost')
      expect(checkPlacement(table, { tileX: 0, tileY: 0, rotation: 0 }, [ghost], lookup)).toEqual({ ok: true, problem: null, blockers: [] })
    })

    it('still reports real blockers alongside unknown objects', () => {
      const ghost = placed('does-not-exist', 0, 0, 0, 'ghost')
      const a = placed('table', 0, 0, 0, 'a')
      expect(checkPlacement(table, { tileX: 0, tileY: 0, rotation: 0 }, [ghost, a], lookup).blockers).toEqual(['a'])
    })
  })

  describe('layers', () => {
    it('allows a solid object to stand on a flat rug', () => {
      const r = placed('rug', 0, 0, 0, 'rug1')
      expect(checkPlacement(table, { tileX: 0, tileY: 0, rotation: 0 }, [r], lookup).ok).toBe(true)
      expect(checkPlacement(trash, { tileX: 1, tileY: 2, rotation: 0 }, [r], lookup).ok).toBe(true)
      expect(checkPlacement(sink, { tileX: 0, tileY: 1, rotation: 0 }, [r], lookup).ok).toBe(true)
    })

    it('allows a rug to go under a solid object', () => {
      const t = placed('table', 0, 0, 0, 'tbl')
      expect(checkPlacement(rug, { tileX: 0, tileY: 0, rotation: 0 }, [t], lookup).ok).toBe(true)
    })

    it('rejects a rug on a rug (any overlap)', () => {
      const r = placed('rug', 0, 0, 0, 'rug1')
      const result = checkPlacement(rug, { tileX: 1, tileY: 2, rotation: 0 }, [r], lookup)
      expect(result).toEqual({ ok: false, problem: 'overlap', blockers: ['rug1'] })
    })

    it('allows a rug next to a rug', () => {
      const r = placed('rug', 0, 0, 0, 'rug1')
      expect(checkPlacement(rug, { tileX: 2, tileY: 0, rotation: 0 }, [r], lookup).ok).toBe(true)
      expect(checkPlacement(rug, { tileX: 0, tileY: 3, rotation: 0 }, [r], lookup).ok).toBe(true)
    })

    it('rejects solid on solid', () => {
      const t = placed('table', 2, 2, 0, 'tbl')
      expect(checkPlacement(trash, { tileX: 3, tileY: 3, rotation: 0 }, [t], lookup).blockers).toEqual(['tbl'])
    })

    it('only blocks on the solid when both a rug and a table are underneath', () => {
      const r = placed('rug', 0, 0, 0, 'rug1')
      const t = placed('table', 0, 0, 0, 'tbl')
      expect(checkPlacement(trash, { tileX: 0, tileY: 0, rotation: 0 }, [r, t], lookup).blockers).toEqual(['tbl'])
    })
  })

  it('works with a custom lookup', () => {
    const custom = (id: string) => (id === 'big' ? { footprint: { w: 6, d: 6 }, placement: 'floor' as const, layer: 'solid' as const } : undefined)
    const big = placed('big', 0, 0, 0, 'big1')
    expect(checkPlacement(trash, { tileX: 3, tileY: 3, rotation: 0 }, [big], custom).blockers).toEqual(['big1'])
  })
})

describe('rotationsFor', () => {
  it('offers rotations 0 and 1 for wall and floor objects', () => {
    expect(rotationsFor(sink)).toEqual([0, 1])
    expect(rotationsFor(table)).toEqual([0, 1])
  })
})

describe('findFreeSpot', () => {
  const none: PlacedObject[] = []

  it('puts a floor object in the back corner of an empty room', () => {
    expect(findFreeSpot(table, none, lookup)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
    expect(findFreeSpot(trash, none, lookup)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
  })

  it('puts a rug in the back corner of an empty room', () => {
    expect(findFreeSpot(rug, none, lookup)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
  })

  it('returns a valid spot for every catalog-like footprint in an empty room', () => {
    for (const e of [sink, bed, couch, rug, table, trash]) {
      const spot = findFreeSpot(e, none, lookup)
      expect(spot).not.toBeNull()
      expect(checkPlacement(e, spot as Placement, none, lookup).ok).toBe(true)
    }
  })

  it('gives wall objects a wall spot', () => {
    for (const e of [sink, bed, couch]) {
      const spot = findFreeSpot(e, none, lookup) as Placement
      expect(againstWall(spot)).toBe(true)
    }
    expect(findFreeSpot(sink, none, lookup)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
    expect(findFreeSpot(bed, none, lookup)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
  })

  it('skips occupied spots', () => {
    const t = placed('table', 0, 0, 0)
    const spot = findFreeSpot(table, [t], lookup) as Placement
    expect(spot).not.toBeNull()
    expect(overlaps(footprintOf(spot, table), footprintOf(t, table))).toBe(false)
    expect(spot).toEqual({ tileX: 0, tileY: 2, rotation: 0 })
  })

  it('moves a wall object past a table in the corner to the next wall spot', () => {
    const t = placed('table', 0, 0, 0)
    // sum = 2: (0, 2) rotation 0 comes before (2, 0) rotation 1
    expect(findFreeSpot(sink, [t], lookup)).toEqual({ tileX: 0, tileY: 2, rotation: 0 })
  })

  it('uses the right wall when the left wall is taken', () => {
    // fill tx = 0 column with 1x1 trash cans
    const cans = [0, 1, 2, 3, 4, 5].map((y) => placed('trash', 0, y))
    const spot = findFreeSpot(sink, cans, lookup) as Placement
    expect(spot).toEqual({ tileX: 1, tileY: 0, rotation: 1 })
  })

  it('may stack a solid object on a rug', () => {
    const r = placed('rug', 0, 0, 0)
    expect(findFreeSpot(table, [r], lookup)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
  })

  it('does not stack a rug on a rug', () => {
    const r = placed('rug', 0, 0, 0)
    const spot = findFreeSpot(rug, [r], lookup) as Placement
    expect(spot).not.toBeNull()
    expect(overlaps(footprintOf(spot, rug), footprintOf(r, rug))).toBe(false)
  })

  it('returns null when the room is full of tables', () => {
    // 9 tables tile the 6x6 room exactly
    const tables: PlacedObject[] = []
    for (let x = 0; x < 6; x += 2) for (let y = 0; y < 6; y += 2) tables.push(placed('table', x, y))
    expect(tables).toHaveLength(9)
    expect(findFreeSpot(table, tables, lookup)).toBeNull()
    expect(findFreeSpot(trash, tables, lookup)).toBeNull()
    expect(findFreeSpot(sink, tables, lookup)).toBeNull()
  })

  it('finds a rug spot in a room full of solid tables (flat and solid are separate layers)', () => {
    const tables: PlacedObject[] = []
    for (let x = 0; x < 6; x += 2) for (let y = 0; y < 6; y += 2) tables.push(placed('table', x, y))
    expect(findFreeSpot(rug, tables, lookup)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
  })

  it('finds the last remaining hole', () => {
    const tables: PlacedObject[] = []
    for (let x = 0; x < 6; x += 2) for (let y = 0; y < 6; y += 2) if (!(x === 4 && y === 4)) tables.push(placed('table', x, y))
    expect(findFreeSpot(table, tables, lookup)).toEqual({ tileX: 4, tileY: 4, rotation: 0 })
    expect(findFreeSpot(trash, tables, lookup)).toEqual({ tileX: 4, tileY: 4, rotation: 0 })
  })

  it('returns null for a wall object when both walls are blocked', () => {
    const cans = [
      ...[0, 1, 2, 3, 4, 5].map((y) => placed('trash', 0, y)),
      ...[1, 2, 3, 4, 5].map((x) => placed('trash', x, 0)),
    ]
    expect(findFreeSpot(sink, cans, lookup)).toBeNull()
    expect(findFreeSpot(bed, cans, lookup)).toBeNull()
    // but floor objects still fit
    expect(findFreeSpot(table, cans, lookup)).not.toBeNull()
  })
})

describe('snapDrag', () => {
  describe('floor objects', () => {
    it('centres a 1x1 under the pointer', () => {
      // pointer in the middle of tile (2, 3)
      expect(snapDrag(trash, 2.5, 3.5, 0)).toEqual({ tileX: 2, tileY: 3, rotation: 0 })
    })

    it('centres a 2x2 on the pointer (pointer on a tile corner)', () => {
      expect(snapDrag(table, 3, 3, 0)).toEqual({ tileX: 2, tileY: 2, rotation: 0 })
    })

    it('uses the rotated footprint when centring (rug 2x3)', () => {
      // rotation 0: w=2, d=3 -> tileX = round(3 - 1) = 2, tileY = round(3 - 1.5) = round(1.5) = 2
      expect(snapDrag(rug, 3, 3, 0)).toEqual({ tileX: 2, tileY: 2, rotation: 0 })
      // rotation 1: w=3, d=2 -> tileX = round(3 - 1.5) = 2, tileY = round(3 - 1) = 2
      expect(snapDrag(rug, 3, 3, 1)).toEqual({ tileX: 2, tileY: 2, rotation: 1 })
      expect(snapDrag(rug, 4, 2, 1)).toEqual({ tileX: 3, tileY: 1, rotation: 1 })
    })

    it('keeps the requested rotation', () => {
      for (const r of [0, 1, 2, 3] as Rotation[]) expect(snapDrag(table, 3, 3, r).rotation).toBe(r)
    })

    it('clamps inside the room at the back edges', () => {
      expect(snapDrag(table, -5, -5, 0)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
      expect(snapDrag(table, 0, 3, 0)).toEqual({ tileX: 0, tileY: 2, rotation: 0 })
      expect(snapDrag(table, 3, 0, 0)).toEqual({ tileX: 2, tileY: 0, rotation: 0 })
    })

    it('clamps inside the room at the front edges', () => {
      expect(snapDrag(table, 20, 20, 0)).toEqual({ tileX: 4, tileY: 4, rotation: 0 })
      expect(snapDrag(table, 6, 3, 0)).toEqual({ tileX: 4, tileY: 2, rotation: 0 })
      expect(snapDrag(table, 3, 6, 0)).toEqual({ tileX: 2, tileY: 4, rotation: 0 })
      expect(snapDrag(trash, 6, 6, 0)).toEqual({ tileX: 5, tileY: 5, rotation: 0 })
    })

    it('clamps non-square objects with their rotated size', () => {
      expect(snapDrag(rug, 99, 99, 0)).toEqual({ tileX: 4, tileY: 3, rotation: 0 })
      expect(snapDrag(rug, 99, 99, 1)).toEqual({ tileX: 3, tileY: 4, rotation: 1 })
    })

    it('always yields a placement inside the room, for pointers well outside', () => {
      for (const e of [trash, table, rug]) {
        for (const r of [0, 1, 2, 3] as Rotation[]) {
          for (const v of [-10, -0.5, 0, 2.5, 5.99, 6, 12]) {
            for (const w of [-10, -0.5, 0, 2.5, 5.99, 6, 12]) {
              const p = snapDrag(e, v, w, r)
              expect(insideRoom(footprintOf(p, e))).toBe(true)
            }
          }
        }
      }
    })
  })

  describe('wall objects', () => {
    it('picks the left wall (rotation 0, tileX 0) when tx <= ty', () => {
      expect(snapDrag(sink, 1, 3, 0)).toEqual({ tileX: 0, tileY: 3, rotation: 0 })
    })

    it('slides along the left wall under the pointer', () => {
      expect(snapDrag(sink, 1, 3.5, 0)).toEqual({ tileX: 0, tileY: 3, rotation: 0 })
      expect(snapDrag(sink, 0.2, 1.5, 0)).toEqual({ tileX: 0, tileY: 1, rotation: 0 })
    })

    it('picks the right wall (rotation 1, tileY 0) when tx > ty', () => {
      expect(snapDrag(sink, 3.5, 1, 0)).toEqual({ tileX: 3, tileY: 0, rotation: 1 })
      expect(snapDrag(sink, 4.5, 0.2, 0)).toEqual({ tileX: 4, tileY: 0, rotation: 1 })
    })

    it('treats tx === ty as the left wall', () => {
      expect(snapDrag(sink, 2.5, 2.5, 1).rotation).toBe(0)
      expect(snapDrag(sink, 2.5, 2.5, 1).tileX).toBe(0)
    })

    it('ignores the incoming rotation for wall objects', () => {
      for (const r of [0, 1, 2, 3] as Rotation[]) {
        expect(snapDrag(sink, 1, 4, r).rotation).toBe(0)
        expect(snapDrag(sink, 4, 1, r).rotation).toBe(1)
      }
    })

    it('swaps the footprint with the wall (bed 3x2)', () => {
      // left wall: 3 along tx, 2 along ty
      const left = snapDrag(bed, 1, 3, 0)
      expect(left.rotation).toBe(0)
      expect(left.tileX).toBe(0)
      expect(left.tileY).toBe(2) // round(3 - 1)
      expect(footprintOf(left, bed)).toEqual({ tx: 0, ty: 2, w: 3, d: 2 })

      // right wall: 2 along tx, 3 along ty
      const right = snapDrag(bed, 3, 1, 0)
      expect(right.rotation).toBe(1)
      expect(right.tileY).toBe(0)
      expect(right.tileX).toBe(2) // round(3 - 1)
      expect(footprintOf(right, bed)).toEqual({ tx: 2, ty: 0, w: 2, d: 3 })
    })

    it('clamps along the wall using the rotated size', () => {
      // bed on the left wall is 2 deep along ty: max tileY = 4
      expect(snapDrag(bed, 0, 99, 0)).toEqual({ tileX: 0, tileY: 4, rotation: 0 })
      // bed on the right wall is 2 wide along tx: max tileX = 4
      expect(snapDrag(bed, 99, 0, 0)).toEqual({ tileX: 4, tileY: 0, rotation: 1 })
      // couch (1x2): left wall d = 2, right wall w = 2
      expect(snapDrag(couch, 0, 99, 0)).toEqual({ tileX: 0, tileY: 4, rotation: 0 })
      expect(snapDrag(couch, 99, 0, 0)).toEqual({ tileX: 4, tileY: 0, rotation: 1 })
    })

    it('clamps to the back corner for a pointer behind the room', () => {
      expect(snapDrag(sink, -3, -3, 0)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
      expect(snapDrag(bed, -3, -3, 0)).toEqual({ tileX: 0, tileY: 0, rotation: 0 })
    })

    it('always yields a valid placement against a wall in an empty room', () => {
      for (const e of [sink, bed, couch]) {
        for (const v of [-4, 0, 0.5, 1.5, 2.5, 3, 4.5, 5.99, 6, 9]) {
          for (const w of [-4, 0, 0.5, 1.5, 2.5, 3, 4.5, 5.99, 6, 9]) {
            const p = snapDrag(e, v, w, 0)
            expect(checkPlacement(e, p, [], lookup).ok).toBe(true)
          }
        }
      }
    })
  })
})

describe('turned', () => {
  describe('wall objects', () => {
    it('mirrors across the diagonal and flips 0 -> 1', () => {
      expect(turned(sink, { tileX: 0, tileY: 3, rotation: 0 })).toEqual({ tileX: 3, tileY: 0, rotation: 1 })
    })

    it('mirrors across the diagonal and flips 1 -> 0', () => {
      expect(turned(sink, { tileX: 4, tileY: 0, rotation: 1 })).toEqual({ tileX: 0, tileY: 4, rotation: 0 })
    })

    it('stays against a wall', () => {
      for (let i = 0; i < 6; i++) {
        expect(againstWall(turned(sink, { tileX: 0, tileY: i, rotation: 0 }))).toBe(true)
        expect(againstWall(turned(sink, { tileX: i, tileY: 0, rotation: 1 }))).toBe(true)
      }
    })

    it('turning twice returns the original', () => {
      const p: Placement = { tileX: 0, tileY: 2, rotation: 0 }
      expect(turned(bed, turned(bed, p))).toEqual(p)
      const q: Placement = { tileX: 3, tileY: 0, rotation: 1 }
      expect(turned(bed, turned(bed, q))).toEqual(q)
    })

    it('keeps a valid wall object valid and inside the room (bed and couch, every slot)', () => {
      for (const e of [sink, bed, couch]) {
        for (let i = 0; i < 6; i++) {
          for (const p of [
            { tileX: 0, tileY: i, rotation: 0 } as Placement,
            { tileX: i, tileY: 0, rotation: 1 } as Placement,
          ]) {
            if (!checkPlacement(e, p, [], lookup).ok) continue
            expect(checkPlacement(e, turned(e, p), [], lookup)).toEqual({ ok: true, problem: null, blockers: [] })
          }
        }
      }
    })

    it('mirrors the footprint across the diagonal (tx/ty and w/d swap)', () => {
      const p: Placement = { tileX: 0, tileY: 2, rotation: 0 }
      const a = footprintOf(p, bed)
      const b = footprintOf(turned(bed, p), bed)
      expect(b).toEqual({ tx: a.ty, ty: a.tx, w: a.d, d: a.w })
    })

    it('normalises rotations 2 and 3 to 1 and 0', () => {
      expect(turned(sink, { tileX: 0, tileY: 3, rotation: 2 }).rotation).toBe(1)
      expect(turned(sink, { tileX: 0, tileY: 3, rotation: 3 }).rotation).toBe(0)
    })
  })

  describe('floor objects', () => {
    it('turns in place: position is unchanged', () => {
      expect(turned(table, { tileX: 2, tileY: 3, rotation: 0 })).toEqual({ tileX: 2, tileY: 3, rotation: 1 })
      expect(turned(table, { tileX: 2, tileY: 3, rotation: 1 })).toEqual({ tileX: 2, tileY: 3, rotation: 0 })
    })

    it('swaps the footprint at the same top corner (rug)', () => {
      const p: Placement = { tileX: 1, tileY: 1, rotation: 0 }
      expect(footprintOf(turned(rug, p), rug)).toEqual({ tx: 1, ty: 1, w: 3, d: 2 })
    })

    it('cycles 2 and 3 back to 1 and 0', () => {
      expect(turned(table, { tileX: 2, tileY: 3, rotation: 2 }).rotation).toBe(1)
      expect(turned(table, { tileX: 2, tileY: 3, rotation: 3 }).rotation).toBe(0)
    })

    // The rug (2x3) at (4, 3) fits at rotation 0 (tx 4..6, ty 3..6); turned
    // it is 3x2, so it is nudged back to tx 3..6.
    it('keeps a floor object inside the room when turned near the front edge', () => {
      const p: Placement = { tileX: 4, tileY: 3, rotation: 0 }
      expect(insideRoom(footprintOf(p, rug))).toBe(true)
      expect(insideRoom(footprintOf(turned(rug, p), rug))).toBe(true)
    })
  })
})

describe('depthOrder', () => {
  const item = (id: string, layer: 'solid' | 'flat', tx: number, ty: number, w: number, d: number): Sortable => ({
    id,
    layer,
    footprint: fp(tx, ty, w, d),
  })
  const ids = (items: Sortable[]) => items.map((i) => i.id)

  it('returns an empty array for no items', () => {
    expect(depthOrder([])).toEqual([])
  })

  it('returns a single item untouched', () => {
    const a = item('a', 'solid', 2, 2, 1, 1)
    expect(depthOrder([a])).toEqual([a])
  })

  it('does not mutate the input', () => {
    const input = [item('b', 'solid', 3, 3, 1, 1), item('a', 'solid', 0, 0, 1, 1)]
    const copy = [...input]
    depthOrder(input)
    expect(input).toEqual(copy)
  })

  it('draws flat items before solid ones, even when the flat one is in front', () => {
    const rugFront = item('rug', 'flat', 4, 4, 2, 2)
    const tableBack = item('table', 'solid', 0, 0, 2, 2)
    expect(ids(depthOrder([tableBack, rugFront]))).toEqual(['rug', 'table'])
    expect(ids(depthOrder([rugFront, tableBack]))).toEqual(['rug', 'table'])
  })

  it('draws flat items before solid ones even when they overlap', () => {
    const rugUnder = item('rug', 'flat', 0, 0, 2, 3)
    const tableOn = item('table', 'solid', 0, 0, 2, 2)
    expect(ids(depthOrder([tableOn, rugUnder]))).toEqual(['rug', 'table'])
  })

  it('orders several flat items back to front', () => {
    const near = item('near', 'flat', 3, 3, 1, 1)
    const far = item('far', 'flat', 0, 0, 1, 1)
    const mid = item('mid', 'flat', 1, 1, 1, 1)
    expect(ids(depthOrder([near, far, mid]))).toEqual(['far', 'mid', 'near'])
  })

  it('draws an item fully behind another along tx first', () => {
    const behind = item('behind', 'solid', 0, 2, 1, 1)
    const front = item('front', 'solid', 1, 2, 1, 1)
    expect(ids(depthOrder([front, behind]))).toEqual(['behind', 'front'])
    expect(ids(depthOrder([behind, front]))).toEqual(['behind', 'front'])
  })

  it('draws an item fully behind another along ty first', () => {
    const behind = item('behind', 'solid', 2, 0, 1, 1)
    const front = item('front', 'solid', 2, 1, 1, 1)
    expect(ids(depthOrder([front, behind]))).toEqual(['behind', 'front'])
    expect(ids(depthOrder([behind, front]))).toEqual(['behind', 'front'])
  })

  it('puts a bed (3x2) behind a table (2x2) that sits in front of it along ty', () => {
    const b = item('bed', 'solid', 0, 0, 3, 2)
    const t = item('table', 'solid', 0, 2, 2, 2)
    expect(ids(depthOrder([t, b]))).toEqual(['bed', 'table'])
    expect(ids(depthOrder([b, t]))).toEqual(['bed', 'table'])
  })

  it('puts a bed (3x2) behind a table that sits in front of it along tx', () => {
    const b = item('bed', 'solid', 0, 0, 3, 2)
    const t = item('table', 'solid', 3, 0, 2, 2)
    expect(ids(depthOrder([t, b]))).toEqual(['bed', 'table'])
  })

  it('puts a table before a bed that is in front of it along ty', () => {
    const t = item('table', 'solid', 0, 0, 2, 2)
    const b = item('bed', 'solid', 0, 2, 3, 2)
    expect(ids(depthOrder([b, t]))).toEqual(['table', 'bed'])
  })

  it('puts a table before a bed that is in front of it along tx (bed rotated, 2x3)', () => {
    const t = item('table', 'solid', 0, 0, 2, 2)
    const b = item('bed', 'solid', 2, 0, 2, 3)
    expect(ids(depthOrder([b, t]))).toEqual(['table', 'bed'])
  })

  it('handles a table tucked into the corner of an L around it (bed behind, table beside)', () => {
    // bed along the left wall, table diagonal in front of it
    const b = item('bed', 'solid', 0, 0, 3, 2)
    const t = item('table', 'solid', 3, 2, 2, 2)
    expect(ids(depthOrder([t, b]))).toEqual(['bed', 'table'])
  })

  it('is stable for items far apart on screen (opposite sides of the room)', () => {
    const left = item('left', 'solid', 0, 4, 1, 1)
    const right = item('right', 'solid', 4, 0, 1, 1)
    const out = ids(depthOrder([left, right]))
    expect(out).toHaveLength(2)
    expect(out.sort()).toEqual(['left', 'right'])
    // and deterministic regardless of input order
    expect(ids(depthOrder([right, left]))).toEqual(ids(depthOrder([left, right])))
  })

  it('gives the same result for side-by-side items regardless of input order', () => {
    const a = item('a', 'solid', 0, 0, 1, 1)
    const b = item('b', 'solid', 1, 0, 1, 1)
    const c = item('c', 'solid', 2, 0, 1, 1)
    const expected = ['a', 'b', 'c']
    expect(ids(depthOrder([a, b, c]))).toEqual(expected)
    expect(ids(depthOrder([c, b, a]))).toEqual(expected)
    expect(ids(depthOrder([b, c, a]))).toEqual(expected)
  })

  it('sorts a diagonal row of items back to front', () => {
    const list = [4, 2, 0, 3, 1].map((i) => item(`i${i}`, 'solid', i, i, 1, 1))
    expect(ids(depthOrder(list))).toEqual(['i0', 'i1', 'i2', 'i3', 'i4'])
  })

  it('sorts a grid of 1x1 items so that nothing is drawn after something in front of it', () => {
    const list: Sortable[] = []
    for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) list.push(item(`${x}-${y}`, 'solid', x, y, 1, 1))
    const shuffled = [...list].reverse()
    const out = depthOrder(shuffled)
    expect(out).toHaveLength(36)
    const pos = new Map(out.map((o, i) => [o.id, i]))
    for (const a of list) {
      for (const b of list) {
        const fa = a.footprint
        const fb = b.footprint
        // a is strictly behind b on tx, or the same column and behind on ty
        if (fa.tx < fb.tx || (fa.tx === fb.tx && fa.ty < fb.ty)) {
          expect(pos.get(a.id)!).toBeLessThan(pos.get(b.id)!)
        }
      }
    }
  })

  it('treats non-flat layers as solid (only "flat" goes first)', () => {
    const solidFront = item('solid', 'solid', 5, 5, 1, 1)
    const flatBack = item('flat', 'flat', 0, 0, 1, 1)
    expect(ids(depthOrder([solidFront, flatBack]))).toEqual(['flat', 'solid'])
  })

  it('keeps extra properties on the returned items', () => {
    const a = { ...item('a', 'solid', 0, 0, 1, 1), label: 'hello' }
    const out = depthOrder([a])
    expect(out[0].label).toBe('hello')
    expect(out[0]).toBe(a)
  })

  it('does not hang or drop items when the rules form a cycle', () => {
    // a long thin item wrapped by neighbours is a classic iso-sorting cycle
    const list = [
      item('long', 'solid', 0, 2, 4, 1),
      item('tall', 'solid', 2, 0, 1, 4),
      item('x', 'solid', 1, 1, 1, 1),
    ]
    const out = depthOrder(list)
    expect(ids(out).sort()).toEqual(['long', 'tall', 'x'])
  })

  describe('property: random non-overlapping rooms', () => {
    // mulberry32, fixed seed so the test is deterministic
    function rng(seed: number): () => number {
      let a = seed >>> 0
      return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }

    const pool = [sink, bed, couch, rug, table, trash]

    function randomRoom(rand: () => number): (PlacedObject & { entry: CatalogEntry })[] {
      const objs: PlacedObject[] = []
      const attempts = 3 + Math.floor(rand() * 30)
      for (let i = 0; i < attempts; i++) {
        const e = pool[Math.floor(rand() * pool.length)]
        const p: Placement = {
          tileX: Math.floor(rand() * ROOM_SIZE),
          tileY: Math.floor(rand() * ROOM_SIZE),
          rotation: Math.floor(rand() * 4) as Rotation,
        }
        if (checkPlacement(e, p, objs, lookup).ok) objs.push({ id: `p${i}`, roomId: 'r', catalogId: e.id, ...p })
      }
      return objs.map((o) => ({ ...o, entry: entry(o.catalogId) }))
    }

    function shuffle<T>(rand: () => number, list: T[]): T[] {
      const out = [...list]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    }

    it('never loses or duplicates an item, and always puts flat items first', () => {
      const rand = rng(20261006)
      let total = 0
      for (let round = 0; round < 300; round++) {
        const room = randomRoom(rand)
        const items = shuffle(
          rand,
          room.map((o) => ({ id: o.id, layer: o.entry.layer, footprint: footprintOf(o, o.entry) })),
        )
        const out = depthOrder(items)
        total += items.length

        expect(out).toHaveLength(items.length)
        expect(new Set(out.map((o) => o.id)).size).toBe(items.length)
        expect(out.map((o) => o.id).sort()).toEqual(items.map((o) => o.id).sort())

        const firstSolid = out.findIndex((o) => o.layer !== 'flat')
        if (firstSolid !== -1) {
          expect(out.slice(firstSolid).every((o) => o.layer !== 'flat')).toBe(true)
        }
      }
      expect(total).toBeGreaterThan(300) // the generator actually produced rooms
    })

    it('is deterministic for a given input order', () => {
      const rand = rng(7)
      for (let round = 0; round < 50; round++) {
        const room = randomRoom(rand)
        const items = room.map((o) => ({ id: o.id, layer: o.entry.layer, footprint: footprintOf(o, o.entry) }))
        expect(depthOrder(items).map((o) => o.id)).toEqual(depthOrder(items).map((o) => o.id))
      }
    })

    it('draws a solid item before another whenever it is entirely behind it on both axes', () => {
      // unambiguous case: a ends before b starts on tx AND on ty. No rule can contradict this.
      const rand = rng(99)
      let checked = 0
      for (let round = 0; round < 300; round++) {
        const room = randomRoom(rand)
        const items = shuffle(
          rand,
          room.map((o) => ({ id: o.id, layer: o.entry.layer, footprint: footprintOf(o, o.entry) })),
        )
        const out = depthOrder(items)
        const pos = new Map(out.map((o, i) => [o.id, i]))
        const solids = items.filter((i) => i.layer !== 'flat')
        for (const a of solids) {
          for (const b of solids) {
            if (a === b) continue
            const fa = a.footprint
            const fb = b.footprint
            if (fa.tx + fa.w <= fb.tx && fa.ty + fa.d <= fb.ty) {
              checked++
              expect(pos.get(a.id)!).toBeLessThan(pos.get(b.id)!)
            }
          }
        }
      }
      expect(checked).toBeGreaterThan(0)
    })
  })
})

describe('screenToTile', () => {
  const close = (a: { tx: number; ty: number }, tx: number, ty: number) => {
    expect(a.tx).toBeCloseTo(tx, 9)
    expect(a.ty).toBeCloseTo(ty, 9)
  }

  it('maps the floor origin to tile (0, 0)', () => {
    const p = roomPoint(0, 0)
    close(screenToTile(p.x, p.y), 0, 0)
  })

  it('round-trips the room corners', () => {
    for (const [tx, ty] of [
      [0, 0],
      [6, 0],
      [0, 6],
      [6, 6],
    ]) {
      const p = roomPoint(tx, ty)
      close(screenToTile(p.x, p.y), tx, ty)
    }
  })

  it('round-trips the room centre', () => {
    const p = roomPoint(3, 3)
    close(screenToTile(p.x, p.y), 3, 3)
  })

  it('round-trips fractional points', () => {
    for (const [tx, ty] of [
      [0.5, 0.5],
      [2.25, 4.75],
      [5.9, 0.1],
      [0.1, 5.9],
      [3.333, 1.667],
      [1 / 3, 2 / 3],
    ]) {
      const p = roomPoint(tx, ty)
      close(screenToTile(p.x, p.y), tx, ty)
    }
  })

  it('round-trips points outside the room (negative and beyond the front)', () => {
    for (const [tx, ty] of [
      [-1.5, 2],
      [2, -3.25],
      [8, 9.5],
    ]) {
      const p = roomPoint(tx, ty)
      close(screenToTile(p.x, p.y), tx, ty)
    }
  })

  it('ignores z only because it is called at z = 0: lifted points read as nearer the back', () => {
    const base = roomPoint(3, 3)
    const lifted = roomPoint(3, 3, 20)
    const t = screenToTile(lifted.x, lifted.y)
    // moving up the screen decreases both tx and ty equally
    expect(t.tx).toBeLessThan(3)
    expect(t.ty).toBeLessThan(3)
    expect(3 - t.tx).toBeCloseTo(3 - t.ty)
    expect(base.x).toBe(lifted.x)
  })

  it('is the inverse the other way: roomPoint(screenToTile(x, y)) = (x, y)', () => {
    for (const [x, y] of [
      [195, 170],
      [195, 255],
      [300, 240],
      [100, 300],
    ]) {
      const t = screenToTile(x, y)
      const p = roomPoint(t.tx, t.ty)
      expect(p.x).toBeCloseTo(x, 9)
      expect(p.y).toBeCloseTo(y, 9)
    }
  })

  it('feeds snapDrag so that a pointer over a tile centre lands the 1x1 on that tile', () => {
    for (const [tx, ty] of [
      [0, 0],
      [2, 4],
      [5, 5],
      [4, 1],
    ]) {
      const c = roomPoint(tx + 0.5, ty + 0.5)
      const t = screenToTile(c.x, c.y)
      expect(snapDrag(trash, t.tx, t.ty, 0)).toEqual({ tileX: tx, tileY: ty, rotation: 0 })
    }
  })
})

describe('freeTile', () => {
  it('prefers the front corner of an empty room', () => {
    expect(freeTile([])).toEqual({ tx: 5, ty: 5 })
  })

  it('skips an occupied front tile and takes a neighbour one step back', () => {
    const t = freeTile([fp(5, 5, 1, 1)])
    expect(t).toEqual({ tx: 5, ty: 4 })
  })

  it('skips tiles under multi-tile footprints', () => {
    // table at (4, 4) covers the four front tiles
    const t = freeTile([fp(4, 4, 2, 2)])
    expect(t).toEqual({ tx: 5, ty: 3 })
  })

  it('prefers a tile further front over one further back', () => {
    // only the very back corner and a mid tile are free
    const occupied: Footprint[] = []
    for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) if (!(x === 0 && y === 0) && !(x === 3 && y === 2)) occupied.push(fp(x, y, 1, 1))
    expect(freeTile(occupied)).toEqual({ tx: 3, ty: 2 })
  })

  it('finds the only free tile, even at the back corner', () => {
    const occupied: Footprint[] = []
    for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) if (!(x === 0 && y === 0)) occupied.push(fp(x, y, 1, 1))
    expect(freeTile(occupied)).toEqual({ tx: 0, ty: 0 })
  })

  it('returns null when the room is full', () => {
    expect(freeTile([fp(0, 0, 6, 6)])).toBeNull()
    const occupied: Footprint[] = []
    for (let x = 0; x < 6; x += 2) for (let y = 0; y < 6; y += 2) occupied.push(fp(x, y, 2, 2))
    expect(freeTile(occupied)).toBeNull()
  })

  it('only returns tiles inside the room and never an occupied one', () => {
    const occupied = [fp(0, 0, 3, 2), fp(4, 4, 2, 2), fp(2, 3, 1, 1), fp(5, 0, 1, 3)]
    const blocked = new Set(occupied.flatMap((f) => tilesOf(f).map((t) => `${t.tx},${t.ty}`)))
    const picked: string[] = []
    const stack = [...occupied]
    for (let i = 0; i < 40; i++) {
      const t = freeTile(stack)
      if (!t) break
      expect(t.tx).toBeGreaterThanOrEqual(0)
      expect(t.tx).toBeLessThan(6)
      expect(t.ty).toBeGreaterThanOrEqual(0)
      expect(t.ty).toBeLessThan(6)
      expect(blocked.has(`${t.tx},${t.ty}`)).toBe(false)
      expect(picked).not.toContain(`${t.tx},${t.ty}`)
      picked.push(`${t.tx},${t.ty}`)
      stack.push(fp(t.tx, t.ty, 1, 1))
    }
    // every tile ends up either blocked or picked, then null
    expect(picked.length + blocked.size).toBe(36)
    expect(freeTile(stack)).toBeNull()
  })

  it('ignores footprints that are entirely outside the room', () => {
    expect(freeTile([fp(7, 7, 2, 2)])).toEqual({ tx: 5, ty: 5 })
  })
})

describe('the window', () => {
  const poster = { footprint: { w: 1, d: 1 }, placement: 'wall' as const, layer: 'hung' as const }
  const none = () => undefined
  it("keeps hung things off the window on the left wall, but allows them beside it and on the right wall", () => {
    expect(checkPlacement(poster, { tileX: 0, tileY: 2, rotation: 0 }, [], none).problem).toBe('window')
    expect(checkPlacement(poster, { tileX: 0, tileY: 1, rotation: 0 }, [], none).problem).toBe('window')
    expect(checkPlacement(poster, { tileX: 0, tileY: 0, rotation: 0 }, [], none).ok).toBe(true)
    expect(checkPlacement(poster, { tileX: 0, tileY: 4, rotation: 0 }, [], none).ok).toBe(true)
    expect(checkPlacement(poster, { tileX: 2, tileY: 0, rotation: 1 }, [], none).ok).toBe(true)
  })
})
