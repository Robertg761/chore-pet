import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion } from './motion'
import type { Mood, Species } from '../domain/types'

const at = (species: Species, elapsedMs: number, durationMs = ACTION_MS.inspect, reducedMotion = false, mood: Mood = 'happy') =>
  sampleMotion({ species, mood, action: 'inspect', elapsedMs, durationMs, reducedMotion, distance: 0 })

describe('quiet furniture inspection', () => {
  it.each([
    { species: 'mochi', excursion: 1.75, speed: 8.5, visible: 1 },
    { species: 'bun', excursion: 4.8, speed: 23, visible: 3 },
    { species: 'sprout', excursion: 3.15, speed: 15, visible: 2 },
  ] as const)('keeps $species appendages restrained while the resident examines a furnishing', ({ species, excursion, speed, visible }) => {
    for (const mood of ['happy', 'content', 'meh', 'scruffy'] as const) {
      const energy = { happy: 1, content: .9, meh: .8, scruffy: .65 }[mood]
      const frames = Array.from({ length: 1801 }, (_, ms) => at(species, ms, 1800, false, mood))
      for (const side of ['leftAppendage', 'rightAppendage'] as const) {
        const values = frames.map(frame => frame[side])
        expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(excursion * energy + 1e-9)
        expect(Math.max(...values.map(Math.abs))).toBeGreaterThan(visible * .7 * energy)
        const velocity = values.slice(1).map((value, i) => Math.abs(value - values[i]) * 1000)
        expect(Math.max(...velocity)).toBeLessThan(speed * energy)
        expect(values[0]).toBe(0)
        expect(values.at(-1)).toBe(0)
        expect(velocity.at(-1)).toBeLessThan(.1)
      }
      const held = at(species, 720, 1800, false, mood)
      expect(held.lean).toBeCloseTo(8 * ({ mochi: .82, bun: 1, sprout: .72 }[species]) * energy, 9)
      expect(held.gazeX).toBe(4 * energy)
      expect(held.leftArm).toBe(0)
      expect(held.rightArm).toBeCloseTo(-12 * ({ mochi: .82, bun: 1, sprout: .72 }[species]) * energy, 9)
      for (const frame of frames) {
        expect(frame.bodyX).toBe(0)
        expect(frame.bodyY).toBe(0)
        expect(frame.leftFoot).toBe(0)
        expect(frame.rightFoot).toBe(0)
        expect(frame.accentOpacity).toBe(0)
        expect(frame.shadowScale).toBe(1)
        expect(frame.shadowOpacity).toBe(1)
      }
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('%s makes one calm sway at short, normal, long and legacy durations', species => {
    for (const mood of ['happy', 'content', 'meh', 'scruffy'] as const) for (const duration of [900, 1800, 3600, 4200]) for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const values = Array.from({ length: 1001 }, (_, phase) => at(species, phase / 1000 * duration, duration, false, mood)[side])
      const signs = values.filter(value => Math.abs(value) > 1e-6).map(Math.sign)
      expect(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1])).toHaveLength(1)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(0)
    }
  })

  it('retains a still reduced reaction throughout the existing 1800ms lifetime', () => {
    expect(ACTION_MS.inspect).toBe(1800)
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick'] as const) {
      for (const ms of [0, 180, 600, 900, 1500, 1799, 1800]) {
        const frame = at(species, ms, 1800, true, mood)
        expect(frame.leftAppendage).toBe(0)
        expect(frame.rightAppendage).toBe(0)
      }
    }
  })
})
