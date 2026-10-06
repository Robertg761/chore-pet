import { describe, expect, it } from 'vitest'
import { HEALTH_TUNING, healthFromStatuses, moodFor, penaltyFor, petCondition } from './health'
import type { ChoreStatus } from './schedule'
import type { Chore, Completion, ISODate, Schedule, VacationWindow } from './types'

// Reference: 2026-10-06 is a Tuesday.

function chore(id: string, schedule: Schedule, createdOn: ISODate = '2026-10-01'): Chore {
  return { id, homeId: 'h1', objectId: null, name: id, schedule, createdOn, photoProof: false }
}

function done(choreId: string, ...dates: string[]): Completion[] {
  return dates.map((d, i) => ({ id: `${choreId}-${i}`, choreId, completedAt: `${d}T12:00:00Z`, completedOn: d }))
}

function overdue(...days: number[]): ChoreStatus[] {
  return days.map((overdueDays, i) => ({ choreId: `c${i}`, dueDate: '2026-10-01', state: 'overdue' as const, overdueDays }))
}

describe('penaltyFor', () => {
  it('steps by perDayPenalty and caps', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(penaltyFor)).toEqual([8, 14, 20, 26, 32, 35, 35])
  })
  it('treats negative days as zero', () => {
    expect(penaltyFor(-1)).toBe(0)
    expect(penaltyFor(-100)).toBe(0)
  })
  it('never exceeds the cap even for huge values', () => {
    expect(penaltyFor(10_000)).toBe(HEALTH_TUNING.maxPenaltyPerChore)
  })
})

describe('healthFromStatuses', () => {
  it('sums penalties across chores', () => {
    expect(healthFromStatuses(overdue(1, 1, 1))).toBe(76)
    expect(healthFromStatuses(overdue(2))).toBe(86)
  })
  it('non-overdue statuses cost nothing', () => {
    const statuses: ChoreStatus[] = [
      { choreId: 'a', dueDate: '2026-10-06', state: 'due', overdueDays: 0 },
      { choreId: 'b', dueDate: '2026-10-09', state: 'upcoming', overdueDays: 0 },
    ]
    expect(healthFromStatuses(statuses)).toBe(100)
  })
  it('clamps at 0 and never goes negative or above 100', () => {
    expect(healthFromStatuses(overdue(99, 99, 99, 99))).toBe(0)
    expect(healthFromStatuses(overdue())).toBe(100)
  })
  it('hits exact mood boundaries', () => {
    expect(healthFromStatuses(overdue(2))).toBe(86) // happy
    expect(healthFromStatuses(overdue(1, 1))).toBe(84) // content
    expect(healthFromStatuses(overdue(6))).toBe(65) // content, lowest
    expect(healthFromStatuses(overdue(1, 1, 3))).toBe(64) // meh
    expect(healthFromStatuses(overdue(6, 3))).toBe(45) // meh, lowest
    expect(healthFromStatuses(overdue(1, 1, 1, 5))).toBe(44) // scruffy
    expect(healthFromStatuses(overdue(6, 3, 3))).toBe(25) // scruffy, lowest
    expect(healthFromStatuses(overdue(3, 3, 3, 1, 1))).toBe(24) // sick
  })
})

describe('moodFor boundaries', () => {
  it.each([
    [100, 'happy'],
    [85, 'happy'],
    [84, 'content'],
    [65, 'content'],
    [64, 'meh'],
    [45, 'meh'],
    [44, 'scruffy'],
    [25, 'scruffy'],
    [24, 'sick'],
    [1, 'sick'],
    [0, 'sick'],
  ] as const)('health %i is %s', (health, mood) => {
    expect(moodFor(health)).toBe(mood)
  })
})

describe('petCondition without vacations', () => {
  it('no chores at all: full health, happy, no worst chore', () => {
    const p = petCondition([], [], '2026-10-06')
    expect(p.health).toBe(100)
    expect(p.mood).toBe('happy')
    expect(p.statuses).toEqual([])
    expect(p.worst).toBeNull()
  })
  it('a chore due today is not penalised and is not the worst', () => {
    const p = petCondition([chore('a', { kind: 'weekly', weekday: 2 }, '2026-10-06')], [], '2026-10-06')
    expect(p.health).toBe(100)
    expect(p.worst).toBeNull()
  })
  it('picks the most overdue chore as worst, first one on ties', () => {
    const chores = [
      chore('late1', { kind: 'daily' }, '2026-10-04'), // due 10-04, overdue 2 on 10-06
      chore('late3', { kind: 'daily' }, '2026-10-02'), // overdue 4
      chore('late3b', { kind: 'daily' }, '2026-10-02'), // overdue 4, tie
      chore('ok', { kind: 'daily' }, '2026-10-06'),
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.worst?.choreId).toBe('late3')
    expect(p.worst?.overdueDays).toBe(4)
  })
  it('does not reorder the statuses array when picking worst', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-05'), chore('b', { kind: 'daily' }, '2026-10-01')]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.choreId)).toEqual(['a', 'b'])
  })
  it('completions for unknown chores are ignored', () => {
    const p = petCondition([chore('a', { kind: 'daily' }, '2026-10-05')], done('zzz', '2026-10-05', '2026-10-06'), '2026-10-06')
    expect(p.statuses[0].overdueDays).toBe(1)
  })
  it('mixed schedules combine penalties', () => {
    const chores = [
      chore('d', { kind: 'daily' }, '2026-10-05'), // due 10-05, overdue 1 -> 8
      chore('w', { kind: 'weekly', weekday: 1 }, '2026-10-01'), // first due Mon 10-05, overdue 1 -> 8
      chore('m', { kind: 'monthly', dayOfMonth: 31 }, '2026-09-01'), // due 09-30, overdue 6 -> 35
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([1, 1, 6])
    expect(p.health).toBe(49) // 100 - 8 - 8 - 35
    expect(p.mood).toBe('meh')
    expect(p.worst?.choreId).toBe('m')
  })
  it('recovers to happy as soon as everything is done, mid-week and at month end', () => {
    const chores = [chore('m', { kind: 'monthly', dayOfMonth: 31 }, '2027-02-01')]
    const sick = petCondition(chores, [], '2027-03-20')
    expect(sick.health).toBeLessThan(100)
    expect(petCondition(chores, done('m', '2027-03-20'), '2027-03-20').health).toBe(100)
  })
})

describe('petCondition with vacations', () => {
  const win = (start: ISODate, end: ISODate): VacationWindow[] => [{ start, end }]

  it('a vacation covering the whole overdue period keeps the pet healthy', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-06'), chore('b', { kind: 'daily' }, '2026-10-06')]
    const p = petCondition(chores, done('a', '2026-10-06').concat(done('b', '2026-10-06')), '2026-10-15', win('2026-10-07', '2026-10-20'))
    expect(p.health).toBe(100)
    expect(p.mood).toBe('happy')
    expect(p.worst).toBeNull()
  })
  it('the same chores without the vacation are sick, so the vacation is what protects the pet', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-06'), chore('b', { kind: 'daily' }, '2026-10-06')]
    const comps = done('a', '2026-10-06').concat(done('b', '2026-10-06'))
    const without = petCondition(chores, comps, '2026-10-15')
    expect(without.health).toBe(30) // 100 - 35 - 35
    expect(without.mood).toBe('scruffy')
  })
  it('overdue days before a vacation still count during it', () => {
    // Daily chore never completed, created 10-01: due 10-01. Active days after: 10-02..10-07 = 6.
    const chores = [chore('a', { kind: 'daily' })]
    const p = petCondition(chores, [], '2026-10-09', win('2026-10-08', '2026-10-14'))
    expect(p.statuses[0].overdueDays).toBe(6)
    expect(p.health).toBe(65)
    expect(p.mood).toBe('content')
  })
  it('health does not get worse while the vacation continues', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-05')]
    const v = win('2026-10-07', '2026-10-20')
    // Due 10-05; only 10-06 is active before the vacation.
    const early = petCondition(chores, [], '2026-10-08', v).health
    const later = petCondition(chores, [], '2026-10-18', v).health
    expect(early).toBe(92)
    expect(later).toBe(early)
  })
  it('health starts to slip again only after the vacation ends', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-05')]
    const v = win('2026-10-07', '2026-10-20')
    expect(petCondition(chores, [], '2026-10-20', v).health).toBe(92)
    expect(petCondition(chores, [], '2026-10-21', v).health).toBe(86) // one more active day: 8 + 6
    expect(petCondition(chores, [], '2026-10-22', v).health).toBe(80)
  })
  it('a partial vacation reduces but does not erase overdue days', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-01')]
    const done1 = done('a', '2026-10-01')
    // Due 10-02; today 10-12. Days 03..12 = 10 days minus vacation 04..09 (6) = 4 active.
    const p = petCondition(chores, done1, '2026-10-12', win('2026-10-04', '2026-10-09'))
    expect(p.statuses[0].overdueDays).toBe(4)
    expect(p.health).toBe(74) // 100 - (8 + 18)
    expect(p.mood).toBe('content')
  })
  it('vacation applies per chore: each chore only loses its own vacation overlap', () => {
    const chores = [
      chore('daily', { kind: 'daily' }, '2026-10-06'), // done 10-06, due 10-07
      chore('sat', { kind: 'weekly', weekday: 6 }, '2026-10-06'), // due 10-10
    ]
    const p = petCondition(chores, done('daily', '2026-10-06'), '2026-10-12', win('2026-10-08', '2026-10-09'))
    // daily: after 10-07 through 10-12 minus 08,09 -> 10,11,12 = 3 (penalty 20)
    // weekly: after 10-10 -> 11,12 = 2 (penalty 14)
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([3, 2])
    expect(p.health).toBe(66)
    expect(p.mood).toBe('content')
    expect(p.worst?.choreId).toBe('daily')
  })
  it('back-to-back and overlapping vacations protect the pet as a single break', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-06')]
    const comps = done('a', '2026-10-06')
    const v: VacationWindow[] = [
      { start: '2026-10-08', end: '2026-10-10' },
      { start: '2026-10-10', end: '2026-10-12' },
      { start: '2026-10-13', end: '2026-10-14' },
    ]
    // Due 10-07; 08..14 all vacation.
    expect(petCondition(chores, comps, '2026-10-14', v).health).toBe(100)
    expect(petCondition(chores, comps, '2026-10-15', v).health).toBe(92)
  })
  it('a chore falling due during a vacation does not penalise the pet, and is not worst', () => {
    // Weekly Saturday due 10-10, vacation 10-09..10-16.
    const chores = [chore('sat', { kind: 'weekly', weekday: 6 }, '2026-10-06')]
    const p = petCondition(chores, [], '2026-10-14', win('2026-10-09', '2026-10-16'))
    expect(p.health).toBe(100)
    expect(p.worst).toBeNull()
    // The day after the vacation ends it starts counting.
    const after = petCondition(chores, [], '2026-10-17', win('2026-10-09', '2026-10-16'))
    expect(after.statuses[0].overdueDays).toBe(1)
    expect(after.health).toBe(92)
    expect(after.worst?.choreId).toBe('sat')
  })
  it('doing a chore during a vacation resets it so the pet stays healthy afterwards', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-01')]
    const v = win('2026-10-05', '2026-10-12')
    const comps = done('a', '2026-10-01', '2026-10-12')
    // Due 10-13 after the completion on the last vacation day.
    expect(petCondition(chores, comps, '2026-10-13', v).health).toBe(100)
    expect(petCondition(chores, comps, '2026-10-14', v).health).toBe(92)
  })
  it('vacation windows outside the period have no effect on health', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-01')]
    const base = petCondition(chores, [], '2026-10-06').health
    expect(petCondition(chores, [], '2026-10-06', win('2026-09-01', '2026-09-30')).health).toBe(base)
    expect(petCondition(chores, [], '2026-10-06', win('2026-11-01', '2026-11-30')).health).toBe(base)
  })
  it('a clamped monthly chore across a vacation over the month end', () => {
    const chores = [chore('m', { kind: 'monthly', dayOfMonth: 31 }, '2027-02-01')] // due 2027-02-28
    const v = win('2027-02-26', '2027-03-03')
    expect(petCondition(chores, [], '2027-03-03', v).health).toBe(100)
    expect(petCondition(chores, [], '2027-03-04', v).health).toBe(92)
  })
})
