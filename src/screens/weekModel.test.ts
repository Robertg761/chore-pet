import { describe, expect, it } from 'vitest'
import type { Chore, Completion } from '../domain/types'
import { petCondition } from '../domain/health'
import { completedPerDay, healthPerDay, weekDays, weekSummary } from './weekModel'

// Health numbers come from the domain's own petCondition, so retuning its curve doesn't break these.

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

  it('counts a chore once per day, even when two devices both ticked it off', () => {
    const days = weekDays(TODAY)
    const twice = [done('a', '2026-10-07'), { ...done('a', '2026-10-07'), id: 'a-again' }, done('b', '2026-10-07')]
    expect(completedPerDay(twice, days)).toEqual([0, 0, 0, 0, 0, 0, 2])
  })
})

describe('healthPerDay', () => {
  const days = weekDays(TODAY)

  it('is full health with nothing to do', () => {
    expect(healthPerDay([], [], [], days).map((d) => d.health)).toEqual([100, 100, 100, 100, 100, 100, 100])
  })

  it('replays only what was true by each day', () => {
    // Created 10-01, never done: it only ever gets later, so health only ever drops.
    const a = chore('a', '2026-10-01')
    const result = healthPerDay([a], [], [], days)
    expect(result[0].health).toBe(100) // due that day, not overdue yet
    result.forEach((d) => expect(d.health).toBe(petCondition([a], [], d.date).health))
    for (let i = 1; i < result.length; i++) expect(result[i].health).toBeLessThanOrEqual(result[i - 1].health)
    expect(result[6].health).toBeLessThan(100)
  })

  it('keeps past days as they were when a chore is edited today', () => {
    // Daily since 10-01 and never done, then switched to weekly today.
    const before = healthPerDay([chore('a', '2026-10-01')], [], [], days)
    const edited: Chore = { ...chore('a', '2026-10-01'), schedule: { kind: 'weekly', weekday: 3, since: TODAY, before: { kind: 'daily' } } }
    const after = healthPerDay([edited], [], [], days)
    expect(after.slice(0, 6).map((d) => d.health)).toEqual(before.slice(0, 6).map((d) => d.health))
    expect(after[5].health).toBeLessThan(100)
  })

  it('ignores completions made after a day and chores created after it', () => {
    const chores = [chore('a', '2026-10-01'), chore('late', '2026-10-06')]
    const completions = [done('a', '2026-10-05'), done('a', '2026-10-06'), done('a', '2026-10-07')]
    const result = healthPerDay(chores, completions, [], days)
    // 10-04: chore a was never done yet; completions from 10-05 on don't exist yet, nor does chore 'late'.
    expect(result[3].health).toBe(petCondition([chores[0]], [], '2026-10-04').health)
    expect(result[3].health).toBeLessThan(100)
    // The same day with every completion would look healthier, so it was not used.
    expect(petCondition(chores, completions, '2026-10-04').health).toBeGreaterThan(result[3].health)
    // On 10-05 chore a was just done and the other chore did not exist yet.
    expect(result[4].health).toBe(100)
  })

  it('does not count a chore before it was created', () => {
    const fresh = chore('new', '2026-10-01')
    const result = healthPerDay([{ ...fresh, createdOn: '2026-10-06' }], [], [], days)
    expect(result.slice(0, 5).map((d) => d.health)).toEqual([100, 100, 100, 100, 100])
    // Had it existed all week, it would already be costing health by 10-05.
    expect(petCondition([fresh], [], '2026-10-05').health).toBeLessThan(100)
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
    const quiet = "A quiet week. I'm here whenever you're ready."
    expect(weekSummary(days, [0, 0, 0, 0, 0, 0, 0], []).line).toBe(quiet)
    expect(weekSummary(days, [0, 1, 0, 0, 0, 0, 0], []).line).toBe(quiet)
  })

  it('treats a week away as rest', () => {
    const s = weekSummary(days, [0, 0, 0, 0, 0, 0, 0], [{ start: '2026-09-20', end: '2026-10-20' }])
    expect(s.line).toBe('A week away. Your pet was resting.')
  })
})

describe('sample history and personal work', () => {
  it('excludes seed work before deduplication and still counts legacy genuine completions', () => {
    const completions = [
      { ...done('a', '2026-10-01'), counts: false },
      { ...done('b', TODAY), counts: false },
      { ...done('b', TODAY), id: 'real-b', counts: true },
      done('c', TODAY),
    ]
    expect(completedPerDay(completions, weekDays(TODAY))).toEqual([0, 0, 0, 0, 0, 0, 2])
  })
  it('retains seeded completions for the sample health replay', () => {
    const days = weekDays(TODAY)
    const chores = [chore('a', '2026-10-01')]
    const completions = days.map(d => ({ ...done('a', d.date), counts: false }))
    expect(completedPerDay(completions, days)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(healthPerDay(chores, completions, [], days).map(d => d.health)).toEqual([100, 100, 100, 100, 100, 100, 100])
  })
})
