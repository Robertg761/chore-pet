import { describe, expect, it } from 'vitest'
import { neglectLevel } from '../domain/neglect'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore } from '../domain/types'
import {
  DEFAULT_PREFS,
  isValidTime,
  parsePrefs,
  pickReminder,
  PRIVATE_REMINDER_BODY,
  reminderMessage,
  REMINDER_DUE_LINES,
  REMINDER_OVERDUE_LINES,
  shouldNotify,
  timeToMinutes,
  type ReminderPrefs,
} from './reminderLogic'
import { pickLine } from '../content/petLines'
import { loadLastSent, loadPrefs, PREFS_KEY, saveLastSent, savePrefs } from './reminderStore'

const on: ReminderPrefs = { enabled: true, time: '09:00' }
const at = (h: number, m = 0) => new Date(2026, 9, 6, h, m)
const status = (choreId: string, state: ChoreStatus['state'], overdueDays = 0, dueDate = '2026-10-06'): ChoreStatus => ({
  choreId,
  dueDate,
  state,
  overdueDays,
  neglect: state === 'overdue' ? neglectLevel(overdueDays, { kind: 'daily' }) : 0,
})
const chore = (id: string, name: string): Chore => ({
  id,
  homeId: 'h',
  objectId: null,
  name,
  schedule: { kind: 'daily' },
  createdOn: '2026-10-01',
  photoProof: false,
})

describe('time helpers', () => {
  it('validates and converts HH:MM', () => {
    expect(isValidTime('09:00')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('9:00')).toBe(false)
    expect(isValidTime('')).toBe(false)
    expect(isValidTime(900)).toBe(false)
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('nope')).toBeNull()
  })

  it('reads prefs and falls back on junk', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(parsePrefs('{oops')).toEqual(DEFAULT_PREFS)
    expect(parsePrefs('42')).toEqual(DEFAULT_PREFS)
    expect(parsePrefs('null')).toEqual(DEFAULT_PREFS)
    expect(parsePrefs(JSON.stringify({ enabled: true, time: '07:15' }))).toEqual({ enabled: true, time: '07:15' })
    expect(parsePrefs(JSON.stringify({ enabled: 'yes', time: '99:99' }))).toEqual(DEFAULT_PREFS)
  })
})

describe('shouldNotify', () => {
  const due = [status('a', 'due')]

  it('sends at or after the chosen time when something is due', () => {
    expect(shouldNotify(at(9, 0), on, null, due, false)).toBe(true)
    expect(shouldNotify(at(17, 30), on, '2026-10-05', due, false)).toBe(true)
  })

  it('waits until the chosen time', () => {
    expect(shouldNotify(at(8, 59), on, null, due, false)).toBe(false)
  })

  it('sends at most once a day', () => {
    expect(shouldNotify(at(10), on, '2026-10-06', due, false)).toBe(false)
    expect(shouldNotify(at(10), on, '2026-10-05', due, false)).toBe(true)
  })

  it('stays quiet when off, on vacation, or nothing is due', () => {
    expect(shouldNotify(at(10), { ...on, enabled: false }, null, due, false)).toBe(false)
    expect(shouldNotify(at(10), on, null, due, true)).toBe(false)
    expect(shouldNotify(at(10), on, null, [], false)).toBe(false)
    expect(shouldNotify(at(10), on, null, [status('a', 'upcoming', 0, '2026-10-08')], false)).toBe(false)
  })

  it('counts overdue chores and ignores a broken time', () => {
    expect(shouldNotify(at(10), on, null, [status('a', 'overdue', 2, '2026-10-04')], false)).toBe(true)
    expect(shouldNotify(at(10), { enabled: true, time: 'x' }, null, due, false)).toBe(false)
  })
})

describe('pickReminder', () => {
  const chores = [chore('a', 'Dishes'), chore('b', 'Vacuum'), chore('c', 'Water the plants')]

  it('is null when nothing is due', () => {
    expect(pickReminder('Mochi', chores, [], '2026-10-06')).toBeNull()
    expect(pickReminder('Mochi', chores, [status('a', 'upcoming')], '2026-10-06')).toBeNull()
  })

  it('titles with the pet name and talks about the most overdue chore', () => {
    const statuses = [status('a', 'due'), status('b', 'overdue', 1, '2026-10-05'), status('c', 'overdue', 3, '2026-10-03')]
    const msg = pickReminder('Mochi', chores, statuses, '2026-10-06')
    expect(msg?.title).toBe('Mochi')
    expect(msg?.body).toContain('Water the plants'.toLowerCase())
    expect(msg?.body).toContain('Plus 2 more.')
  })

  it('uses a gentle due-today line when nothing is overdue', () => {
    const msg = pickReminder('Bun', chores, [status('a', 'due')], '2026-10-06')
    expect(msg?.body.toLowerCase()).toContain('dishes')
    expect(msg?.body).not.toContain('Plus')
  })

  it('is deterministic for a day and skips chores it does not know', () => {
    const s = [status('a', 'due')]
    expect(pickReminder('Bun', chores, s, '2026-10-06')).toEqual(pickReminder('Bun', chores, s, '2026-10-06'))
    expect(pickReminder('Bun', chores, [status('zzz', 'due')], '2026-10-06')).toBeNull()
  })

  it('keeps chore names out of a private reminder', () => {
    const statuses = [status('a', 'due'), status('c', 'overdue', 3, '2026-10-03')]
    const msg = reminderMessage('Mochi', chores, statuses, '2026-10-06', { private: true })
    expect(msg).toEqual({ title: 'Mochi', body: 'A few little jobs are ready.' })
    expect(PRIVATE_REMINDER_BODY).toBe('A few little jobs are ready.')
    expect(msg?.body.toLowerCase()).not.toContain('plants')
    expect(msg?.body).not.toContain('Plus')
    expect(reminderMessage('Mochi', chores, [], '2026-10-06', { private: true })).toBeNull()
    expect(reminderMessage('Mochi', chores, [status('zzz', 'due')], '2026-10-06', { private: true })).toBeNull()
  })

  it('is the same as pickReminder when not private', () => {
    const s = [status('c', 'overdue', 3, '2026-10-03'), status('a', 'due')]
    expect(reminderMessage('Mochi', chores, s, '2026-10-06')).toEqual(pickReminder('Mochi', chores, s, '2026-10-06'))
    expect(reminderMessage('Mochi', chores, s, '2026-10-06', { private: false })).toEqual(pickReminder('Mochi', chores, s, '2026-10-06'))
  })

  it('falls back to a generic title', () => {
    expect(pickReminder('  ', chores, [status('a', 'due')], '2026-10-06')?.title).toBe('Chore Pet')
  })
})

describe('reminder lines', () => {
  const BANNED = ['forgot', 'never', 'fault', 'blame', 'die', 'dying', 'dead', 'disappoint', 'lazy', 'late', 'behind', 'overdue']
  const all = [...REMINDER_OVERDUE_LINES, ...REMINDER_DUE_LINES]

  it('are kind, short, and use the chore name', () => {
    for (const line of all) {
      expect(line).toContain('{chore}')
      expect(line.length).toBeLessThanOrEqual(60)
      for (const word of BANNED) expect(line.toLowerCase().split(/\W+/)).not.toContain(word)
    }
  })
})

describe('reminder wording', () => {
  it('reads well with verb-phrase names, never opens with the chore, and has no typographic quotes', () => {
    for (const line of [...REMINDER_OVERDUE_LINES, ...REMINDER_DUE_LINES]) {
      expect(line.startsWith('{chore}'), line).toBe(false)
      expect(/^[\x20-\x7e]+$/.test(line), line).toBe(true)
      const filled = pickLine([line], 0, { chore: 'Wash the dishes' })
      expect(filled).toContain('wash the dishes')
      expect(filled).not.toContain('{')
    }
  })
})

describe('reminderStore', () => {
  const memory = () => {
    const data = new Map<string, string>()
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
  }

  it('round-trips prefs and last sent date', () => {
    const store = memory()
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS)
    savePrefs({ enabled: true, time: '18:30' }, store)
    expect(loadPrefs(store)).toEqual({ enabled: true, time: '18:30' })
    expect(loadLastSent(store)).toBeNull()
    saveLastSent('2026-10-06', store)
    expect(loadLastSent(store)).toBe('2026-10-06')
  })

  it('survives broken storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('no')
      },
      setItem: () => {
        throw new Error('no')
      },
    }
    expect(loadPrefs(broken)).toEqual(DEFAULT_PREFS)
    expect(loadLastSent(broken)).toBeNull()
    expect(() => savePrefs(on, broken)).not.toThrow()
    expect(() => saveLastSent('2026-10-06', broken)).not.toThrow()
    expect(loadPrefs(null)).toEqual(DEFAULT_PREFS)
    expect(PREFS_KEY).toBeTruthy()
  })

  it('keeps choices for the visit when storage refuses to save them', () => {
    const refusing = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
    savePrefs(on, refusing)
    expect(loadPrefs(refusing)).toEqual(on)
    saveLastSent('2026-10-06', refusing)
    expect(loadLastSent(refusing)).toBe('2026-10-06')
    // With no storage at all, too.
    savePrefs(on, null)
    expect(loadPrefs(null)).toEqual(on)
  })

  it('prefers storage again once a save goes through', () => {
    let refuse = true
    const values = new Map<string, string>()
    const flaky = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { if (refuse) throw new Error('no'); values.set(k, v) } }
    savePrefs(on, flaky)
    refuse = false
    savePrefs({ ...on, time: '07:15' }, flaky)
    values.set(PREFS_KEY, JSON.stringify({ ...on, time: '08:00' })) // another tab writes
    expect(loadPrefs(flaky)).toEqual({ ...on, time: '08:00' })
  })
})
