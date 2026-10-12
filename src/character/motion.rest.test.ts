import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion } from './motion'
import type { Species } from '../domain/types'

const at = (species: Species, elapsedMs: number, durationMs = ACTION_MS.rest, reducedMotion = false) =>
  sampleMotion({ species, mood: 'happy', action: 'rest', elapsedMs, durationMs, reducedMotion, distance: 0 })

describe('quiet environmental rest follow-through', () => {
  it.each([
    { species: 'mochi', limit: 1.25, speed: 5 },
    { species: 'bun', limit: 3.6, speed: 14 },
    { species: 'sprout', limit: 2.25, speed: 9 },
  ] as const)('keeps $species appendages small and slow beside resting furnishings', ({ species, limit, speed }) => {
    const frames = Array.from({ length: 2401 }, (_, ms) => at(species, ms))
    for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const values = frames.map(frame => frame[side])
      expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(limit + 1e-9)
      expect(Math.max(...values.map(Math.abs))).toBeGreaterThan(.25)
      const velocity = values.slice(1).map((value, i) => Math.abs(value - values[i]) * 1000)
      expect(Math.max(...velocity)).toBeLessThan(speed)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(0)
      expect(velocity.at(-1)).toBeLessThan(.1)
    }
  })
  it.each(['mochi', 'bun', 'sprout'] as const)('%s makes one quiet sway across different finite durations', species => {
    for (const duration of [1200, 2400, 4800]) for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const signs = Array.from({ length: 1001 }, (_, phase) => at(species, phase / 1000 * duration, duration)[side])
        .filter(value => Math.abs(value) > 1e-6).map(Math.sign)
      expect(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1])).toHaveLength(1)
    }
  })
  it('keeps reduced rest appendages still through its existing deadline', () => {
    expect(ACTION_MS.rest).toBe(2400)
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const ms of [0, 120, 600, 1200, 2100, 2399, 2400, 2600]) {
      const frame = at(species, ms, ACTION_MS.rest, true)
      expect(frame.leftAppendage).toBe(0)
      expect(frame.rightAppendage).toBe(0)
    }
  })
})
