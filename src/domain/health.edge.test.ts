import { describe, expect, it } from 'vitest'
import { HEALTH_TUNING, healthFromStatuses, moodFor, penaltyFor, petCondition, totalPenalty } from './health'
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
  it('costs 0, 4, 12, 25 for neglect levels 0 to 3', () => {
    expect(([0, 1, 2, 3] as const).map((neglect) => penaltyFor({ neglect }))).toEqual([0, 4, 12, 25])
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
    expect(penaltyFor({ neglect: 1, daysAtWorst: 10 })).toBe(4)
    expect(penaltyFor({ neglect: 2, daysAtWorst: 10 })).toBe(12)
  })
  it('never exceeds the cap even for huge values', () => {
    expect(penaltyFor({ neglect: 3, daysAtWorst: 10_000 })).toBe(HEALTH_TUNING.maxPenaltyPerChore)
  })
})

describe('totalPenalty', () => {
  it('adds up every chore, with level-1 chores capped at 20 between them', () => {
    expect(totalPenalty(lvl(1, 1, 1))).toBe(12)
    expect(totalPenalty(lvl(1, 1, 1, 1, 1))).toBe(20)
    expect(totalPenalty(lvl(1, 1, 1, 1, 1, 1, 1, 1, 1, 1))).toBe(20)
    expect(totalPenalty(lvl(2, 3, 1, 1, 1, 1, 1, 1))).toBe(12 + 25 + 20)
  })
  it('does not cap levels 2 and 3', () => {
    expect(totalPenalty(lvl(2, 2, 2, 2, 2, 2))).toBe(72)
    expect(totalPenalty([{ neglect: 3, daysAtWorst: 9 }, { neglect: 3, daysAtWorst: 9 }])).toBe(70)
  })
})

describe('healthFromStatuses', () => {
  it('is 100 * 100 / (100 + total penalty), rounded', () => {
    expect(healthFromStatuses(lvl(1))).toBe(96)
    expect(healthFromStatuses(lvl(1, 1, 1))).toBe(89)
    expect(healthFromStatuses(lvl(2))).toBe(89)
    expect(healthFromStatuses(lvl(2, 1))).toBe(86)
    expect(healthFromStatuses(lvl(3))).toBe(80)
    expect(healthFromStatuses(lvl(3, 3))).toBe(67)
  })
  it('a pile of level-1 chores costs no more than five', () => {
    expect(healthFromStatuses(lvl(1, 1, 1, 1, 1))).toBe(83)
    expect(healthFromStatuses(lvl(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1))).toBe(83)
  })
  it('counts days at worst per chore', () => {
    expect(healthFromStatuses([{ neglect: 3, daysAtWorst: 2 }, { neglect: 1 }])).toBe(75) // P = 29 + 4
  })
  it('accepts full chore statuses, and non-late ones cost nothing', () => {
    const statuses: ChoreStatus[] = [
      { choreId: 'a', dueDate: '2026-10-06', state: 'due', overdueDays: 0, neglect: 0 },
      { choreId: 'b', dueDate: '2026-10-09', state: 'upcoming', overdueDays: 0, neglect: 0 },
    ]
    expect(healthFromStatuses(statuses)).toBe(100)
  })
  it('stays within 0 to 100 and only nears 0 with an absurd pile-up', () => {
    expect(healthFromStatuses(lvl())).toBe(100)
    expect(healthFromStatuses(lvl(3, 3, 3, 3))).toBe(50)
    expect(healthFromStatuses(Array.from({ length: 3 }, () => ({ neglect: 3 as const, daysAtWorst: 99 })))).toBe(49)
    expect(healthFromStatuses(Array.from({ length: 20 }, () => ({ neglect: 3 as const, daysAtWorst: 99 })))).toBe(13)
    const huge = healthFromStatuses(Array.from({ length: 1000 }, () => ({ neglect: 3 as const, daysAtWorst: 99 })))
    expect(huge).toBeGreaterThanOrEqual(0)
    expect(huge).toBeLessThan(1)
  })
  it('every chore done moves the bar, even from very sick', () => {
    const worst = { neglect: 3 as const, daysAtWorst: 99 }
    const health = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => healthFromStatuses(Array.from({ length: n }, () => worst)))
    for (let i = 1; i < health.length; i++) expect(health[i]).toBeGreaterThan(health[i - 1])
    expect(health[0]).toBe(22)
  })
  it('hits exact mood boundaries', () => {
    const at3 = (daysAtWorst: number) => ({ neglect: 3 as const, daysAtWorst })
    expect(healthFromStatuses(lvl(2))).toBe(89) // happy
    expect(healthFromStatuses(lvl(2, 1))).toBe(86) // content
    expect(healthFromStatuses([at3(5), ...lvl(1, 1)])).toBe(70) // content, lowest (P = 43)
    expect(healthFromStatuses(lvl(2, 2, 1, 1, 1, 1, 1))).toBe(69) // meh (P = 44)
    expect(healthFromStatuses([at3(0), at3(0), at3(0), at3(1)])).toBe(50) // meh, lowest (P = 102)
    expect(healthFromStatuses([at3(5), at3(5), at3(4)])).toBe(49) // scruffy (P = 103)
    expect(healthFromStatuses([...Array.from({ length: 5 }, () => at3(5)), ...lvl(2, 1, 1, 1, 1, 1)])).toBe(33) // scruffy, lowest (P = 207)
    expect(healthFromStatuses([...Array.from({ length: 5 }, () => at3(5)), at3(4)])).toBe(32) // sick (P = 208)
  })
  it('mood follows the health it is given', () => {
    expect(moodFor(healthFromStatuses(lvl(2)))).toBe('happy')
    expect(moodFor(healthFromStatuses(lvl(2, 1)))).toBe('content')
    expect(moodFor(healthFromStatuses(lvl(3, 3)))).toBe('meh')
    expect(moodFor(healthFromStatuses(lvl(3, 3, 3, 3, 3)))).toBe('scruffy')
    expect(moodFor(healthFromStatuses(lvl(3, 3, 3, 3, 3, 3, 3, 3, 3)))).toBe('sick')
  })
})

describe('moodFor boundaries', () => {
  it.each([
    [100, 'happy'],
    [88, 'happy'],
    [87, 'content'],
    [70, 'content'],
    [69, 'meh'],
    [50, 'meh'],
    [49, 'scruffy'],
    [33, 'scruffy'],
    [32, 'sick'],
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
  it('dishes 3 days late (level 2) and trash 1 day late (level 1): 86 and content', () => {
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
    expect(p.health).toBe(86) // P = 12 + 4
    expect(p.mood).toBe('content')
    expect(p.worst?.choreId).toBe('dishes')
    // Doing the dishes leaves just the trash: 96 and happy.
    const better = petCondition(chores, [...comps, ...done('dishes', '2026-10-06')], '2026-10-06')
    expect(better.health).toBe(96)
    expect(better.mood).toBe('happy')
    expect(better.worst?.choreId).toBe('trash')
  })
  it('a lone daily chore gets steadily sicker, then levels off once the cap is hit', () => {
    const chores = [chore('a', { kind: 'daily' })]
    const comps = done('a', '2026-10-01') // due 10-02
    const days = Array.from({ length: 12 }, (_, i) => `2026-10-${String(i + 3).padStart(2, '0')}`) // 1 to 12 days late
    const health = days.map((d) => petCondition(chores, comps, d).health)
    //        1   2   3   4   5   6   7   8   9  10  11  12 days late
    expect(health).toEqual([96, 89, 89, 80, 79, 78, 76, 75, 74, 74, 74, 74])
  })
  it("a new chore that's never done gets one grace day before it costs anything", () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-06')] // created and due 10-06
    expect(petCondition(chores, [], '2026-10-07').health).toBe(100)
    expect(petCondition(chores, [], '2026-10-08').health).toBe(96)
  })
  it('a weekly toilet follows the user example: level 1 at day 1, level 2 at day 3, level 3 at day 7', () => {
    const chores = [chore('toilet', { kind: 'weekly', weekday: 3 })] // first due Wed 10-07
    const at = (d: ISODate) => petCondition(chores, [], d)
    expect(at('2026-10-07').health).toBe(100)
    expect(at('2026-10-08').health).toBe(96)
    expect(at('2026-10-09').health).toBe(96)
    expect(at('2026-10-10').health).toBe(89)
    expect(at('2026-10-13').health).toBe(89)
    expect(at('2026-10-14').health).toBe(80)
    expect(at('2026-10-15').health).toBe(79)
  })
  it('a monthly chore is gentler and counts its days at worst from 14 days late', () => {
    const chores = [chore('oven', { kind: 'monthly', dayOfMonth: 1 }, '2026-08-25')] // due 09-01
    const at = (d: ISODate) => petCondition(chores, [], d)
    expect(at('2026-09-04').health).toBe(96) // 3 days late
    expect(at('2026-09-07').health).toBe(96) // 6
    expect(at('2026-09-08').health).toBe(89) // 7
    expect(at('2026-09-14').health).toBe(89) // 13
    expect(at('2026-09-15').health).toBe(80) // 14, level 3 starts
    expect(at('2026-09-17').health).toBe(78) // 16
  })
  it('the same lateness costs a daily chore more than a monthly one', () => {
    const daily = petCondition([chore('a', { kind: 'daily' }, '2026-10-02')], [], '2026-10-06') // due 10-02, grace day 10-03: 3 days late
    const monthly = petCondition([chore('m', { kind: 'monthly', dayOfMonth: 3 }, '2026-10-01')], [], '2026-10-06') // due 10-03: 3 days late
    expect(daily.statuses[0].overdueDays).toBe(3)
    expect(monthly.statuses[0].overdueDays).toBe(3)
    expect(daily.health).toBe(89)
    expect(monthly.health).toBe(96)
  })
  it('picks the most neglected chore as worst, first one on ties', () => {
    const chores = [
      chore('late1', { kind: 'daily' }, '2026-10-03'), // due 10-03 (grace 10-04), overdue 2 (level 2)
      chore('late3', { kind: 'daily' }, '2026-10-01'), // overdue 4 (level 3)
      chore('late3b', { kind: 'daily' }, '2026-10-01'), // overdue 4, tie
      chore('ok', { kind: 'daily' }, '2026-10-06'),
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.worst?.choreId).toBe('late3')
    expect(p.worst?.overdueDays).toBe(4)
    expect(p.health).toBe(62) // P = 12 + 25 + 25
    expect(p.mood).toBe('meh')
  })
  it('neglect beats overdue days when picking worst', () => {
    const chores = [
      chore('oven', { kind: 'monthly', dayOfMonth: 31 }, '2026-09-01'), // due 09-30, 6 days late: level 1
      chore('dishes', { kind: 'daily' }, '2026-10-03'), // 2 days late (after its grace day): level 2
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([6, 2])
    expect(p.worst?.choreId).toBe('dishes')
  })
  it('at the same neglect level, more overdue days is worse, wherever it is in the list', () => {
    const chores = [
      chore('five', { kind: 'daily' }, '2026-09-30'), // 5 days late (after its grace day)
      chore('eight', { kind: 'daily' }, '2026-09-27'), // 8 days late
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([5, 8])
    expect(p.statuses.map((s) => s.neglect)).toEqual([3, 3])
    expect(p.worst?.choreId).toBe('eight')
    expect(p.health).toBe(63) // P = (25 + 2*1) + (25 + 2*4) = 60
  })
  it('does not reorder the statuses array when picking worst', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-05'), chore('b', { kind: 'daily' }, '2026-10-01')]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.choreId)).toEqual(['a', 'b'])
  })
  it('completions for unknown chores are ignored', () => {
    const p = petCondition([chore('a', { kind: 'daily' }, '2026-10-04')], done('zzz', '2026-10-05', '2026-10-06'), '2026-10-06')
    expect(p.statuses[0].overdueDays).toBe(1)
  })
  it('mixed schedules combine penalties', () => {
    const chores = [
      chore('d', { kind: 'daily' }, '2026-10-04'), // due 10-04, grace 10-05, overdue 1: level 1 -> 4
      chore('w', { kind: 'weekly', weekday: 1 }, '2026-10-01'), // first due Mon 10-05, overdue 1: level 1 -> 4
      chore('m', { kind: 'monthly', dayOfMonth: 31 }, '2026-09-01'), // due 09-30, overdue 6: still level 1 -> 4
    ]
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([1, 1, 6])
    expect(p.statuses.map((s) => s.neglect)).toEqual([1, 1, 1])
    expect(p.health).toBe(89) // P = 12: a few things a little late is still happy
    expect(p.mood).toBe('happy')
    expect(p.worst?.choreId).toBe('m')
  })
  it('stays above zero however many chores pile up, and the pet is then sick', () => {
    const chores = Array.from({ length: 12 }, (_, i) => chore(`c${i}`, { kind: 'daily' }, '2026-01-01'))
    const p = petCondition(chores, [], '2026-10-06')
    expect(p.health).toBe(19) // P = 12 * 35
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
    expect(without.health).toBe(60) // P = 33 + 33
    expect(without.mood).toBe('meh')
  })
  it('overdue days before a vacation still count during it', () => {
    // Daily chore never completed, created 09-30: due 09-30, grace day 10-01. Active days after: 10-02..10-07 = 6.
    const chores = [chore('a', { kind: 'daily' }, '2026-09-30')]
    const p = petCondition(chores, [], '2026-10-09', win('2026-10-08', '2026-10-14'))
    expect(p.statuses[0].overdueDays).toBe(6)
    expect(p.health).toBe(78) // level 3, 2 days at worst: P = 29
    expect(p.mood).toBe('content')
  })
  it('health does not get worse while the vacation continues', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-04')]
    const v = win('2026-10-07', '2026-10-20')
    // Due 10-04 (grace 10-05); only 10-06 is late before the vacation.
    const early = petCondition(chores, [], '2026-10-08', v).health
    const later = petCondition(chores, [], '2026-10-18', v).health
    expect(early).toBe(96)
    expect(later).toBe(early)
  })
  it('health starts to slip again only after the vacation ends', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-04')]
    const v = win('2026-10-07', '2026-10-20')
    expect(petCondition(chores, [], '2026-10-20', v).health).toBe(96)
    expect(petCondition(chores, [], '2026-10-21', v).health).toBe(89) // 2 days late: level 2
    expect(petCondition(chores, [], '2026-10-22', v).health).toBe(89)
    expect(petCondition(chores, [], '2026-10-23', v).health).toBe(80) // 4 days late: level 3
  })
  it('a partial vacation reduces but does not erase overdue days', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-01')]
    const done1 = done('a', '2026-10-01')
    // Due 10-02; today 10-12. Days 03..12 = 10 days minus vacation 04..09 (6) = 4 active.
    const p = petCondition(chores, done1, '2026-10-12', win('2026-10-04', '2026-10-09'))
    expect(p.statuses[0].overdueDays).toBe(4)
    expect(p.statuses[0].neglect).toBe(3)
    expect(p.health).toBe(80) // level 3 just started: P = 25
    expect(p.mood).toBe('content')
  })
  it('vacation applies per chore: each chore only loses its own vacation overlap', () => {
    const chores = [
      chore('daily', { kind: 'daily' }, '2026-10-06'), // done 10-06, due 10-07
      chore('sat', { kind: 'weekly', weekday: 6 }, '2026-10-06'), // due 10-10
    ]
    const p = petCondition(chores, done('daily', '2026-10-06'), '2026-10-12', win('2026-10-08', '2026-10-09'))
    // daily: after 10-07 through 10-12 minus 08,09 -> 10,11,12 = 3 (level 2, penalty 12)
    // weekly: after 10-10 -> 11,12 = 2 (level 1 for a weekly chore, penalty 4)
    expect(p.statuses.map((s) => s.overdueDays)).toEqual([3, 2])
    expect(p.statuses.map((s) => s.neglect)).toEqual([2, 1])
    expect(p.health).toBe(86)
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
    expect(petCondition(chores, comps, '2026-10-15', v).health).toBe(96)
  })
  it('a chore falling due during a vacation does not penalise the pet, and is not worst', () => {
    // Weekly Saturday due 10-10, vacation 10-09..10-16.
    const chores = [chore('sat', { kind: 'weekly', weekday: 6 }, '2026-10-06')]
    const p = petCondition(chores, [], '2026-10-14', win('2026-10-09', '2026-10-16'))
    expect(p.health).toBe(100)
    expect(p.worst).toBeNull()
    // The first day back it is due, not late: the pet is fine on the day you get home.
    const back = petCondition(chores, [], '2026-10-17', win('2026-10-09', '2026-10-16'))
    expect(back.statuses[0]).toMatchObject({ state: 'due', overdueDays: 0 })
    expect(back.health).toBe(100)
    expect(back.worst).toBeNull()
    // The day after that it starts counting.
    const after = petCondition(chores, [], '2026-10-18', win('2026-10-09', '2026-10-16'))
    expect(after.statuses[0].overdueDays).toBe(1)
    expect(after.health).toBe(96)
    expect(after.worst?.choreId).toBe('sat')
  })
  it('doing a chore during a vacation resets it so the pet stays healthy afterwards', () => {
    const chores = [chore('a', { kind: 'daily' }, '2026-10-01')]
    const v = win('2026-10-05', '2026-10-12')
    const comps = done('a', '2026-10-01', '2026-10-12')
    // Due 10-13 after the completion on the last vacation day.
    expect(petCondition(chores, comps, '2026-10-13', v).health).toBe(100)
    expect(petCondition(chores, comps, '2026-10-14', v).health).toBe(96)
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
    expect(petCondition(chores, [], '2027-03-04', v).health).toBe(100) // the first day back: due
    expect(petCondition(chores, [], '2027-03-05', v).health).toBe(96)
  })
})
