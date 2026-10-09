import { describe, expect, it } from 'vitest'
import type { Chore, Completion, Home, PlacedObject, Room } from '../domain/types'
import { clearHome, removeRoom } from './actions'
import { change, emptySnapshot, upsertOp, type NewOp, type Snapshot } from './state'

const TODAY = '2026-10-08'
const NOW = new Date('2026-10-08T09:00:00.000Z')

const home: Home = { id: 'h1', ownerId: 'u1', name: 'Home', vacations: [] }
const room = (id: string, type: Room['type']): Room => ({ id, homeId: 'h1', type, floorStyle: 'wood', wallStyle: 'peach' })
const object = (id: string, roomId: string, catalogId: string): PlacedObject => ({ id, roomId, catalogId, tileX: 0, tileY: 0, rotation: 0 })
const chore = (id: string, objectId: string | null, name: string, patch: Partial<Chore> = {}): Chore => ({
  id, homeId: 'h1', objectId, name, createdOn: '2026-10-01', schedule: { kind: 'daily' }, photoProof: false, ...patch,
})

const rooms = [room('r1', 'kitchen'), room('r2', 'bedroom'), room('r3', 'bathroom')]
const objects = [
  object('o1', 'r1', 'sink'),
  object('o2', 'r1', 'stove'),
  object('o3', 'r2', 'bed'),
  object('o4', 'r3', 'toilet'),
]
const chores = [
  chore('c1', 'o1', 'Wash the dishes'),
  chore('c2', 'o2', 'Wipe the stove', { schedule: { kind: 'everyNDays', n: 3 } }),
  chore('c3', 'o3', 'Make the bed'),
  chore('c4', 'o4', 'Clean the toilet', { schedule: { kind: 'weekly', weekday: 3 } }),
  chore('c5', null, 'Water plants'),
]
const completion: Completion = { id: 'd1', choreId: 'c1', completedAt: '2026-10-07T09:00:00.000Z', completedOn: '2026-10-07', counts: true }

/** A home with three rooms, four placed things and five chores, written through the state module. */
function seeded(): Snapshot {
  const rows: NewOp[] = [
    upsertOp('homes', home),
    ...rooms.map((r) => upsertOp('rooms', r)),
    ...objects.map((o) => upsertOp('placed_objects', o)),
    ...chores.map((c) => upsertOp('chores', c)),
    upsertOp('completions', completion),
  ]
  return rows.reduce(change, emptySnapshot('u1'))
}

describe('removeRoom', () => {
  it('deletes each object in the room as removing it would, then the room last', () => {
    expect(removeRoom(rooms[0], objects, TODAY)).toEqual([
      { table: 'placed_objects', kind: 'delete', key: 'o1', removal: { archivedOn: TODAY, keepChores: false } },
      { table: 'placed_objects', kind: 'delete', key: 'o2', removal: { archivedOn: TODAY, keepChores: false } },
      { table: 'rooms', kind: 'delete', key: 'r1' },
    ])
  })

  it('touches only the objects of that room', () => {
    const ops = removeRoom(rooms[1], objects, TODAY)
    expect(ops.filter((o) => o.table === 'placed_objects').map((o) => o.key)).toEqual(['o3'])
    expect(ops.at(-1)).toEqual({ table: 'rooms', kind: 'delete', key: 'r2' })
  })

  it('gives just the room delete for a room with no objects', () => {
    expect(removeRoom(room('empty', 'living'), objects, TODAY)).toEqual([{ table: 'rooms', kind: 'delete', key: 'empty' }])
  })

  it('archives the room\'s chores, detaches them, and leaves other rooms alone when applied', () => {
    const before = seeded()
    const after = removeRoom(rooms[0], objects, TODAY).reduce(change, before)

    expect(Object.keys(after.tables.rooms).sort()).toEqual(['r2', 'r3'])
    expect(Object.keys(after.tables.placed_objects).sort()).toEqual(['o3', 'o4'])

    for (const id of ['c1', 'c2']) {
      expect(after.tables.chores[id]).toMatchObject({ objectId: null, archivedOn: TODAY })
    }
    // Completions of the archived chores are history, and stay.
    expect(after.tables.completions.d1).toEqual(completion)

    for (const id of ['c3', 'c4', 'c5']) expect(after.tables.chores[id]).toEqual(before.tables.chores[id])
    expect(after.tables.chores.c3.objectId).toBe('o3')
    expect(after.tables.rooms.r2).toEqual(rooms[1])
    expect(after.tables.placed_objects.o3).toEqual(objects[2])
  })

  it('keeps a chore already archived before today as it ended', () => {
    const early = chore('c6', 'o2', 'Old wipe', { archivedOn: '2026-10-03' })
    const snap: NewOp[] = [upsertOp('homes', home), ...rooms.map((r) => upsertOp('rooms', r)), ...objects.map((o) => upsertOp('placed_objects', o)), upsertOp('chores', early)]
    const after = removeRoom(rooms[0], objects, TODAY).reduce(change, snap.reduce(change, emptySnapshot('u1')))
    expect(after.tables.chores.c6).toMatchObject({ archivedOn: '2026-10-03', objectId: null })
  })

  it('queues the object and room deletes for the server', () => {
    const after = removeRoom(rooms[0], objects, TODAY).reduce(change, seeded())
    expect(after.outbox['rooms:r1']).toMatchObject({ kind: 'delete', table: 'rooms', key: 'r1' })
    expect(after.outbox['placed_objects:o1']).toMatchObject({ kind: 'delete', removal: { archivedOn: TODAY, keepChores: false } })
  })
})

describe('clearHome with several rooms', () => {
  const history = { home, objects, chores, completions: [completion], progress: null }

  // A plain room delete would also take furniture another device added after the press;
  // only the server's clear_home (with its cutoff) can tell those apart, so rooms stay.
  it('never deletes a room', () => {
    expect(clearHome(history, TODAY, NOW).filter((o) => o.table === 'rooms')).toEqual([])
  })

  it('ends with the clear op for the server', () => {
    const ops = clearHome(history, TODAY, NOW)
    expect(ops.at(-1)).toEqual({ table: 'homes', kind: 'delete', key: 'clear:h1', removal: { archivedOn: TODAY, clearBefore: NOW.toISOString() } })
  })

  it('when applied, empties every room and retires every chore, keeping the rooms', () => {
    const after = clearHome(history, TODAY, NOW).reduce(change, seeded())
    expect(Object.keys(after.tables.rooms).sort()).toEqual(['r1', 'r2', 'r3'])
    expect(Object.keys(after.tables.placed_objects)).toEqual([])
    for (const c of chores) {
      expect(after.tables.chores[c.id]).toMatchObject({ objectId: null, archivedOn: TODAY })
    }
    expect(after.tables.completions.d1).toEqual(completion)
    // The clear op itself changes nothing on the device; the home row stays.
    expect(after.tables.homes.h1).toEqual(home)
  })
})

describe('createRoom', () => {
  it('keeps rooms made on this device in the order they were made, so a second kitchen is "Kitchen 2"', async () => {
    const { vi } = await import('vitest')
    const { createRoom } = await import('./actions')
    const { selectHome } = await import('./state')
    const { orderRooms, roomNames } = await import('../screens/roomsModel')
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-08T09:00:00.000Z'))
      const [first] = createRoom(home)
      vi.setSystemTime(new Date('2026-10-08T09:05:00.000Z'))
      const [second] = createRoom(home)
      const tables = { ...emptySnapshot().tables, homes: { h1: home } } as Snapshot['tables']
      // Whatever the random ids, and in whichever order the rows come back from storage.
      for (const ops of [[first, second], [second, first]]) {
        const rooms = Object.fromEntries(ops.map((op) => [op.key, (op as { value: Room }).value]))
        const ordered = orderRooms(selectHome({ ...tables, rooms } as Snapshot['tables'], 'h1').rooms)
        const names = roomNames(ordered)
        expect(names.get(first.key)).toBe('Kitchen')
        expect(names.get(second.key)).toBe('Kitchen 2')
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('puts a synced kitchen before one made here, even when this device clock is behind the server', async () => {
    const { vi } = await import('vitest')
    const { createRoom } = await import('./actions')
    const { selectHome } = await import('./state')
    const { orderRooms, roomNames } = await import('../screens/roomsModel')
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-08T09:00:00.000Z'))
      const [local] = createRoom(home)
      // The server stamped the original an hour "later" than this device's clock reads.
      const synced = { ...room('zz-synced', 'kitchen'), createdAt: '2026-10-08T10:00:00.000Z' }
      const tables = { ...emptySnapshot().tables, homes: { h1: home }, rooms: { [local.key]: (local as { value: Room }).value, [synced.id]: synced } } as Snapshot['tables']
      const names = roomNames(orderRooms(selectHome(tables, 'h1').rooms))
      expect(names.get(synced.id)).toBe('Kitchen')
      expect(names.get(local.key)).toBe('Kitchen 2')
    } finally {
      vi.useRealTimers()
    }
  })
})
