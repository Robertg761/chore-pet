import { describe, expect, it } from 'vitest'
import type { CatalogEntry } from '../catalog/types'
import { CATALOG, DECOR } from '../catalog/objects'
import type { RoomType } from '../domain/types'
import { groupCatalog, type CatalogGroup } from './buildModel'

const ALL: CatalogEntry[] = [...CATALOG, ...DECOR]
const ROOM_TYPES: RoomType[] = ['kitchen', 'bathroom', 'bedroom', 'living', 'other']

/** A small catalog entry; with chores unless `withChores` is false. */
const fake = (id: string, rooms: RoomType[], withChores = true): CatalogEntry => ({
  id,
  name: id,
  rooms,
  footprint: { w: 1, d: 1 },
  placement: 'floor',
  layer: 'solid',
  mess: 'dust',
  chores: withChores ? [{ name: `Tidy ${id}`, schedule: { kind: 'daily' } }] : [],
})

/** Group key -> entry ids, in the order the groups come. */
const idsByKey = (groups: CatalogGroup[]) => Object.fromEntries(groups.map((g) => [g.key, g.entries.map((e) => e.id)]))

describe('groupCatalog with the real catalog', () => {
  it('lists groups with their labels, leaving out groups already assigned to a preferred room', () => {
    const groups = groupCatalog(ALL, 'kitchen')
    expect(groups.map((g) => [g.key, g.label])).toEqual([
      ['kitchen', 'Kitchen'],
      ['bathroom', 'Bathroom'],
      ['bedroom', 'Bedroom'],
      ['living', 'Living room'],
      ['decor', 'Decor'],
    ])
  })

  it('puts shared furniture in the focused room before the fallback room order', () => {
    expect(idsByKey(groupCatalog(ALL, 'kitchen')).kitchen).toEqual(expect.arrayContaining(['washer', 'plant', 'dining-chair', 'wall-shelf']))
    expect(idsByKey(groupCatalog(ALL, 'bathroom')).bathroom).toEqual(expect.arrayContaining(['washer', 'mirror', 'bathtub', 'bathroom-vanity']))
    expect(idsByKey(groupCatalog(ALL, 'bedroom')).bedroom).toEqual(expect.arrayContaining(['bed', 'plant', 'nightstand', 'wardrobe', 'desk']))
    expect(idsByKey(groupCatalog(ALL, 'living')).living).toEqual(expect.arrayContaining(['table', 'plant', 'rug', 'armchair', 'coffee-table']))
  })

  it.each(ROOM_TYPES)('leads with furniture suited to %s', (roomType) => {
    const groups = groupCatalog(ALL, roomType)
    expect(groups[0].key).toBe(roomType)
    expect(groups[0].entries.every((entry) => entry.rooms.includes(roomType))).toBe(true)
  })

  it('offers work and entryway furniture first in other rooms', () => {
    const groups = groupCatalog(ALL, 'other')
    expect(groups.map((g) => g.key)).toEqual(['other', 'kitchen', 'bathroom', 'bedroom', 'living', 'decor'])
    expect(idsByKey(groups).other).toEqual(['bench', 'desk', 'shoe-rack', 'wall-shelf'])
  })

  it.each(ROOM_TYPES)('for %s, every entry appears exactly once, and decor is always last', (roomType) => {
    const groups = groupCatalog(ALL, roomType)
    const flat = groups.flatMap((g) => g.entries.map((e) => e.id))
    expect([...flat].sort()).toEqual(ALL.map((e) => e.id).sort())
    expect(new Set(flat).size).toBe(ALL.length)
    expect(groups.at(-1)?.key).toBe('decor')
  })

  it.each(ROOM_TYPES)('for %s, chore-less entries are only in decor and every other group has chores', (roomType) => {
    const groups = groupCatalog(ALL, roomType)
    for (const g of groups) {
      if (g.key === 'decor') expect(g.entries.every((e) => e.chores.length === 0)).toBe(true)
      else expect(g.entries.every((e) => e.chores.length > 0)).toBe(true)
    }
  })

  it.each(ROOM_TYPES)('for %s, no group is empty and every label is set', (roomType) => {
    for (const g of groupCatalog(ALL, roomType)) {
      expect(g.entries.length).toBeGreaterThan(0)
      expect(g.label).not.toBe('')
    }
  })

  it('does not change the catalog it is given', () => {
    const copy = [...ALL]
    groupCatalog(copy, 'living')
    expect(copy).toEqual(ALL)
  })
})

describe('groupCatalog with small fake entries', () => {
  it('puts the room own type first, then kitchen, bathroom, bedroom, living, other', () => {
    const entries = [fake('o', ['other']), fake('l', ['living']), fake('b', ['bedroom']), fake('k', ['kitchen']), fake('ba', ['bathroom'])]
    expect(groupCatalog(entries, 'other').map((g) => g.key)).toEqual(['other', 'kitchen', 'bathroom', 'bedroom', 'living'])
    expect(groupCatalog(entries, 'living').map((g) => g.key)).toEqual(['living', 'kitchen', 'bathroom', 'bedroom', 'other'])
    expect(groupCatalog(entries, 'bathroom').map((g) => g.key)).toEqual(['bathroom', 'kitchen', 'bedroom', 'living', 'other'])
  })

  it('places a thing with several rooms under the first of its rooms in that order', () => {
    const multi = fake('m', ['living', 'bedroom'])
    expect(idsByKey(groupCatalog([multi], 'bedroom'))).toEqual({ bedroom: ['m'] })
    expect(idsByKey(groupCatalog([multi], 'living'))).toEqual({ living: ['m'] })
    expect(idsByKey(groupCatalog([multi], 'other'))).toEqual({ bedroom: ['m'] })
    expect(idsByKey(groupCatalog([fake('k2', ['living', 'kitchen'])], 'bathroom'))).toEqual({ kitchen: ['k2'] })
  })

  it('keeps catalog order inside a group', () => {
    const entries = [fake('b1', ['bedroom']), fake('k1', ['kitchen']), fake('b2', ['bedroom']), fake('k2', ['kitchen']), fake('b3', ['bedroom'])]
    expect(idsByKey(groupCatalog(entries, 'kitchen'))).toEqual({ kitchen: ['k1', 'k2'], bedroom: ['b1', 'b2', 'b3'] })
    expect(idsByKey(groupCatalog(entries, 'bedroom'))).toEqual({ bedroom: ['b1', 'b2', 'b3'], kitchen: ['k1', 'k2'] })
  })

  it('puts entries with no chores in decor, even when they name a room, and decor comes last', () => {
    const entries = [fake('d1', ['kitchen'], false), fake('k', ['kitchen']), fake('d2', ['living'], false)]
    const groups = groupCatalog(entries, 'living')
    expect(groups.map((g) => g.key)).toEqual(['kitchen', 'decor'])
    expect(idsByKey(groups)).toEqual({ kitchen: ['k'], decor: ['d1', 'd2'] })
    expect(groups.at(-1)?.label).toBe('Decor')
  })

  it('omits empty groups, and returns no groups for an empty catalog', () => {
    expect(groupCatalog([fake('k', ['kitchen'])], 'bathroom').map((g) => g.key)).toEqual(['kitchen'])
    expect(groupCatalog([], 'kitchen')).toEqual([])
  })

  it('a catalog of only decor is one Decor group', () => {
    const groups = groupCatalog([fake('d', ['kitchen'], false)], 'kitchen')
    expect(groups).toEqual([{ key: 'decor', label: 'Decor', entries: [expect.objectContaining({ id: 'd' })] }])
  })

  it('an entry with chores but no rooms still shows once, under Other', () => {
    const groups = groupCatalog([fake('orphan', [])], 'kitchen')
    expect(groups.flatMap((g) => g.entries.map((e) => e.id))).toEqual(['orphan'])
    expect(groups.map((g) => g.key)).toEqual(['other'])
  })
})
