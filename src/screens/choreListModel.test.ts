import { describe, expect, it } from 'vitest'
import { neglectLevel } from '../domain/neglect'
import type { Chore, Completion } from '../domain/types'
import { buildSections, shortDate, statusLabel } from './choreListModel'

const chore = (id: string, name: string, createdOn: string, schedule: Chore['schedule'] = { kind: 'daily' }): Chore => ({
  id,
  homeId: 'h',
  objectId: null,
  name,
  schedule,
  createdOn,
  photoProof: false,
})
const done = (choreId: string, on: string): Completion => ({ id: `${choreId}-${on}`, choreId, completedAt: `${on}T10:00:00Z`, completedOn: on })

describe('shortDate', () => {
  it('formats day and month', () => {
    expect(shortDate('2026-10-12')).toBe('12 Oct')
    expect(shortDate('2026-01-03')).toBe('3 Jan')
  })
})

describe('buildSections', () => {
  const today = '2026-10-06' // Tuesday
  const chores = [
    chore('a', 'Dishes', '2026-10-06'),
    chore('b', 'Bins', '2026-10-01', { kind: 'weekly', weekday: 4 }),
    chore('c', 'Plants', '2026-10-03', { kind: 'everyNDays', n: 7 }),
    chore('d', 'Sheets', '2026-10-04', { kind: 'everyNDays', n: 7 }),
  ]
  const completions = [done('c', '2026-10-03')]

  it('orders sections late, today, soon and sorts within them', () => {
    const sections = buildSections(chores, completions, [], today)
    expect(sections.map((s) => s.id)).toEqual(['late', 'today', 'soon'])
    expect(sections[0].rows.map((r) => r.chore.id)).toEqual(['b', 'd'])
    expect(sections[0].rows.map((r) => r.label)).toEqual(['5 days late', '2 days late'])
    expect(sections[1].rows.map((r) => r.chore.id)).toEqual(['a'])
    expect(sections[2].rows.map((r) => r.chore.id)).toEqual(['c'])
  })

  it('hides empty sections', () => {
    expect(buildSections([], [], [], today)).toEqual([])
    const only = buildSections([chore('a', 'Dishes', today)], [], [], today)
    expect(only.map((s) => s.id)).toEqual(['today'])
  })

  it('moves a just-completed chore to coming up', () => {
    const sections = buildSections([chore('a', 'Dishes', today)], [done('a', today)], [], today)
    expect(sections.map((s) => s.id)).toEqual(['soon'])
    expect(sections[0].rows[0].label).toBe('Tomorrow')
  })
})

describe('statusLabel', () => {
  const today = '2026-10-06'
  const base = { choreId: 'x', overdueDays: 0, neglect: 0 as const }
  it('words overdue, due and upcoming', () => {
    expect(statusLabel({ ...base, dueDate: '2026-10-05', state: 'overdue', overdueDays: 1, neglect: neglectLevel(1, { kind: 'daily' }) }, today)).toBe('1 day late')
    expect(statusLabel({ ...base, dueDate: '2026-10-03', state: 'overdue', overdueDays: 3, neglect: neglectLevel(3, { kind: 'daily' }) }, today)).toBe('3 days late')
    expect(statusLabel({ ...base, dueDate: today, state: 'due' }, today)).toBe('Today')
    expect(statusLabel({ ...base, dueDate: '2026-10-07', state: 'upcoming' }, today)).toBe('Tomorrow')
    expect(statusLabel({ ...base, dueDate: '2026-10-08', state: 'upcoming' }, today)).toBe('Thu')
    expect(statusLabel({ ...base, dueDate: '2026-10-12', state: 'upcoming' }, today)).toBe('Mon')
    expect(statusLabel({ ...base, dueDate: '2026-10-13', state: 'upcoming' }, today)).toBe('13 Oct')
  })
})
