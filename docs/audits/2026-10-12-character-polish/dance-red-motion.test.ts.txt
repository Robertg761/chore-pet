import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion, type MotionAction } from './motion'
import type { Mood, Species } from '../domain/types'

const dance = 'dance' as MotionAction
const at = (species: Species, elapsedMs: number, mood: Mood = 'happy', reducedMotion = false, durationMs = 2800) =>
  sampleMotion({ species, mood, action: dance, elapsedMs, durationMs, distance: 0, reducedMotion, blinkMs: 0 })

it('has a finite 2800ms invitation with neutral geometry at both ends and invalid-time guards', () => {
  expect(ACTION_MS[dance]).toBe(2800)
  for (const species of ['mochi', 'bun', 'sprout'] as const) {
    const neutral = at(species, 0)
    for (const ms of [-1, NaN, -Infinity, 2800, 2801, Infinity]) expect(at(species, ms)).toEqual(neutral)
    expect(at(species, 500, 'happy', false, 0)).toEqual(neutral)
    expect(at(species, 500, 'happy', false, NaN)).toEqual(at(species, 500))
  }
})

describe.each(['mochi', 'bun', 'sprout'] as const)('%s grounded dance', species => {
  it.each(['happy', 'content', 'meh', 'scruffy'] as const)('keeps both feet planted and accents/shadow quiet for %s', mood => {
    let moving = false
    for (let ms = 0; ms <= 2800; ms += 5) {
      const f = at(species, ms, mood)
      expect(f.bodyY).toBe(0)
      expect(f.leftFoot).toBe(0); expect(f.rightFoot).toBe(0)
      expect(f.bodyX + (f.leftGroundX ?? 0)).toBeCloseTo(0, 12)
      expect(f.bodyX + (f.rightGroundX ?? 0)).toBeCloseTo(0, 12)
      expect(f.leftGroundY).toBe(0); expect(f.rightGroundY).toBe(0)
      expect(f.accentOpacity).toBe(0)
      expect(f.shadowScale).toBe(1); expect(f.shadowOpacity).toBe(1)
      moving ||= Math.abs(f.bodyX) > .5
    }
    expect(moving).toBe(true)
  })
  it('makes two measured sways with small hands and appendages, settling without a snap', () => {
    const frames = Array.from({ length: 2801 }, (_, ms) => at(species, ms))
    const x = frames.map(f => f.bodyX).filter(value => Math.abs(value) > 1e-6)
    expect(x.filter((value, i) => i > 0 && Math.sign(value) !== Math.sign(x[i - 1]))).toHaveLength(3)
    for (const [field, max, speed] of [
      ['bodyX', 2.5, 14], ['lean', 4.5, 25], ['leftArm', 27, 130], ['rightArm', 27, 130],
      ['leftAppendage', 3.7, 24], ['rightAppendage', 3, 20],
    ] as const) {
      const values = frames.map(f => f[field])
      expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(max + 1e-9)
      const velocity = values.slice(1).map((value, i) => Math.abs(value - values[i]) * 1000)
      expect(Math.max(...velocity)).toBeLessThan(speed)
      expect(velocity[0]).toBeLessThan(.15); expect(velocity.at(-1)).toBeLessThan(.15)
    }
    expect(frames[1176].pleasedWeight).toBe(1)
    expect(frames[1176].expression).toBe('pleased')
  })
  it('keeps reduced motion still and preserves the semantic smile until its finite end', () => {
    const neutral = at(species, 0)
    for (const ms of [1, 280, 700, 1400, 2100, 2799]) {
      expect(at(species, ms, 'happy', true)).toEqual({ ...neutral, expression: 'pleased', pleasedWeight: 1 })
    }
    expect(at(species, 2800, 'happy', true)).toEqual(neutral)
  })
  it('uses the same normalized movement across finite duration overrides', () => {
    for (const duration of [1400, 2800, 5600]) for (const phase of [.08, .25, .42, .65, .88]) {
      expect(at(species, duration * phase, 'happy', false, duration)).toEqual(at(species, 2800 * phase))
    }
  })
})
