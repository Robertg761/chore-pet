import { describe, expect, it } from 'vitest'
import type { Chore, Completion, ISODate } from '../domain/types'
import { STREAK_NUDGE, homeStreak } from './streakNudge'

const daily = (createdOn: ISODate): Chore => ({ id: 'A', homeId: 'h', objectId: null, name: 'A', schedule: { kind: 'daily' }, createdOn, photoProof: false })
const done = (...days: ISODate[]): Completion[] => days.map((d) => ({ id: `A-${d}`, choreId: 'A', completedAt: '', completedOn: d }))
const chores = [daily('2026-10-01')]
// Done on the 1st and 2nd, nothing on the 3rd and 4th: the run of 2 has ended by the 5th.
const early = done('2026-10-01', '2026-10-02')

describe('homeStreak nudge', () => {
  it('nudges kindly when a streak ended and nothing is done today', () => {
    expect(homeStreak(chores, early, '2026-10-05')).toEqual({ streak: 0, nudge: STREAK_NUDGE })
    expect(STREAK_NUDGE).toBe('Do one chore today to start a new streak.')
  })

  it('goes once a chore counts today', () => {
    const r = homeStreak(chores, [...early, ...done('2026-10-05')], '2026-10-05')
    expect(r.streak).toBe(1)
    expect(r.nudge).toBeNull()
  })

  it('stays quiet when there is a streak going', () => {
    const r = homeStreak(chores, done('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'), '2026-10-05')
    expect(r.streak).toBeGreaterThan(0)
    expect(r.nudge).toBeNull()
  })

  it('stays quiet for a brand new home that never had a streak', () => {
    expect(homeStreak(chores, [], '2026-10-01')).toEqual({ streak: 0, nudge: null })
    expect(homeStreak(chores, [], '2026-10-05').nudge).toBeNull()
  })

  it("ignores seeded sample history, which is not the player's", () => {
    const seeded = early.map((c) => ({ ...c, counts: false }))
    expect(homeStreak(chores, seeded, '2026-10-05').nudge).toBeNull()
  })

  it('stays quiet when every owed round today was skipped, since no chore could count', () => {
    const skipped = [{ ...daily('2026-10-01'), schedule: { kind: 'daily' as const, skips: ['2026-10-05'] } }]
    expect(homeStreak(skipped, early, '2026-10-05').nudge).toBeNull()
  })

  it('stays quiet on vacation', () => {
    expect(homeStreak(chores, early, '2026-10-05', [{ start: '2026-10-04', end: '2026-10-08' }]).nudge).toBeNull()
  })

  it('has no nudge without chores', () => {
    expect(homeStreak([], [], '2026-10-05')).toEqual({ streak: 0, nudge: null })
  })
})
