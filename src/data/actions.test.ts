import { describe, expect, it } from 'vitest'
import { catalogEntry } from '../catalog/objects'
import { completeChore, createHousehold, moveObject, placeObject, removeObject } from './actions'
import { change, emptySnapshot, selectHome, type Snapshot } from './state'

function apply(s: Snapshot, ops: ReturnType<typeof createHousehold>): Snapshot {
  return ops.reduce(change, s)
}

function household() {
  return apply(emptySnapshot('u1'), createHousehold({ species: 'mochi', petName: 'Pip', userId: 'u1' }))
}

describe('rooms and objects', () => {
  it('starts every home with an empty kitchen and the pet in its own colour', () => {
    const data = selectHome(household().tables)
    expect(data.rooms).toHaveLength(1)
    expect(data.rooms[0]).toMatchObject({ type: 'kitchen', floorStyle: 'wood', wallStyle: 'peach' })
    expect(data.pet?.bodyColour).toBe('#FFCFDA')
  })

  it('placing an object brings its default chores, tied to the object', () => {
    let s = household()
    const room = selectHome(s.tables).rooms[0]
    const sink = catalogEntry('sink')!
    s = apply(s, placeObject(room, sink, { tileX: 0, tileY: 2, rotation: 0 }, '2026-10-06'))
    const data = selectHome(s.tables)
    expect(data.objects).toHaveLength(1)
    expect(data.chores.map((c) => c.name).sort()).toEqual(sink.chores.map((c) => c.name).sort())
    expect(data.chores.every((c) => c.objectId === data.objects[0].id && c.createdOn === '2026-10-06')).toBe(true)
  })

  it('moving keeps the chores; removing takes the chores and their history with it', () => {
    let s = household()
    const room = selectHome(s.tables).rooms[0]
    s = apply(s, placeObject(room, catalogEntry('stove')!, { tileX: 0, tileY: 0, rotation: 0 }, '2026-10-06'))
    s = apply(s, placeObject(room, catalogEntry('sink')!, { tileX: 0, tileY: 1, rotation: 0 }, '2026-10-06'))
    let data = selectHome(s.tables)
    const stove = data.objects.find((o) => o.catalogId === 'stove')!
    s = apply(s, moveObject(stove, { tileX: 3, tileY: 0, rotation: 1 }))
    data = selectHome(s.tables)
    expect(data.objects.find((o) => o.id === stove.id)).toMatchObject({ tileX: 3, tileY: 0, rotation: 1 })

    const stoveChore = data.chores.find((c) => c.objectId === stove.id)!
    s = apply(s, completeChore(stoveChore, data.progress, new Date(2026, 9, 6)))
    s = apply(s, removeObject(stove.id))
    data = selectHome(s.tables)
    expect(data.objects.map((o) => o.catalogId)).toEqual(['sink'])
    expect(data.chores.every((c) => c.objectId !== stove.id)).toBe(true)
    expect(data.completions).toHaveLength(0)
  })
})
