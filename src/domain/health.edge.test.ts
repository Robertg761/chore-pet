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

type Level = 0 | 1 | 2 | 3

/** Statuses at given neglect levels (days at worst only matter at level 3). */
const lvl = (...levels: Level[]) => levels.map((neglect) => ({ neglect }))

describe('penaltyFor', () => {
  it('costs 0, 6, 15, 25 for neglect levels 0 to 3', () => {
    expect(([0, 1, 2, 3] as const).map((neglect) => penaltyFor({ neglect }))).toEqual([0, 6, 15, 25])
  })
  it('grows by 2 a day while at level 3, then caps at 35', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((daysAtWorst) => penaltyFor({ neglect: 3, daysAtWorst }))).toEqual([25, 27, 29, 31, 33, 35, 35, 35])
  })
  it('level 3 without daysAtWorst, or with a negative one, is just the base penalty', () => {
    expect(penaltyFor({ neglect: 3 })).toBe(25)
    expect(penaltyFor({ neglect: 3, daysAtWorst: -4 })).toBe(25)
  })
  it('days at worst only matter at level 3', () => {
    expect(penaltyFor({ neglect: 0, daysAtWorst: 10 })).toBe(0)
    expect(penaltyFor({ neglect: 1, daysAtWorst: 10 })).toBe(6)
    expect(penaltyFor({ neglect: 2, daysAtWorst: 10 })).toBe(15)
  })
  it('never exceeds the cap even for huge values', () => {
    expect(penaltyFor({ neglect: 3, daysAtWorst: 10_000 })).toBe(HEALTH_TUNING.maxPenaltyPerChore)
  })
})

describe('healthFromStatuses', () => {
  it('sums penalties across chores', () => {
    expect(healthFromStatuses(lvl(1, 1, 1))).toBe(82)
    expect(healthFromStatuses(lvl(2))).toBe(85)
    expect(healthFromStatuses(lvl(2, 1))).toBe(79)
    expect(healthFromStatuses(lvl(3, 3))).toBe(50)
  })
  it('counts days at worst per chore', () => {
    expect(healthFromStatuses([{ neglect: 3, daysAtWorst: 2 }, { neglect: 1 }])).toBe(65) // 100 - 29 - 6
  })
  it('accepts full chore statuses, and non-late ones cost nothing', () => {
    const statuses: ChoreStatus[] = [
      { choreId: 'a', dueDate: '2026-10-06', state: 'due', overdueDays: 0, neglect: 0 },
      { choreId: 'b', dueDate: '2026-10-09', state: 'upcoming', overdueDays: 0, neglect: 0 },
    ]
    expect(healthFromStatuses(statuses)).toBe(100)
  })
  it('clamps at 0 and never goes negative or above 100', () => {
    expect(healthFromStatuses(lvl(3, 3, 3, 3))).toBe(0)
    expect(healthFromStatuses(Array.from({ length: 3 }, () => ({ neglect: 3 as const, daysAtWorst: 99 })))).toBe(0)
    expect(healthFromStatuses(lvl())).toBe(100)
  })
  it('hits exact mood boundaries', () => {
    expect(healthFromStatuses(lvl(2))).toBe(85) // happy, lowest
    expect(healthFromStatuses(lvl(1, 1, 1))).toBe(82) // content
    expect(healthFromStatuses([{ neglect: 3, daysAtWorst: 5 }])).toBe(65) // content, lowest
    expect(healthFromStatuses(lvl(1, 1, 1, 1, 1, 1))).toBe(64) // meh
    expect(healthFromStatuses(lvl(3, 2, 2))).toBe(45) // meh, lowest
    expect(healthFromStatuses(lvl(3, 3, 1))).toBe(44) // scruffy
    expect(healthFromStatuses(lvl(3, 3, 3))).toBe(25) // scruffy, lowest
    expect(healthFromStatuses([{ neglect: 3, daysAtWorst: 5 }, { neglect: 3, daysAtWorst: 5 }, { neglect: 1 }])).toBe(24) // sick
  })
  it('mood follows the health it is given', () => {
    expect(moodFor(healthFromStatuses(lvl(2)))).toBe('happy')
    expect(moodFor(healthFromStatuses(lvl(2, 1)))).toBe('content')
    expect(moodFor(healthFromStatuses(lvl(3, 3)))).toBe('meh')
    expect(moodFor(healthFromStatuses(lvl(3, 3, 3)))).toBe('scruffy')
    expect(moodFor(healthFromStatuses(lvl(3, 3, 3, 3)))).toBe('sick')
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
  it('dishes 3 days late (level 2) and trash 1 day late (level 1): 79 and content', () => {
    const chores = [
      chore('dishes', { kind: 'daily' }),
      chore('trash', { kind: 'everyNDays', n: 3 }),
      chore('bed', { kind: 'weekly', weekday: 6 }, '2026-10-06'), // due Sat 10-10
      chore('plant', { kind: 'daily' }, '2026-10-06'), // due today
    ]
    const comps = [...done('dishes', '2026-10-02'), ...done('trash', '2026-10-02')]
    const p = petCondition(chores, comps, '2026-10-06')
    expect(p.statuses.map((s) => [s.state, s.overdueDays, s.neglect])).toEqual([
      ['overdue', 3, 2],
      ['overdue', 1, 1],
      ['upcoming', 0, 0],
      ['due', 0, 0],
    ])
    expect(p.health).toBe(79) // 100 - 15 - 6
    expect(p.mood).toBe('content')
    expect(p.worst?.choreId).toBe('dishes')
    // Doing the dishes leaves just the trash: 94 and happy.
    const better = petCondition(chores, [...comps, ...done('dishes', '2026-10-06')], '2026-10-06')
    expect(better.health).toBe(94)
    expect(better.mood).toBe('happy')
    expect(better.worst?.choreId).toBe('trash')
  })
  it('a lone daily chore gets steadily sicker, then levels off once the cap is hit', () => {
    const chores = [chore('a', { kind: 'daily' })] // due 10-01
    const days = Array.from({ length: 12 }, (_, i) => `2026-10-${String(i + 2).padStart(2, '0')}`) // 1 to 12 days late
    const health = days.map((d) => petCondition(chores, [], d).health)
    //        1   2   3   4   5   6   7   8   9  10  11  12 days late
    expect(health).toEqual([94, 85, 85, 75, 73, 71, 69, 67, 65, 65, 65, 65])
  })
  it('a weekly toilet follows the user example: level 1 at day 1, level 2 at day 3, level 3 at day 7', () => {
    const chores = [chore('toilet', { kind: 'weekly', weekday: 3 })] // first due Wed 10-07
    const at = (d: ISODate) => petCondition(chores, [], d)
    expect(at('2026-10-07').health).toBe(100)
    expect(at('2026-10-08').health).toBe(94)
    expect(at('2026-10-09').health).toBe(94)
    expect(at('2026-10-10').health).toBe(85)
    expect(at('2026-10-13').health).toBe(85)
    expect(at('2026-10-14').health).toBe(75)
    expect(at('2026-10-15').health).toBe(73)
  })
  it('a monthly chore is gentler and counts its days at worst from 14 days late', () => {
    const chores = [chore('oven', { kind: 'monthly', dayOfMonth: 1 }, '2026-09-01')] // due 09-01
    const at = (d: ISODate) => petCondition(chores, [], d)
    expect(at('2026-09-04').health).toBe(94) // 3 days late
    expect(at('2026-09-07').health).toBe(94) // 6
    expect(at('2026-09-08').health).toBe(85) // 7
    expect(at('2026-09-14').health).toBe(85) // 13
    expect(at('2026-09-15').health).toBe(75) // 14, level 3 starts
    expect(at('2026-09-17').health).toBe(71) // 16
  })
  it('the same lateness costs a daily chore more than a monthly one', () => {
    const daily = petCondition([chore('a', { kind: 'daily' }, '2026-10-03')], [], '2026-10-06') // 3 days late
    const monthly = petCondition([chore('m', { kind: 'monthly', dayOfMonth: 3 }, '2026-10-03')], [], '2026-10-06') // 3 days late
    expect(daily.statuses[0].overdueDays).toBe(monthly.statuses[0].overdueDays)
    expect(daily.health).toBe(85)
    expect(monthly.health).toBe(94)
  })
  it('picks the most neglected chore as worst, first one on ties', () => {
    const chores = [
      chore('late1', { kind: 'daily' }, '2026-10-04'), // due 10-04, overdue 2 (level 2)
      chore('late3', { kind: 'daily' }, '2026-10-02'), // overdue 4 (level 3)
      chore('late3b', { kind: 'daily' }, '2026-10-02'), // overdue 4, tie
      chore('ok', { kind: 'daily' }, '2026-10-06'),
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.worst?.choreId).toBe('late3')
    expect(p.worst?.overdueDays).toBe(4)
    expect(p.health).toBe(35) // 100 - 15 - 25 - 25
    expect(p.mood).toBe('scruffy')
  })
  it('neglect beats overdue days when picking worst', () => {
    const chores = [
      chore('oven', { kind: 'monthly', dayOfMonth: 31 }, '2026-09-01'), // due 09-30, 6 days late: level 1
      chore('dishes', { kind: 'daily' }, '2026-10-04'), // 2 days late: level 2
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([6, 2])
    expect(p.worst?.choreId).toBe('dishes')
  })
  it('at the same neglect level, more overdue days is worse, wherever it is in the list', () => {
    const chores = [
      chore('five', { kind: 'daily' }, '2026-10-01'), // 5 days late
      chore('eight', { kind: 'daily' }, '2026-09-28'), // 8 days late
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.neglect)).toEqual([3, 3])
    expect(p.worst?.choreId).toBe('eight')
    expect(p.health).toBe(40) // 100 - (25 + 2*1) - (25 + 2*4)
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
      chore('d', { kind: 'daily' }, '2026-10-05'), // due 10-05, overdue 1: level 1 -> 6
      chore('w', { kind: 'weekly', weekday: 1 }, '2026-10-01'), // first due Mon 10-05, overdue 1: level 1 -> 6
      chore('m', { kind: 'monthly', dayOfMonth: 31 }, '2026-09-01'), // due 09-30, overdue 6: still level 1 -> 6
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([1, 1, 6])
    expect(p.statuses.map((s) => s.neglect)).toEqual([1, 1, 1])
    expect(p.health).toBe(82) // 100 - 6 - 6 - 6
    expect(p.mood).toBe('content')
    expect(p.worst?.choreId).toBe('m')
  })
  it('never drops below zero however many chores pile up, and the pet is then sick', () => {
    const chores = Array.from({ length: 12 }, (_, i) => chore(`c${i}`, { kind: 'daily' }, '2026-01-01'))
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.health).toBe(0)
    expect(p.mood).toBe('sick')
    expect(p.worst).not.toBeNull()
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
    expect(without.statuses.map((x) => x.neglect)).toEqual([3, 3]) // 8 days late each
    expect(without.health).toBe(34) // 100 - 33 - 33
    expect(without.mood).toBe('scruffy')
  })
  it('overdue days before a vacation still count during it', () => {
    // Daily chore never completed, created 10-01: due 10-01. Active days after: 10-02..10-07 = 6.
    const chores = [chore('a', { kind: 'daily' })]
    const p = petCondition(chores, [], '2026-10-09', win('2026-10-08', '2026-10-14'))
    expect(p.statuses[0].overdueDays).toBe(6)
    expect(p.health).toBe(71) // level 3, 2 days at worst: 100 - 29
    expect(p.mood).toBe('content')
  })
  it('health does not get worse while the vacation continues', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-05')]
    const v = win('2026-10-07', '2026-10-20')
    // Due 10-05; only 10-06 is active before the vacation.
    const early = petCondition(chores, [], '2026-10-08', v).health
    const later = petCondition(chores, [], '2026-10-18', v).health
    expect(early).toBe(94)
    expect(later).toBe(early)
  })
  it('health starts to slip again only after the vacation ends', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-05')]
    const v = win('2026-10-07', '2026-10-20')
    expect(petCondition(chores, [], '2026-10-20', v).health).toBe(94)
    expect(petCondition(chores, [], '2026-10-21', v).health).toBe(85) // 2 days late: level 2
    expect(petCondition(chores, [], '2026-10-22', v).health).toBe(85)
    expect(petCondition(chores, [], '2026-10-23', v).health).toBe(75) // 4 days late: level 3
  })
  it('a partial vacation reduces but does not erase overdue days', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-01')]
    const done1 = done('a', '2026-10-01')
    // Due 10-02; today 10-12. Days 03..12 = 10 days minus vacation 04..09 (6) = 4 active.
    const p = petCondition(chores, done1, '2026-10-12', win('2026-10-04', '2026-10-09'))
    expect(p.statuses[0].overdueDays).toBe(4)
    expect(p.statuses[0].neglect).toBe(3)
    expect(p.health).toBe(75) // level 3 just started: 100 - 25
    expect(p.mood).toBe('content')
  })
  it('vacation applies per chore: each chore only loses its own vacation overlap', () => {
    const chores = [
      chore('daily', { kind: 'daily' }, '2026-10-06'), // done 10-06, due 10-07
      chore('sat', { kind: 'weekly', weekday: 6 }, '2026-10-06'), // due 10-10
    ]
    const p = petCondition(chores, done('daily', '2026-10-06'), '2026-10-12', win('2026-10-08', '2026-10-09'))
    // daily: after 10-07 through 10-12 minus 08,09 -> 10,11,12 = 3 (level 2, penalty 15)
    // weekly: after 10-10 -> 11,12 = 2 (level 1 for a weekly chore, penalty 6)
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([3, 2])
    expect(p.statuses.map((s) => s.neglect)).toEqual([2, 1])
    expect(p.health).toBe(79)
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
    expect(petCondition(chores, comps, '2026-10-15', v).health).toBe(94)
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
    expect(after.health).toBe(94)
    expect(after.worst?.choreId).toBe('sat')
  })
  it('doing a chore during a vacation resets it so the pet stays healthy afterwards', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-01')]
    const v = win('2026-10-05', '2026-10-12')
    const comps = done('a', '2026-10-01', '2026-10-12')
    // Due 10-13 after the completion on the last vacation day.
    expect(petCondition(chores, comps, '2026-10-13', v).health).toBe(100)
    expect(petCondition(chores, comps, '2026-10-14', v).health).toBe(94)
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
    expect(petCondition(chores, [], '2027-03-04', v).health).toBe(94)
  })
})
