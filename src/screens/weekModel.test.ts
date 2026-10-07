import { describe, expect, it } from 'vitest'
import type { Chore, Completion } from '../domain/types'
import { completedPerDay, healthPerDay, weekDays, weekSummary } from './weekModel'

// 2026-10-07 is a Wednesday.
const TODAY = '2026-10-07'

const chore = (id: string, createdOn: string): Chore => ({
  id,
  homeId: 'h',
  objectId: null,
  name: id,
  schedule: { kind: 'daily' },
  createdOn,
  photoProof: false,
})
const done = (choreId: string, on: string): Completion => ({
  id: `${choreId}-${on}`,
  choreId,
  completedAt: `${on}T10:00:00.000Z`,
  completedOn: on,
})

describe('weekDays', () => {
  it('gives seven days ending today, oldest first, with labels', () => {
    const days = weekDays(TODAY)
    expect(days).toHaveLength(7)
    expect(days[0].date).toBe('2026-10-01')
    expect(days[6].date).toBe(TODAY)
    expect(days.map((d) => d.label)).toEqual(['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'])
    expect(days[2].long).toBe('Saturday')
    expect(days.filter((d) => d.isToday).map((d) => d.date)).toEqual([TODAY])
  })

  it('crosses month and year ends', () => {
    expect(weekDays('2027-01-02').map((d) => d.date)).toEqual([
      '2026-12-27',
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })
})

describe('completedPerDay', () => {
  it('counts completions per day and ignores days outside the week', () => {
    const days = weekDays(TODAY)
    const completions = [
      done('a', '2026-10-01'),
      done('b', '2026-10-01'),
      done('a', '2026-10-07'),
      done('a', '2026-09-30'),
      done('a', '2026-10-08'),
    ]
    expect(completedPerDay(completions, days)).toEqual([2, 0, 0, 0, 0, 0, 1])
  })
})

describe('healthPerDay', () => {
  const days = weekDays(TODAY)

  it('is full health with nothing to do', () => {
    expect(healthPerDay([], [], [], days).map((d) => d.health)).toEqual([100, 100, 100, 100, 100, 100, 100])
  })

  it('replays only what was true by each day', () => {
    // Created 10-01, never done: overdue grows each day after it is due.
    const result = healthPerDay([chore('a', '2026-10-01')], [], [], days)
    expect(result[0].health).toBe(100) // due that day, not overdue yet
    expect(result[1].health).toBe(94) // 1 day overdue (level 1)
    expect(result[2].health).toBe(85) // 2 days overdue (level 2)
    expect(result[6].health).toBeLessThan(result[2].health)
  })

  it('ignores completions made after a day and chores created after it', () => {
    const chores = [chore('a', '2026-10-01'), chore('late', '2026-10-06')]
    const completions = [done('a', '2026-10-05'), done('a', '2026-10-06'), done('a', '2026-10-07')]
    const result = healthPerDay(chores, completions, [], days)
    // 10-03: chore a is 2 days overdue, completions from 10-05 on don't exist yet.
    expect(result[2].health).toBe(85)
    // The same day with every completion would look healthier, so it was not used.
    const naive = healthPerDay([chore('a', '2026-10-01')], [done('a', '2026-10-02')], [], days)
    expect(naive[2].health).toBeGreaterThan(result[2].health)
    // On 10-05 chore a was just done and the other chore did not exist yet.
    expect(result[4].health).toBe(100)
  })

  it('does not count a chore before it was created', () => {
    const result = healthPerDay([chore('new', '2026-10-06')], [], [], days)
    expect(result.slice(0, 5).map((d) => d.health)).toEqual([100, 100, 100, 100, 100])
    expect(result[6].health).toBe(94)
  })

  it('flags vacation days and stops overdue counting during them', () => {
    const vacations = [{ start: '2026-10-03', end: '2026-10-05' }]
    const result = healthPerDay([chore('a', '2026-10-01')], [], vacations, days)
    expect(result.map((d) => d.away)).toEqual([false, false, true, true, true, false, false])
    // Overdue days do not grow across the break.
    expect(result[4].health).toBe(result[1].health)
  })
})

describe('weekSummary', () => {
  const days = weekDays(TODAY)

  it('names the total and best day', () => {
    const s = weekSummary(days, [1, 0, 5, 2, 1, 2, 1], [])
    expect(s.total).toBe(12)
    expect(s.bestDay?.long).toBe('Saturday')
    expect(s.bestCount).toBe(5)
    expect(s.line).toBe('12 chores this week. Your best day was Saturday.')
  })

  it('picks the most recent day on a tie', () => {
    const s = weekSummary(days, [3, 0, 0, 0, 0, 0, 3], [])
    expect(s.bestDay?.date).toBe(TODAY)
  })

  it('is kind on quiet weeks', () => {
    const quiet = 'A quiet week. Even one chore makes a difference.'
    expect(weekSummary(days, [0, 0, 0, 0, 0, 0, 0], []).line).toBe(quiet)
    expect(weekSummary(days, [0, 1, 0, 0, 0, 0, 0], []).line).toBe(quiet)
  })

  it('treats a week away as rest', () => {
    const s = weekSummary(days, [0, 0, 0, 0, 0, 0, 0], [{ start: '2026-09-20', end: '2026-10-20' }])
    expect(s.line).toBe('A week away. Your pet was resting.')
  })
})
