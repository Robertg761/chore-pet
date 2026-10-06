import { describe, expect, it } from 'vitest'
import { activeDaysBetween, addDays, daysInMonth, diffDays, isInVacation, toISODate, weekdayOf } from './dates'

describe('daysInMonth', () => {
  it('handles February in century, 400-year, leap and common years', () => {
    expect(daysInMonth(1900, 2)).toBe(28) // divisible by 100, not 400
    expect(daysInMonth(2000, 2)).toBe(29) // divisible by 400
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2027, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
  })
  it('knows 30 and 31 day months, including January and December', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 6)).toBe(30)
    expect(daysInMonth(2026, 9)).toBe(30)
    expect(daysInMonth(2026, 11)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })
})

describe('addDays', () => {
  it('rolls over month, year and leap day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('1900-02-28', 1)).toBe('1900-03-01')
    expect(addDays('2000-02-28', 1)).toBe('2000-02-29')
  })
  it('adding zero is a no-op and large offsets work', () => {
    expect(addDays('2026-10-06', 0)).toBe('2026-10-06')
    expect(addDays('2026-10-06', 365)).toBe('2027-10-06')
    expect(addDays('2028-01-01', 366)).toBe('2029-01-01')
    expect(addDays('2026-10-06', -278)).toBe('2026-01-01')
  })
  it('never shifts across daylight saving changes (US, EU, southern hemisphere)', () => {
    // US: 2026-03-08 spring forward, 2026-11-01 fall back.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    // EU: 2026-03-29 and 2026-10-25.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    // Southern hemisphere: 2026-04-05 and 2026-10-04.
    expect(addDays('2026-04-04', 1)).toBe('2026-04-05')
    expect(addDays('2026-10-03', 2)).toBe('2026-10-05')
    // Spans containing a change are still whole days.
    expect(addDays('2026-03-01', 14)).toBe('2026-03-15')
    expect(addDays('2026-10-25', 14)).toBe('2026-11-08')
  })
  it('walking day by day over a year visits every date exactly once', () => {
    const seen = new Set<string>()
    let d = '2026-01-01'
    for (let i = 0; i < 365; i++) {
      seen.add(d)
      d = addDays(d, 1)
    }
    expect(seen.size).toBe(365)
    expect(d).toBe('2027-01-01')
  })
})

describe('diffDays', () => {
  it('is signed and zero for the same date', () => {
    expect(diffDays('2026-10-06', '2026-10-06')).toBe(0)
    expect(diffDays('2026-10-06', '2026-10-09')).toBe(3)
    expect(diffDays('2026-10-09', '2026-10-06')).toBe(-3)
  })
  it('counts whole days across DST changes', () => {
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2)
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2)
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2)
    expect(diffDays('2026-01-01', '2026-12-31')).toBe(364)
  })
  it('counts leap days', () => {
    expect(diffDays('2028-02-28', '2028-03-01')).toBe(2)
    expect(diffDays('2026-02-28', '2026-03-01')).toBe(1)
    expect(diffDays('2028-01-01', '2029-01-01')).toBe(366)
    expect(diffDays('2027-01-01', '2028-01-01')).toBe(365)
  })
  it('is the inverse of addDays', () => {
    for (const n of [-400, -31, -1, 0, 1, 28, 29, 30, 31, 365, 1000]) {
      expect(diffDays('2026-10-06', addDays('2026-10-06', n))).toBe(n)
    }
  })
})

describe('weekdayOf and toISODate', () => {
  it('knows weekdays around the reference date', () => {
    expect(weekdayOf('2026-10-04')).toBe(0) // Sunday
    expect(weekdayOf('2026-10-05')).toBe(1)
    expect(weekdayOf('2026-10-06')).toBe(2)
    expect(weekdayOf('2026-10-10')).toBe(6)
  })
  it('knows the leap day weekday', () => {
    expect(weekdayOf('2028-02-29')).toBe(2) // Tuesday
  })
  it('formats a local date with zero padding', () => {
    expect(toISODate(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
    expect(toISODate(new Date(2028, 1, 29, 0, 0))).toBe('2028-02-29')
  })
})

describe('isInVacation', () => {
  const v = [{ start: '2026-10-08', end: '2026-10-10' }]
  it('is inclusive of start and end', () => {
    expect(isInVacation('2026-10-07', v)).toBe(false)
    expect(isInVacation('2026-10-08', v)).toBe(true)
    expect(isInVacation('2026-10-09', v)).toBe(true)
    expect(isInVacation('2026-10-10', v)).toBe(true)
    expect(isInVacation('2026-10-11', v)).toBe(false)
  })
  it('handles no windows, single day windows and multiple windows', () => {
    expect(isInVacation('2026-10-08', [])).toBe(false)
    expect(isInVacation('2026-10-08', [{ start: '2026-10-08', end: '2026-10-08' }])).toBe(true)
    expect(isInVacation('2026-11-01', [...v, { start: '2026-11-01', end: '2026-11-03' }])).toBe(true)
  })
  it('an inverted window (end before start) matches nothing', () => {
    expect(isInVacation('2026-10-09', [{ start: '2026-10-10', end: '2026-10-08' }])).toBe(false)
  })
})

describe('activeDaysBetween', () => {
  it('counts days strictly after from, up to and including to', () => {
    expect(activeDaysBetween('2026-10-06', '2026-10-09', [])).toBe(3)
    expect(activeDaysBetween('2026-10-06', '2026-10-07', [])).toBe(1)
  })
  it('is zero when from equals or is after to', () => {
    expect(activeDaysBetween('2026-10-06', '2026-10-06', [])).toBe(0)
    expect(activeDaysBetween('2026-10-09', '2026-10-06', [])).toBe(0)
  })
  it('subtracts vacation days, including partial overlap with the range', () => {
    // Range days: 07..12 (6). Vacation 05..08 only overlaps 07, 08.
    expect(activeDaysBetween('2026-10-06', '2026-10-12', [{ start: '2026-10-05', end: '2026-10-08' }])).toBe(4)
    // Vacation 11..20 overlaps 11, 12.
    expect(activeDaysBetween('2026-10-06', '2026-10-12', [{ start: '2026-10-11', end: '2026-10-20' }])).toBe(4)
  })
  it('does not count the from day even when the vacation starts on it', () => {
    expect(activeDaysBetween('2026-10-06', '2026-10-08', [{ start: '2026-10-06', end: '2026-10-06' }])).toBe(2)
  })
  it('is zero when a vacation covers the whole range', () => {
    expect(activeDaysBetween('2026-10-06', '2026-10-12', [{ start: '2026-10-01', end: '2026-10-30' }])).toBe(0)
  })
  it('ignores vacations outside the range', () => {
    expect(activeDaysBetween('2026-10-06', '2026-10-12', [{ start: '2026-09-01', end: '2026-09-30' }, { start: '2026-11-01', end: '2026-11-05' }])).toBe(6)
  })
  it('does not double count overlapping or duplicate vacations', () => {
    const overlapping = [
      { start: '2026-10-08', end: '2026-10-10' },
      { start: '2026-10-09', end: '2026-10-11' },
    ]
    // Range 07..12 minus 08..11 (4 distinct days) = 2.
    expect(activeDaysBetween('2026-10-06', '2026-10-12', overlapping)).toBe(2)
    const dup = [overlapping[0], overlapping[0]]
    expect(activeDaysBetween('2026-10-06', '2026-10-12', dup)).toBe(3)
    // One window nested inside another.
    const nested = [
      { start: '2026-10-08', end: '2026-10-11' },
      { start: '2026-10-09', end: '2026-10-10' },
    ]
    expect(activeDaysBetween('2026-10-06', '2026-10-12', nested)).toBe(2)
  })
  it('handles back-to-back windows as one continuous break', () => {
    const w = [
      { start: '2026-10-08', end: '2026-10-09' },
      { start: '2026-10-10', end: '2026-10-11' },
    ]
    expect(activeDaysBetween('2026-10-06', '2026-10-13', w)).toBe(3) // 07, 12, 13
  })
  it('works across month ends, leap days and DST changes', () => {
    expect(activeDaysBetween('2028-02-27', '2028-03-02', [])).toBe(4) // 28, 29, 01, 02
    expect(activeDaysBetween('2026-02-27', '2026-03-02', [])).toBe(3) // 28, 01, 02
    expect(activeDaysBetween('2026-03-06', '2026-03-10', [{ start: '2026-03-08', end: '2026-03-08' }])).toBe(3)
    expect(activeDaysBetween('2026-12-30', '2027-01-02', [])).toBe(3)
  })
})
