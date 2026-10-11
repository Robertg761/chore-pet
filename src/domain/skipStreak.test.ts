import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { choreStatus } from './schedule'
import type { Chore, Completion, ISODate, Schedule } from './types'
import { currentStreak, streakHistory } from './unlocks'

// 2026-10-06 is a Tuesday. 2026-09-21, 09-28 and 10-05 are Mondays.
const TODAY = '2026-10-06'

const chore = (id: string, schedule: Schedule, createdOn: ISODate): Chore => ({ id, homeId: 'h', objectId: null, name: id, schedule, createdOn, photoProof: false })
const daily = (id: string, createdOn: ISODate, skips: ISODate[] = []): Chore => chore(id, { kind: 'daily', skips }, createdOn)
const range = (from: ISODate, to: ISODate): ISODate[] => {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
/** Real completions (they count) on the given days. */
const done = (choreId: string, ...dates: ISODate[]): Completion[] => dates.map((d) => ({ id: `${choreId}-${d}`, choreId, completedAt: '', completedOn: d }))
const doneBetween = (choreId: string, from: ISODate, to: ISODate): Completion[] => done(choreId, ...range(from, to))
/** Seeded sample history: settles a round like a completion, but never counts. */
const seeded = (choreId: string, ...dates: ISODate[]): Completion[] => dates.map((d) => ({ id: `${choreId}-${d}-seed`, choreId, completedAt: '', completedOn: d, counts: false }))

describe('a paused day: every owed chore skipped, nothing done', () => {
  it('adds nothing to the streak', () => {
    const c = [daily('A', '2026-10-01', ['2026-10-03'])]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-02'), ...doneBetween('A', '2026-10-04', '2026-10-05')]
    // Judged on the skipped day itself: still 2, not 3.
    expect(currentStreak(c, comps, '2026-10-03')).toBe(2)
    expect(currentStreak(c, comps, '2026-10-05')).toBe(4)
  })

  it('does not break a streak that has no rest token banked', () => {
    const c = [daily('A', '2026-10-01', ['2026-10-03'])]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-02'), ...doneBetween('A', '2026-10-04', TODAY)]
    // Without the skip, 10-03 would be a miss with no token and the run would restart at 3.
    expect(currentStreak(c, comps, TODAY)).toBe(5)
  })

  it('does not spend a rest token', () => {
    // 10-01..10-07 are seven counted days: one token. 10-08 is paused, 10-09 is missed and the token covers it.
    const c = [daily('A', '2026-10-01', ['2026-10-08'])]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-07'), ...done('A', '2026-10-10')]
    // If the pause had spent the token, 10-09 would break the run and today would give 1.
    expect(currentStreak(c, comps, '2026-10-10')).toBe(8)
  })

  it('banks nothing toward the next rest token', () => {
    // Six counted days, then 24 paused days, then a miss on 10-01. Pausing is not counting, so no token exists and the miss breaks the run.
    const c = [daily('A', '2026-09-01', range('2026-09-07', '2026-09-30'))]
    const comps = [...doneBetween('A', '2026-09-01', '2026-09-06'), ...doneBetween('A', '2026-10-02', TODAY)]
    // 10-02 .. 10-06 is five counted days. If pauses banked a token, 10-01 would be covered and this would be 11.
    expect(currentStreak(c, comps, TODAY)).toBe(5)
  })

  it('keeps the streak flat when everything owed is skipped every day', () => {
    expect(currentStreak([daily('A', '2026-10-01', range('2026-10-01', TODAY))], [], TODAY)).toBe(0)
    const c = [daily('A', '2026-10-01', range('2026-10-04', TODAY))]
    const comps = doneBetween('A', '2026-10-01', '2026-10-03')
    expect(currentStreak(c, comps, '2026-10-04')).toBe(3)
    expect(currentStreak(c, comps, TODAY)).toBe(3)
  })

  it('is bridged by bestStreak, so a run continues across a paused stretch', () => {
    const c = [daily('A', '2026-10-01', ['2026-10-06', '2026-10-07'])]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-05'), ...doneBetween('A', '2026-10-08', '2026-10-10')]
    expect(streakHistory(c, comps, '2026-10-10')).toEqual({ currentStreak: 8, bestStreak: 8 })
  })
})

describe('a day with some owed chores skipped and one really done', () => {
  it('counts normally', () => {
    // A is skipped on 10-03 while B is done. The day counts, so the streak reaches 4, not the 3 a paused day would give.
    const c = [daily('A', '2026-10-01', ['2026-10-03']), daily('B', '2026-10-01')]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-02'), ...done('A', '2026-10-04'), ...doneBetween('B', '2026-10-01', '2026-10-04')]
    expect(currentStreak(c, comps, '2026-10-04')).toBe(4)
  })

  it('banks toward a rest token like any counted day', () => {
    // 10-01..10-07 each have something done (A skipped on 10-03, B done every day): seven counted days bank one token.
    // 10-08 is missed and spends it, and 10-09 counts again.
    const c = [daily('A', '2026-10-01', ['2026-10-03']), daily('B', '2026-10-01')]
    const comps = [
      ...doneBetween('A', '2026-10-01', '2026-10-02'),
      ...doneBetween('A', '2026-10-04', '2026-10-07'),
      ...doneBetween('B', '2026-10-01', '2026-10-07'),
      ...done('A', '2026-10-09'),
      ...done('B', '2026-10-09'),
    ]
    // If 10-03 were paused, only six counted days would bank no token and 10-08 would break the run: 1.
    expect(currentStreak(c, comps, '2026-10-09')).toBe(8)
  })
})

describe('a day with an owed chore neither done nor skipped', () => {
  it('is missed, and breaks a streak that has no rest token', () => {
    // A is skipped on 10-03 but B is neither done nor skipped, and nothing was done: missed. Only 10-04 counts after it.
    const c = [daily('A', '2026-10-01', ['2026-10-03']), daily('B', '2026-10-01')]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-02'), ...done('A', '2026-10-04'), ...doneBetween('B', '2026-10-01', '2026-10-02'), ...done('B', '2026-10-04')]
    expect(currentStreak(c, comps, '2026-10-04')).toBe(1)
  })

  it('spends a rest token when one is banked', () => {
    // Seven counted days bank a token. 10-08: A skipped, B left undone, so missed and the token is spent. 10-09 counts.
    const c = [daily('A', '2026-10-01', ['2026-10-08']), daily('B', '2026-10-01')]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-07'), ...doneBetween('B', '2026-10-01', '2026-10-07'), ...done('A', '2026-10-09'), ...done('B', '2026-10-09')]
    expect(currentStreak(c, comps, '2026-10-09')).toBe(8)
  })
})

describe('neglect level 2 still fails the day', () => {
  it('fails the day even when another owed chore was done and the rest skipped', () => {
    // On 10-04 A is skipped and C is done, but B (last done 10-01, due 10-02) is two days late: level 2, so missed.
    const c = [daily('A', '2026-10-01', ['2026-10-04']), daily('B', '2026-10-01'), daily('C', '2026-10-01')]
    const comps = [
      ...doneBetween('A', '2026-10-01', '2026-10-03'),
      ...doneBetween('A', '2026-10-05', TODAY),
      ...done('B', '2026-10-01', '2026-10-05', '2026-10-06'),
      ...doneBetween('C', '2026-10-01', TODAY),
    ]
    // 10-01..10-03 count (3), 10-04 is missed, 10-05 and 10-06 count (2).
    expect(currentStreak(c, comps, TODAY)).toBe(2)
  })

  it('fails the day when a neglected chore is the only one not skipped', () => {
    // A is skipped on 10-04 and B is left at level 2: missed, though nothing else was left undone.
    const c = [daily('A', '2026-10-01', ['2026-10-04']), daily('B', '2026-10-01')]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-03'), ...done('A', '2026-10-05'), ...done('B', '2026-10-01', '2026-10-05')]
    expect(currentStreak(c, comps, '2026-10-05')).toBe(1)
  })

  it('does not fail a chore that a skip settled that day', () => {
    // B was last done 10-01. Skipping it on 10-04, its level-2 day, settles the round, so it is not neglected that day.
    // A and B are both skipped on 10-04, so the day is paused and the run carries on to 4.
    const c = [daily('A', '2026-10-01', ['2026-10-04']), daily('B', '2026-10-01', ['2026-10-04'])]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-03'), ...done('A', '2026-10-05'), ...done('B', '2026-10-01', '2026-10-05')]
    // Without the skip on B, 10-04 would be level 2 and break the run, leaving 1.
    expect(currentStreak(c, comps, '2026-10-05')).toBe(4)
  })
})

describe('today', () => {
  it('a fully skipped today keeps the current streak, and does not add to it', () => {
    const c = [daily('A', '2026-10-01', [TODAY])]
    const comps = doneBetween('A', '2026-10-01', '2026-10-05')
    expect(currentStreak(c, comps, TODAY)).toBe(5)
    expect(currentStreak(c, [...comps, ...done('A', TODAY)], TODAY)).toBe(6)
  })
})

describe('skips feed the replay', () => {
  it('a chore skipped on its due day is not late the next day', () => {
    const comps = done('A', '2026-10-01', '2026-10-02')
    expect(choreStatus(daily('A', '2026-10-01', ['2026-10-03']), comps, '2026-10-04')).toMatchObject({ dueDate: '2026-10-04', state: 'due', overdueDays: 0, neglect: 0 })
    // Without the skip the same day is one day late.
    expect(choreStatus(daily('A', '2026-10-01'), comps, '2026-10-04')).toMatchObject({ dueDate: '2026-10-03', state: 'overdue', overdueDays: 1, neglect: 1 })
  })

  it('a weekly chore skipped on its due Monday does not break the streak days later', () => {
    // B is weekly on Mondays: done 09-21 and 09-28, then skipped on Mon 10-05. Its next round is due 10-12.
    // A is done every day, so each day counts on A alone.
    const a = daily('A', '2026-09-21')
    const b: Chore = chore('B', { kind: 'weekly', weekday: 1, skips: ['2026-10-05'] }, '2026-09-21')
    const comps = [...doneBetween('A', '2026-09-21', '2026-10-12'), ...done('B', '2026-09-21', '2026-09-28')]
    expect(choreStatus(b, comps, '2026-10-08')).toMatchObject({ dueDate: '2026-10-12', state: 'upcoming' })
    // Without the skip, B would be level 2 on 10-08 (three days late), missed, and the run would break.
    expect(currentStreak([a, b], comps, '2026-10-12')).toBe(22) // 09-21 .. 10-12
  })
})

describe('seeded completions still do not count', () => {
  it('a seeded completion on a skipped day leaves that day paused, not counted', () => {
    // 10-03 has a seeded row and a skip for A: paused, so the run is 2 on that day, then 3 after 10-04.
    const c = [daily('A', '2026-10-01', ['2026-10-03'])]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-02'), ...seeded('A', '2026-10-03'), ...done('A', '2026-10-04')]
    expect(currentStreak(c, comps, '2026-10-03')).toBe(2)
    expect(currentStreak(c, comps, '2026-10-04')).toBe(3)
  })

  it('a seeded completion does not rescue a day where another owed chore was skipped and nothing else done', () => {
    // A is seeded on 10-03 but not skipped, and B is skipped: A is still owed and nothing was done, so missed.
    const c = [daily('A', '2026-10-01'), daily('B', '2026-10-01', ['2026-10-03'])]
    const comps = [...doneBetween('A', '2026-10-01', '2026-10-02'), ...seeded('A', '2026-10-03'), ...doneBetween('B', '2026-10-01', '2026-10-02'), ...done('A', '2026-10-04'), ...done('B', '2026-10-04')]
    // If the seeded row counted, 10-03 would count and the run would be 4. The miss restarts it at 1.
    expect(currentStreak(c, comps, '2026-10-04')).toBe(1)
  })
})
