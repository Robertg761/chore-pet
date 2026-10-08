import { describe, expect, it } from 'vitest'
import { SKIP_HISTORY } from '../domain/schedule'
import type { Chore, ISODate, Schedule } from '../domain/types'
import { skipChore, unskipChore, updateChore } from './actions'
import type { NewOp } from './state'

// Fixed dates only. 2026-10-06 is a Tuesday.
const chore = (schedule: Schedule = { kind: 'daily' }, extra: Partial<Chore> = {}): Chore => ({
  id: 'c',
  homeId: 'h',
  objectId: 'o',
  name: 'Laundry',
  schedule,
  createdOn: '2026-09-01',
  photoProof: false,
  ...extra,
})

/** The row a single chores upsert carries. */
const savedChore = (ops: NewOp[]): Chore => {
  expect(ops).toHaveLength(1)
  const [op] = ops
  expect(op.table).toBe('chores')
  expect(op.kind).toBe('upsert')
  return (op as Extract<NewOp, { table: 'chores'; kind: 'upsert' }>).value
}

/** Day n of January 2026 (0 = 2026-01-01), computed without the real clock. */
const day = (n: number): ISODate => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10)

describe('skipChore', () => {
  it('returns one chores upsert keyed by the chore id, with the day added to skips', () => {
    const c = chore({ kind: 'weekdays', days: [1, 4] })
    expect(skipChore(c, '2026-10-06')).toEqual([
      { table: 'chores', kind: 'upsert', key: 'c', value: { ...c, schedule: { kind: 'weekdays', days: [1, 4], skips: ['2026-10-06'] } } },
    ])
  })

  it('keeps the skips sorted and deduplicated', () => {
    const c = chore({ kind: 'daily', skips: ['2026-10-03', '2026-10-01', '2026-10-03'] })
    expect(savedChore(skipChore(c, '2026-10-02')).schedule.skips).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(savedChore(skipChore(c, '2026-09-20')).schedule.skips).toEqual(['2026-09-20', '2026-10-01', '2026-10-03'])
  })

  it('returns no ops when the day is already skipped', () => {
    expect(skipChore(chore({ kind: 'daily', skips: ['2026-10-06'] }), '2026-10-06')).toEqual([])
  })

  it('keeps at most SKIP_HISTORY skips, dropping the oldest', () => {
    expect(SKIP_HISTORY).toBe(30)
    const full = Array.from({ length: SKIP_HISTORY }, (_, i) => day(i))
    const c = chore({ kind: 'daily', skips: full })
    const skips = savedChore(skipChore(c, '2026-10-06')).schedule.skips!
    expect(skips).toHaveLength(SKIP_HISTORY)
    expect(skips[0]).toBe(full[1])
    expect(skips.at(-1)).toBe('2026-10-06')
  })

  it('keeps the newest skips when the cap is reached, even if the new day is older', () => {
    const full = Array.from({ length: SKIP_HISTORY }, (_, i) => day(i + 10))
    const skips = savedChore(skipChore(chore({ kind: 'daily', skips: full }), day(0))).schedule.skips!
    expect(skips).toHaveLength(SKIP_HISTORY)
    expect(skips).not.toContain(day(0))
    expect(skips).toEqual(full)
  })

  it('keeps every other schedule field (kind, since, before, resume)', () => {
    const schedule: Schedule = {
      kind: 'everyNDays',
      n: 3,
      since: '2026-10-01',
      before: { kind: 'daily', since: '2026-09-01' },
      resume: { due: '2026-10-04', last: '2026-10-02' },
    }
    const saved = savedChore(skipChore(chore(schedule), '2026-10-06'))
    expect(saved.schedule).toEqual({ ...schedule, skips: ['2026-10-06'] })
  })

  it('leaves the chore row otherwise unchanged', () => {
    const c = chore({ kind: 'daily' }, { archivedOn: '2027-01-01' })
    const saved = savedChore(skipChore(c, '2026-10-06'))
    expect(saved).toMatchObject({ id: 'c', homeId: 'h', objectId: 'o', name: 'Laundry', createdOn: '2026-09-01', archivedOn: '2027-01-01' })
  })

  it('drops malformed skip entries rather than keeping them', () => {
    const c = chore({ kind: 'daily', skips: ['not a day', '2026-10-02'] as ISODate[] })
    expect(savedChore(skipChore(c, '2026-10-06')).schedule.skips).toEqual(['2026-10-02', '2026-10-06'])
  })
})

describe('unskipChore', () => {
  it('removes just that day and keeps the others', () => {
    const c = chore({ kind: 'daily', skips: ['2026-10-03', '2026-10-06'] })
    expect(savedChore(unskipChore(c, '2026-10-06')).schedule.skips).toEqual(['2026-10-03'])
  })

  it('removes the skips key entirely when no skips remain', () => {
    const c = chore({ kind: 'daily', skips: ['2026-10-06'] })
    const saved = savedChore(unskipChore(c, '2026-10-06'))
    expect(saved.schedule).toEqual({ kind: 'daily' })
    expect('skips' in saved.schedule).toBe(false)
  })

  it('keeps every other schedule field when removing the last skip', () => {
    const schedule: Schedule = { kind: 'weekly', weekday: 6, since: '2026-10-01', before: { kind: 'daily' }, resume: { due: '2026-10-10', last: '2026-10-03' } }
    const saved = savedChore(unskipChore(chore({ ...schedule, skips: ['2026-10-06'] }), '2026-10-06'))
    expect(saved.schedule).toEqual(schedule)
  })

  it('returns no ops when the day was not skipped', () => {
    expect(unskipChore(chore({ kind: 'daily' }), '2026-10-06')).toEqual([])
    expect(unskipChore(chore({ kind: 'daily', skips: ['2026-10-05'] }), '2026-10-06')).toEqual([])
  })

  it('undoes a skip: skip then unskip gives back the original schedule', () => {
    const original = chore({ kind: 'monthly', dayOfMonth: 1, since: '2026-09-15' })
    const skipped = savedChore(skipChore(original, '2026-10-06'))
    expect(savedChore(unskipChore(skipped, '2026-10-06')).schedule).toEqual(original.schedule)
  })
})

describe('updateChore and skips', () => {
  const base = chore({ kind: 'weekly', weekday: 5, skips: ['2026-10-03'] }, { createdOn: '2026-09-01' })

  it('a schedule change keeps the existing skips on the new schedule, with since and before set as before', () => {
    const saved = savedChore(updateChore(base, { schedule: { kind: 'daily' } }, '2026-10-07'))
    expect(saved.schedule).toMatchObject({ kind: 'daily', since: '2026-10-07', skips: ['2026-10-03'] })
    expect(saved.schedule.before).toMatchObject({ kind: 'weekly', weekday: 5 })
    expect(saved.schedule.before?.since).toBeUndefined()
  })

  it('a schedule change on a chore with no skips adds no skips key', () => {
    const saved = savedChore(updateChore(chore({ kind: 'daily' }), { schedule: { kind: 'weekly', weekday: 1 } }, '2026-10-07'))
    expect('skips' in saved.schedule).toBe(false)
    expect(saved.schedule).toMatchObject({ kind: 'weekly', weekday: 1, since: '2026-10-07' })
  })

  it('a form schedule carrying its own skips does not replace the chore skips on a schedule change', () => {
    const saved = savedChore(updateChore(base, { schedule: { kind: 'daily', skips: ['2026-09-15'] } }, '2026-10-07'))
    expect(saved.schedule.skips).toEqual(['2026-10-03'])
  })

  it('a form schedule carrying skips does not add skips to a chore that has none', () => {
    const saved = savedChore(updateChore(chore({ kind: 'daily' }), { schedule: { kind: 'weekly', weekday: 1, skips: ['2026-09-15'] } }, '2026-10-07'))
    expect('skips' in saved.schedule).toBe(false)
  })

  it('a rename keeps the schedule, skips included, untouched', () => {
    const saved = savedChore(updateChore(base, { name: 'Sheets' }, '2026-10-07'))
    expect(saved.name).toBe('Sheets')
    expect(saved.schedule).toEqual(base.schedule)
  })

  it('a same-schedule save with a form that carries other skips keeps the chore skips', () => {
    const saved = savedChore(updateChore(base, { name: 'Laundry', schedule: { kind: 'weekly', weekday: 5, skips: ['2026-09-15'] } }, '2026-10-07'))
    expect(saved.schedule).toEqual(base.schedule)
  })

  it('skipping after a schedule change adds to the skips carried over', () => {
    const changed = savedChore(updateChore(base, { schedule: { kind: 'daily' } }, '2026-10-07'))
    expect(savedChore(skipChore(changed, '2026-10-08')).schedule.skips).toEqual(['2026-10-03', '2026-10-08'])
  })

  // Skips are kept on the current schedule only (Schedule.skips), so history never copies them.
  it('keeps skips only on the current schedule, not in the replaced one', () => {
    const saved = savedChore(updateChore(base, { schedule: { kind: 'daily' } }, '2026-10-07'))
    expect(saved.schedule.before).not.toHaveProperty('skips')
  })
})
