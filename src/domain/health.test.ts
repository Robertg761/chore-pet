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
    expect(penaltyFor({ neglect: 1 })).toBe(6)
    expect(penaltyFor({ neglect: 2 })).toBe(15)
    expect(penaltyFor({ neglect: 3 })).toBe(25)
    expect(penaltyFor({ neglect: 3, daysAtWorst: 300 })).toBe(35)
  })
  it('uses the tuning table', () => {
    expect(HEALTH_TUNING.levelPenalty).toEqual([0, 6, 15, 25])
    expect(HEALTH_TUNING.maxPenaltyPerChore).toBe(35)
  })
})

describe('health and mood', () => {
  it('is fully healthy with nothing overdue', () => {
    expect(healthFromStatuses([])).toBe(100)
    expect(moodFor(100)).toBe('happy')
  })
  it('never drops below zero, and zero is sick (not dead)', () => {
    const statuses = Array.from({ length: 10 }, () => ({ neglect: 3 as const, daysAtWorst: 20 }))
    expect(healthFromStatuses(statuses)).toBe(0)
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
    expect(before.worst?.overdueDays).toBe(3)
    expect(before.health).toBe(70) // two daily chores, each 3 days late (level 2): 100 - 15 - 15
  })
})
