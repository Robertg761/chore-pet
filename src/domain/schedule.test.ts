import { describe, expect, it } from 'vitest'
import { weekdayOf } from './dates'
import { archiveEnd, choreAsOf, choreRetiredBy, choreStatus, completionCounts, nextDueDate, resumeFrom } from './schedule'
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
    expect(nextDueDate(c, [])).toBe('2026-10-07') // first due halfway through its first 3 days
    expect(nextDueDate(c, done('2026-10-06'))).toBe('2026-10-09')
    expect(nextDueDate(c, done('2026-10-06', '2026-10-07'))).toBe('2026-10-09') // the next day is a repeat
    expect(nextDueDate(c, done('2026-10-06', '2026-10-08'))).toBe('2026-10-11') // from halfway it counts
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

describe('completionCounts', () => {
  const chore = (schedule: Schedule): Chore => ({ id: 'c', homeId: 'h', objectId: null, name: 'c', schedule, createdOn: '2026-09-01', photoProof: false })
  const on = (completedOn: string): Completion => ({ id: completedOn, choreId: 'c', completedAt: '', completedOn })

  it('counts the first completion of an occurrence, on time, late or early', () => {
    const daily = chore({ kind: 'daily' })
    expect(completionCounts(daily, [], '2026-10-06')).toBe(true)
    const weekly = chore({ kind: 'weekdays', days: [1] }) // Mondays
    expect(completionCounts(weekly, [on('2026-09-28')], '2026-10-02')).toBe(true) // early for Mon 5 Oct (from halfway, Fri 2 Oct)
    expect(completionCounts(weekly, [on('2026-09-21')], '2026-09-29')).toBe(true) // a day late for Mon 28 Sep
  })

  it('does not count a repeat soon after the last time', () => {
    const weekly = chore({ kind: 'weekdays', days: [1] })
    expect(completionCounts(weekly, [on('2026-09-28')], '2026-09-29')).toBe(false) // the day after doing it on time
    expect(completionCounts(weekly, [on('2026-09-30')], '2026-10-01')).toBe(false) // late on Wed, again on Thu
    const plant = chore({ kind: 'everyNDays', n: 7 })
    expect(completionCounts(plant, [on('2026-10-01')], '2026-10-04')).toBe(false)
    expect(completionCounts(plant, [on('2026-10-01')], '2026-10-05')).toBe(true)
  })

  it('agrees with nextDueDate: a completion counts exactly when it moves the due date', () => {
    const schedules: Schedule[] = [{ kind: 'daily' }, { kind: 'everyNDays', n: 5 }, { kind: 'weekdays', days: [1, 4] }, { kind: 'weekly', weekday: 6 }, { kind: 'monthly', dayOfMonth: 10 }]
    for (const schedule of schedules) {
      const c = chore(schedule)
      const history: Completion[] = []
      for (let d = 0; d < 60; d++) {
        const day = new Date(Date.UTC(2026, 8, 1 + d)).toISOString().slice(0, 10)
        const counts = completionCounts(c, history, day)
        const moved = nextDueDate(c, [...history, on(day)]) !== nextDueDate(c, history)
        expect(counts, `${schedule.kind} ${day}`).toBe(moved)
        if (d % 2 === 0) history.push(on(day))
      }
    }
  })

  it('does not count doing it again the same day', () => {
    for (const schedule of [{ kind: 'daily' }, { kind: 'everyNDays', n: 3 }, { kind: 'weekdays', days: [2] }] as Schedule[]) {
      expect(completionCounts(chore(schedule), [on('2026-10-06')], '2026-10-06'), schedule.kind).toBe(false)
    }
  })

  it('does not count a second early completion in the same period', () => {
    const weekly = chore({ kind: 'weekdays', days: [1] })
    expect(completionCounts(weekly, [on('2026-09-28'), on('2026-10-02')], '2026-10-03')).toBe(false)
  })
})

describe('choreAsOf', () => {
  const c: Chore = {
    id: 'c', homeId: 'h', objectId: null, name: 'c', createdOn: '2026-01-01', photoProof: false,
    schedule: { kind: 'weekly', weekday: 1, since: '2026-03-01', before: { kind: 'monthly', dayOfMonth: 1, since: '2026-02-01', before: { kind: 'daily' } } },
  }
  it('gives the rule in force on each day', () => {
    expect(choreAsOf(c, '2026-01-15').schedule).toEqual({ kind: 'daily' })
    expect(choreAsOf(c, '2026-02-15').schedule).toEqual({ kind: 'monthly', dayOfMonth: 1, since: '2026-02-01' })
    expect(choreAsOf(c, '2026-03-15')).toBe(c)
  })
  it('starts a middle rule on the day it took effect, so older completions do not shift it', () => {
    // Daily, done 31 Jan; every 7 days from 1 Feb; weekly from 1 Mar.
    const edited: Chore = { ...c, schedule: { kind: 'weekly', weekday: 1, since: '2026-03-01', before: { kind: 'everyNDays', n: 7, since: '2026-02-01', before: { kind: 'daily' } } } }
    const status = choreStatus(choreAsOf(edited, '2026-02-05'), [{ id: 'x', choreId: 'c', completedAt: '2026-01-31T10:00:00.000Z', completedOn: '2026-01-31' }], '2026-02-05')
    expect(status.dueDate).toBe('2026-02-04')
  })

  it('falls back to the current rule when no history was kept', () => {
    expect(choreAsOf({ ...c, schedule: { kind: 'weekly', weekday: 1, since: '2026-03-01' } }, '2026-01-15').schedule).toEqual({ kind: 'weekly', weekday: 1 })
  })
})


describe('removed chores', () => {
  const base: Chore = { id: 'c', homeId: 'h', objectId: null, name: 'Dishes', createdOn: '2026-10-05', schedule: { kind: 'daily' }, photoProof: false }
  it('a chore is retired once its archive date has come', () => {
    expect(choreRetiredBy(base, '2026-10-08')).toBe(false)
    expect(choreRetiredBy({ ...base, archivedOn: '2026-10-09' }, '2026-10-08')).toBe(false)
    expect(choreRetiredBy({ ...base, archivedOn: '2026-10-08' }, '2026-10-08')).toBe(true)
  })
  it('a chore removed before it started is retired at once', () => {
    // Dated ahead by a clock and removed today: it ends on its start date, active on no day.
    expect(choreRetiredBy({ ...base, createdOn: '2026-10-10', archivedOn: '2026-10-10' }, '2026-10-08')).toBe(true)
  })
  it('a removal never ends before the chore starts', () => {
    expect(archiveEnd(base, '2026-10-08')).toBe('2026-10-08')
    expect(archiveEnd(base, '2026-10-01')).toBe('2026-10-05')
  })
})

describe('resumeFrom', () => {
  const daily: Chore = { id: 'c', homeId: 'h', objectId: null, name: 'Dishes', createdOn: '2026-10-01', schedule: { kind: 'daily' }, photoProof: false, archivedOn: '2026-10-08' }
  const done = (day: string, choreId = 'c'): Completion => ({ id: `${choreId}${day}`, choreId, completedOn: day, completedAt: `${day}T12:00:00Z` })
  /** The chore added back on `today` from `old`, resuming where it stood. */
  const again = (old: Chore, completions: Completion[], today: string): Chore => {
    const resume = resumeFrom(old, completions, today)
    const { since: _s, before: _b, ...rule } = old.schedule
    return { ...old, id: 'n', createdOn: today, archivedOn: undefined, schedule: resume ? { ...rule, resume } : rule }
  }

  it('has nothing to resume when never done, or due again', () => {
    expect(resumeFrom(daily, [], '2026-10-08')).toBeUndefined()
    expect(resumeFrom(daily, [done('2026-10-06')], '2026-10-08')).toBeUndefined()
  })

  it('resumes a round already done: due when the old one would have been', () => {
    expect(resumeFrom(daily, [done('2026-10-08')], '2026-10-08')).toEqual({ due: '2026-10-09', last: '2026-10-08' })
    const monthly = { ...daily, schedule: { kind: 'monthly' as const, dayOfMonth: 20 } }
    expect(resumeFrom(monthly, [done('2026-10-08')], '2026-10-10')).toEqual({ due: '2026-11-20', last: '2026-10-08' })
  })

  it('an every-N-days chore added back late in its interval keeps its due date exactly', () => {
    // Every 4 days, done Oct 1, so due Oct 5. Added back Oct 4: still due Oct 5, not Oct 6.
    const every4: Chore = { ...daily, name: 'Mop', createdOn: '2026-09-20', schedule: { kind: 'everyNDays', n: 4 }, archivedOn: '2026-10-04' }
    const back = again(every4, [done('2026-10-01')], '2026-10-04')
    expect(back.schedule.resume).toEqual({ due: '2026-10-05', last: '2026-10-01' })
    expect(nextDueDate(back, [])).toBe('2026-10-05')
    expect(choreStatus(back, [], '2026-10-04').state).toBe('upcoming')
  })

  it('ignores completions dated after today (a clock that was set ahead)', () => {
    // Done and removed on Oct 10 by a clock set ahead; added back on the real Oct 8: due today, not Oct 11.
    expect(resumeFrom({ ...daily, createdOn: '2026-10-10', archivedOn: '2026-10-10' }, [done('2026-10-10')], '2026-10-08')).toBeUndefined()
  })

  it('an early completion counts exactly as it would have on the removed chore', () => {
    // Weekly on Mondays. Done on time Mon 28 Sep: an early go on Sat 3 Oct still counts for Mon 5 Oct.
    const weekly: Chore = { ...daily, createdOn: '2026-09-21', schedule: { kind: 'weekly', weekday: 1 }, archivedOn: '2026-10-02' }
    const onTime = [done('2026-09-28')]
    expect(completionCounts(again(weekly, onTime, '2026-10-02'), [], '2026-10-03')).toBe(completionCounts({ ...weekly, archivedOn: undefined }, onTime, '2026-10-03'))
    expect(completionCounts(again(weekly, onTime, '2026-10-02'), [], '2026-10-03')).toBe(true)
    // Already done early on Sat 3 Oct: another go before Monday is a repeat, on the old chore and the new one alike.
    const early = [done('2026-09-28'), done('2026-10-03')]
    expect(completionCounts(again(weekly, early, '2026-10-03'), [], '2026-10-04')).toBe(false)
    expect(completionCounts({ ...weekly, archivedOn: undefined }, early, '2026-10-04')).toBe(false)
  })
})

describe('archiveEnd settles on the earliest end', () => {
  const base: Chore = { id: 'c', homeId: 'h', objectId: null, name: 'Dishes', createdOn: '2026-10-05', schedule: { kind: 'daily' }, photoProof: false }
  it('an end already recorded later is brought forward; an earlier one stays', () => {
    expect(archiveEnd({ ...base, archivedOn: '2026-10-20' }, '2026-10-08')).toBe('2026-10-08')
    expect(archiveEnd({ ...base, archivedOn: '2026-10-06' }, '2026-10-08')).toBe('2026-10-06')
  })
})
