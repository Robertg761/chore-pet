import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion } from './motion'
import type { Mood, Species } from '../domain/types'

const at = (species: Species, elapsedMs: number, durationMs = ACTION_MS.wave, reducedMotion = false, mood: Mood = 'happy') =>
  sampleMotion({ species, mood, action: 'wave', elapsedMs, durationMs, reducedMotion, distance: 0 })

describe('quiet wave toward furnishings', () => {
  it.each([
    { species: 'mochi', excursion: 2, speed: 12.5, visible: 1 },
    { species: 'bun', excursion: 5.4, speed: 33, visible: 3.5 },
    { species: 'sprout', excursion: 3.15, speed: 20, visible: 2 },
  ] as const)('keeps $species appendages restrained while the resident waves toward leaves or glass', ({ species, excursion, speed, visible }) => {
    for (const mood of ['happy', 'content', 'meh', 'scruffy'] as const) {
      const energy = { happy: 1, content: .9, meh: .8, scruffy: .65 }[mood]
      const frames = Array.from({ length: 1401 }, (_, ms) => at(species, ms, 1400, false, mood))
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
      const held = at(species, 560, 1400, false, mood)
      expect(held.lean).toBeCloseTo(4 * ({ mochi: .82, bun: 1, sprout: .72 }[species]) * energy, 9)
      expect(held.gazeX).toBe(4 * energy)
      expect(held.leftArm).toBe(0)
      expect(Math.abs(held.rightArm)).toBeGreaterThan(10 * energy)
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
    for (const mood of ['happy', 'content', 'meh', 'scruffy'] as const) for (const duration of [700, 1400, 2800, 4200]) for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const values = Array.from({ length: 1001 }, (_, phase) => at(species, phase / 1000 * duration, duration, false, mood)[side])
      const signs = values.filter(value => Math.abs(value) > 1e-6).map(Math.sign)
      expect(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1])).toHaveLength(1)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(0)
    }
  })

  it('retains a still reduced reaction throughout the existing 1400ms lifetime', () => {
    expect(ACTION_MS.wave).toBe(1400)
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick'] as const) {
      for (const ms of [0, 180, 600, 900, 1200, 1399, 1400]) {
        const frame = at(species, ms, 1400, true, mood)
        expect(frame.leftAppendage).toBe(0)
        expect(frame.rightAppendage).toBe(0)
      }
    }
  })
})
