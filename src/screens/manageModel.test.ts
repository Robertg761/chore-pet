import { describe, expect, it } from 'vitest'
import type { Chore, PlacedObject } from '../domain/types'
import { againInput, choreGroups, PAST_LIMIT, pastChores, placeNames } from './manageModel'

const TODAY = '2026-10-08'
const object = (id: string, catalogId: string): PlacedObject => ({ id, roomId: 'r', catalogId, tileX: 0, tileY: 0, rotation: 0 })
const chore = (id: string, patch: Partial<Chore> = {}): Chore => ({ id, homeId: 'h', objectId: null, name: id, createdOn: '2026-10-01', schedule: { kind: 'daily' }, photoProof: false, ...patch })

describe('placeNames', () => {
  it('names objects from the catalog and numbers duplicates', () => {
    expect(placeNames([object('a', 'sink'), object('b', 'rug'), object('c', 'rug'), object('d', 'nope')]))
      .toEqual([{ id: 'a', name: 'Sink' }, { id: 'b', name: 'Floor rug' }, { id: 'c', name: 'Floor rug 2' }])
  })
})

describe('choreGroups', () => {
  it('groups today’s chores by object in room order, then anywhere, sorted by name', () => {
    const objects = [object('s', 'sink'), object('t', 'trash')]
    const groups = choreGroups([
      chore('Wipe', { objectId: 's' }),
      chore('Dishes', { objectId: 's' }),
      chore('Bins', { objectId: 't' }),
      chore('Water plants'),
      chore('Gone object', { objectId: 'removed' }),
      chore('Retired', { objectId: 's', archivedOn: '2026-10-05' }),
      chore('Not yet', { createdOn: '2026-10-09' }),
    ], objects, TODAY)
    // A chore dated to start later (a clock set ahead) is still listed, so it can be edited or removed.
    expect(groups.map((g) => [g.title, g.chores.map((c) => c.name)])).toEqual([
      ['Sink', ['Dishes', 'Wipe']],
      ['Trash can', ['Bins']],
      ['Anywhere', ['Gone object', 'Not yet', 'Water plants']],
    ])
  })

  it('drops a future-dated chore once it is removed (ended on its own start date)', () => {
    const groups = choreGroups([chore('Not yet', { createdOn: '2026-10-09', archivedOn: '2026-10-09' })], [], TODAY)
    expect(groups).toEqual([])
    expect(pastChores([chore('Not yet', { createdOn: '2026-10-09', archivedOn: '2026-10-09' })], TODAY).map((c) => c.name)).toEqual(['Not yet'])
  })

  it('leaves out empty groups', () => {
    expect(choreGroups([], [object('s', 'sink')], TODAY)).toEqual([])
  })
})

describe('pastChores', () => {
  it('lists removed chores newest first, once per name, skipping names on today’s list', () => {
    const past = pastChores([
      chore('a', { name: 'Dishes', archivedOn: '2026-10-02' }),
      chore('b', { name: 'dishes ', archivedOn: '2026-10-06' }),
      chore('c', { name: 'Mop', archivedOn: '2026-10-04' }),
      chore('d', { name: 'Bins', archivedOn: '2026-10-07' }),
      chore('e', { name: 'Bins' }),
      chore('f', { name: 'Later', archivedOn: '2026-10-20' }),
    ], TODAY)
    expect(past.map((c) => c.id)).toEqual(['b', 'c'])
  })

  it('leaves out a name that is coming back later, so adding it would not make a twin', () => {
    const past = pastChores([chore('a', { name: 'Mop', archivedOn: '2026-10-02' }), chore('b', { name: 'Mop', createdOn: '2026-10-09' })], TODAY)
    expect(past).toEqual([])
  })

  it('offers the latest copy when two with the same name were removed the same day', () => {
    // Removed, added back, changed to weekly, removed again, all on the 8th.
    const first = { ...chore('a', { name: 'Dishes', archivedOn: TODAY }), createdAt: '2026-10-01T09:00:00Z' }
    const stored = { ...chore('b', { name: 'Dishes', createdOn: TODAY, archivedOn: TODAY, schedule: { kind: 'weekly', weekday: 1 } }), createdAt: '2026-10-08T09:00:00Z' }
    const unsynced = chore('c', { name: 'Dishes', createdOn: TODAY, archivedOn: TODAY, schedule: { kind: 'monthly', dayOfMonth: 3 } })
    expect(pastChores([first, stored], TODAY).map((c) => c.id)).toEqual(['b'])
    expect(pastChores([stored, first], TODAY).map((c) => c.id)).toEqual(['b'])
    // A copy the server hasn't stored yet is the newest of all.
    expect(pastChores([first, unsynced, stored], TODAY).map((c) => c.id)).toEqual(['c'])
    // Same start day, neither stored: still the other way round from the oldest start.
    const { createdAt: _a, ...firstLocal } = first
    const { createdAt: _b, ...storedLocal } = stored
    expect(pastChores([firstLocal, storedLocal], TODAY).map((c) => c.id)).toEqual(['b'])
  })

  it('offers at most PAST_LIMIT', () => {
    const many = Array.from({ length: PAST_LIMIT + 5 }, (_, i) => chore(`c${i}`, { archivedOn: '2026-10-02' }))
    expect(pastChores(many, TODAY)).toHaveLength(PAST_LIMIT)
  })
})

describe('againInput', () => {
  it('keeps the name and rule, drops schedule history, and keeps the object only if it is still placed', () => {
    const old = chore('a', { name: 'Dishes', objectId: 's', schedule: { kind: 'everyNDays', n: 3, since: '2026-10-03', before: { kind: 'daily' }, resume: { due: '2026-10-08', last: '2026-10-05' } } })
    expect(againInput(old, [object('s', 'sink')])).toEqual({ name: 'Dishes', schedule: { kind: 'everyNDays', n: 3 }, objectId: 's' })
    expect(againInput(old, [])).toEqual({ name: 'Dishes', schedule: { kind: 'everyNDays', n: 3 }, objectId: null })
  })

  it('leaves the old chore\'s skips behind (resumeFrom already counts them)', () => {
    const old = chore('a', { name: 'Dishes', schedule: { kind: 'daily', skips: ['2026-10-05'] } })
    expect(againInput(old, []).schedule).toEqual({ kind: 'daily' })
  })
})
