import { describe, expect, it } from 'vitest'
import {
  addWindow,
  endEarly,
  formatRange,
  formatShortDate,
  mergeWindows,
  removeWindow,
  sortWindows,
  splitVacations,
  validateRange,
  earliestStart,
} from './vacationModel'

const today = '2026-10-06'

describe('formatShortDate', () => {
  it('omits the current year', () => {
    expect(formatShortDate('2026-10-14', today)).toBe('14 Oct')
    expect(formatShortDate('2026-01-02', today)).toBe('2 Jan')
  })
  it('adds the year for other years', () => {
    expect(formatShortDate('2027-01-02', today)).toBe('2 Jan 2027')
  })
  it('formats ranges', () => {
    expect(formatRange({ start: '2026-10-14', end: '2026-10-20' }, today)).toBe('14 Oct to 20 Oct')
    expect(formatRange({ start: '2026-10-14', end: '2026-10-14' }, today)).toBe('14 Oct')
  })
})

describe('validateRange', () => {
  it('accepts today to a week away', () => {
    expect(validateRange('2026-10-06', '2026-10-13', today)).toEqual({})
  })
  it('accepts a single day', () => {
    expect(validateRange('2026-10-08', '2026-10-08', today)).toEqual({})
  })
  it('rejects an end before the start', () => {
    expect(validateRange('2026-10-10', '2026-10-09', today).end).toBeTruthy()
  })
  it('accepts a start up to 2 weeks back, for "I was away"', () => {
    expect(validateRange('2026-09-22', '2026-10-03', today)).toEqual({})
    expect(earliestStart(today)).toBe('2026-09-22')
  })
  it('rejects a start further back than that', () => {
    expect(validateRange('2026-09-21', '2026-10-03', today).start).toBe('Pick a date up to 2 weeks back, or one coming up.')
  })
  it('rejects empty dates', () => {
    const e = validateRange('', '', today)
    expect(e.start).toBeTruthy()
    expect(e.end).toBeTruthy()
  })
})

describe('mergeWindows', () => {
  it('sorts by start', () => {
    const out = sortWindows([
      { start: '2026-12-01', end: '2026-12-02' },
      { start: '2026-10-01', end: '2026-10-02' },
    ])
    expect(out.map((w) => w.start)).toEqual(['2026-10-01', '2026-12-01'])
  })
  it('merges overlapping windows', () => {
    expect(
      mergeWindows([
        { start: '2026-10-10', end: '2026-10-15' },
        { start: '2026-10-12', end: '2026-10-20' },
      ]),
    ).toEqual([{ start: '2026-10-10', end: '2026-10-20' }])
  })
  it('merges touching windows (next day)', () => {
    expect(
      mergeWindows([
        { start: '2026-10-10', end: '2026-10-15' },
        { start: '2026-10-16', end: '2026-10-20' },
      ]),
    ).toEqual([{ start: '2026-10-10', end: '2026-10-20' }])
  })
  it('keeps a gap of a full day apart', () => {
    expect(
      mergeWindows([
        { start: '2026-10-10', end: '2026-10-15' },
        { start: '2026-10-17', end: '2026-10-20' },
      ]),
    ).toHaveLength(2)
  })
  it('swallows a window fully inside another', () => {
    expect(
      mergeWindows([
        { start: '2026-10-10', end: '2026-10-30' },
        { start: '2026-10-12', end: '2026-10-14' },
      ]),
    ).toEqual([{ start: '2026-10-10', end: '2026-10-30' }])
  })
  it('does not mutate its input', () => {
    const input = [
      { start: '2026-10-10', end: '2026-10-15' },
      { start: '2026-10-12', end: '2026-10-20' },
    ]
    mergeWindows(input)
    expect(input[0].end).toBe('2026-10-15')
  })
})

describe('addWindow', () => {
  it('keeps past windows and merges the new one', () => {
    const past = { start: '2026-08-01', end: '2026-08-10' }
    const out = addWindow([past, { start: '2026-10-10', end: '2026-10-12' }], { start: '2026-10-13', end: '2026-10-14' })
    expect(out).toEqual([past, { start: '2026-10-10', end: '2026-10-14' }])
  })
})

describe('removeWindow and endEarly', () => {
  const running = { start: '2026-10-04', end: '2026-10-10' }
  const past = { start: '2026-08-01', end: '2026-08-10' }
  it('removes only the matching window', () => {
    expect(removeWindow([past, running], running)).toEqual([past])
  })
  it('ends a running vacation yesterday', () => {
    expect(endEarly([past, running], running, today)).toEqual([past, { start: '2026-10-04', end: '2026-10-05' }])
  })
  it('removes a vacation that started today', () => {
    const w = { start: today, end: '2026-10-09' }
    expect(endEarly([past, w], w, today)).toEqual([past])
  })
})

describe('splitVacations', () => {
  it('splits into current, upcoming (soonest first) and past (latest first)', () => {
    const list = [
      { start: '2026-12-01', end: '2026-12-05' },
      { start: '2026-08-01', end: '2026-08-05' },
      { start: '2026-10-05', end: '2026-10-08' },
      { start: '2026-10-20', end: '2026-10-22' },
      { start: '2026-06-01', end: '2026-06-05' },
    ]
    const g = splitVacations(list, today)
    expect(g.current).toEqual({ start: '2026-10-05', end: '2026-10-08' })
    expect(g.upcoming.map((w) => w.start)).toEqual(['2026-10-20', '2026-12-01'])
    expect(g.past.map((w) => w.start)).toEqual(['2026-08-01', '2026-06-01'])
  })
  it('has no current when away nowhere', () => {
    expect(splitVacations([], today).current).toBeNull()
  })
  it('counts a vacation ending today as current', () => {
    expect(splitVacations([{ start: '2026-10-01', end: today }], today).current).not.toBeNull()
  })
})
