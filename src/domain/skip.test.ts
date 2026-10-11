import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { canSkip, choreAsOf, choreStatus, completionCounts, completionDays, nextDueDate, resumeFrom, sameSchedule, scheduleDays, skipDays, skippedOn } from './schedule'
import type { Chore, Completion, ISODate, Schedule } from './types'

// Reference: 2026-10-06 is a Tuesday, 2026-10-10 is a Saturday.
// A skip ("Skip this time") lives on the chore's schedule as `skips`; completions are passed separately.

function chore(schedule: Schedule, createdOn: ISODate = '2026-10-06'): Chore {
  return { id: 'c1', homeId: 'h1', objectId: null, name: 'Test', schedule, createdOn, photoProof: false }
}

/** The chore with its schedule's `skips` set to exactly `skips` (raw, so malformed rows can be tried). */
function withSkips(c: Chore, skips: unknown): Chore {
  return { ...c, schedule: { ...c.schedule, skips: skips as ISODate[] } }
}

function done(...dates: string[]): Completion[] {
  return dates.map((d, i) => ({ id: `x${i}`, choreId: 'c1', completedAt: `${d}T12:00:00Z`, completedOn: d }))
}

const SCHEDULES: Schedule[] = [
  { kind: 'daily' },
  { kind: 'everyNDays', n: 5 },
  { kind: 'weekdays', days: [1, 4] },
  { kind: 'weekly', weekday: 6 },
  { kind: 'monthly', dayOfMonth: 10 },
]

interface SettleCase {
  name: string
  schedule: Schedule
  createdOn: ISODate
  /** The round skipped (or, for comparison, completed). */
  day: ISODate
  /** The day the status is read on. */
  today: ISODate
  /** The next due date once that round is settled. */
  next: ISODate
}

describe('a skip settles the round like a completion on that day', () => {
  const cases: SettleCase[] = [
    { name: 'daily, on the day', schedule: { kind: 'daily' }, createdOn: '2026-10-06', day: '2026-10-06', today: '2026-10-06', next: '2026-10-07' },
    { name: 'daily, read four days late', schedule: { kind: 'daily' }, createdOn: '2026-10-06', day: '2026-10-06', today: '2026-10-10', next: '2026-10-07' },
    { name: 'everyNDays 3, skipped on its first due day', schedule: { kind: 'everyNDays', n: 3 }, createdOn: '2026-10-06', day: '2026-10-07', today: '2026-10-07', next: '2026-10-10' },
    { name: 'everyNDays 3, skipped early (the day before the first due day)', schedule: { kind: 'everyNDays', n: 3 }, createdOn: '2026-10-06', day: '2026-10-06', today: '2026-10-06', next: '2026-10-09' },
    { name: 'everyNDays 3, read a week late', schedule: { kind: 'everyNDays', n: 3 }, createdOn: '2026-10-06', day: '2026-10-07', today: '2026-10-14', next: '2026-10-10' },
    { name: 'weekdays Mon/Wed/Fri, skipped on Wednesday', schedule: { kind: 'weekdays', days: [1, 3, 5] }, createdOn: '2026-10-06', day: '2026-10-07', today: '2026-10-07', next: '2026-10-09' },
    { name: 'weekdays Mon/Wed/Fri, skipped Wednesday, read on Monday overdue', schedule: { kind: 'weekdays', days: [1, 3, 5] }, createdOn: '2026-10-06', day: '2026-10-07', today: '2026-10-12', next: '2026-10-09' },
    { name: 'weekly Saturday, on the day', schedule: { kind: 'weekly', weekday: 6 }, createdOn: '2026-10-06', day: '2026-10-10', today: '2026-10-10', next: '2026-10-17' },
    { name: 'weekly Saturday, skipped early on Thursday', schedule: { kind: 'weekly', weekday: 6 }, createdOn: '2026-10-06', day: '2026-10-08', today: '2026-10-08', next: '2026-10-17' },
    { name: 'weekly Saturday, read ten days late', schedule: { kind: 'weekly', weekday: 6 }, createdOn: '2026-10-06', day: '2026-10-10', today: '2026-10-20', next: '2026-10-17' },
    { name: 'monthly 15, on the day', schedule: { kind: 'monthly', dayOfMonth: 15 }, createdOn: '2026-10-01', day: '2026-10-15', today: '2026-10-15', next: '2026-11-15' },
    { name: 'monthly 15, read five days late', schedule: { kind: 'monthly', dayOfMonth: 15 }, createdOn: '2026-09-01', day: '2026-09-15', today: '2026-10-20', next: '2026-10-15' },
    { name: 'monthly 31 clamped to Feb 28, on the day', schedule: { kind: 'monthly', dayOfMonth: 31 }, createdOn: '2027-02-01', day: '2027-02-28', today: '2027-02-28', next: '2027-03-31' },
    { name: 'monthly 31 clamped to Feb 28, read into April', schedule: { kind: 'monthly', dayOfMonth: 31 }, createdOn: '2027-02-01', day: '2027-02-28', today: '2027-04-02', next: '2027-03-31' },
  ]

  it.each(cases)('$name: same next due date and status as completing it that day', ({ schedule, createdOn, day, today, next }) => {
    const base = chore(schedule, createdOn)
    expect(nextDueDate(withSkips(base, [day]), [])).toBe(next)
    expect(nextDueDate(base, done(day))).toBe(next)
    expect(choreStatus(withSkips(base, [day]), [], today)).toEqual(choreStatus(base, done(day), today))
  })

  it('a skipped overdue round reads as overdue for the next round, as a completion would leave it', () => {
    // Daily from Tue 10-06, skipped on 10-06 and read on 10-10: the 10-07 round is owed and four days late.
    const s = choreStatus(withSkips(chore({ kind: 'daily' }), ['2026-10-06']), [], '2026-10-10')
    expect(s).toMatchObject({ dueDate: '2026-10-07', state: 'overdue', overdueDays: 3 })
  })

  it('walking every round by skipping gives the same due dates as completing them', () => {
    for (const schedule of SCHEDULES) {
      const base = chore(schedule, '2026-09-01')
      const skips: ISODate[] = []
      const completions: Completion[] = []
      for (let i = 0; i < 8; i++) {
        const dueBySkip = nextDueDate(withSkips(base, skips), [])
        const dueByCompletion = nextDueDate(base, completions)
        expect(dueBySkip, `${schedule.kind} round ${i}`).toBe(dueByCompletion)
        skips.push(dueBySkip)
        completions.push(...done(dueByCompletion))
      }
    }
  })

  it('day by day, skips move the schedule and the completion-counts exactly as completions do', () => {
    for (const schedule of SCHEDULES) {
      const base = chore(schedule, '2026-09-01')
      const skips: ISODate[] = []
      const completions: Completion[] = []
      for (let i = 0; i < 60; i++) {
        const day = addDays('2026-09-01', i)
        expect(completionCounts(withSkips(base, skips), [], day), `${schedule.kind} ${day}`).toBe(completionCounts(base, completions, day))
        expect(nextDueDate(withSkips(base, skips), [])).toBe(nextDueDate(base, completions))
        if (i % 2 === 0) {
          skips.push(day)
          completions.push(...done(day))
        }
      }
    }
  })
})

describe('a skip is not a completion', () => {
  const daily = chore({ kind: 'daily' })

  it('completionDays ignores skips', () => {
    const skipped = withSkips(daily, ['2026-10-06', '2026-10-07'])
    expect(completionDays(skipped, [])).toEqual([])
    expect(completionDays(skipped, done('2026-10-08'))).toEqual(['2026-10-08'])
  })

  it('scheduleDays merges completions and skips, one per day, in order', () => {
    const skipped = withSkips(daily, ['2026-10-08', '2026-10-06', '2026-10-08'])
    expect(scheduleDays(skipped, done('2026-10-07', '2026-10-06', '2026-10-07'))).toEqual(['2026-10-06', '2026-10-07', '2026-10-08'])
    expect(scheduleDays(skipped, [])).toEqual(['2026-10-06', '2026-10-08'])
    expect(scheduleDays(daily, done('2026-10-07', '2026-10-06'))).toEqual(['2026-10-06', '2026-10-07'])
  })

  it('a skipped day earns nothing: completionCounts is false on it', () => {
    expect(completionCounts(withSkips(daily, ['2026-10-06']), [], '2026-10-06')).toBe(false)
  })

  it('a day both skipped and completed earns nothing either', () => {
    expect(completionCounts(withSkips(daily, ['2026-10-06']), done('2026-10-06'), '2026-10-06')).toBe(false)
  })

  it('a weekly chore skipped early earns nothing on the skipped day', () => {
    const sat = withSkips(chore({ kind: 'weekly', weekday: 6 }), ['2026-10-08'])
    expect(completionCounts(sat, [], '2026-10-08')).toBe(false)
  })

  it('the next round after a skip counts like any completion (the skip settled the one before)', () => {
    expect(completionCounts(withSkips(daily, ['2026-10-06']), [], '2026-10-07')).toBe(true)
    expect(completionCounts(daily, done('2026-10-06'), '2026-10-07')).toBe(true)
  })
})

describe('skipDays', () => {
  const daily = chore({ kind: 'daily' })

  it('is empty when there are no skips, or the field is not a list', () => {
    expect(skipDays(daily)).toEqual([])
    for (const bad of [null, undefined, '2026-10-06', 20261006, { 0: '2026-10-06' }]) {
      expect(skipDays(withSkips(daily, bad)), JSON.stringify(bad)).toEqual([])
    }
  })

  it('ignores entries that are not strings', () => {
    expect(skipDays(withSkips(daily, [20261006, null, undefined, { day: '2026-10-06' }, ['2026-10-06'], '2026-10-06']))).toEqual(['2026-10-06'])
  })

  it('ignores entries in a bad format', () => {
    expect(skipDays(withSkips(daily, ['2026-10-6', '06/10/2026', '2026/10/06', '2026-10-06T12:00:00Z', ' 2026-10-06', '2026-10-06 ', '20261006', '']))).toEqual([])
  })

  it('keeps one entry per day, in order', () => {
    expect(skipDays(withSkips(daily, ['2026-10-08', '2026-10-06', '2026-10-08']))).toEqual(['2026-10-06', '2026-10-08'])
  })

  // Suspected bug: the check is only the shape YYYY-MM-DD, so days that are not on the calendar get through.
  it('ignores days that are not on the calendar', () => {
    expect(skipDays(withSkips(daily, ['2026-02-30', '2026-13-01', '2026-10-00']))).toEqual([])
  })

  it('a malformed skips field leaves the completions alone in scheduleDays', () => {
    expect(scheduleDays(withSkips(daily, 'oops'), done('2026-10-06'))).toEqual(['2026-10-06'])
    expect(scheduleDays(withSkips(daily, [null, 'bad', 7]), done('2026-10-06'))).toEqual(['2026-10-06'])
  })
})

describe('skippedOn and canSkip', () => {
  const daily = chore({ kind: 'daily' })

  it('skippedOn is true only on a day that was skipped', () => {
    const skipped = withSkips(daily, ['2026-10-06'])
    expect(skippedOn(skipped, '2026-10-06')).toBe(true)
    expect(skippedOn(skipped, '2026-10-07')).toBe(false)
    expect(skippedOn(skipped, '2026-10-05')).toBe(false)
    expect(skippedOn(daily, '2026-10-06')).toBe(false)
  })

  it('skippedOn does not match a malformed entry for the same day', () => {
    expect(skippedOn(withSkips(daily, ['2026-10-6']), '2026-10-06')).toBe(false)
  })

  it('canSkip is true while the round is due or overdue', () => {
    expect(choreStatus(daily, [], '2026-10-06').state).toBe('due')
    expect(canSkip(choreStatus(daily, [], '2026-10-06'))).toBe(true)
    expect(choreStatus(daily, [], '2026-10-09').state).toBe('overdue')
    expect(canSkip(choreStatus(daily, [], '2026-10-09'))).toBe(true)
  })

  it('canSkip is false while the round is upcoming', () => {
    expect(choreStatus(daily, [], '2026-10-05').state).toBe('upcoming')
    expect(canSkip(choreStatus(daily, [], '2026-10-05'))).toBe(false)
  })

  it('canSkip is false once today\'s round has been skipped (the next one is upcoming)', () => {
    expect(canSkip(choreStatus(withSkips(daily, ['2026-10-06']), [], '2026-10-06'))).toBe(false)
  })
})

describe('sameSchedule ignores skips', () => {
  it('the same rule with and without skips is the same schedule', () => {
    const daily = chore({ kind: 'daily' }).schedule
    const weekly = chore({ kind: 'weekly', weekday: 6 }).schedule
    expect(sameSchedule({ ...daily, skips: ['2026-10-06'] }, daily)).toBe(true)
    expect(sameSchedule({ ...weekly, skips: ['2026-10-10', '2026-10-17'] }, weekly)).toBe(true)
  })

  it('an unknown kind with skips is the same as without them', () => {
    const a = { kind: 'fortnightly', every: 14, skips: ['2026-10-06'] } as unknown as Schedule
    const b = { kind: 'fortnightly', every: 14 } as unknown as Schedule
    expect(sameSchedule(a, b)).toBe(true)
  })

  it('a different rule is still different, skips or not', () => {
    expect(sameSchedule({ kind: 'weekly', weekday: 6, skips: ['2026-10-10'] }, { kind: 'weekly', weekday: 5 })).toBe(false)
  })
})

describe('choreAsOf and skips', () => {
  const daily = withSkips(chore({ kind: 'daily' }, '2026-10-01'), ['2026-10-03', '2026-10-06', '2026-10-09'])

  it('drops skips after the day and keeps the ones on or before it', () => {
    expect(skipDays(choreAsOf(daily, '2026-10-02'))).toEqual([])
    expect(skipDays(choreAsOf(daily, '2026-10-05'))).toEqual(['2026-10-03'])
    expect(skipDays(choreAsOf(daily, '2026-10-06'))).toEqual(['2026-10-03', '2026-10-06'])
    expect(skipDays(choreAsOf(daily, '2026-10-30'))).toEqual(['2026-10-03', '2026-10-06', '2026-10-09'])
  })

  it('a skip made after the day has not happened yet: the round it settled is still owed', () => {
    expect(nextDueDate(choreAsOf(daily, '2026-10-08'), [])).toBe('2026-10-07')
    expect(nextDueDate(daily, [])).toBe('2026-10-10')
  })

  it('keeps skips on or before the day when the day is after the schedule change', () => {
    // Weekly on Wednesdays from Mon 10-05, daily before. Skipped Sun 10-04 (daily rule) and Thu 10-08.
    const changed: Chore = withSkips(
      { ...chore({ kind: 'weekly', weekday: 3, since: '2026-10-05', before: { kind: 'daily' } }, '2026-09-01') },
      ['2026-10-04', '2026-10-08'],
    )
    expect(skipDays(choreAsOf(changed, '2026-10-06'))).toEqual(['2026-10-04'])
    expect(skipDays(choreAsOf(changed, '2026-10-30'))).toEqual(['2026-10-04', '2026-10-08'])
  })

  it('keeps a skip before a change that has no kept history (falls back to the current rule)', () => {
    const changed = withSkips(chore({ kind: 'weekly', weekday: 3, since: '2026-10-05' }, '2026-09-01'), ['2026-10-04'])
    expect(skipDays(choreAsOf(changed, '2026-10-04'))).toEqual(['2026-10-04'])
  })

  // Suspected bug: stepping back to the `before` rule drops the chore's skips, so a skip taken before a schedule change disappears.
  it('keeps a skip taken before a schedule change when the day is before that change', () => {
    // Daily, then weekly on Wednesdays from Mon 10-05. Skipped Sun 10-04 under the daily rule.
    const changed = withSkips(chore({ kind: 'weekly', weekday: 3, since: '2026-10-05', before: { kind: 'daily' } }, '2026-09-01'), ['2026-10-04'])
    expect(skipDays(choreAsOf(changed, '2026-10-04'))).toEqual(['2026-10-04'])
  })

  // Suspected bug: a non-list skips field makes choreAsOf throw, though skipDays is meant to be safe against it.
  it('does not throw on a malformed skips field', () => {
    expect(() => choreAsOf(withSkips(daily, 'oops'), '2026-10-06')).not.toThrow()
  })
})

describe('a skip before a schedule change does not satisfy the new schedule', () => {
  it('a weekly Wednesday chore changed on Mon 10-05 ignores a skip on Sun 10-04', () => {
    const c = chore({ kind: 'weekly', weekday: 3, since: '2026-10-05' }, '2026-09-01')
    expect(nextDueDate(withSkips(c, ['2026-10-04']), [])).toBe('2026-10-07')
    expect(choreStatus(withSkips(c, ['2026-10-04']), [], '2026-10-07')).toEqual(choreStatus(c, [], '2026-10-07'))
  })

  it('a skip on the day of the change settles the new round, as a completion that day would', () => {
    const c = chore({ kind: 'weekly', weekday: 3, since: '2026-10-05' }, '2026-09-01')
    expect(nextDueDate(withSkips(c, ['2026-10-05']), [])).toBe('2026-10-14')
    expect(nextDueDate(c, done('2026-10-05'))).toBe('2026-10-14')
  })

  it('an every-N-days chore restarting on a change ignores a skip from before it', () => {
    const c = chore({ kind: 'everyNDays', n: 7, since: '2026-10-07' }, '2026-09-01')
    expect(nextDueDate(withSkips(c, ['2026-09-20']), [])).toBe('2026-10-10')
    expect(nextDueDate(withSkips(c, ['2026-09-20', '2026-10-07']), [])).toBe('2026-10-14')
  })
})

describe('resumeFrom treats a skip as the last day done', () => {
  it('a daily chore skipped today and then removed resumes its next round, as a completion would', () => {
    const removed: Chore = { ...chore({ kind: 'daily' }, '2026-10-01'), archivedOn: '2026-10-08' }
    expect(resumeFrom(withSkips(removed, ['2026-10-08']), [], '2026-10-08')).toEqual({ due: '2026-10-09', last: '2026-10-08' })
    expect(resumeFrom(withSkips(removed, ['2026-10-08']), [], '2026-10-08')).toEqual(resumeFrom(removed, done('2026-10-08'), '2026-10-08'))
  })

  it('a weekly chore skipped early on Thursday and removed that day resumes for the Saturday', () => {
    const removed: Chore = { ...chore({ kind: 'weekly', weekday: 6 }, '2026-10-06'), archivedOn: '2026-10-08' }
    expect(resumeFrom(withSkips(removed, ['2026-10-08']), [], '2026-10-08')).toEqual({ due: '2026-10-17', last: '2026-10-08' })
  })

  it('a skip dated after today is ignored, as a completion dated after today is', () => {
    const removed: Chore = { ...chore({ kind: 'daily' }, '2026-10-01'), archivedOn: '2026-10-08' }
    expect(resumeFrom(withSkips(removed, ['2026-10-10']), [], '2026-10-08')).toBeUndefined()
  })
})
