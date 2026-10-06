import { describe, expect, it } from 'vitest'
import type { Chore, Schedule } from '../domain/types'
import {
  describeSchedule,
  formFromChore,
  ordinal,
  parseN,
  scheduleFromForm,
  stepN,
  toggleDay,
  validateForm,
  valueFromForm,
  type ChoreFormState,
} from './choreForm'

// 2026-10-06 is a Tuesday (weekday 2).
const TODAY = '2026-10-06'

function chore(schedule: Schedule, name = 'Water plants'): Chore {
  return { id: 'c1', homeId: 'h1', objectId: null, name, schedule, createdOn: TODAY, photoProof: false }
}

function form(patch: Partial<ChoreFormState> = {}): ChoreFormState {
  return { ...formFromChore(undefined, TODAY), name: 'Dishes', ...patch }
}

describe('formFromChore', () => {
  it('defaults a new chore to daily with date-based defaults for the other kinds', () => {
    const f = formFromChore(undefined, TODAY)
    expect(f).toMatchObject({ name: '', kind: 'daily', n: '3', days: [2], weekday: 2, dayOfMonth: 6 })
  })

  it('keeps the existing schedule values when editing', () => {
    expect(formFromChore(chore({ kind: 'everyNDays', n: 9 }), TODAY)).toMatchObject({ kind: 'everyNDays', n: '9' })
    expect(formFromChore(chore({ kind: 'weekly', weekday: 0 }), TODAY)).toMatchObject({ kind: 'weekly', weekday: 0 })
    expect(formFromChore(chore({ kind: 'monthly', dayOfMonth: 31 }), TODAY)).toMatchObject({ kind: 'monthly', dayOfMonth: 31 })
    expect(formFromChore(chore({ kind: 'weekdays', days: [0, 5, 1] }), TODAY).days).toEqual([1, 5, 0])
    expect(formFromChore(chore({ kind: 'daily' }, 'Bins'), TODAY).name).toBe('Bins')
  })
})

describe('round trip', () => {
  const schedules: Schedule[] = [
    { kind: 'daily' },
    { kind: 'everyNDays', n: 3 },
    { kind: 'everyNDays', n: 60 },
    { kind: 'weekdays', days: [1, 3, 5] },
    { kind: 'weekdays', days: [6, 0] },
    { kind: 'weekly', weekday: 0 },
    { kind: 'monthly', dayOfMonth: 1 },
    { kind: 'monthly', dayOfMonth: 31 },
  ]
  for (const schedule of schedules) {
    it(`keeps ${JSON.stringify(schedule)}`, () => {
      expect(scheduleFromForm(formFromChore(chore(schedule), TODAY))).toEqual(schedule)
    })
  }

  it('switching kinds uses sensible defaults', () => {
    expect(scheduleFromForm(form({ kind: 'weekly' }))).toEqual({ kind: 'weekly', weekday: 2 })
    expect(scheduleFromForm(form({ kind: 'monthly' }))).toEqual({ kind: 'monthly', dayOfMonth: 6 })
    expect(scheduleFromForm(form({ kind: 'weekdays' }))).toEqual({ kind: 'weekdays', days: [2] })
    expect(scheduleFromForm(form({ kind: 'everyNDays' }))).toEqual({ kind: 'everyNDays', n: 3 })
  })

  it('stores weekdays with 0 = Sunday, in Monday-first order', () => {
    expect(scheduleFromForm(form({ kind: 'weekdays', days: [0, 3, 1] }))).toEqual({ kind: 'weekdays', days: [1, 3, 0] })
  })
})

describe('validateForm', () => {
  it('accepts a good form', () => {
    expect(validateForm(form())).toEqual({})
  })

  it('requires a trimmed name of at most 40 characters', () => {
    expect(validateForm(form({ name: '' })).name).toBeTruthy()
    expect(validateForm(form({ name: '   ' })).name).toBeTruthy()
    expect(validateForm(form({ name: 'a'.repeat(40) })).name).toBeUndefined()
    expect(validateForm(form({ name: `  ${'a'.repeat(40)}  ` })).name).toBeUndefined()
    expect(validateForm(form({ name: 'a'.repeat(41) })).name).toBeTruthy()
  })

  it('requires at least one weekday for the weekdays kind only', () => {
    expect(validateForm(form({ kind: 'weekdays', days: [] })).days).toBeTruthy()
    expect(validateForm(form({ kind: 'weekly', days: [] })).days).toBeUndefined()
  })

  it('requires N from 2 to 60 for the every-few-days kind only', () => {
    for (const bad of ['', '1', '0', '61', '2.5', '-3', 'abc', '1e2']) {
      expect(validateForm(form({ kind: 'everyNDays', n: bad })).n, bad).toBeTruthy()
    }
    for (const ok of ['2', '30', '60', ' 7 ']) {
      expect(validateForm(form({ kind: 'everyNDays', n: ok })).n, ok).toBeUndefined()
    }
    expect(validateForm(form({ kind: 'daily', n: '999' })).n).toBeUndefined()
  })
})

describe('valueFromForm', () => {
  it('trims the name and builds the schedule', () => {
    expect(valueFromForm(form({ name: '  Dishes  ', kind: 'everyNDays', n: '4' }))).toEqual({
      name: 'Dishes',
      schedule: { kind: 'everyNDays', n: 4 },
    })
  })

  it('is null while invalid', () => {
    expect(valueFromForm(form({ name: '' }))).toBeNull()
    expect(valueFromForm(form({ kind: 'weekdays', days: [] }))).toBeNull()
    expect(scheduleFromForm(form({ kind: 'everyNDays', n: '1' }))).toBeNull()
  })
})

describe('number and day helpers', () => {
  it('parses N strictly', () => {
    expect(parseN('12')).toBe(12)
    expect(parseN('1')).toBeNull()
    expect(parseN('')).toBeNull()
  })

  it('steps N within range', () => {
    expect(stepN('3', 1)).toBe('4')
    expect(stepN('2', -1)).toBe('2')
    expect(stepN('60', 1)).toBe('60')
    expect(stepN('', 1)).toBe('2')
    expect(stepN('x', -1)).toBe('2')
    expect(stepN('500', -1)).toBe('60')
  })

  it('toggles weekdays', () => {
    expect(toggleDay([1], 0)).toEqual([1, 0])
    expect(toggleDay([1, 0], 1)).toEqual([0])
    expect(toggleDay([0], 0)).toEqual([])
  })
})

describe('describeSchedule', () => {
  it('describes each kind', () => {
    expect(describeSchedule({ kind: 'daily' })).toBe('Every day')
    expect(describeSchedule({ kind: 'everyNDays', n: 3 })).toBe('Every 3 days')
    expect(describeSchedule({ kind: 'weekdays', days: [5, 1, 3] })).toBe('Mon, Wed, Fri')
    expect(describeSchedule({ kind: 'weekdays', days: [0, 6] })).toBe('Sat, Sun')
    expect(describeSchedule({ kind: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day')
    expect(describeSchedule({ kind: 'weekdays', days: [] })).toBe('No days picked')
    expect(describeSchedule({ kind: 'weekly', weekday: 0 })).toBe('Every Sunday')
    expect(describeSchedule({ kind: 'monthly', dayOfMonth: 1 })).toBe('On the 1st')
    expect(describeSchedule({ kind: 'monthly', dayOfMonth: 28 })).toBe('On the 28th')
    expect(describeSchedule({ kind: 'monthly', dayOfMonth: 31 })).toBe('On the 31st (or the last day of shorter months)')
  })

  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '30th', '31st',
    ])
  })
})
