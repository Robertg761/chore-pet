import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion } from './motion'
import type { Mood, Species } from '../domain/types'

const at = (species: Species, elapsedMs: number, durationMs = ACTION_MS.smell, reducedMotion = false, mood: Mood = 'happy') =>
  sampleMotion({ species, mood, action: 'smell', elapsedMs, durationMs, reducedMotion, distance: 0 })

describe('restrained environmental sniff', () => {
  it.each([
    { species: 'mochi', excursion: 1.65, speed: 11, visible: 1, amplitude: .82 },
    { species: 'bun', excursion: 4.25, speed: 29, visible: 3, amplitude: 1 },
    { species: 'sprout', excursion: 2.5, speed: 18, visible: 2, amplitude: .72 },
  ] as const)('keeps $species follow-through small while retaining the lean-back and hand gesture', ({ species, excursion, speed, visible, amplitude }) => {
    const frames = Array.from({ length: 1601 }, (_, ms) => at(species, ms))
    for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const values = frames.map(frame => frame[side])
      expect(Math.max(...values.map(Math.abs))).toBeLessThan(excursion)
      expect(Math.max(...values.map(Math.abs))).toBeGreaterThan(visible * .7)
      const velocity = values.slice(1).map((value, i) => Math.abs(value - values[i]) * 1000)
      expect(Math.max(...velocity)).toBeLessThan(speed)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(0)
      expect(velocity.at(-1)).toBeLessThan(.1)
    }
    const held = at(species, 640)
    expect(held.lean).toBeCloseTo(-10 * amplitude, 9)
    expect(held.bodyX).toBeCloseTo(-2 * amplitude, 9)
    expect(held.rightArm).toBeCloseTo(-16 * amplitude, 9)
    for (const frame of frames) {
      expect(frame.bodyY).toBe(0)
      expect(frame.leftFoot).toBe(0)
      expect(frame.rightFoot).toBe(0)
      expect(frame.accentOpacity).toBe(0)
      expect(frame.shadowScale).toBe(1)
      expect(frame.shadowOpacity).toBe(1)
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('%s settles with two displacement zero crossings at different durations', species => {
    for (const duration of [800, 1600, 3200]) for (const side of ['leftAppendage', 'rightAppendage'] as const) {
      const values = Array.from({ length: 1001 }, (_, phase) => at(species, phase / 1000 * duration, duration)[side])
      const signs = values.filter(value => Math.abs(value) > 1e-6).map(Math.sign)
      expect(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1])).toHaveLength(2)
      expect(values[0]).toBe(0)
      expect(values.at(-1)).toBe(0)
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('%s keeps both feet fixed under its lateral torso recoil', species => {
    for (const mood of ['happy', 'content', 'meh', 'scruffy'] as const) for (const duration of [800, 1600, 3200]) {
      for (let phase = 0; phase <= 100; phase++) {
        const frame = at(species, duration * phase / 100, duration, false, mood)
        expect(frame.bodyX + (frame.leftGroundX ?? 0)).toBe(0)
        expect(frame.bodyX + (frame.rightGroundX ?? 0)).toBe(0)
        expect(frame.leftGroundY).toBe(0)
        expect(frame.rightGroundY).toBe(0)
      }
    }
  })

  it('keeps reduced-motion appendages still for the existing1600ms reaction', () => {
    expect(ACTION_MS.smell).toBe(1600)
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick'] as const) {
      for (const ms of [0, 160, 600, 800, 1400, 1599, 1600]) {
        const frame = at(species, ms, 1600, true, mood)
        expect(frame.leftAppendage).toBe(0)
        expect(frame.rightAppendage).toBe(0)
      }
    }
  })
})
