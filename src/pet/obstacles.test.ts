import { expect, it } from 'vitest'
import { ALL_ENTRIES } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import { footprintOf, overlaps } from '../room/grid'
import { petObstacles } from './obstacles'

const object: PlacedObject = { id: 'fixture', roomId: 'room', catalogId: 'dishwasher', tileX: 2, tileY: 2, rotation: 0 }

it.each([0, 1, 2, 3] as const)('reserves the folded door and the front standing tile at rotation %s', (rotation) => {
  const obstacles = petObstacles([{ ...object, rotation }], { fixture: 'messy2' })
  expect(obstacles).toEqual([{ tx: 2, ty: 2, w: rotation % 2 ? 1 : 1.45, d: rotation % 2 ? 1.45 : 1 }])
  const front = rotation % 2 ? { tx: 2, ty: 3 } : { tx: 3, ty: 2 }
  const side = rotation % 2 ? { tx: 3, ty: 2 } : { tx: 2, ty: 3 }
  expect(obstacles.some((solid) => overlaps(solid, { ...front, w: 1, d: 1 }))).toBe(true)
  expect(obstacles.some((solid) => overlaps(solid, { ...side, w: 1, d: 1 }))).toBe(false)
})

it.each(['clean', 'messy1'] as const)('restores the original footprint and clear front when %s', (stage) => {
  expect(petObstacles([object], { fixture: stage })).toEqual([{ tx: 2, ty: 2, w: 1, d: 1 }])
})

it.each(['constructor', 'toString', '__proto__'])('requires an owned stage for reserved object ID %s', (id) => {
  const fixture = { ...object, id }
  expect(petObstacles([fixture], {})).toEqual([{ tx: 2, ty: 2, w: 1, d: 1 }])
  expect(petObstacles([fixture], { [id]: 'messy2' })).toEqual([{ tx: 2, ty: 2, w: 1.45, d: 1 }])
})

it('keeps every other solid footprint unchanged, with flat/hung/missing objects walkable', () => {
  for (const entry of ALL_ENTRIES) for (const rotation of [0, 1, 2, 3] as const) {
    const fixture = { ...object, catalogId: entry.id, rotation }
    const original = footprintOf(fixture, entry)
    const expected = entry.layer !== 'solid' ? [] : entry.id === 'dishwasher'
      ? [{ ...original, w: rotation % 2 ? original.w : original.w + 0.45, d: rotation % 2 ? original.d + 0.45 : original.d }]
      : [original]
    expect(petObstacles([fixture], { fixture: 'messy2' }), entry.id).toEqual(expected)
  }
  expect(petObstacles([{ ...object, catalogId: 'missing' }], { fixture: 'messy2' })).toEqual([])
})

it('does not mutate objects or stage records', () => {
  const objects = Object.freeze([Object.freeze({ ...object })])
  const stages = Object.freeze({ fixture: 'messy2' as const })
  expect(petObstacles(objects, stages)).toHaveLength(1)
  expect(objects[0]).toEqual(object)
  expect(stages).toEqual({ fixture: 'messy2' })
})
