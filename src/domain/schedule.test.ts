import { describe, expect, it } from 'vitest'
import { weekdayOf } from './dates'
import { choreStatus, nextDueDate } from './schedule'
import type { Chore, Completion, Schedule } from './types'

// Reference: 2026-10-06 is a Tuesday, 2026-10-10 is a Saturday.

function chore(schedule: Schedule, createdOn = '2026-10-06'): Chore {
  return { id: 'c1', homeId: 'h1', objectId: null, name: 'Test', schedule, createdOn, photoProof: false }
}

function done(...dates: string[]): Completion[] {
  return dates.map((d, i) => ({ id: `x${i}`, choreId: 'c1', completedAt: `${d}T12:00:00Z`, completedOn: d }))
}

describe('dates', () => {
  it('knows the reference weekdays', () => {
    expect(weekdayOf('2026-10-06')).toBe(2)
    expect(weekdayOf('2026-10-10')).toBe(6)
  })
})

describe('daily', () => {
  it('is due the day it is created', () => {
    expect(nextDueDate(chore({ kind: 'daily' }), [])).toBe('2026-10-06')
  })
  it('is due tomorrow after doing it today', () => {
    expect(nextDueDate(chore({ kind: 'daily' }), done('2026-10-06'))).toBe('2026-10-07')
  })
  it('counts overdue days', () => {
    const s = choreStatus(chore({ kind: 'daily' }), done('2026-10-06'), '2026-10-10')
    expect(s.state).toBe('overdue')
    expect(s.overdueDays).toBe(3)
  })
  it('ignores a second completion on the same day', () => {
    expect(nextDueDate(chore({ kind: 'daily' }), done('2026-10-06', '2026-10-06'))).toBe('2026-10-07')
  })
})

describe('weekly', () => {
  const sat = chore({ kind: 'weekly', weekday: 6 })
  it('is first due on the next matching weekday', () => {
    expect(nextDueDate(sat, [])).toBe('2026-10-10')
  })
  it('early completion satisfies this week', () => {
    expect(nextDueDate(sat, done('2026-10-08'))).toBe('2026-10-17')
  })
  it('two early completions in one week only count once', () => {
    expect(nextDueDate(sat, done('2026-10-07', '2026-10-08'))).toBe('2026-10-17')
  })
  it('late completion satisfies the missed one and next is the following Saturday', () => {
    expect(nextDueDate(sat, done('2026-10-12'))).toBe('2026-10-17')
  })
  it('is due on the day itself', () => {
    expect(choreStatus(sat, [], '2026-10-10').state).toBe('due')
  })
})

describe('weekdays', () => {
  it('finds the next listed weekday', () => {
    const monThu = chore({ kind: 'weekdays', days: [1, 4] })
    expect(nextDueDate(monThu, [])).toBe('2026-10-08')
    expect(nextDueDate(monThu, done('2026-10-08'))).toBe('2026-10-12')
  })
})

describe('monthly', () => {
  it('clamps day 31 to the end of short months', () => {
    const c = chore({ kind: 'monthly', dayOfMonth: 31 }, '2027-02-01')
    expect(nextDueDate(c, [])).toBe('2027-02-28')
    expect(nextDueDate(c, done('2027-02-28'))).toBe('2027-03-31')
  })
})

describe('everyNDays', () => {
  it('is due N days after the last completion', () => {
    const c = chore({ kind: 'everyNDays', n: 3 })
    expect(nextDueDate(c, [])).toBe('2026-10-06')
    expect(nextDueDate(c, done('2026-10-06'))).toBe('2026-10-09')
    expect(nextDueDate(c, done('2026-10-06', '2026-10-07'))).toBe('2026-10-10')
  })
})

describe('vacation', () => {
  it('does not count vacation days as overdue', () => {
    const c = chore({ kind: 'daily' })
    const s = choreStatus(c, done('2026-10-06'), '2026-10-12', [{ start: '2026-10-08', end: '2026-10-11' }])
    // Due 10-07. Days after due through 10-12: 08,09,10,11 (vacation) and 12 -> 1 active day.
    expect(s.overdueDays).toBe(1)
  })
})
