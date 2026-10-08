import { describe, expect, it } from 'vitest'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore, PlacedObject, Room, RoomType } from '../domain/types'
import { placeNames, choreGroups } from './manageModel'
import { MAX_ROOMS, ROOM_CHOICES, ROOM_LABEL, currentRoom, lateByRoom, orderRooms, placesAcrossRooms, roomNames } from './roomsModel'

const TODAY = '2026-10-08'
const room = (id: string, type: string): Room => ({ id, homeId: 'h', type: type as RoomType, floorStyle: 'wood', wallStyle: 'peach' })
const object = (id: string, roomId: string, catalogId = 'sink'): PlacedObject => ({ id, roomId, catalogId, tileX: 0, tileY: 0, rotation: 0 })
const chore = (id: string, objectId: string | null, patch: Partial<Chore> = {}): Chore => ({
  id, homeId: 'h', objectId, name: id, createdOn: '2026-10-01', schedule: { kind: 'daily' }, photoProof: false, ...patch,
})
const status = (choreId: string, state: ChoreStatus['state']): ChoreStatus => ({
  choreId, dueDate: '2026-10-07', state, overdueDays: state === 'overdue' ? 1 : 0, neglect: state === 'overdue' ? 1 : 0,
})

describe('room constants', () => {
  it('offers the four kinds a player can add, each with a name', () => {
    expect(ROOM_CHOICES).toEqual(['kitchen', 'bathroom', 'bedroom', 'living'])
    for (const type of ROOM_CHOICES) expect(ROOM_LABEL[type]).toBeTruthy()
    expect(MAX_ROOMS).toBe(6)
  })
})

describe('orderRooms', () => {
  it('orders kitchen, living, bedroom, bathroom, other, then unknown kinds last', () => {
    const rooms = [room('r6', 'attic'), room('r5', 'other'), room('r4', 'bathroom'), room('r3', 'bedroom'), room('r2', 'living'), room('r1', 'kitchen')]
    expect(orderRooms(rooms).map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6'])
  })

  it('breaks ties between rooms of one kind by id', () => {
    const rooms = [room('bedroom-b', 'bedroom'), room('kitchen-2', 'kitchen'), room('bedroom-a', 'bedroom'), room('kitchen-1', 'kitchen')]
    expect(orderRooms(rooms).map((r) => r.id)).toEqual(['kitchen-1', 'kitchen-2', 'bedroom-a', 'bedroom-b'])
  })

  it('sorts unknown kinds after everything else, by id among themselves', () => {
    const rooms = [room('x2', 'cellar'), room('x1', 'attic'), room('o1', 'other')]
    expect(orderRooms(rooms).map((r) => r.id)).toEqual(['o1', 'x1', 'x2'])
  })

  it('does not mutate the input', () => {
    const rooms = [room('b', 'bathroom'), room('k', 'kitchen')]
    const before = rooms.map((r) => r.id)
    const sorted = orderRooms(rooms)
    expect(sorted).not.toBe(rooms)
    expect(rooms.map((r) => r.id)).toEqual(before)
  })

  it('returns an empty list for no rooms', () => {
    expect(orderRooms([])).toEqual([])
  })
})

describe('roomNames', () => {
  it('names rooms by kind and numbers a repeated kind, in the order given', () => {
    const names = roomNames([room('k', 'kitchen'), room('b1', 'bedroom'), room('b2', 'bedroom')])
    expect([...names]).toEqual([['k', 'Kitchen'], ['b1', 'Bedroom'], ['b2', 'Bedroom 2']])
  })

  it('numbers by the order given, not by id', () => {
    const names = roomNames([room('b2', 'bedroom'), room('b1', 'bedroom')])
    expect(names.get('b2')).toBe('Bedroom')
    expect(names.get('b1')).toBe('Bedroom 2')
  })

  it('numbers a third room of a kind as 3', () => {
    const names = roomNames([room('a', 'bathroom'), room('b', 'bathroom'), room('c', 'bathroom')])
    expect([...names.values()]).toEqual(['Bathroom', 'Bathroom 2', 'Bathroom 3'])
  })

  it('names the living room and the other kind', () => {
    const names = roomNames([room('l1', 'living'), room('l2', 'living'), room('o', 'other')])
    expect([...names.values()]).toEqual(['Living room', 'Living room 2', 'Room'])
  })

  it('gives an unknown type the name Room', () => {
    expect(roomNames([room('a', 'attic')]).get('a')).toBe('Room')
  })

  it('is empty for no rooms', () => {
    expect(roomNames([]).size).toBe(0)
  })

  // An unknown kind and 'other' share the name "Room", so they're numbered by name.
  it('gives two different unnamed rooms different names', () => {
    const names = roomNames([room('o', 'other'), room('a', 'attic')])
    expect(new Set(names.values()).size).toBe(2)
  })

  // Only ROOM_LABEL's own names count, never an inherited property like 'constructor'.
  it('gives a type named like an Object.prototype property the name Room', () => {
    expect(roomNames([room('a', 'constructor')]).get('a')).toBe('Room')
  })
})

describe('currentRoom', () => {
  const rooms = [room('k', 'kitchen'), room('b', 'bedroom'), room('t', 'bathroom')]

  it('is the picked room when it still exists', () => {
    expect(currentRoom(rooms, 'b')?.id).toBe('b')
  })

  it('falls back to the first room when the picked one is gone', () => {
    expect(currentRoom(rooms, 'deleted')?.id).toBe('k')
  })

  it('is the first room when nothing was picked', () => {
    expect(currentRoom(rooms, null)?.id).toBe('k')
  })

  it('is undefined for no rooms', () => {
    expect(currentRoom([], null)).toBeUndefined()
    expect(currentRoom([], 'k')).toBeUndefined()
  })
})

describe('lateByRoom', () => {
  it('counts overdue chores on each room\'s things, and leaves out rooms with none', () => {
    const objects = [object('o1', 'k'), object('o2', 'k'), object('o3', 'b'), object('o4', 't')]
    const chores = [
      chore('c1', 'o1'), // kitchen, overdue
      chore('c2', 'o2'), // kitchen, only due
      chore('c3', 'o3'), // bedroom, overdue
      chore('c4', 'o3'), // bedroom, overdue
      chore('c5', 'o4'), // bathroom, upcoming
    ]
    const statuses = [
      status('c1', 'overdue'), status('c2', 'due'), status('c3', 'overdue'), status('c4', 'overdue'), status('c5', 'upcoming'),
    ]
    const late = lateByRoom(objects, chores, statuses)
    expect(Object.fromEntries(late)).toEqual({ k: 1, b: 2 })
    expect(late.has('t')).toBe(false)
  })

  it('leaves out chores with no object, chores whose object is gone, and chores not in the list', () => {
    const objects = [object('o1', 'k')]
    const chores = [chore('loose', null), chore('gone', 'removed-object'), chore('kept', 'o1')]
    const statuses = [status('loose', 'overdue'), status('gone', 'overdue'), status('unknown', 'overdue')]
    expect(lateByRoom(objects, chores, statuses).size).toBe(0)
    expect(lateByRoom(objects, chores, [...statuses, status('kept', 'overdue')]).get('k')).toBe(1)
  })

  it('counts only overdue statuses', () => {
    const objects = [object('o1', 'k')]
    const chores = [chore('a', 'o1'), chore('b', 'o1'), chore('c', 'o1')]
    const statuses = [status('a', 'upcoming'), status('b', 'due'), status('c', 'overdue')]
    expect(lateByRoom(objects, chores, statuses).get('k')).toBe(1)
  })

  it('is empty for no inputs', () => {
    expect(lateByRoom([], [], []).size).toBe(0)
    expect(lateByRoom([object('o1', 'k')], [chore('a', 'o1')], []).size).toBe(0)
  })
})

describe('placesAcrossRooms', () => {
  it('names places exactly as placeNames does when there is one room', () => {
    const kitchen = room('k', 'kitchen')
    const objects = [object('s', 'k', 'sink'), object('r1', 'k', 'rug'), object('r2', 'k', 'rug'), object('x', 'k', 'not-in-catalog')]
    expect(placesAcrossRooms([kitchen], objects)).toEqual(placeNames(objects))
    expect(placesAcrossRooms([kitchen], objects)).toEqual([
      { id: 's', name: 'Sink' },
      { id: 'r1', name: 'Floor rug' },
      { id: 'r2', name: 'Floor rug 2' },
    ])
  })

  it('adds the room name once there are several rooms', () => {
    const rooms = [room('k', 'kitchen'), room('b', 'bedroom')]
    const objects = [object('s', 'k', 'sink'), object('r1', 'b', 'rug'), object('r2', 'b', 'rug')]
    expect(placesAcrossRooms(rooms, objects)).toEqual([
      { id: 's', name: 'Sink, Kitchen' },
      { id: 'r1', name: 'Floor rug, Bedroom' },
      { id: 'r2', name: 'Floor rug 2, Bedroom' },
    ])
  })

  it('numbers duplicates within a room only', () => {
    const rooms = [room('k', 'kitchen'), room('b', 'bedroom')]
    const objects = [object('r-k', 'k', 'rug'), object('r-b', 'b', 'rug')]
    expect(placesAcrossRooms(rooms, objects).map((p) => p.name)).toEqual(['Floor rug, Kitchen', 'Floor rug, Bedroom'])
  })

  it('uses the numbered room name when a kind repeats', () => {
    const rooms = [room('k1', 'kitchen'), room('k2', 'kitchen')]
    const objects = [object('s1', 'k1', 'sink'), object('s2', 'k2', 'sink')]
    expect(placesAcrossRooms(rooms, objects).map((p) => p.name)).toEqual(['Sink, Kitchen', 'Sink, Kitchen 2'])
  })

  it('follows the order of the rooms given', () => {
    const kitchen = room('k', 'kitchen')
    const bedroom = room('b', 'bedroom')
    const objects = [object('s', 'k', 'sink'), object('r', 'b', 'rug')]
    expect(placesAcrossRooms([bedroom, kitchen], objects).map((p) => p.id)).toEqual(['r', 's'])
    expect(placesAcrossRooms([kitchen, bedroom], objects).map((p) => p.id)).toEqual(['s', 'r'])
  })

  it('leaves out objects in rooms not given, and returns nothing for no rooms', () => {
    const objects = [object('s', 'elsewhere', 'sink')]
    expect(placesAcrossRooms([room('k', 'kitchen'), room('b', 'bedroom')], objects)).toEqual([])
    expect(placesAcrossRooms([], objects)).toEqual([])
  })
})

describe('choreGroups with places', () => {
  const kitchen = room('k', 'kitchen')
  const bedroom = room('b', 'bedroom')
  const objects = [object('s', 'k', 'sink'), object('t', 'b', 'sink')]
  const chores = [chore('Wipe', 's'), chore('Make bed', 't'), chore('Water', null)]

  it('titles the groups from the places given', () => {
    const places = placesAcrossRooms([kitchen, bedroom], objects)
    const groups = choreGroups(chores, objects, TODAY, places)
    expect(groups.map((g) => [g.title, g.chores.map((c) => c.name)])).toEqual([
      ['Sink, Kitchen', ['Wipe']],
      ['Sink, Bedroom', ['Make bed']],
      ['Anywhere', ['Water']],
    ])
  })

  it('keeps the places order, not the object order', () => {
    const places = placesAcrossRooms([bedroom, kitchen], objects)
    expect(choreGroups(chores, objects, TODAY, places).map((g) => g.id)).toEqual(['t', 's', 'anywhere'])
  })

  it('sends a chore on an object that is not among the places to Anywhere', () => {
    const places = placesAcrossRooms([kitchen], objects)
    const groups = choreGroups(chores, objects, TODAY, places)
    expect(groups.map((g) => [g.title, g.chores.map((c) => c.name)])).toEqual([
      ['Sink', ['Wipe']],
      ['Anywhere', ['Make bed', 'Water']],
    ])
  })

  it('without places, names groups within one room as before', () => {
    const roomObjects = [object('s', 'k', 'sink'), object('r1', 'k', 'rug'), object('r2', 'k', 'rug')]
    const roomChores = [chore('Wipe', 's'), chore('Vacuum', 'r2'), chore('Water', null)]
    const groups = choreGroups(roomChores, roomObjects, TODAY)
    expect(groups.map((g) => [g.id, g.title])).toEqual([['s', 'Sink'], ['r2', 'Floor rug 2'], ['anywhere', 'Anywhere']])
    expect(groups).toEqual(choreGroups(roomChores, roomObjects, TODAY, placeNames(roomObjects)))
  })
})
