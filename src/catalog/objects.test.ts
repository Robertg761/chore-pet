import { describe, expect, it } from 'vitest'
import { CATALOG, DECOR, catalogEntry } from './objects'
import { UNLOCKS } from '../domain/unlocks'
import type { Schedule } from '../domain/types'
import { ROOM_SIZE } from '../room/grid'

function validSchedule(s: Schedule): boolean {
  switch (s.kind) {
    case 'daily':
      return true
    case 'everyNDays':
      return Number.isInteger(s.n) && s.n >= 2
    case 'weekdays':
      return s.days.length > 0 && new Set(s.days).size === s.days.length && s.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    case 'weekly':
      return Number.isInteger(s.weekday) && s.weekday >= 0 && s.weekday <= 6
    case 'monthly':
      return Number.isInteger(s.dayOfMonth) && s.dayOfMonth >= 1 && s.dayOfMonth <= 28
  }
}

describe('object catalog', () => {
  it('has unique ids', () => {
    const ids = CATALOG.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('finds every entry by id, and nothing for an unknown id', () => {
    for (const e of CATALOG) expect(catalogEntry(e.id)).toBe(e)
    expect(catalogEntry('nope')).toBeUndefined()
  })

  it('gives every entry a name and at least one room', () => {
    for (const e of CATALOG) {
      expect(e.name.trim().length, e.id).toBeGreaterThan(0)
      expect(e.rooms.length, e.id).toBeGreaterThan(0)
    }
  })

  it('gives every entry 1 to 3 chores with unique short names', () => {
    for (const e of CATALOG) {
      expect(e.chores.length, e.id).toBeGreaterThanOrEqual(1)
      expect(e.chores.length, e.id).toBeLessThanOrEqual(3)
      const names = e.chores.map((c) => c.name)
      expect(new Set(names).size, e.id).toBe(names.length)
      for (const n of names) {
        expect(n.trim().length, `${e.id}: ${n}`).toBeGreaterThan(0)
        expect(n.length, `${e.id}: ${n}`).toBeLessThan(32)
      }
    }
  })

  it('uses only valid schedules', () => {
    for (const e of CATALOG) {
      for (const c of e.chores) expect(validSchedule(c.schedule), `${e.id}: ${c.name}`).toBe(true)
    }
  })

  it('has positive integer footprints that fit the room', () => {
    for (const e of CATALOG) {
      const { w, d } = e.footprint
      expect(Number.isInteger(w) && w >= 1 && w <= ROOM_SIZE, `${e.id} w`).toBe(true)
      expect(Number.isInteger(d) && d >= 1 && d <= ROOM_SIZE, `${e.id} d`).toBe(true)
    }
  })
})

describe('rewards are purely cosmetic', () => {
  it('gives no decor reward any chores', () => {
    for (const e of DECOR) expect(e.chores, e.id).toEqual([])
  })

  it('keeps everything that brings chores in the starting catalog, never behind an unlock', () => {
    for (const e of CATALOG) expect(e.unlock, e.id).toBeUndefined()
    expect(catalogEntry('plant')?.chores.length).toBeGreaterThan(0)
    expect(catalogEntry('fish-tank')?.chores.length).toBeGreaterThan(0)
    expect(CATALOG.map((e) => e.id)).toEqual(expect.arrayContaining(['plant', 'fish-tank']))
  })

  it('points every decor unlock at a chore-free decor entry', () => {
    for (const u of UNLOCKS.filter((x) => x.kind === 'decor')) {
      const entry = DECOR.find((e) => e.id === u.ref)
      expect(entry, u.id).toBeDefined()
      expect(entry!.unlock).toBe(u.id)
      expect(entry!.chores).toEqual([])
    }
  })
})
