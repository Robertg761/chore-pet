import { describe, expect, it } from 'vitest'
import { neglectLevel } from '../domain/neglect'
import type { Chore, Completion } from '../domain/types'
import { allCaughtUp, buildSections, nextUpcoming, shortDate, shortRows, statusLabel, whenPhrase } from './choreListModel'

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
    chore('d', 'Sheets', '2026-10-02'),
  ]
  const completions = [done('c', '2026-10-03')]

  it('orders sections late, today, soon and sorts within them', () => {
    const sections = buildSections(chores, completions, [], today)
    expect(sections.map((s) => s.id)).toEqual(['late', 'today', 'soon'])
    const late = sections[0].rows
    expect(late.map((r) => r.chore.id).sort()).toEqual(['b', 'd'])
    expect(late[0].status.overdueDays).toBeGreaterThanOrEqual(late[1].status.overdueDays)
    expect(late.every((r) => /days late$/.test(r.label))).toBe(true)
    expect(sections[1].rows.map((r) => r.chore.id)).toEqual(['a'])
    expect(sections[2].rows.map((r) => r.chore.id)).toEqual(['c'])
  })

  it('hides empty sections', () => {
    expect(buildSections([], [], [], today)).toEqual([])
    const only = buildSections([chore('a', 'Dishes', today)], [], [], today)
    expect(only.map((s) => s.id)).toEqual(['today'])
  })

  it('moves a just-completed chore to done today', () => {
    const sections = buildSections([chore('a', 'Dishes', today)], [done('a', today)], [], today)
    expect(sections.map((s) => s.id)).toEqual(['done'])
    expect(sections[0].title).toBe('Done today')
    expect(sections[0].rows[0].label).toBe('Tomorrow')
    expect(sections[0].rows[0].doneToday).toBe(true)
    expect(sections[0].rows[0].allSet).toBe(true)
  })

  it('keeps a chore finished on an earlier day in coming up, marked all set', () => {
    const sections = buildSections([chore('c', 'Plants', '2026-10-03', { kind: 'everyNDays', n: 7 })], [done('c', '2026-10-05')], [], today)
    expect(sections.map((s) => s.id)).toEqual(['soon'])
    expect(sections[0].rows[0].doneToday).toBe(false)
    expect(sections[0].rows[0].allSet).toBe(true)
  })
})

describe('all caught up', () => {
  const today = '2026-10-06'
  const dishes = chore('a', 'Dishes', '2026-10-06')
  const bed = chore('b', 'Make the bed', '2026-10-06')

  it('is true when nothing is late or due today', () => {
    const sections = buildSections([dishes, bed], [done('a', today), done('b', today)], [], today)
    expect(allCaughtUp(sections)).toBe(true)
    expect(shortRows(sections)).toEqual([])
  })
  it('is false while something is late or due today', () => {
    expect(allCaughtUp(buildSections([dishes, bed], [done('a', today)], [], today))).toBe(false)
    expect(allCaughtUp(buildSections([chore('x', 'Bins', '2026-10-01')], [], [], today))).toBe(false)
  })
  it('is false with no chores at all', () => {
    expect(allCaughtUp([])).toBe(false)
  })
  it('names the next chore coming up', () => {
    const weekly = chore('w', 'Bins', '2026-10-01', { kind: 'weekly', weekday: 4 })
    const sections = buildSections([dishes, weekly], [done('a', today), done('w', '2026-10-01')], [], today)
    const next = nextUpcoming(sections)
    expect(next?.chore.id).toBe('a')
    expect(whenPhrase(next!.label)).toBe('tomorrow')
    expect(whenPhrase('Tomorrow')).toBe('tomorrow')
    expect(nextUpcoming(buildSections([], [], [], today))).toBeNull()
  })
})

describe('shortRows', () => {
  const today = '2026-10-06'
  it('lists late and due chores and leaves out rows that are all set', () => {
    const chores = [
      chore('a', 'Dishes', '2026-10-06'),
      chore('b', 'Bins', '2026-10-01', { kind: 'weekly', weekday: 4 }),
      chore('c', 'Plants', '2026-10-03', { kind: 'everyNDays', n: 7 }),
      chore('d', 'Sheets', '2026-10-02'),
      chore('e', 'Hoover', '2026-10-01', { kind: 'weekly', weekday: 6 }),
    ]
    const sections = buildSections(chores, [done('c', '2026-10-03'), done('e', '2026-10-06')], [], today)
    const ids = shortRows(sections).map((r) => r.chore.id)
    expect(ids.slice(0, 2).sort()).toEqual(['b', 'd'])
    expect(ids[2]).toBe('a')
    expect(ids).toHaveLength(3)
    expect(ids).not.toContain('c')
    expect(ids).not.toContain('e')
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

  it('says "Paused" instead of late while the home is away', () => {
    const overdue = { ...base, dueDate: '2026-10-03', state: 'overdue' as const, overdueDays: 3, neglect: 2 as const }
    expect(statusLabel(overdue, today, true)).toBe('Paused')
    expect(statusLabel(overdue, today, false)).toBe('3 days late')
    expect(statusLabel({ ...base, dueDate: '2026-10-07', state: 'upcoming' }, today, true)).toBe('Tomorrow')
  })

  it('caps long stretches so they read kindly', () => {
    const late = (days: number) => statusLabel({ ...base, dueDate: '2026-09-01', state: 'overdue', overdueDays: days, neglect: 3 }, today)
    expect(late(6)).toBe('6 days late')
    expect(late(7)).toBe('Over a week late')
    expect(late(13)).toBe('Over a week late')
    expect(late(14)).toBe('Over 2 weeks late')
    expect(late(40)).toBe('Over 2 weeks late')
  })
})

describe('next recurrence after finishing chores', () => {
  const today = '2026-10-07'
  const dishes = chore('d', 'Wash the dishes', today)
  it('chooses dishes tomorrow ahead of the sink on Monday', () => {
    const sink = chore('s', 'Scrub the sink', today, { kind: 'weekly', weekday: 1 })
    const next = nextUpcoming(buildSections([sink, dishes], [done('d', today)], [], today))
    expect(next?.chore.id).toBe('d')
    expect(next?.status.dueDate).toBe('2026-10-08')
  })
  it('includes the next occurrence in a done-only list', () => {
    const next = nextUpcoming(buildSections([dishes], [done('d', today)], [], today))
    expect(next?.chore.id).toBe('d')
    expect(next?.label).toBe('Tomorrow')
  })
  it('compares dates even when done rows are sorted by name', () => {
    const monthly = chore('a', 'A monthly chore', today, { kind: 'monthly', dayOfMonth: 7 })
    const next = nextUpcoming(buildSections([monthly, dishes], [done('a', today), done('d', today)], [], today))
    expect(next?.chore.id).toBe('d')
  })
})

describe('buildSections while on vacation', () => {
  it('marks late rows as paused only inside a vacation window', () => {
    const today = '2026-10-06'
    const dishes = chore('a', 'Wash the dishes', '2026-09-01')
    const away = buildSections([dishes], [], [{ start: today, end: '2026-10-10' }], today).flatMap((s) => s.rows)
    const home = buildSections([dishes], [], [], today).flatMap((s) => s.rows)
    expect(away[0]).toMatchObject({ label: 'Paused', paused: true })
    expect(home[0].paused).toBe(false)
    expect(home[0].label).toMatch(/late/)
  })
})
