import { describe, expect, it } from 'vitest'
import { HEALTH_TUNING, healthFromStatuses, moodFor, penaltyFor, petCondition } from './health'
import type { Chore } from './types'

function daily(id: string): Chore {
  return { id, homeId: 'h1', objectId: null, name: id, schedule: { kind: 'daily' }, createdOn: '2026-10-01', photoProof: false }
}

describe('penalties', () => {
  it('is zero when not overdue', () => {
    expect(penaltyFor({ neglect: 0 })).toBe(0)
  })
  it('costs more the more neglected the chore is, and caps per chore', () => {
    expect(penaltyFor({ neglect: 1 })).toBe(4)
    expect(penaltyFor({ neglect: 2 })).toBe(12)
    expect(penaltyFor({ neglect: 3 })).toBe(25)
    expect(penaltyFor({ neglect: 3, daysAtWorst: 300 })).toBe(35)
  })
  it('uses the tuning table', () => {
    expect(HEALTH_TUNING.levelPenalty).toEqual([0, 4, 12, 25])
    expect(HEALTH_TUNING.maxPenaltyPerChore).toBe(35)
    expect(HEALTH_TUNING.maxLevel1Total).toBe(20)
    expect(HEALTH_TUNING.moodThresholds).toEqual({ happy: 88, content: 70, meh: 50, scruffy: 33 })
  })
})

describe('health and mood', () => {
  it('is fully healthy with nothing overdue', () => {
    expect(healthFromStatuses([])).toBe(100)
    expect(moodFor(100)).toBe('happy')
  })
  it('stays above zero however bad it gets, and low health is sick (not dead)', () => {
    const statuses = Array.from({ length: 10 }, () => ({ neglect: 3 as const, daysAtWorst: 20 }))
    expect(healthFromStatuses(statuses)).toBe(22)
    expect(moodFor(22)).toBe('sick')
    expect(moodFor(0)).toBe('sick')
  })
  it('recovers immediately when chores are done', () => {
    const chores = [daily('dishes'), daily('trash')]
    const before = petCondition(chores, [], '2026-10-04')
    const after = petCondition(
      chores,
      [
        { id: 'a', choreId: 'dishes', completedAt: '2026-10-04T10:00:00Z', completedOn: '2026-10-04' },
        { id: 'b', choreId: 'trash', completedAt: '2026-10-04T10:05:00Z', completedOn: '2026-10-04' },
      ],
      '2026-10-04',
    )
    expect(before.health).toBeLessThan(after.health)
    expect(after.health).toBe(100)
    expect(before.worst?.overdueDays).toBe(2) // due 10-01, a new chore's grace day 10-02, then 10-03 and 10-04
    expect(before.health).toBe(81) // two daily chores at level 2: 100 * 100 / (100 + 12 + 12)
  })
})
