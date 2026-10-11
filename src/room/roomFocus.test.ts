import { describe, expect, it } from 'vitest'
import type { Room, RoomType } from '../domain/types'
import { orderRooms, readFocusedRoomId, readRoomOrder, resolveFocusedRoomId, roomNames, writeFocusedRoomId, writeRoomOrder, type RoomFocusStorage } from './roomFocus'

function room(id: string, type: RoomType = 'kitchen'): Room {
  return { id, homeId: 'home', type, floorStyle: 'wood', wallStyle: 'peach' }
}

function memoryStorage(): RoomFocusStorage {
  const data = new Map<string, string>()
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) }
}

describe('focused room', () => {
  const rooms = [room('kitchen'), room('bedroom', 'bedroom')]

  it('keeps the selected room by id when room order changes', () => {
    expect(resolveFocusedRoomId(rooms, 'bedroom')).toBe('bedroom')
    expect(resolveFocusedRoomId([...rooms].reverse(), 'bedroom')).toBe('bedroom')
  })

  it('falls back to the first room when focus is missing or the room was deleted', () => {
    expect(resolveFocusedRoomId(rooms)).toBe('kitchen')
    expect(resolveFocusedRoomId(rooms, 'deleted-room')).toBe('kitchen')
    expect(resolveFocusedRoomId(rooms, null)).toBe('kitchen')
  })

  it('has no focus before a home has a room', () => {
    expect(resolveFocusedRoomId([], 'old-room')).toBeNull()
  })

  it('remembers room ids separately for each home', () => {
    const storage = memoryStorage()
    writeFocusedRoomId('home-one', 'bedroom', storage)
    writeFocusedRoomId('home-two', 'bathroom', storage)
    expect(readFocusedRoomId('home-one', storage)).toBe('bedroom')
    expect(readFocusedRoomId('home-two', storage)).toBe('bathroom')
    expect(readFocusedRoomId('new-home', storage)).toBeNull()
    writeFocusedRoomId('home-one', 'living-room', storage)
    expect(readFocusedRoomId('home-one', storage)).toBe('living-room')
    expect(readFocusedRoomId('home-two', storage)).toBe('bathroom')
  })

  it('keeps room switching usable when browser storage is missing or blocked', () => {
    const blocked: RoomFocusStorage = {
      getItem: () => { throw new Error('Storage blocked') },
      setItem: () => { throw new Error('Storage blocked') },
    }
    for (const storage of [blocked, null]) {
      expect(() => writeFocusedRoomId('home', 'bedroom', storage)).not.toThrow()
      expect(readFocusedRoomId('home', storage)).toBeNull()
      expect(resolveFocusedRoomId(rooms, readFocusedRoomId('home', storage))).toBe('kitchen')
    }
  })
})

describe('room names', () => {
  it('gives rooms readable names and distinguishes repeated room types', () => {
    expect(roomNames([
      room('k1'), room('b1', 'bedroom'), room('k2'), room('bath', 'bathroom'),
      room('living', 'living'), room('other1', 'other'), room('b2', 'bedroom'), room('other2', 'other'),
    ])).toEqual({
      k1: 'Kitchen', b1: 'Bedroom', k2: 'Kitchen 2', bath: 'Bathroom',
      living: 'Living room', other1: 'Room', b2: 'Bedroom 2', other2: 'Room 2',
    })
  })

  it('returns no names for an empty home', () => {
    expect(roomNames([])).toEqual({})
  })
})

describe('room order', () => {
  it('preserves the saved order when sync changes the incoming room order', () => {
    const rooms = [room('new'), room('bedroom', 'bedroom'), room('kitchen')]
    expect(orderRooms(rooms, ['kitchen', 'bedroom']).map((room) => room.id)).toEqual(['kitchen', 'bedroom', 'new'])
    expect(rooms.map((room) => room.id)).toEqual(['new', 'bedroom', 'kitchen'])
  })

  it('removes deleted rooms, ignores repeated ids, and appends every unseen room', () => {
    expect(orderRooms([room('a'), room('b'), room('c'), room('d')], ['deleted', 'c', 'c', 'a']).map((room) => room.id))
      .toEqual(['c', 'a', 'b', 'd'])
    expect(orderRooms([], ['deleted'])).toEqual([])
    expect(orderRooms([room('b'), room('a')], []).map((room) => room.id)).toEqual(['b', 'a'])
  })

  it('saves each home order independently of its focused room', () => {
    const storage = memoryStorage()
    writeRoomOrder('home-one', ['kitchen', 'bedroom'], storage)
    writeRoomOrder('home-two', ['bathroom', 'living'], storage)
    writeFocusedRoomId('home-one', 'bedroom', storage)
    expect(readRoomOrder('home-one', storage)).toEqual(['kitchen', 'bedroom'])
    expect(readRoomOrder('home-two', storage)).toEqual(['bathroom', 'living'])
    expect(readRoomOrder('new-home', storage)).toEqual([])
    expect(readFocusedRoomId('home-one', storage)).toBe('bedroom')
    writeRoomOrder('home-one', ['bedroom'], storage)
    expect(readRoomOrder('home-one', storage)).toEqual(['bedroom'])
  })

  it('ignores corrupt order preferences instead of blocking the home', () => {
    for (const value of ['not json', '{}', 'null', '42']) {
      expect(readRoomOrder('home', { getItem: () => value, setItem: () => {} })).toEqual([])
    }
    expect(readRoomOrder('home', { getItem: () => '["kitchen",null,3,"","bedroom","kitchen"]', setItem: () => {} }))
      .toEqual(['kitchen', 'bedroom'])
  })

  it('uses the incoming order when storage is unavailable', () => {
    const blocked: RoomFocusStorage = {
      getItem: () => { throw new Error('Storage blocked') },
      setItem: () => { throw new Error('Storage blocked') },
    }
    for (const storage of [blocked, null]) {
      expect(() => writeRoomOrder('home', ['kitchen'], storage)).not.toThrow()
      expect(readRoomOrder('home', storage)).toEqual([])
      expect(orderRooms([room('kitchen')], readRoomOrder('home', storage)).map((room) => room.id)).toEqual(['kitchen'])
    }
  })
})
