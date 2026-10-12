import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion } from './motion'
import type { Species } from '../domain/types'

const at = (species: Species, elapsedMs: number, durationMs = ACTION_MS.dust, reducedMotion = false) =>
  sampleMotion({ species, mood: 'happy', action: 'dust', elapsedMs, durationMs, reducedMotion, distance: 0 })

describe('deliberate environmental dust hand reaction', () => {
  it.each([
    { species: 'mochi', speed: 105, peak: 22 },
    { species: 'bun', speed: 140, peak: 28 },
    { species: 'sprout', speed: 90, peak: 19 },
  ] as const)('keeps $species hand motion readable without rapid flutter', ({ species, speed, peak }) => {
    const angles = Array.from({ length: ACTION_MS.dust + 1 }, (_, ms) => at(species, ms).rightArm)
    const velocity = angles.slice(1).map((angle, i) => Math.abs(angle - angles[i]) * 1000)
    expect(Math.max(...velocity)).toBeLessThan(speed)
    expect(Math.max(...angles.map(Math.abs))).toBeLessThan(peak)
    expect(Math.max(...angles.map(Math.abs))).toBeGreaterThan(10)
    expect(angles[0]).toBe(0)
    expect(angles.at(-1)).toBe(0)
    expect(velocity[0]).toBe(0)
    expect(velocity.at(-1)).toBe(0)
  })
  it.each([
    { species: 'mochi', reversals: 1 }, { species: 'bun', reversals: 3 }, { species: 'sprout', reversals: 1 },
  ] as const)('$species uses a few deliberate hand changes across finite durations', ({ species, reversals }) => {
    for (const duration of [700, 1400, 2800]) {
      const angles = Array.from({ length: 1401 }, (_, phase) => at(species, phase / 1400 * duration, duration).rightArm)
      const signs = angles.slice(1).map((angle, i) => angle - angles[i]).filter(delta => Math.abs(delta) > 1e-5).map(Math.sign)
      expect(signs.filter((sign, i) => i > 0 && sign !== signs[i - 1])).toHaveLength(reversals)
    }
  })
  it('retains the1400ms deadline and still reduced reaction', () => {
    expect(ACTION_MS.dust).toBe(1400)
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const ms of [0, 140, 350, 700, 1200, 1399, 1400, 1500]) {
      const frame = at(species, ms, ACTION_MS.dust, true)
      expect(frame.rightArm).toBe(0)
      expect(frame.leftArm).toBe(0)
      expect(frame.leftFoot).toBe(0)
      expect(frame.rightFoot).toBe(0)
    }
  })
})
