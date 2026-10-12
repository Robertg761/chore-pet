import { describe, expect, it } from 'vitest'
import { normalizeAppearance } from '../catalog/customization'
import type { PlacedObject } from '../domain/types'
import { moveObject, restyleObject } from './actions'
import { MAPPERS } from './mappers'
import { change, emptySnapshot, upsertOp } from './state'

const object: PlacedObject = { id: 'chair', roomId: 'living', catalogId: 'armchair', tileX: 2, tileY: 3, rotation: 1 }
const appearance = { style: 'cottage', finish: 'sage', fabric: 'rose', pattern: 'checks', details: false } as const

describe('furniture appearance persistence', () => {
  it('round trips independent appearance settings through cloud rows', () => {
    const furnished = { ...object, appearance }
    const row = MAPPERS.placed_objects.toRow(furnished)
    expect(row.appearance).toEqual(appearance)
    expect(MAPPERS.placed_objects.fromRow(row)).toEqual(furnished)
  })

  it('keeps old rows unchanged and explicitly clears cloud appearance on reset', () => {
    const row = MAPPERS.placed_objects.toRow(object)
    expect(row.appearance).toBeNull()
    expect(MAPPERS.placed_objects.fromRow(row)).toEqual(object)
    const { appearance: _unused, ...legacy } = row
    expect(MAPPERS.placed_objects.fromRow(legacy)).toEqual(object)
  })

  it('restyles only the placed object and preserves identity and position', () => {
    const ops = restyleObject(object, appearance)
    expect(ops).toHaveLength(1)
    expect(ops[0]).toEqual(upsertOp('placed_objects', { ...object, appearance }))
    const saved = ops.reduce(change, emptySnapshot())
    expect(saved.tables.placed_objects.chair).toEqual({ ...object, appearance })
    expect(saved.outbox['placed_objects:chair']).toMatchObject({ value: { appearance } })
  })

  it('keeps customization when moving and removes it on reset', () => {
    const furnished = { ...object, appearance }
    expect(moveObject(furnished, { tileX: 4, tileY: 1, rotation: 0 })[0]).toMatchObject({ value: { appearance, tileX: 4 } })
    expect(restyleObject(furnished, undefined)).toEqual([upsertOp('placed_objects', object)])
  })

  it('falls back safely for malformed or future appearance values', () => {
    expect(normalizeAppearance({ style: 'future', fabric: 'url(https://example.com)', finish: null, pattern: [], details: false }))
      .toEqual({ style: 'classic', finish: 'natural', fabric: 'blue', pattern: 'plain', details: false })
    for (const value of [null, [], 'classic', 12]) expect(normalizeAppearance(value)).toEqual(normalizeAppearance())
  })
})
