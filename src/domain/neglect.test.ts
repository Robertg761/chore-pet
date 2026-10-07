import { describe, expect, it } from 'vitest'
import { cadenceDays, neglectLevel, neglectThresholds, type NeglectLevel } from './neglect'
import { choreStatus } from './schedule'
import type { Chore, ISODate, Schedule, VacationWindow, Weekday } from './types'

// Reference: 2026-10-06 is a Tuesday.

const weekdays = (...days: number[]): Schedule => ({ kind: 'weekdays', days: days as Weekday[] })

function chore(schedule: Schedule, createdOn: ISODate = '2026-10-01'): Chore {
  return { id: 'c', homeId: 'h', objectId: null, name: 'c', schedule, createdOn, photoProof: false }
}

describe('cadenceDays', () => {
  it('uses the fixed rhythm of daily, weekly and monthly', () => {
    expect(cadenceDays({ kind: 'daily' })).toBe(1)
    expect(cadenceDays({ kind: 'weekly', weekday: 3 })).toBe(7)
    expect(cadenceDays({ kind: 'monthly', dayOfMonth: 31 })).toBe(30)
    expect(cadenceDays({ kind: 'monthly', dayOfMonth: 1 })).toBe(30)
  })

  it('uses n for every-N-days, never below 1', () => {
    expect(cadenceDays({ kind: 'everyNDays', n: 1 })).toBe(1)
    expect(cadenceDays({ kind: 'everyNDays', n: 3 })).toBe(3)
    expect(cadenceDays({ kind: 'everyNDays', n: 60 })).toBe(60)
    expect(cadenceDays({ kind: 'everyNDays', n: 0 })).toBe(1)
    expect(cadenceDays({ kind: 'everyNDays', n: -4 })).toBe(1)
  })

  describe('weekdays: the longest gap between chosen days, wrapping round the week', () => {
    it('one day is a weekly rhythm, whichever day it is', () => {
      for (let d = 0; d < 7; d++) expect(cadenceDays(weekdays(d))).toBe(7)
    })
    it('Mon + Thu: gaps of 3 and 4, so 4', () => {
      expect(cadenceDays(weekdays(1, 4))).toBe(4)
    })
    it('all seven days: 1', () => {
      expect(cadenceDays(weekdays(0, 1, 2, 3, 4, 5, 6))).toBe(1)
    })
    it('wraps round the week: Sat + Sun leave a 6-day wait from Sun to Sat', () => {
      expect(cadenceDays(weekdays(6, 0))).toBe(6)
    })
    it('Mon to Fri: the weekend makes the longest gap, 3', () => {
      expect(cadenceDays(weekdays(1, 2, 3, 4, 5))).toBe(3)
    })
    it('Sun + Wed + Sat: gaps 3, 3, 1, so 3', () => {
      expect(cadenceDays(weekdays(0, 3, 6))).toBe(3)
    })
    it('ignores the order the days were chosen in', () => {
      expect(cadenceDays(weekdays(4, 1))).toBe(4)
      expect(cadenceDays(weekdays(5, 1, 3))).toBe(cadenceDays(weekdays(1, 3, 5)))
    })
    it('ignores duplicate days', () => {
      expect(cadenceDays(weekdays(1, 1, 4, 4, 1))).toBe(4)
      expect(cadenceDays(weekdays(2, 2, 2))).toBe(7)
    })
    it('an empty list falls back to weekly', () => {
      expect(cadenceDays(weekdays())).toBe(7)
    })
    it('does not mutate the schedule it was given', () => {
      const schedule = weekdays(4, 1, 4)
      cadenceDays(schedule)
      expect(schedule).toEqual({ kind: 'weekdays', days: [4, 1, 4] })
    })
  })
})

describe('neglectThresholds', () => {
  it.each<[string, Schedule, number, number]>([
    ['daily', { kind: 'daily' }, 2, 4],
    ['every day (n=1)', { kind: 'everyNDays', n: 1 }, 2, 4],
    ['every 2 days', { kind: 'everyNDays', n: 2 }, 2, 4],
    ['every 3 days', { kind: 'everyNDays', n: 3 }, 2, 4],
    ['every 4 days', { kind: 'everyNDays', n: 4 }, 2, 4],
    ['every 5 days', { kind: 'everyNDays', n: 5 }, 2, 5],
    ['every 10 days', { kind: 'everyNDays', n: 10 }, 4, 10],
    ['weekly', { kind: 'weekly', weekday: 3 }, 3, 7],
    ['every 14 days', { kind: 'everyNDays', n: 14 }, 6, 14],
    ['every 20 days', { kind: 'everyNDays', n: 20 }, 7, 14],
    ['monthly', { kind: 'monthly', dayOfMonth: 15 }, 7, 14],
    ['every 60 days', { kind: 'everyNDays', n: 60 }, 7, 14],
    ['weekdays Mon + Thu (cadence 4)', weekdays(1, 4), 2, 4],
    ['weekdays, one day (cadence 7)', weekdays(2), 3, 7],
    ['weekdays, all seven (cadence 1)', weekdays(0, 1, 2, 3, 4, 5, 6), 2, 4],
    ['weekdays, empty (cadence 7)', weekdays(), 3, 7],
  ])('%s is level 2 at %i and level 3 at %i', (_name, schedule, level2, level3) => {
    expect(neglectThresholds(schedule)).toEqual({ level2, level3 })
  })

  it('stays inside the clamps for any cadence, with level 3 always after level 2', () => {
    for (let n = 0; n <= 400; n++) {
      const { level2, level3 } = neglectThresholds({ kind: 'everyNDays', n })
      expect(level2).toBeGreaterThanOrEqual(2)
      expect(level2).toBeLessThanOrEqual(7)
      expect(level3).toBeGreaterThanOrEqual(4)
      expect(level3).toBeLessThanOrEqual(14)
      expect(level3).toBeGreaterThan(level2)
    }
  })

  it('never gets sooner as the cadence gets longer', () => {
    let prev = neglectThresholds({ kind: 'everyNDays', n: 1 })
    for (let n = 2; n <= 100; n++) {
      const next = neglectThresholds({ kind: 'everyNDays', n })
      expect(next.level2).toBeGreaterThanOrEqual(prev.level2)
      expect(next.level3).toBeGreaterThanOrEqual(prev.level3)
      prev = next
    }
  })
})

describe('neglectLevel', () => {
  const levels = (schedule: Schedule, days: number[]) => days.map((d) => neglectLevel(d, schedule))

  it('is 0 when not late, including nonsense negative days', () => {
    expect(neglectLevel(0, { kind: 'daily' })).toBe(0)
    expect(neglectLevel(-1, { kind: 'daily' })).toBe(0)
    expect(neglectLevel(-50, { kind: 'monthly', dayOfMonth: 1 })).toBe(0)
  })

  it('level 1 starts at one day late for every kind of schedule', () => {
    const all: Schedule[] = [
      { kind: 'daily' },
      { kind: 'everyNDays', n: 3 },
      { kind: 'everyNDays', n: 60 },
      { kind: 'weekly', weekday: 1 },
      { kind: 'monthly', dayOfMonth: 1 },
      weekdays(1, 4),
      weekdays(),
    ]
    for (const s of all) expect(neglectLevel(1, s)).toBe(1)
  })

  it('daily: 2 and 4 are the boundaries', () => {
    expect(levels({ kind: 'daily' }, [0, 1, 2, 3, 4, 5])).toEqual([0, 1, 2, 2, 3, 3])
  })

  it('every 3 days: 2 and 4 are the boundaries', () => {
    expect(levels({ kind: 'everyNDays', n: 3 }, [0, 1, 2, 3, 4, 5])).toEqual([0, 1, 2, 2, 3, 3])
  })

  it("the user's example: a weekly toilet is level 1 at day 1, level 2 at day 3, level 3 at day 7", () => {
    const toilet: Schedule = { kind: 'weekly', weekday: 3 }
    expect(neglectLevel(1, toilet)).toBe(1)
    expect(neglectLevel(2, toilet)).toBe(1)
    expect(neglectLevel(3, toilet)).toBe(2)
    expect(neglectLevel(6, toilet)).toBe(2)
    expect(neglectLevel(7, toilet)).toBe(3)
    expect(neglectLevel(8, toilet)).toBe(3)
  })

  it('every 14 days: 6 and 14 are the boundaries', () => {
    const s: Schedule = { kind: 'everyNDays', n: 14 }
    expect(levels(s, [1, 5, 6, 13, 14, 15])).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('monthly: 7 and 14 are the boundaries', () => {
    const s: Schedule = { kind: 'monthly', dayOfMonth: 20 }
    expect(levels(s, [1, 6, 7, 13, 14, 15, 30])).toEqual([1, 1, 2, 2, 3, 3, 3])
  })

  it('every 60 days: same as monthly, clamped at 7 and 14', () => {
    const s: Schedule = { kind: 'everyNDays', n: 60 }
    expect(levels(s, [6, 7, 13, 14])).toEqual([1, 2, 2, 3])
  })

  it('weekdays Mon + Thu follows its 4-day cadence', () => {
    expect(levels(weekdays(1, 4), [1, 2, 3, 4])).toEqual([1, 2, 2, 3])
  })

  it('the same days late hurts a quick chore more than a slow one', () => {
    expect(neglectLevel(3, { kind: 'daily' })).toBe(2)
    expect(neglectLevel(3, { kind: 'monthly', dayOfMonth: 1 })).toBe(1)
    expect(neglectLevel(4, { kind: 'daily' })).toBe(3)
    expect(neglectLevel(4, { kind: 'weekly', weekday: 0 })).toBe(2)
    expect(neglectLevel(4, { kind: 'monthly', dayOfMonth: 1 })).toBe(1)
  })

  it('never goes down as the days go up, for every kind of schedule', () => {
    const schedules: Schedule[] = [
      { kind: 'daily' },
      ...[1, 2, 3, 4, 5, 7, 10, 14, 21, 30, 60, 365].map((n): Schedule => ({ kind: 'everyNDays', n })),
      { kind: 'weekly', weekday: 0 },
      { kind: 'monthly', dayOfMonth: 31 },
      weekdays(1),
      weekdays(1, 4),
      weekdays(1, 2, 3, 4, 5),
      weekdays(0, 1, 2, 3, 4, 5, 6),
      weekdays(),
    ]
    for (const schedule of schedules) {
      let prev: NeglectLevel = 0
      for (let days = 0; days <= 400; days++) {
        const level = neglectLevel(days, schedule)
        expect(level, `${JSON.stringify(schedule)} at ${days} days`).toBeGreaterThanOrEqual(prev)
        expect(level).toBeLessThanOrEqual(3)
        prev = level
      }
      expect(prev, `${JSON.stringify(schedule)} ends at level 3`).toBe(3)
    }
  })

  it('agrees with its thresholds on both sides of each', () => {
    for (const n of [1, 2, 3, 5, 7, 10, 14, 30, 90]) {
      const schedule: Schedule = { kind: 'everyNDays', n }
      const { level2, level3 } = neglectThresholds(schedule)
      expect(neglectLevel(level2 - 1, schedule)).toBe(1)
      expect(neglectLevel(level2, schedule)).toBe(2)
      expect(neglectLevel(level3 - 1, schedule)).toBe(2)
      expect(neglectLevel(level3, schedule)).toBe(3)
    }
  })
})

describe('choreStatus fills in neglect', () => {
  const vac = (start: ISODate, end: ISODate): VacationWindow[] => [{ start, end }]

  it('is 0 while upcoming and while due today', () => {
    const upcoming = choreStatus(chore({ kind: 'weekly', weekday: 6 }, '2026-10-06'), [], '2026-10-06')
    expect(upcoming).toMatchObject({ state: 'upcoming', overdueDays: 0, neglect: 0 })
    const due = choreStatus(chore({ kind: 'daily' }, '2026-10-06'), [], '2026-10-06')
    expect(due).toMatchObject({ state: 'due', overdueDays: 0, neglect: 0 })
  })

  it('follows the schedule as days go by (daily, created and due 2026-09-30, so 10-01 is its grace day)', () => {
    const c = chore({ kind: 'daily' }, '2026-09-30')
    const at = (today: ISODate) => choreStatus(c, [], today)
    expect(at('2026-10-01')).toMatchObject({ state: 'due', neglect: 0 })
    expect(at('2026-10-02')).toMatchObject({ overdueDays: 1, neglect: 1 })
    expect(at('2026-10-03')).toMatchObject({ overdueDays: 2, neglect: 2 })
    expect(at('2026-10-04')).toMatchObject({ overdueDays: 3, neglect: 2 })
    expect(at('2026-10-05')).toMatchObject({ overdueDays: 4, neglect: 3 })
    expect(at('2026-10-31')).toMatchObject({ overdueDays: 30, neglect: 3 })
  })

  it("a weekly toilet (Wed, first due 2026-10-07) matches the user's example", () => {
    const c = chore({ kind: 'weekly', weekday: 3 })
    const at = (today: ISODate) => choreStatus(c, [], today)
    expect(at('2026-10-07').neglect).toBe(0)
    expect(at('2026-10-08').neglect).toBe(1) // 1 day late
    expect(at('2026-10-09').neglect).toBe(1)
    expect(at('2026-10-10').neglect).toBe(2) // 3 days late
    expect(at('2026-10-13').neglect).toBe(2)
    expect(at('2026-10-14').neglect).toBe(3) // 7 days late
  })

  it('uses the chore schedule, so a monthly chore three days late is only level 1', () => {
    const c = chore({ kind: 'monthly', dayOfMonth: 1 }, '2026-09-25') // due 10-01
    expect(choreStatus(c, [], '2026-10-04')).toMatchObject({ overdueDays: 3, neglect: 1 })
    expect(choreStatus(c, [], '2026-10-08')).toMatchObject({ overdueDays: 7, neglect: 2 })
    expect(choreStatus(c, [], '2026-10-15')).toMatchObject({ overdueDays: 14, neglect: 3 })
  })

  it('goes back to 0 once the chore is done', () => {
    const c = chore({ kind: 'daily' })
    const done = [{ id: 'x', choreId: 'c', completedAt: '2026-10-06T08:00:00Z', completedOn: '2026-10-06' }]
    expect(choreStatus(c, [], '2026-10-06').neglect).toBe(3)
    expect(choreStatus(c, done, '2026-10-06')).toMatchObject({ state: 'upcoming', neglect: 0 })
  })

  it('skips vacation days: they do not count towards neglect', () => {
    const c = chore({ kind: 'daily' }, '2026-09-30') // due 09-30, grace day 10-01
    // Active days since 10-01 up to 10-06: 02, 05, 06 = 3, with 03..04 away.
    const partial = choreStatus(c, [], '2026-10-06', vac('2026-10-03', '2026-10-04'))
    expect(partial).toMatchObject({ overdueDays: 3, neglect: 2 })
    // Without the vacation the same day is 5 days late and level 3.
    expect(choreStatus(c, [], '2026-10-06').neglect).toBe(3)
  })

  it('stays flat while away, then grows again after', () => {
    const c = chore({ kind: 'daily' }, '2026-10-04') // due 10-04, grace day 10-05
    const v = vac('2026-10-07', '2026-10-20')
    expect(choreStatus(c, [], '2026-10-06', v).neglect).toBe(1)
    expect(choreStatus(c, [], '2026-10-10', v).neglect).toBe(1)
    expect(choreStatus(c, [], '2026-10-20', v).neglect).toBe(1)
    expect(choreStatus(c, [], '2026-10-21', v)).toMatchObject({ overdueDays: 2, neglect: 2 })
    expect(choreStatus(c, [], '2026-10-23', v)).toMatchObject({ overdueDays: 4, neglect: 3 })
  })

  it('a vacation covering every late day leaves no neglect and is not overdue', () => {
    const c = chore({ kind: 'daily' }, '2026-10-06') // due 10-06
    const s = choreStatus(c, [], '2026-10-10', vac('2026-10-07', '2026-10-12'))
    expect(s).toMatchObject({ state: 'due', overdueDays: 0, neglect: 0 })
  })

  it('is 0 exactly when the chore is not overdue', () => {
    const c = chore({ kind: 'everyNDays', n: 3 })
    for (let d = 1; d <= 20; d++) {
      const today = `2026-10-${String(d).padStart(2, '0')}`
      const s = choreStatus(c, [], today)
      expect(s.neglect === 0, today).toBe(s.state !== 'overdue')
    }
  })
})
