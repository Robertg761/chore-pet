import { describe, expect, it } from 'vitest'
import type { Chore } from '../domain/types'
import { FIRST_DONE_HINT, PLACING_COPY, coachCopy, coachStep, hasDueChore, hintKey, onboardedKey, readFlag, showFirstDoneHint, writeFlag, type FlagStorage } from './onboardingModel'

function memory(): FlagStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

const blocked: FlagStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('coach steps', () => {
  it('moves on as things are placed', () => {
    expect([0, 1, 2, 5].map(coachStep)).toEqual([1, 2, 3, 3])
  })

  it('has short copy with a live chore count', () => {
    expect(coachCopy(1, 0)).toEqual({ text: 'Tap something to put it in your room.', count: null })
    expect(coachCopy(2, 1).count).toBe('1 chore so far')
    expect(coachCopy(2, 4).count).toBe('4 chores so far')
    expect(coachCopy(2, 2, true).text).toContain('Tap Add a chore')
    expect(coachCopy(3, 7).text).toBe('Looks cosy! Tap Finish to meet your chores.')
  })

  it('says everything you place brings chores', () => {
    expect(coachCopy(2, 1).text).toBe('Everything you place brings its own chores. Add one or two more.')
    expect(coachCopy(2, 1, true).text).toBe('Everything you place brings its own chores. Tap Add a chore for one or two more.')
  })

  it('has a placing state that wins over the step text and keeps the count', () => {
    expect(PLACING_COPY).toBe('Drag it where it goes, then tap Place it.')
    expect(coachCopy(1, 0, false, true)).toEqual({ text: PLACING_COPY, count: null })
    expect(coachCopy(2, 3, true, true)).toEqual({ text: PLACING_COPY, count: '3 chores so far' })
    expect(coachCopy(3, 1, false, true).text).toBe(PLACING_COPY)
    expect(coachCopy(2, 1, false, false).text).not.toBe(PLACING_COPY)
  })

  it('has a first-done hint that says to do it for real', () => {
    expect(FIRST_DONE_HINT).toBe('Do it for real, then tap Done. Your pet will notice!')
  })
})

describe('flags', () => {
  it('remembers per home', () => {
    const s = memory()
    expect(readFlag(onboardedKey('a'), s)).toBe(false)
    writeFlag(onboardedKey('a'), s)
    expect(readFlag(onboardedKey('a'), s)).toBe(true)
    expect(readFlag(onboardedKey('b'), s)).toBe(false)
    expect(readFlag(hintKey('a'), s)).toBe(false)
  })

  it('never throws when storage is blocked or missing', () => {
    expect(() => writeFlag('k', blocked)).not.toThrow()
    expect(readFlag('k', blocked)).toBe(false)
    expect(() => writeFlag('k', null)).not.toThrow()
    expect(readFlag('k', null)).toBe(false)
  })
})

describe('first done hint', () => {
  const chore: Chore = {
    id: 'c1',
    homeId: 'h',
    objectId: 'o',
    name: 'Wipe the counter',
    schedule: { kind: 'daily' },
    createdOn: '2026-01-05',
    photoProof: false,
  }

  it('needs a chore that can be done today', () => {
    expect(hasDueChore([chore], [], '2026-01-05', [])).toBe(true)
    expect(hasDueChore([], [], '2026-01-05', [])).toBe(false)
  })

  it('shows only after a first build and before any completion', () => {
    const base = { onboarded: true, hintDone: false, completionCount: 0, dueChore: true }
    expect(showFirstDoneHint(base)).toBe(true)
    expect(showFirstDoneHint({ ...base, onboarded: false })).toBe(false)
    expect(showFirstDoneHint({ ...base, hintDone: true })).toBe(false)
    expect(showFirstDoneHint({ ...base, completionCount: 1 })).toBe(false)
    expect(showFirstDoneHint({ ...base, dueChore: false })).toBe(false)
  })
})
