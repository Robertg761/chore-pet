import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion } from './motion'
import type { Mood, Species } from '../domain/types'

const at = (species: Species, elapsedMs: number, durationMs = ACTION_MS.turn, reducedMotion = false, mood: Mood = 'happy') =>
  sampleMotion({ species, mood, action: 'turn', elapsedMs, durationMs, reducedMotion, distance: 0 })

describe('soft furniture orientation', () => {
  it.each([
    { species: 'mochi', excursion: .51, speed: 7, visible: .4 },
    { species: 'bun', excursion: 1.45, speed: 20, visible: 1.2 },
    { species: 'sprout', excursion: .91, speed: 13, visible: .6 },
  ] as const)('keeps $species appendages restrained while the resident turns toward a furnishing', ({ species, excursion, speed, visible }) => {
    const frames = Array.from({ length: 361 }, (_, ms) => at(species, ms))
    for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const values = frames.map(frame => frame[side])
      expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(excursion + 1e-9)
      expect(Math.max(...values.map(Math.abs))).toBeGreaterThan(visible * .7)
      const velocity = values.slice(1).map((value, i) => Math.abs(value - values[i]) * 1000)
      expect(Math.max(...velocity)).toBeLessThan(speed)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(0)
      expect(velocity.at(-1)).toBeLessThan(.1)
    }
    const held = at(species, 144)
    expect(held.lean).toBeCloseTo(-6 * ({ mochi: .82, bun: 1, sprout: .72 }[species]), 9)
    expect(held.gazeX).toBe(3)
    expect(held.leftArm).toBe(0); expect(held.rightArm).toBe(0)
    for (const frame of frames) {
      expect(frame.bodyX).toBe(0)
      expect(frame.bodyY).toBe(0)
      expect(frame.leftFoot).toBe(0)
      expect(frame.rightFoot).toBe(0)
      expect(frame.accentOpacity).toBe(0)
      expect(frame.shadowScale).toBe(1)
      expect(frame.shadowOpacity).toBe(1)
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('%s makes one small deflection without reversing direction at short, normal and long durations', species => {
    for (const duration of [180, 360, 720]) for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const values = Array.from({ length: 1001 }, (_, phase) => at(species, phase / 1000 * duration, duration)[side])
      const signs = values.filter(value => Math.abs(value) > 1e-6).map(Math.sign)
      expect(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1])).toHaveLength(0)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(0)
    }
  })

  it('retains a still reduced reaction throughout the existing360ms lifetime', () => {
    expect(ACTION_MS.turn).toBe(360)
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick'] as const) {
      for (const ms of [0, 36, 120, 180, 300, 359, 360]) {
        const frame = at(species, ms, 360, true, mood)
        expect(frame.leftAppendage).toBe(0)
        expect(frame.rightAppendage).toBe(0)
      }
    }
  })
})
