import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion } from './motion'
import type { Species } from '../domain/types'

const at = (species: Species, elapsedMs: number, durationMs = ACTION_MS.affection, reducedMotion = false) =>
  sampleMotion({ species, mood: 'happy', action: 'affection', elapsedMs, durationMs, reducedMotion, distance: 0 })

describe('gentle affection follow-through', () => {
  it.each([
    { species: 'mochi', limit: 2.25, speed: 12 },
    { species: 'bun', limit: 6.6, speed: 35 },
    { species: 'sprout', limit: 4.5, speed: 24 },
  ] as const)('keeps $species appendages small and slow while pats settle', ({ species, limit, speed }) => {
    const frames = Array.from({ length: 1601 }, (_, ms) => at(species, ms))
    for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const values = frames.map(frame => frame[side])
      expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(limit + 1e-9)
      const velocity = values.slice(1).map((value, i) => Math.abs(value - values[i]) * 1000)
      expect(Math.max(...velocity)).toBeLessThan(speed)
      expect(Math.max(...values.map(Math.abs))).toBeGreaterThan(.5)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(0)
      expect(velocity.at(-1)).toBeLessThan(.2)
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('%s makes one relaxed sway at short, normal and long durations', species => {
    for (const duration of [800, 1600, 3200]) {
      for (const side of ['leftAppendage', 'rightAppendage'] as const) {
        const signs = Array.from({ length: 1001 }, (_, phase) => at(species, phase / 1000 * duration, duration)[side])
          .filter(value => Math.abs(value) > 1e-6).map(Math.sign)
        expect(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1])).toHaveLength(1)
      }
    }
  })

  it('leaves reduced affection appendages still through the full finite response', () => {
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const ms of [0, 160, 384, 800, 1280, 1599, 1600, 1800]) {
      const frame = at(species, ms, ACTION_MS.affection, true)
      expect(frame.leftAppendage).toBe(0)
      expect(frame.rightAppendage).toBe(0)
    }
  })
})
