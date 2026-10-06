import { describe, expect, it } from 'vitest'
import { CATALOG } from '../catalog/objects'
import {
  CHORE_LINES,
  DONE_LINES,
  MOOD_LINES,
  OBJECT_LINES,
  TAP_LINES,
  VACATION_LINES,
  WELCOME_LINES,
  pickLine,
} from './petLines'

const MOODS = ['happy', 'content', 'meh', 'scruffy', 'sick'] as const

const BANNED = ['forgot', 'never', 'fault', 'blame', 'die', 'dying', 'dead', 'disappoint', 'lazy']
const BANNED_PHRASES = ['you forgot', 'you never', 'because of you', "i'm sad because you"]
const TYPICAL_CHORE = 'wash the dishes'

const ALL_LISTS: Record<string, string[]> = {
  ...Object.fromEntries(MOODS.map((m) => [`MOOD_LINES.${m}`, MOOD_LINES[m]])),
  ...Object.fromEntries(Object.entries(OBJECT_LINES).map(([id, l]) => [`OBJECT_LINES.${id}`, l])),
  CHORE_LINES,
  TAP_LINES,
  DONE_LINES,
  VACATION_LINES,
  WELCOME_LINES,
}

describe('line lists', () => {
  it('has every list non-empty and within its size range', () => {
    for (const mood of MOODS) {
      expect(MOOD_LINES[mood].length).toBeGreaterThanOrEqual(4)
      expect(MOOD_LINES[mood].length).toBeLessThanOrEqual(6)
    }
    for (const lines of Object.values(OBJECT_LINES)) {
      expect(lines.length).toBeGreaterThanOrEqual(2)
      expect(lines.length).toBeLessThanOrEqual(3)
    }
    expect(CHORE_LINES.length).toBeGreaterThan(0)
    expect(TAP_LINES.length).toBeGreaterThanOrEqual(6)
    expect(TAP_LINES.length).toBeLessThanOrEqual(8)
    expect(DONE_LINES.length).toBeGreaterThanOrEqual(6)
    expect(DONE_LINES.length).toBeLessThanOrEqual(8)
    expect(VACATION_LINES.length).toBeGreaterThanOrEqual(3)
    expect(VACATION_LINES.length).toBeLessThanOrEqual(4)
    expect(WELCOME_LINES.length).toBeGreaterThanOrEqual(3)
    expect(WELCOME_LINES.length).toBeLessThanOrEqual(4)
  })

  it('keeps every line under 60 characters raw and under 48 filled', () => {
    for (const [name, lines] of Object.entries(ALL_LISTS)) {
      for (const line of lines) {
        expect(line.length, `${name}: ${line}`).toBeLessThan(60)
        expect(pickLine([line], 0, { chore: TYPICAL_CHORE }).length, `${name}: ${line}`).toBeLessThan(48)
      }
    }
  })

  it('is sentence case, plain text, and has no duplicates within a list', () => {
    for (const [name, lines] of Object.entries(ALL_LISTS)) {
      expect(new Set(lines).size, name).toBe(lines.length)
      for (const line of lines) {
        const first = line.charAt(0)
        const ok = first === '{' || first === first.toUpperCase()
        expect(ok, `${name}: ${line}`).toBe(true)
        // ASCII only: no emoji and no fancy punctuation.
        expect(/^[\x20-\x7e]+$/.test(line), `${name}: ${line}`).toBe(true)
      }
    }
  })

  it('never uses guilt or drama words', () => {
    for (const [name, lines] of Object.entries(ALL_LISTS)) {
      for (const line of lines) {
        const lower = line.toLowerCase()
        for (const word of BANNED) {
          expect(new RegExp(`\\b${word}`).test(lower), `${name}: "${line}" has "${word}"`).toBe(false)
        }
        for (const phrase of BANNED_PHRASES) {
          expect(lower.includes(phrase), `${name}: "${line}" has "${phrase}"`).toBe(false)
        }
      }
    }
  })

  it('has OBJECT_LINES for every catalog id and no stray ids', () => {
    for (const entry of CATALOG) {
      expect(OBJECT_LINES[entry.id], entry.id).toBeDefined()
      expect(OBJECT_LINES[entry.id].length, entry.id).toBeGreaterThan(0)
    }
    const ids = new Set(CATALOG.map((e) => e.id))
    for (const id of Object.keys(OBJECT_LINES)) expect(ids.has(id), id).toBe(true)
  })

  it('has chore lines that all use the placeholder, and no other lists that need it unexpectedly', () => {
    for (const line of CHORE_LINES) expect(line).toContain('{chore}')
    for (const lines of [TAP_LINES, VACATION_LINES, WELCOME_LINES, ...Object.values(MOOD_LINES)]) {
      for (const line of lines) expect(line).not.toContain('{chore}')
    }
  })

  it('stays under 60 characters filled with the longest catalog chore name', () => {
    const names = CATALOG.flatMap((e) => e.chores.map((c) => c.name.toLowerCase()))
    for (const chore of names) {
      for (const line of [...CHORE_LINES, ...DONE_LINES, ...Object.values(OBJECT_LINES).flat()]) {
        expect(pickLine([line], 0, { chore }).length, `${chore}: ${line}`).toBeLessThan(60)
      }
    }
  })
})

describe('pickLine', () => {
  const lines = ['One.', 'Two.', 'Three.']

  it('is deterministic for the same seed', () => {
    for (const seed of [0, 1, 2, 7, 12345, -3]) {
      expect(pickLine(lines, seed)).toBe(pickLine(lines, seed))
    }
  })

  it('cycles through lines by seed', () => {
    expect(pickLine(lines, 0)).toBe('One.')
    expect(pickLine(lines, 1)).toBe('Two.')
    expect(pickLine(lines, 2)).toBe('Three.')
    expect(pickLine(lines, 3)).toBe('One.')
  })

  it('handles negative, huge and odd seeds', () => {
    expect(pickLine(lines, -1)).toBe('Three.')
    expect(pickLine(lines, -3)).toBe('One.')
    expect(pickLine(lines, -1000001)).toBeTruthy()
    expect(lines).toContain(pickLine(lines, Number.MAX_SAFE_INTEGER))
    expect(lines).toContain(pickLine(lines, Number.MIN_SAFE_INTEGER))
    expect(lines).toContain(pickLine(lines, 2.7))
    expect(lines).toContain(pickLine(lines, Number.NaN))
    expect(lines).toContain(pickLine(lines, Number.POSITIVE_INFINITY))
  })

  it('fills {chore} with the lowercased chore name', () => {
    expect(pickLine(['Could we {chore} soon?'], 0, { chore: 'Wash the dishes' })).toBe('Could we wash the dishes soon?')
    expect(pickLine(['{chore} and {chore}.'], 0, { chore: 'nap' })).toBe('Nap and nap.')
  })

  it('capitalises a line that starts with the chore', () => {
    expect(pickLine(['{chore}: done!'], 0, { chore: 'make the bed' })).toBe('Make the bed: done!')
  })

  it('skips {chore} lines when no chore is given', () => {
    const mixed = ['Hi!', 'Could we {chore} soon?', 'Hello!']
    for (let seed = -5; seed <= 5; seed++) {
      expect(pickLine(mixed, seed)).not.toContain('{chore}')
      expect(pickLine(mixed, seed, {})).not.toContain('{chore}')
      expect(pickLine(mixed, seed, { chore: '   ' })).not.toContain('{chore}')
    }
  })

  it('returns an empty string when nothing is usable', () => {
    expect(pickLine([], 0)).toBe('')
    expect(pickLine(['Could we {chore} soon?'], 0)).toBe('')
  })

  it('never leaves a placeholder in real content', () => {
    for (let seed = -20; seed <= 20; seed++) {
      expect(pickLine(CHORE_LINES, seed, { chore: TYPICAL_CHORE })).not.toContain('{')
      expect(pickLine(DONE_LINES, seed)).not.toContain('{')
    }
  })
})
