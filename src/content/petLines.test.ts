import { describe, expect, it } from 'vitest'
import { CATALOG } from '../catalog/objects'
import {
  BIG_DONE_LINES,
  CAUGHT_UP_LINES,
  CHORE_LINES,
  CHORE_OBJECT_LINES,
  DONE_LINES,
  FIRST_OF_DAY_LINES,
  KIND_LINES,
  MOOD_LINES,
  OBJECT_LINES,
  TAP_LINES,
  VACATION_LINES,
  WELCOME_BACK_LINES,
  WELCOME_LINES,
  messLine,
  objectLine,
  pickLine,
} from './petLines'

const MOODS = ['happy', 'content', 'meh', 'scruffy', 'sick'] as const

const BANNED = ['forgot', 'never', 'fault', 'blame', 'die', 'dying', 'dead', 'disappoint', 'lazy']
const BANNED_PHRASES = ['you forgot', 'you never', 'because of you', "i'm sad because you", 'again?']
// Whole words only, so "later" and "mustard" are fine.
const BANNED_WORDS = ['should', 'must', 'lazy', 'disappointed', 'finally', 'ignored', 'neglected', 'overdue']
// Species-neutral: every line works for Mochi, Bun and Sprout.
const SPECIES_WORDS = ['fur', 'paw', 'paws', 'whisker', 'whiskers', 'tail', 'ears']
const TYPICAL_CHORE = 'wash the dishes'

const ALL_LISTS: Record<string, string[]> = {
  ...Object.fromEntries(MOODS.map((m) => [`MOOD_LINES.${m}`, MOOD_LINES[m]])),
  ...Object.fromEntries(Object.entries(OBJECT_LINES).map(([id, l]) => [`OBJECT_LINES.${id}`, l])),
  CHORE_LINES,
  TAP_LINES,
  DONE_LINES,
  VACATION_LINES,
  WELCOME_LINES,
  WELCOME_BACK_LINES,
  CAUGHT_UP_LINES,
  BIG_DONE_LINES,
  FIRST_OF_DAY_LINES,
  ...Object.fromEntries(
    Object.entries(KIND_LINES).flatMap(([kind, levels]) => Object.entries(levels).map(([level, l]) => [`KIND_LINES.${kind}.${level}`, l])),
  ),
  ...Object.fromEntries(Object.entries(CHORE_OBJECT_LINES).map(([key, l]) => [`CHORE_OBJECT_LINES.${key}`, l])),
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
    expect(DONE_LINES.length).toBeGreaterThanOrEqual(14)
    expect(DONE_LINES.length).toBeLessThanOrEqual(18)
    expect(BIG_DONE_LINES.length).toBeGreaterThanOrEqual(3)
    expect(FIRST_OF_DAY_LINES.length).toBeGreaterThanOrEqual(3)
    expect(WELCOME_BACK_LINES.length).toBeGreaterThanOrEqual(2)
    expect(CAUGHT_UP_LINES.length).toBeGreaterThanOrEqual(3)
    for (const kind of ['stink', 'dust', 'wilt'] as const) {
      for (const level of [2, 3] as const) expect(KIND_LINES[kind][level].length, `${kind} ${level}`).toBeGreaterThanOrEqual(2)
    }
    expect(VACATION_LINES.length).toBeGreaterThanOrEqual(3)
    expect(VACATION_LINES.length).toBeLessThanOrEqual(4)
    expect(WELCOME_LINES.length).toBeGreaterThanOrEqual(3)
    expect(WELCOME_LINES.length).toBeLessThanOrEqual(4)
  })

  it('keeps every line under 60 characters, and chore lines under 48 filled', () => {
    for (const [name, lines] of Object.entries(ALL_LISTS)) {
      for (const line of lines) {
        expect(line.length, `${name}: ${line}`).toBeLessThan(60)
        if (line.includes('{chore}')) {
          expect(pickLine([line], 0, { chore: TYPICAL_CHORE }).length, `${name}: ${line}`).toBeLessThan(48)
        }
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
        const words = lower.split(/[^a-z']+/)
        for (const word of BANNED_WORDS) expect(words, `${name}: "${line}" has "${word}"`).not.toContain(word)
        for (const word of SPECIES_WORDS) expect(words, `${name}: "${line}" is not species-neutral ("${word}")`).not.toContain(word)
        // Match the catalog and the vacation feature's name.
        expect(words, `${name}: "${line}"`).not.toContain('bin')
        expect(words, `${name}: "${line}"`).not.toContain('holiday')
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
    for (const [name, lines] of Object.entries(ALL_LISTS)) {
      if (name === 'CHORE_LINES' || name === 'DONE_LINES') continue
      for (const line of lines) expect(line, name).not.toContain('{chore}')
    }
  })

  it('has chore lines that read after a verb phrase', () => {
    expect(CHORE_LINES).toContain('It would be wonderful to {chore}.')
    expect(CHORE_LINES).toContain('How about we {chore} next?')
    expect(DONE_LINES).toContain('{chore}? Done and dusted!')
    expect(pickLine(['{chore}? Done and dusted!'], 0, { chore: 'make the bed' })).toBe('Make the bed? Done and dusted!')
  })

  it('has per-chore lines that point at a real catalog chore', () => {
    for (const key of Object.keys(CHORE_OBJECT_LINES)) {
      const [id, index] = key.split(':')
      const entry = CATALOG.find((e) => e.id === id)
      expect(entry, key).toBeDefined()
      expect(entry!.chores[Number(index)], key).toBeDefined()
    }
  })

  it('stays under 60 characters filled with the longest catalog chore name', () => {
    const names = CATALOG.flatMap((e) => e.chores.map((c) => c.name.toLowerCase()))
    for (const chore of names) {
      for (const line of [...CHORE_LINES, ...DONE_LINES, ...BIG_DONE_LINES, ...FIRST_OF_DAY_LINES, ...Object.values(OBJECT_LINES).flat()]) {
        expect(pickLine([line], 0, { chore }).length, `${chore}: ${line}`).toBeLessThan(60)
      }
    }
  })
})

describe('messLine', () => {
  it('picks from the kind and level, and is deterministic', () => {
    for (const kind of ['stink', 'dust', 'wilt'] as const) {
      for (const level of [2, 3] as const) {
        for (let beat = -3; beat <= 6; beat++) {
          const line = messLine(kind, level, beat)
          expect(KIND_LINES[kind][level], `${kind} ${level}`).toContain(line)
          expect(messLine(kind, level, beat)).toBe(line)
        }
      }
    }
  })

  it('is quiet below level 2 and clamps above 3', () => {
    expect(messLine('stink', 0, 0)).toBe('')
    expect(messLine('stink', 1, 0)).toBe('')
    expect(messLine('dust', Number.NaN, 0)).toBe('')
    expect(KIND_LINES.dust[3]).toContain(messLine('dust', 5, 0))
  })

  it('is never different for a chore name, since kind lines have no placeholder', () => {
    expect(messLine('wilt', 2, 1, { chore: 'Water the plant' })).toBe(messLine('wilt', 2, 1))
  })
})

describe('objectLine', () => {
  it('uses the chore-specific lines by catalog index', () => {
    expect(CHORE_OBJECT_LINES['bed:1']).toContain(objectLine('bed', 'Change the sheets', 0))
    expect(CHORE_OBJECT_LINES['bed:0']).toContain(objectLine('bed', 'Make the bed', 0))
    expect(CHORE_OBJECT_LINES['fish-tank:0']).toContain(objectLine('fish-tank', 'Feed the fish', 3))
    expect(CHORE_OBJECT_LINES['fish-tank:1']).toContain(objectLine('fish-tank', 'clean the fish tank ', 3))
    expect(objectLine('washer', 'Run a washer cleaning cycle', 7)).toBe('The washer would love a spa day.')
  })

  it('falls back to the object lines for other, renamed or unknown chores', () => {
    expect(OBJECT_LINES.washer).toContain(objectLine('washer', 'Do a load of laundry', 0))
    expect(OBJECT_LINES.sink).toContain(objectLine('sink', 'Dishes my way', 1))
    expect(objectLine('nope', 'Anything', 0)).toBe('')
  })

  it('never leaves a placeholder or an empty line for any catalog chore', () => {
    for (const entry of CATALOG) {
      for (const chore of entry.chores) {
        for (let beat = 0; beat < 4; beat++) {
          const line = objectLine(entry.id, chore.name, beat)
          expect(line, `${entry.id}: ${chore.name}`).not.toBe('')
          expect(line).not.toContain('{')
        }
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
      expect(pickLine(DONE_LINES, seed, { chore: TYPICAL_CHORE })).not.toContain('{')
      for (const lines of [BIG_DONE_LINES, FIRST_OF_DAY_LINES, WELCOME_BACK_LINES, CAUGHT_UP_LINES]) {
        expect(pickLine(lines, seed)).toBeTruthy()
        expect(pickLine(lines, seed, { chore: TYPICAL_CHORE })).not.toContain('{')
      }
    }
  })
})

describe('chore names in lines', () => {
  it('lowers only the first letter, keeping names and acronyms', () => {
    expect(pickLine(['How about we {chore} next?'], 0, { chore: 'Feed Mochi' })).toBe('How about we feed Mochi next?')
    expect(pickLine(['How about we {chore} next?'], 0, { chore: 'Wash the dishes' })).toBe('How about we wash the dishes next?')
    expect(pickLine(['On my list: {chore}.'], 0, { chore: 'TV dusting' })).toBe('On my list: TV dusting.')
  })
})
