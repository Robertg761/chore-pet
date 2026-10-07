import { describe, expect, it } from 'vitest'
import { diffDays, weekdayOf } from './dates'
import { choreStatus, completionCounts, firstOnOrAfter, lastBefore, nextDueDate, sameSchedule } from './schedule'
import type { Chore, Completion, ISODate, Schedule, VacationWindow, Weekday } from './types'

// Reference: 2026-10-06 is a Tuesday. The week of 2026-10-04 (Sun) .. 2026-10-10 (Sat).
// 2028 is a leap year; 2026 and 2027 are not.

function chore(schedule: Schedule, createdOn: ISODate = '2026-10-06'): Chore {
  return { id: 'c1', homeId: 'h1', objectId: null, name: 'Test', schedule, createdOn, photoProof: false }
}

function done(...dates: string[]): Completion[] {
  return dates.map((d, i) => ({ id: `x${i}`, choreId: 'c1', completedAt: `${d}T12:00:00Z`, completedOn: d }))
}

/** Complete the chore on every due date in turn and collect the due dates seen. */
function dueChain(c: Chore, count: number): ISODate[] {
  const completions: Completion[] = []
  const chain: ISODate[] = []
  for (let i = 0; i < count; i++) {
    const due = nextDueDate(c, completions)
    chain.push(due)
    completions.push(...done(due).map((x) => ({ ...x, id: `y${i}` })))
  }
  return chain
}

const WEEK: ISODate[] = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']

describe('monthly: day 31 chain', () => {
  it('clamps through a whole common year and rolls into January', () => {
    const chain = dueChain(chore({ kind: 'monthly', dayOfMonth: 31 }, '2026-01-01'), 13)
    expect(chain).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2026-07-31',
      '2026-08-31',
      '2026-09-30',
      '2026-10-31',
      '2026-11-30',
      '2026-12-31',
      '2027-01-31',
    ])
  })
  it('uses Feb 29 in a leap year', () => {
    expect(dueChain(chore({ kind: 'monthly', dayOfMonth: 31 }, '2028-01-01'), 4)).toEqual([
      '2028-01-31',
      '2028-02-29',
      '2028-03-31',
      '2028-04-30',
    ])
  })
  it('uses Feb 28 in 2027', () => {
    expect(dueChain(chore({ kind: 'monthly', dayOfMonth: 31 }, '2027-01-01'), 3)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
  })
})

describe('monthly: day 30 and 29', () => {
  it('day 30 clamps to Feb 28 / 29 and returns to the 30th', () => {
    expect(dueChain(chore({ kind: 'monthly', dayOfMonth: 30 }, '2026-01-01'), 4)).toEqual(['2026-01-30', '2026-02-28', '2026-03-30', '2026-04-30'])
    expect(dueChain(chore({ kind: 'monthly', dayOfMonth: 30 }, '2028-01-01'), 3)).toEqual(['2028-01-30', '2028-02-29', '2028-03-30'])
  })
  it('day 29 only clamps in non-leap Februaries', () => {
    expect(dueChain(chore({ kind: 'monthly', dayOfMonth: 29 }, '2026-01-01'), 3)).toEqual(['2026-01-29', '2026-02-28', '2026-03-29'])
    expect(dueChain(chore({ kind: 'monthly', dayOfMonth: 29 }, '2027-01-01'), 3)).toEqual(['2027-01-29', '2027-02-28', '2027-03-29'])
    expect(dueChain(chore({ kind: 'monthly', dayOfMonth: 29 }, '2028-01-01'), 3)).toEqual(['2028-01-29', '2028-02-29', '2028-03-29'])
  })
  it('day 31 across Dec to Jan with a leap-year February after it', () => {
    expect(dueChain(chore({ kind: 'monthly', dayOfMonth: 31 }, '2027-12-01'), 4)).toEqual(['2027-12-31', '2028-01-31', '2028-02-29', '2028-03-31'])
  })
})

describe('monthly: created on or around the clamped date', () => {
  it('created on the clamped last day of February is due that same day', () => {
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 31 }, '2026-02-28'), [])).toBe('2026-02-28')
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 31 }, '2028-02-29'), [])).toBe('2028-02-29')
  })
  it('created the day after the clamped date waits for the next month', () => {
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 31 }, '2026-03-01'), [])).toBe('2026-03-31')
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 29 }, '2028-03-01'), [])).toBe('2028-03-29')
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 31 }, '2028-02-28'), [])).toBe('2028-02-29')
  })
  it('created after the due day rolls to next month, including across the year', () => {
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 15 }, '2026-10-16'), [])).toBe('2026-11-15')
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 31 }, '2026-12-31'), [])).toBe('2026-12-31')
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 15 }, '2026-12-16'), [])).toBe('2027-01-15')
  })
  it('created on a 30-day month end for day 31 is due that day', () => {
    for (const d of ['2026-04-30', '2026-06-30', '2026-09-30', '2026-11-30']) {
      expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 31 }, d), [])).toBe(d)
    }
  })
  it('clamps out of range days of month', () => {
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 99 }, '2026-02-01'), [])).toBe('2026-02-28')
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 0 }, '2026-10-06'), [])).toBe('2026-11-01')
  })
})

describe('monthly: late and early completions', () => {
  const c31 = chore({ kind: 'monthly', dayOfMonth: 31 }, '2026-01-01')
  it('completing late in the next month jumps to that month, not the one skipped', () => {
    // Due 2026-01-31, done 2026-02-10 (late): next is Feb 28, not Mar 31.
    expect(nextDueDate(c31, done('2026-02-10'))).toBe('2026-02-28')
    // With Jan 31 done on time first, Feb 10 is too soon after it to count for Feb 28 (a repeat)...
    expect(nextDueDate(c31, done('2026-01-31', '2026-02-10'))).toBe('2026-02-28')
    // ...but from halfway to Feb 28 (Feb 14) it is an early completion, so next is Mar 31.
    expect(nextDueDate(c31, done('2026-01-31', '2026-02-14'))).toBe('2026-03-31')
    expect(nextDueDate(c31, done('2026-01-31', '2026-02-13'))).toBe('2026-02-28')
  })
  it('completing on the clamped day then next month', () => {
    expect(nextDueDate(c31, done('2026-01-31', '2026-02-28'))).toBe('2026-03-31')
  })
  it('completing very late in March for a February chore goes to March 31', () => {
    const c = chore({ kind: 'monthly', dayOfMonth: 31 }, '2027-02-01')
    expect(nextDueDate(c, done('2027-03-05'))).toBe('2027-03-31')
  })
  it('completing on the 1st of the next month after a missed 31st', () => {
    expect(nextDueDate(c31, done('2026-01-31', '2026-03-01'))).toBe('2026-03-31')
    // Done on the 31st late (after clamped Feb) in March satisfies March itself.
    expect(nextDueDate(c31, done('2026-03-31'))).toBe('2026-04-30')
  })
  it('late completion across the year end', () => {
    const c = chore({ kind: 'monthly', dayOfMonth: 31 }, '2026-12-01')
    expect(nextDueDate(c, done('2027-01-15'))).toBe('2027-01-31')
    expect(nextDueDate(c, done('2027-01-31'))).toBe('2027-02-28')
    expect(nextDueDate(c, done('2026-12-31'))).toBe('2027-01-31')
  })
  it('early completion satisfies the month; a second early one is ignored', () => {
    const c = chore({ kind: 'monthly', dayOfMonth: 15 }, '2026-10-01')
    expect(nextDueDate(c, done('2026-10-10'))).toBe('2026-11-15')
    expect(nextDueDate(c, done('2026-10-10', '2026-10-12'))).toBe('2026-11-15')
  })
  it('early completion for a clamped month goes to the next month end', () => {
    const feb = chore({ kind: 'monthly', dayOfMonth: 31 }, '2026-02-01')
    expect(nextDueDate(feb, done('2026-02-05'))).toBe('2026-03-31')
    const mar = chore({ kind: 'monthly', dayOfMonth: 31 }, '2027-03-01')
    expect(nextDueDate(mar, done('2027-03-02'))).toBe('2027-04-30')
  })
  it('overdue days run from the clamped due date', () => {
    const feb = chore({ kind: 'monthly', dayOfMonth: 31 }, '2027-02-01')
    const s = choreStatus(feb, [], '2027-03-03')
    expect(s.dueDate).toBe('2027-02-28')
    expect(s.state).toBe('overdue')
    expect(s.overdueDays).toBe(3) // Mar 1, 2, 3
    const leap = chore({ kind: 'monthly', dayOfMonth: 31 }, '2028-02-01')
    expect(choreStatus(leap, [], '2028-03-03').overdueDays).toBe(3) // Mar 1, 2, 3 after Feb 29 -> 3
    expect(choreStatus(leap, [], '2028-03-03').dueDate).toBe('2028-02-29')
  })
  it('is upcoming the day before and due on the day', () => {
    expect(choreStatus(c31, [], '2026-01-30').state).toBe('upcoming')
    expect(choreStatus(c31, [], '2026-01-31').state).toBe('due')
  })
})

describe('firstOnOrAfter / lastBefore for monthly', () => {
  it('first on or after handles the year boundary', () => {
    expect(firstOnOrAfter({ kind: 'monthly', dayOfMonth: 5 }, '2026-12-20')).toBe('2027-01-05')
    expect(firstOnOrAfter({ kind: 'monthly', dayOfMonth: 31 }, '2026-02-01')).toBe('2026-02-28')
  })
  it('last before handles January to previous December and clamping', () => {
    expect(lastBefore({ kind: 'monthly', dayOfMonth: 31 }, '2027-01-15')).toBe('2026-12-31')
    expect(lastBefore({ kind: 'monthly', dayOfMonth: 31 }, '2026-03-31')).toBe('2026-02-28')
    expect(lastBefore({ kind: 'monthly', dayOfMonth: 31 }, '2028-03-31')).toBe('2028-02-29')
    expect(lastBefore({ kind: 'monthly', dayOfMonth: 15 }, '2026-10-15')).toBe('2026-09-15')
  })
})

describe('weekly created mid-week', () => {
  // Wednesday (3). Expected first due date per createdOn weekday, Sun..Sat.
  const expectedWed = ['2026-10-07', '2026-10-07', '2026-10-07', '2026-10-07', '2026-10-14', '2026-10-14', '2026-10-14']
  it.each(WEEK.map((d, i) => [weekdayOf(d), d, expectedWed[i]] as const))('created on weekday %i (%s) is first due %s', (_w, createdOn, expected) => {
    expect(nextDueDate(chore({ kind: 'weekly', weekday: 3 }, createdOn), [])).toBe(expected)
  })
  it('created on its own weekday is due the same day', () => {
    const s = choreStatus(chore({ kind: 'weekly', weekday: 2 }), [], '2026-10-06')
    expect(s.state).toBe('due')
    expect(s.dueDate).toBe('2026-10-06')
  })
  it('created on Sunday for a Saturday chore is due six days later', () => {
    expect(nextDueDate(chore({ kind: 'weekly', weekday: 6 }, '2026-10-04'), [])).toBe('2026-10-10')
  })
  it('works for every weekday value 0..6 from a Tuesday creation', () => {
    const exp: Record<number, ISODate> = {
      0: '2026-10-11',
      1: '2026-10-12',
      2: '2026-10-06',
      3: '2026-10-07',
      4: '2026-10-08',
      5: '2026-10-09',
      6: '2026-10-10',
    }
    for (let w = 0; w <= 6; w++) {
      expect(nextDueDate(chore({ kind: 'weekly', weekday: w as Weekday }), [])).toBe(exp[w])
    }
  })
})

describe('weekly completions', () => {
  const sat = chore({ kind: 'weekly', weekday: 6 }) // created Tue 10-06, first due Sat 10-10
  it('on-time completion on the due day moves a full week', () => {
    expect(nextDueDate(sat, done('2026-10-10'))).toBe('2026-10-17')
  })
  it('early completion the day after creation counts', () => {
    expect(nextDueDate(sat, done('2026-10-07'))).toBe('2026-10-17')
  })
  it('completion on the creation day itself counts as early', () => {
    expect(nextDueDate(sat, done('2026-10-06'))).toBe('2026-10-17')
  })
  it('one day late', () => {
    expect(nextDueDate(sat, done('2026-10-11'))).toBe('2026-10-17')
  })
  it('late by more than a week skips ahead to the next Saturday after completion', () => {
    expect(nextDueDate(sat, done('2026-10-20'))).toBe('2026-10-24')
  })
  it('late completion on the following Saturday itself', () => {
    expect(nextDueDate(sat, done('2026-10-17'))).toBe('2026-10-24')
  })
  it('weekly chain of on-time completions steps by seven days over a month and year end', () => {
    expect(dueChain(chore({ kind: 'weekly', weekday: 4 }, '2026-12-20'), 4)).toEqual(['2026-12-24', '2026-12-31', '2027-01-07', '2027-01-14'])
  })
  it('chain across leap day', () => {
    expect(dueChain(chore({ kind: 'weekly', weekday: 2 }, '2028-02-22'), 3)).toEqual(['2028-02-22', '2028-02-29', '2028-03-07'])
  })
  it('multiple completions the same day behave as one', () => {
    expect(nextDueDate(sat, done('2026-10-08', '2026-10-08', '2026-10-08'))).toBe('2026-10-17')
    expect(nextDueDate(sat, done('2026-10-10', '2026-10-10'))).toBe('2026-10-17')
  })
  it('completion order does not matter', () => {
    const forward = nextDueDate(sat, done('2026-10-08', '2026-10-17', '2026-10-24'))
    const shuffled = nextDueDate(sat, done('2026-10-24', '2026-10-08', '2026-10-17'))
    const reversed = nextDueDate(sat, done('2026-10-24', '2026-10-17', '2026-10-08'))
    expect(forward).toBe('2026-10-31')
    expect(shuffled).toBe(forward)
    expect(reversed).toBe(forward)
  })
  it('ignores completions that belong to other chores', () => {
    const other: Completion[] = [{ id: 'z', choreId: 'other', completedAt: '2026-10-10T12:00:00Z', completedOn: '2026-10-10' }]
    expect(nextDueDate(sat, other)).toBe('2026-10-10')
    expect(nextDueDate(sat, [...other, ...done('2026-10-10')])).toBe('2026-10-17')
  })
  it('a late completion followed by another before the next due date never skips an occurrence', () => {
    // Late Mon 10-12 satisfies Sat 10-10, so next is 10-17. It already landed in
    // the window before 10-17, so Tue 10-13 (or even Fri 10-16) is a repeat.
    expect(nextDueDate(sat, done('2026-10-12', '2026-10-13'))).toBe('2026-10-17')
    expect(nextDueDate(sat, done('2026-10-12', '2026-10-16'))).toBe('2026-10-17')
  })
  it('a Monday chore done late on Wednesday and again on Thursday is still due next Monday (audit repro)', () => {
    const mon = chore({ kind: 'weekly', weekday: 1 }, '2026-09-01')
    expect(nextDueDate(mon, done('2026-09-30'))).toBe('2026-10-05')
    expect(nextDueDate(mon, done('2026-09-30', '2026-10-01'))).toBe('2026-10-05')
  })
  it('after an on-time completion, an early one counts only from halfway to the next due date', () => {
    // Done Sat 10-10 on time; the next Saturday is 10-17, halfway is Wed 10-14.
    expect(nextDueDate(sat, done('2026-10-10', '2026-10-11'))).toBe('2026-10-17') // Sunday: a repeat
    expect(nextDueDate(sat, done('2026-10-10', '2026-10-13'))).toBe('2026-10-17')
    expect(nextDueDate(sat, done('2026-10-10', '2026-10-14'))).toBe('2026-10-24') // Wednesday: early for 10-17
    expect(nextDueDate(sat, done('2026-10-10', '2026-10-16'))).toBe('2026-10-24') // the day before: early
  })
  it('a weekly chore tapped every day counts no faster than once a week', () => {
    const thu = chore({ kind: 'weekly', weekday: 4 }, '2026-10-01')
    const counted: Completion[] = []
    for (let d = 1; d <= 28; d++) {
      const day = `2026-10-${String(d).padStart(2, '0')}`
      if (completionCounts(thu, counted, day)) counted.push(...done(day).map((x) => ({ ...x, id: day })))
    }
    // Thursdays 10-01, 08, 15, 22 are four occurrences: one early tap can run a week ahead, never more.
    expect(counted.map((c) => c.completedOn)).toEqual(['2026-10-01', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
  })
  it('overdue counts days since the due Saturday', () => {
    const s = choreStatus(sat, [], '2026-10-13')
    expect(s.dueDate).toBe('2026-10-10')
    expect(s.overdueDays).toBe(3)
  })
})

describe('weekdays created mid-week', () => {
  // Mon, Wed, Fri. Expected first due per createdOn weekday, Sun..Sat.
  const expected = ['2026-10-05', '2026-10-05', '2026-10-07', '2026-10-07', '2026-10-09', '2026-10-09', '2026-10-12']
  it.each(WEEK.map((d, i) => [weekdayOf(d), d, expected[i]] as const))('MWF chore created on weekday %i (%s) is first due %s', (_w, createdOn, exp) => {
    expect(nextDueDate(chore({ kind: 'weekdays', days: [1, 3, 5] }, createdOn), [])).toBe(exp)
  })
  it('Monday to Friday skips the weekend', () => {
    const mf = chore({ kind: 'weekdays', days: [1, 2, 3, 4, 5] }, '2026-10-09') // Friday
    expect(dueChain(mf, 4)).toEqual(['2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14'])
    expect(nextDueDate(chore({ kind: 'weekdays', days: [1, 2, 3, 4, 5] }, '2026-10-10'), [])).toBe('2026-10-12') // Saturday
    expect(nextDueDate(chore({ kind: 'weekdays', days: [1, 2, 3, 4, 5] }, '2026-10-04'), [])).toBe('2026-10-05') // Sunday
  })
  it('a single weekday behaves like weekly', () => {
    const a = chore({ kind: 'weekdays', days: [6] })
    const b = chore({ kind: 'weekly', weekday: 6 })
    for (const comp of [[], ['2026-10-08'], ['2026-10-12'], ['2026-10-10', '2026-10-17']]) {
      expect(nextDueDate(a, done(...comp))).toBe(nextDueDate(b, done(...comp)))
    }
  })
  it('day order and duplicates in the list do not matter', () => {
    const a = chore({ kind: 'weekdays', days: [5, 1, 3, 3] })
    expect(nextDueDate(a, [])).toBe('2026-10-07')
    expect(nextDueDate(a, done('2026-10-07'))).toBe('2026-10-09')
  })
  it('weekend only', () => {
    const we = chore({ kind: 'weekdays', days: [0, 6] })
    expect(nextDueDate(we, [])).toBe('2026-10-10')
    expect(nextDueDate(we, done('2026-10-10'))).toBe('2026-10-11')
    expect(nextDueDate(we, done('2026-10-10', '2026-10-11'))).toBe('2026-10-17')
  })
  it('early completion between two scheduled days satisfies the pending one', () => {
    const mwf = chore({ kind: 'weekdays', days: [1, 3, 5] })
    // Created Tue, first due Wed 10-07. Done Tue 10-06 (after previous Mon 10-05).
    expect(nextDueDate(mwf, done('2026-10-06'))).toBe('2026-10-09')
  })
  it('late completion on a non-scheduled day jumps to the next scheduled day after it', () => {
    const mwf = chore({ kind: 'weekdays', days: [1, 3, 5] })
    // Due Wed 10-07, done Sat 10-10 -> next Mon 10-12.
    expect(nextDueDate(mwf, done('2026-10-10'))).toBe('2026-10-12')
    // Done Thu 10-08 (late) -> next Fri 10-09.
    expect(nextDueDate(mwf, done('2026-10-08'))).toBe('2026-10-09')
  })
  it('completing on a scheduled day itself moves to the next scheduled day', () => {
    const mwf = chore({ kind: 'weekdays', days: [1, 3, 5] })
    expect(nextDueDate(mwf, done('2026-10-07'))).toBe('2026-10-09')
    expect(nextDueDate(mwf, done('2026-10-07', '2026-10-09'))).toBe('2026-10-12')
  })
  it('same-day duplicates and shuffled order give the same answer', () => {
    const mwf = chore({ kind: 'weekdays', days: [1, 3, 5] })
    const a = nextDueDate(mwf, done('2026-10-07', '2026-10-07', '2026-10-09'))
    const b = nextDueDate(mwf, done('2026-10-09', '2026-10-07', '2026-10-07'))
    expect(a).toBe('2026-10-12')
    expect(b).toBe(a)
  })
  it('works across month and year ends', () => {
    const mwf = chore({ kind: 'weekdays', days: [1, 3, 5] }, '2026-12-30') // Wednesday
    expect(dueChain(mwf, 4)).toEqual(['2026-12-30', '2027-01-01', '2027-01-04', '2027-01-06'])
  })
})

describe('weekdays with an empty list', () => {
  const empty = chore({ kind: 'weekdays', days: [] })
  it('is treated like a daily chore starting at createdOn', () => {
    expect(nextDueDate(empty, [])).toBe('2026-10-06')
    expect(nextDueDate(empty, done('2026-10-06'))).toBe('2026-10-07')
    expect(nextDueDate(empty, done('2026-10-06', '2026-10-07', '2026-10-08'))).toBe('2026-10-09')
  })
  it('does not throw or loop and reports overdue days', () => {
    const s = choreStatus(empty, done('2026-10-06'), '2026-10-09')
    expect(s.dueDate).toBe('2026-10-07')
    expect(s.overdueDays).toBe(2)
  })
  it('firstOnOrAfter and lastBefore are safe', () => {
    expect(firstOnOrAfter({ kind: 'weekdays', days: [] }, '2026-10-06')).toBe('2026-10-06')
    expect(lastBefore({ kind: 'weekdays', days: [] }, '2026-10-06')).toBe('2026-10-05')
  })
})

describe('daily edge cases', () => {
  it('is due across a leap day and year end', () => {
    const c = chore({ kind: 'daily' }, '2028-02-28')
    expect(dueChain(c, 3)).toEqual(['2028-02-28', '2028-02-29', '2028-03-01'])
    expect(nextDueDate(chore({ kind: 'daily' }, '2026-12-30'), done('2026-12-31'))).toBe('2027-01-01')
  })
  it('a completion early (the day before creation) does not satisfy the first due day', () => {
    expect(nextDueDate(chore({ kind: 'daily' }), done('2026-10-05'))).toBe('2026-10-06')
  })
  it('a completion in the future satisfies through that day', () => {
    expect(nextDueDate(chore({ kind: 'daily' }), done('2026-10-09'))).toBe('2026-10-10')
  })
})

describe('everyNDays', () => {
  it('n = 1 is due every day after the last completion', () => {
    const c = chore({ kind: 'everyNDays', n: 1 })
    expect(nextDueDate(c, [])).toBe('2026-10-06')
    expect(nextDueDate(c, done('2026-10-06'))).toBe('2026-10-07')
    expect(nextDueDate(c, done('2026-10-06', '2026-10-10'))).toBe('2026-10-11')
  })
  it('large n crosses year and leap boundaries', () => {
    expect(nextDueDate(chore({ kind: 'everyNDays', n: 365 }), done('2026-10-06'))).toBe('2027-10-06')
    expect(nextDueDate(chore({ kind: 'everyNDays', n: 365 }, '2028-01-01'), done('2028-01-01'))).toBe('2028-12-31')
    expect(nextDueDate(chore({ kind: 'everyNDays', n: 366 }, '2028-01-01'), done('2028-01-01'))).toBe('2029-01-01')
    const due = nextDueDate(chore({ kind: 'everyNDays', n: 1000 }), done('2026-10-06'))
    expect(diffDays('2026-10-06', due)).toBe(1000)
  })
  it('counts n days over month ends and a leap Feb', () => {
    const c = chore({ kind: 'everyNDays', n: 3 }, '2028-02-27')
    expect(nextDueDate(c, done('2028-02-27'))).toBe('2028-03-01')
    expect(nextDueDate(chore({ kind: 'everyNDays', n: 3 }, '2026-02-27'), done('2026-02-27'))).toBe('2026-03-02')
    expect(nextDueDate(chore({ kind: 'everyNDays', n: 2 }, '2026-12-31'), done('2026-12-31'))).toBe('2027-01-02')
  })
  it('late completion resets the interval from the completion day', () => {
    const c = chore({ kind: 'everyNDays', n: 3 })
    expect(nextDueDate(c, done('2026-10-06', '2026-10-20'))).toBe('2026-10-23')
  })
  it('an early completion from halfway on resets from the completion day', () => {
    const c = chore({ kind: 'everyNDays', n: 7 }) // done 10-06, due 10-13, halfway is 10-10
    expect(nextDueDate(c, done('2026-10-06', '2026-10-10'))).toBe('2026-10-17')
  })
  it('a completion before halfway is a repeat and changes nothing', () => {
    const c = chore({ kind: 'everyNDays', n: 7 })
    expect(nextDueDate(c, done('2026-10-06', '2026-10-08'))).toBe('2026-10-13')
    expect(nextDueDate(c, done('2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'))).toBe('2026-10-13')
  })
  it('an every-60-days chore tapped every day counts once (audit repro)', () => {
    const c = chore({ kind: 'everyNDays', n: 60 }, '2026-10-01')
    const counted: Completion[] = []
    for (let d = 1; d <= 7; d++) {
      const day = `2026-10-0${d}`
      if (completionCounts(c, counted, day)) counted.push(...done(day).map((x) => ({ ...x, id: day })))
    }
    expect(counted.map((x) => x.completedOn)).toEqual(['2026-10-01'])
    expect(nextDueDate(c, counted)).toBe('2026-11-30')
  })
  it('uses the most recent completion regardless of input order and duplicates', () => {
    const c = chore({ kind: 'everyNDays', n: 3 })
    expect(nextDueDate(c, done('2026-10-09', '2026-10-06'))).toBe('2026-10-12')
    expect(nextDueDate(c, done('2026-10-09', '2026-10-09', '2026-10-06'))).toBe('2026-10-12')
    expect(nextDueDate(c, done('2026-10-06', '2026-10-09', '2026-10-07'))).toBe('2026-10-12')
  })
  it('n of 0 or negative is treated as 1', () => {
    expect(nextDueDate(chore({ kind: 'everyNDays', n: 0 }), done('2026-10-06'))).toBe('2026-10-07')
    expect(nextDueDate(chore({ kind: 'everyNDays', n: -5 }), done('2026-10-06'))).toBe('2026-10-07')
  })
  it('ignores completions for other chores', () => {
    const c = chore({ kind: 'everyNDays', n: 3 })
    const other: Completion[] = [{ id: 'z', choreId: 'other', completedAt: '2026-10-20T12:00:00Z', completedOn: '2026-10-20' }]
    expect(nextDueDate(c, other)).toBe('2026-10-07')
  })
  it('a new one is first due halfway through its first interval, then overdue by the days since', () => {
    const c = chore({ kind: 'everyNDays', n: 3 }) // created 10-06: due 10-07
    expect(choreStatus(c, [], '2026-10-06').state).toBe('upcoming')
    expect(choreStatus(c, [], '2026-10-07').state).toBe('due')
    const s = choreStatus(c, [], '2026-10-10')
    expect(s.state).toBe('overdue')
    expect(s.overdueDays).toBe(3)
  })
  it('first due dates spread out by N: 1 and 0 today, 2 and 3 tomorrow, 7 in three days, 90 in 45', () => {
    const first = (n: number) => nextDueDate(chore({ kind: 'everyNDays', n }), [])
    expect([1, 2, 3, 7, 90].map(first)).toEqual(['2026-10-06', '2026-10-07', '2026-10-07', '2026-10-09', '2026-11-20'])
    expect(first(0)).toBe('2026-10-06')
  })
  it('doing it on the day it is created counts, and the interval runs from there', () => {
    const c = chore({ kind: 'everyNDays', n: 7 })
    expect(completionCounts(c, [], '2026-10-06')).toBe(true)
    expect(nextDueDate(c, done('2026-10-06'))).toBe('2026-10-13')
  })
  // Edge: a completion dated before the chore existed (e.g. imported data) must not
  // make a brand new chore show up as overdue.
  it('a completion before createdOn never makes the chore due before createdOn', () => {
    const c = chore({ kind: 'everyNDays', n: 3 }) // created 2026-10-06
    const due = nextDueDate(c, done('2026-10-01')) // currently 2026-10-04
    expect(due >= c.createdOn).toBe(true)
  })
})

describe('completions before createdOn', () => {
  it('daily ignores a completion before the creation day', () => {
    expect(nextDueDate(chore({ kind: 'daily' }), done('2026-09-01'))).toBe('2026-10-06')
  })
  it('weekly ignores a completion before the previous scheduled date', () => {
    // Created Tue 10-06, due Sat 10-10, previous Sat is 10-03.
    expect(nextDueDate(chore({ kind: 'weekly', weekday: 6 }), done('2026-10-01'))).toBe('2026-10-10')
  })
  it('monthly ignores a completion before the previous scheduled date', () => {
    expect(nextDueDate(chore({ kind: 'monthly', dayOfMonth: 15 }), done('2026-08-01'))).toBe('2026-10-15')
  })
  // Ambiguity (documented current behaviour): a weekly completion dated after the previous
  // scheduled date but before createdOn is treated as an early completion for the first occurrence.
  it('weekly: a completion between the previous scheduled date and createdOn counts as early (current behaviour)', () => {
    expect(nextDueDate(chore({ kind: 'weekly', weekday: 6 }), done('2026-10-05'))).toBe('2026-10-17')
  })
})

describe('vacations spanning due dates', () => {
  // Daily, completed 10-06 so due 10-07.
  const daily = chore({ kind: 'daily' })
  const c = done('2026-10-06')
  const win = (start: ISODate, end: ISODate): VacationWindow[] => [{ start, end }]

  it('window starts before and ends after the due date, today after the window', () => {
    // Due 10-07 during the vacation, so due on the first day back (10-11); 10-12 is one day late.
    const s = choreStatus(daily, c, '2026-10-12', win('2026-10-05', '2026-10-10'))
    expect(s.dueDate).toBe('2026-10-07')
    expect(s.state).toBe('overdue')
    expect(s.overdueDays).toBe(1)
    expect(choreStatus(daily, c, '2026-10-11', win('2026-10-05', '2026-10-10'))).toMatchObject({ state: 'due', overdueDays: 0 })
  })
  it('window covers the due date and today: nothing is overdue', () => {
    const s = choreStatus(daily, c, '2026-10-15', win('2026-10-05', '2026-10-20'))
    expect(s.overdueDays).toBe(0)
    expect(s.state).not.toBe('overdue')
  })
  it('window ends on today: still zero overdue days; ends the day before: one day', () => {
    expect(choreStatus(daily, c, '2026-10-12', win('2026-10-08', '2026-10-12')).overdueDays).toBe(0)
    expect(choreStatus(daily, c, '2026-10-12', win('2026-10-08', '2026-10-11')).overdueDays).toBe(1)
  })
  it('vacation starting after the due date only excludes its own days', () => {
    // Due 10-07. Days 08 active, 09-10 vacation, 11 active -> 2.
    expect(choreStatus(daily, c, '2026-10-11', win('2026-10-09', '2026-10-10')).overdueDays).toBe(2)
  })
  it('vacation before the due date has no effect', () => {
    expect(choreStatus(daily, c, '2026-10-10', win('2026-09-01', '2026-09-10')).overdueDays).toBe(3)
  })
  it('vacation in the future has no effect', () => {
    expect(choreStatus(daily, c, '2026-10-10', win('2026-10-20', '2026-10-25')).overdueDays).toBe(3)
  })
  it('a one-day vacation on the due day moves it to the next day', () => {
    // Due 10-07 (vacation), so due 10-08: 10-09 and 10-10 are late.
    expect(choreStatus(daily, c, '2026-10-08', win('2026-10-07', '2026-10-07'))).toMatchObject({ state: 'due', overdueDays: 0 })
    expect(choreStatus(daily, c, '2026-10-10', win('2026-10-07', '2026-10-07')).overdueDays).toBe(2)
  })
  it('chore due on the first day of a vacation is due, not late, on the first day back', () => {
    const sat = chore({ kind: 'weekly', weekday: 6 }) // due 10-10
    const v = win('2026-10-10', '2026-10-12')
    expect(choreStatus(sat, [], '2026-10-10', v).state).toBe('due')
    expect(choreStatus(sat, [], '2026-10-11', v).overdueDays).toBe(0)
    expect(choreStatus(sat, [], '2026-10-12', v).overdueDays).toBe(0)
    // 10-13 is the first day back: due, not late. It keeps its scheduled date.
    expect(choreStatus(sat, [], '2026-10-13', v)).toMatchObject({ dueDate: '2026-10-10', state: 'due', overdueDays: 0, neglect: 0 })
    const after = choreStatus(sat, [], '2026-10-14', v)
    expect(after.overdueDays).toBe(1)
    expect(after.state).toBe('overdue')
  })
  it('chore due on the last day of a vacation', () => {
    const sat = chore({ kind: 'weekly', weekday: 6 }) // due 10-10
    const v = win('2026-10-08', '2026-10-10')
    expect(choreStatus(sat, [], '2026-10-10', v).state).toBe('due')
    expect(choreStatus(sat, [], '2026-10-11', v)).toMatchObject({ state: 'due', overdueDays: 0 })
    const next = choreStatus(sat, [], '2026-10-12', v)
    expect(next.overdueDays).toBe(1)
    expect(next.state).toBe('overdue')
  })
  it('two weeks away with a daily chore due on the first day away: due on the first day back (audit repro)', () => {
    const d = chore({ kind: 'daily' }, '2026-09-01')
    const v = win('2026-10-01', '2026-10-14')
    expect(choreStatus(d, done('2026-09-30'), '2026-10-15', v)).toMatchObject({ dueDate: '2026-10-01', state: 'due', overdueDays: 0 })
    expect(choreStatus(d, done('2026-09-30'), '2026-10-16', v)).toMatchObject({ state: 'overdue', overdueDays: 1, neglect: 1 })
  })
  it('a due date in back-to-back vacations moves past all of them', () => {
    const v: VacationWindow[] = [
      { start: '2026-10-09', end: '2026-10-11' },
      { start: '2026-10-07', end: '2026-10-08' },
    ]
    expect(choreStatus(daily, c, '2026-10-12', v)).toMatchObject({ state: 'due', overdueDays: 0 })
    expect(choreStatus(daily, c, '2026-10-13', v).overdueDays).toBe(1)
  })
  it('chore due the day before a vacation is overdue only outside it', () => {
    const sat = chore({ kind: 'weekly', weekday: 6 }) // due 10-10
    const v = win('2026-10-11', '2026-10-14')
    expect(choreStatus(sat, [], '2026-10-14', v).overdueDays).toBe(0)
    expect(choreStatus(sat, [], '2026-10-15', v).overdueDays).toBe(1)
  })
  it('back-to-back windows act as one continuous break', () => {
    const v: VacationWindow[] = [
      { start: '2026-10-08', end: '2026-10-09' },
      { start: '2026-10-10', end: '2026-10-11' },
    ]
    expect(choreStatus(daily, c, '2026-10-13', v).overdueDays).toBe(2) // 12, 13
    expect(choreStatus(daily, c, '2026-10-11', v).overdueDays).toBe(0)
  })
  it('windows separated by one active day count that day', () => {
    const v: VacationWindow[] = [
      { start: '2026-10-08', end: '2026-10-09' },
      { start: '2026-10-11', end: '2026-10-12' },
    ]
    expect(choreStatus(daily, c, '2026-10-13', v).overdueDays).toBe(2) // 10 and 13
  })
  it('overlapping windows are not double counted', () => {
    const v: VacationWindow[] = [
      { start: '2026-10-08', end: '2026-10-10' },
      { start: '2026-10-09', end: '2026-10-11' },
    ]
    expect(choreStatus(daily, c, '2026-10-13', v).overdueDays).toBe(2)
  })
  it('unsorted windows are fine', () => {
    const v: VacationWindow[] = [
      { start: '2026-10-10', end: '2026-10-11' },
      { start: '2026-10-08', end: '2026-10-09' },
    ]
    expect(choreStatus(daily, c, '2026-10-13', v).overdueDays).toBe(2)
  })
  it('vacations never move the due date', () => {
    const sat = chore({ kind: 'weekly', weekday: 6 })
    const s = choreStatus(sat, [], '2026-10-08', win('2026-10-07', '2026-10-20'))
    expect(s.dueDate).toBe('2026-10-10')
    expect(s.state).toBe('upcoming')
  })
  it('a vacation spanning a month end with a clamped monthly chore', () => {
    const m = chore({ kind: 'monthly', dayOfMonth: 31 }, '2027-02-01') // due 2027-02-28
    const v = win('2027-02-27', '2027-03-02')
    const s = choreStatus(m, [], '2027-03-04', v)
    expect(s.dueDate).toBe('2027-02-28')
    expect(s.overdueDays).toBe(1) // due on the first day back (Mar 3), so only Mar 4 is late
  })
  it('a vacation across a leap day', () => {
    const d = chore({ kind: 'daily' }, '2028-02-27')
    const s = choreStatus(d, done('2028-02-27'), '2028-03-02', win('2028-02-29', '2028-02-29'))
    // Due 02-28. After: 02-29 (vacation), 03-01, 03-02 -> 2.
    expect(s.overdueDays).toBe(2)
  })
  it('returns to normal overdue counting after a long vacation is over', () => {
    const everyThree = chore({ kind: 'everyNDays', n: 3 }) // done 10-06 -> due 10-09
    const v = win('2026-10-10', '2026-11-09')
    expect(choreStatus(everyThree, done('2026-10-06'), '2026-11-09', v).overdueDays).toBe(0)
    expect(choreStatus(everyThree, done('2026-10-06'), '2026-11-12', v).overdueDays).toBe(3)
  })
  it('completing during a vacation is allowed and resets the schedule', () => {
    const s = choreStatus(daily, done('2026-10-06', '2026-10-10'), '2026-10-12', win('2026-10-08', '2026-10-11'))
    expect(s.dueDate).toBe('2026-10-11')
    expect(s.state).toBe('due') // 10-11 is a vacation day, so it is due on 10-12, the first day back
    expect(choreStatus(daily, done('2026-10-06', '2026-10-10'), '2026-10-13', win('2026-10-08', '2026-10-11')).overdueDays).toBe(1)
  })
})

describe('a schedule change is not retroactive (since)', () => {
  // Today is Wed 10-07 in these.
  it('a weekly chore done 5 days ago, changed to daily today, is due today, not 4 days late (audit repro)', () => {
    const weekly = chore({ kind: 'weekly', weekday: 5 }, '2026-09-01') // Fridays
    expect(choreStatus(weekly, done('2026-10-02'), '2026-10-07').state).toBe('upcoming')
    // Without since, the old history would make it instantly very late.
    expect(choreStatus({ ...weekly, schedule: { kind: 'daily' } }, done('2026-10-02'), '2026-10-07').neglect).toBe(3)
    const daily = { ...weekly, schedule: { kind: 'daily', since: '2026-10-07' } as Schedule }
    expect(choreStatus(daily, done('2026-10-02'), '2026-10-07')).toMatchObject({ dueDate: '2026-10-07', state: 'due', overdueDays: 0 })
    expect(choreStatus(daily, done('2026-10-02'), '2026-10-08')).toMatchObject({ state: 'due', overdueDays: 0 }) // the first occurrence's grace day
    expect(choreStatus(daily, done('2026-10-02'), '2026-10-09')).toMatchObject({ state: 'overdue', overdueDays: 1 })
  })
  it('a monthly chore created 12 days ago and never done is not late the moment it is edited (audit repro)', () => {
    const monthly = chore({ kind: 'monthly', dayOfMonth: 20 }, '2026-09-25') // due 10-20
    const edited = { ...monthly, schedule: { kind: 'monthly', dayOfMonth: 5, since: '2026-10-07' } as Schedule }
    expect(choreStatus(edited, [], '2026-10-07')).toMatchObject({ dueDate: '2026-11-05', state: 'upcoming' })
    const toDaily = { ...monthly, schedule: { kind: 'daily', since: '2026-10-07' } as Schedule }
    expect(choreStatus(toDaily, [], '2026-10-07')).toMatchObject({ dueDate: '2026-10-07', state: 'due' })
  })
  it('a completion on or after since still satisfies the first occurrence under the new schedule', () => {
    const c = chore({ kind: 'weekly', weekday: 3, since: '2026-10-05' }, '2026-09-01') // Wednesdays from Mon 10-05
    expect(nextDueDate(c, [])).toBe('2026-10-07')
    expect(nextDueDate(c, done('2026-10-05'))).toBe('2026-10-14') // done on the day of the change: early for Wed
    expect(nextDueDate(c, done('2026-10-04'))).toBe('2026-10-07') // before the change: not counted
    expect(completionCounts(c, [], '2026-10-04')).toBe(false)
  })
  it('everyNDays starts over from since, halfway through its first interval', () => {
    const c = chore({ kind: 'everyNDays', n: 7, since: '2026-10-07' }, '2026-09-01')
    expect(nextDueDate(c, done('2026-09-20'))).toBe('2026-10-10')
    expect(nextDueDate(c, done('2026-09-20', '2026-10-07'))).toBe('2026-10-14')
  })
  it('a since before the chore was created changes nothing', () => {
    const c = chore({ kind: 'daily', since: '2026-01-01' })
    expect(nextDueDate(c, [])).toBe('2026-10-06')
    expect(nextDueDate(c, done('2026-10-06'))).toBe('2026-10-07')
  })
})

describe('a new chore is not late the morning after', () => {
  it('a daily chore never done gets one extra day before it is late', () => {
    const c = chore({ kind: 'daily' }) // created and due 10-06
    expect(choreStatus(c, [], '2026-10-06')).toMatchObject({ dueDate: '2026-10-06', state: 'due' })
    expect(choreStatus(c, [], '2026-10-07')).toMatchObject({ dueDate: '2026-10-06', state: 'due', overdueDays: 0 })
    expect(choreStatus(c, [], '2026-10-08')).toMatchObject({ state: 'overdue', overdueDays: 1, neglect: 1 })
  })
  it('only the first occurrence, and only when it is due the day the chore is created', () => {
    const c = chore({ kind: 'daily' })
    expect(choreStatus(c, done('2026-10-06'), '2026-10-08')).toMatchObject({ state: 'overdue', overdueDays: 1 })
    const wed = chore({ kind: 'weekly', weekday: 3 }) // created Tue, due Wed 10-07
    expect(choreStatus(wed, [], '2026-10-08')).toMatchObject({ state: 'overdue', overdueDays: 1 })
    const tue = chore({ kind: 'weekly', weekday: 2 }) // created and due Tue 10-06
    expect(choreStatus(tue, [], '2026-10-07').state).toBe('due')
    expect(choreStatus(tue, [], '2026-10-08').overdueDays).toBe(1)
  })
  it('the grace day and a vacation stack', () => {
    const c = chore({ kind: 'daily' })
    const v: VacationWindow[] = [{ start: '2026-10-07', end: '2026-10-09' }]
    expect(choreStatus(c, [], '2026-10-10', v)).toMatchObject({ state: 'due', overdueDays: 0 })
    expect(choreStatus(c, [], '2026-10-11', v).overdueDays).toBe(1)
  })
})

describe('unknown or malformed schedules', () => {
  const odd = (schedule: unknown) => chore(schedule as Schedule)
  it('an unknown kind from a newer app is treated as daily instead of crashing', () => {
    const c = odd({ kind: 'fortnightly', every: 14 })
    expect(nextDueDate(c, [])).toBe('2026-10-06')
    expect(nextDueDate(c, done('2026-10-06'))).toBe('2026-10-07')
    expect(choreStatus(c, done('2026-10-06'), '2026-10-09')).toMatchObject({ state: 'overdue', overdueDays: 2, neglect: 2 })
    expect(firstOnOrAfter(c.schedule, '2026-10-06')).toBe('2026-10-06')
    expect(lastBefore(c.schedule, '2026-10-06')).toBe('2026-10-05')
    expect(completionCounts(c, [], '2026-10-06')).toBe(true)
  })
  it('missing fields fall back safely', () => {
    expect(nextDueDate(odd({ kind: 'everyNDays' }), done('2026-10-06'))).toBe('2026-10-07')
    expect(nextDueDate(odd({ kind: 'weekdays' }), done('2026-10-06'))).toBe('2026-10-07')
    expect(nextDueDate(odd({ kind: 'monthly' }), [])).toBe('2026-11-01')
  })
})

describe('sameSchedule', () => {
  it('ignores since, weekday order and repeats', () => {
    expect(sameSchedule({ kind: 'daily' }, { kind: 'daily', since: '2026-10-01' })).toBe(true)
    expect(sameSchedule({ kind: 'weekdays', days: [5, 1, 3, 3] }, { kind: 'weekdays', days: [1, 3, 5], since: '2026-10-01' })).toBe(true)
    expect(sameSchedule({ kind: 'everyNDays', n: 3 }, { kind: 'everyNDays', n: 3 })).toBe(true)
  })
  it('tells apart a different kind or detail', () => {
    expect(sameSchedule({ kind: 'daily' }, { kind: 'everyNDays', n: 1 })).toBe(false)
    expect(sameSchedule({ kind: 'everyNDays', n: 3 }, { kind: 'everyNDays', n: 4 })).toBe(false)
    expect(sameSchedule({ kind: 'weekly', weekday: 1 }, { kind: 'weekly', weekday: 2 })).toBe(false)
    expect(sameSchedule({ kind: 'monthly', dayOfMonth: 1 }, { kind: 'monthly', dayOfMonth: 31 })).toBe(false)
    expect(sameSchedule({ kind: 'weekdays', days: [1] }, { kind: 'weekdays', days: [1, 2] })).toBe(false)
  })
})
