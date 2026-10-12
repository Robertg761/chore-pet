import { describe, expect, it } from 'vitest'
import { ACTION_MS, sampleMotion, type MotionAction } from './motion'
import type { Mood, Species } from '../domain/types'

// Cast permits a regression against the pre-feature action union.
const stretch = 'stretch' as MotionAction
const budgets = { mochi: { arm: 46 * .82, speed: 88, follow: 1, followSpeed: 8 },
  bun: { arm: 58, speed: 135, follow: 3, followSpeed: 20 },
  sprout: { arm: 40 * .72, speed: 68, follow: 1.8, followSpeed: 12 } }
const at = (species: Species, elapsedMs: number, reducedMotion = false, mood: Mood = 'happy') => sampleMotion({
  species, mood, action: stretch, elapsedMs, blinkMs: elapsedMs, durationMs: 2400, distance: 0, reducedMotion,
})
describe('grounded stretch', () => {
  it('has its own finite lifetime', () => { expect(ACTION_MS[stretch]).toBe(2400) })
  it.each(['mochi', 'bun', 'sprout'] as const)('%s raises and holds both arms once with restrained secondary motion', species => {
    const budget = budgets[species], peak = at(species, 1200)
    expect(peak.leftArm).toBeCloseTo(budget.arm, 10)
    expect(peak.rightArm).toBeCloseTo(-budget.arm, 10)
    expect(peak.scaleY).toBeGreaterThan(1)
    expect(peak.scaleY).toBeLessThanOrEqual(1.033)
    expect(at(species, 960).leftArm).toBe(at(species, 1440).leftArm)
    let previous = at(species, 0), lastSign = 0, reversals = 0
    for (let ms = 1; ms <= 2400; ms++) {
      const frame = at(species, ms)
      for (const field of ['bodyX', 'bodyY', 'leftFoot', 'rightFoot', 'leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY', 'accentOpacity'] as const) expect(frame[field]).toBe(0)
      expect(frame.shadowScale).toBe(1)
      expect(frame.shadowOpacity).toBe(1)
      expect(Math.abs(frame.leftArm)).toBeLessThanOrEqual(budget.arm + 1e-10)
      expect(Math.abs(frame.leftArm - previous.leftArm) * 1000).toBeLessThan(budget.speed)
      expect(Math.abs(frame.leftAppendage)).toBeLessThanOrEqual(budget.follow + 1e-10)
      expect(Math.abs(frame.leftAppendage - previous.leftAppendage) * 1000).toBeLessThan(budget.followSpeed)
      const sign = Math.sign(frame.leftAppendage)
      if (sign && lastSign && sign !== lastSign) reversals++
      if (sign) lastSign = sign
      previous = frame
    }
    expect(reversals).toBe(1)
    expect(at(species, 2400)).toEqual(at(species, 0))
  })
  it.each(['mochi', 'bun', 'sprout'] as const)('%s retains still reactions and neutral completion under reduced motion', species => {
    for (const mood of ['happy', 'content', 'meh', 'scruffy', 'sick'] as const) {
      const early = at(species, 100, true, mood), late = at(species, 2300, true, mood)
      expect(early).toEqual(late)
      expect(early.expression).toBe(mood === 'sick' ? 'mood' : 'pleased')
      expect(early.pleasedWeight).toBe(mood === 'sick' ? 0 : 1)
      expect({ ...early, expression: 'mood', pleasedWeight: 0 }).toEqual(at(species, 0, true, mood))
    }
    for (const time of [-1, NaN, Infinity, 2400, 4800]) expect(at(species, time)).toEqual(at(species, 0))
  })
})
