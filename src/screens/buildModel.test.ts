import { describe, expect, it } from 'vitest'
import { CATALOG } from '../catalog/objects'
import type { Chore } from '../domain/types'
import { choreCountLabel, dueText, splitCatalog } from './buildModel'

const chore = (createdOn: string, schedule: Chore['schedule'] = { kind: 'daily' }): Chore => ({
  id: 'c',
  homeId: 'h',
  objectId: null,
  name: 'Wipe',
  schedule,
  createdOn,
  photoProof: false,
})

describe('choreCountLabel', () => {
  it('uses plain counts', () => {
    expect(choreCountLabel(0)).toBe('No chores')
    expect(choreCountLabel(1)).toBe('1 chore')
    expect(choreCountLabel(3)).toBe('3 chores')
  })
})

describe('splitCatalog', () => {
  it('puts room-suited entries first without losing any', () => {
    const { suited, others } = splitCatalog(CATALOG, 'kitchen')
    expect(suited.length).toBeGreaterThan(0)
    expect(suited.every((e) => e.rooms.includes('kitchen'))).toBe(true)
    expect(others.some((e) => e.rooms.includes('kitchen'))).toBe(false)
    expect(suited.length + others.length).toBe(CATALOG.length)
  })
})

describe('dueText', () => {
  it('says due today, tomorrow and a weekday', () => {
    expect(dueText(chore('2026-10-06'), [], '2026-10-06', [])).toEqual({ text: 'Due today', late: false })
    expect(dueText(chore('2026-10-07', { kind: 'everyNDays', n: 2 }), [], '2026-10-06', []).text).toBe('Due tomorrow')
    expect(dueText(chore('2026-10-09', { kind: 'everyNDays', n: 2 }), [], '2026-10-06', []).text).toBe('Due Fri')
  })
  it('flags late chores', () => {
    expect(dueText(chore('2026-10-04'), [], '2026-10-06', [])).toEqual({ text: '2 days late', late: true })
  })
})
