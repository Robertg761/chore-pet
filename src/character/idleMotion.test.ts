import { describe, expect, it } from 'vitest'
import { SPECIES, type Mood, type Species } from '../domain/types'
import { ACTION_MS, sampleMotion, type MotionAction } from './motion'

const moods: Mood[] = ['happy', 'content', 'meh', 'scruffy', 'sick']
const idle = (species: Species, elapsedMs: number, mood: Mood = 'happy', reducedMotion = false) => sampleMotion({
  species, mood, action: 'idle', elapsedMs, blinkMs: 0, distance: 0,
  durationMs: ACTION_MS.idle, reducedMotion,
})

describe('calm idle follow-through', () => {
  it.each(SPECIES)('%s moves its appendages gently while keeping feet, position and shadow still', (species) => {
    const samples = Array.from({ length: 251 }, (_, i) => idle(species, i * 16))
    expect(samples.some((f) => Math.abs(f.leftAppendage) > 0.3)).toBe(true)
    expect(samples.some((f) => Math.abs(f.rightAppendage) > 0.2)).toBe(true)
    for (const frame of samples) {
      expect(Math.abs(frame.leftAppendage)).toBeLessThanOrEqual(2.2)
      expect(Math.abs(frame.rightAppendage)).toBeLessThanOrEqual(2.2)
      expect(frame).toMatchObject({ bodyX: 0, bodyY: 0, lean: 0, leftFoot: 0, rightFoot: 0,
        leftGroundX: 0, leftGroundY: 0, rightGroundX: 0, rightGroundY: 0,
        leftArm: 0, rightArm: 0, shadowScale: 1, shadowOpacity: 1, accentOpacity: 0 })
    }
  })

  it('gives each species a different delayed response and softens it with lower energy', () => {
    const at = SPECIES.map((species) => idle(species, 2000).leftAppendage)
    expect(new Set(at).size).toBe(3)
    expect(Math.abs(at[SPECIES.indexOf('bun')])).toBeGreaterThan(Math.abs(at[SPECIES.indexOf('mochi')]))
    for (const species of SPECIES) {
      const energy = moods.map((mood) => Math.abs(idle(species, 2000, mood).leftAppendage))
      for (let i = 1; i < energy.length; i++) expect(energy[i]).toBeLessThan(energy[i - 1])
    }
  })

  it('joins breathing loops at neutral appendage position and zero velocity', () => {
    for (const species of SPECIES) for (const mood of moods) for (const seam of [0, 4000, 8000, 12000]) {
      const before = idle(species, seam - 0.1, mood), at = idle(species, seam, mood), after = idle(species, seam + 0.1, mood)
      expect(at).toMatchObject({ leftAppendage: 0, rightAppendage: 0, scaleX: 1, scaleY: 1 })
      for (const key of ['leftAppendage', 'rightAppendage', 'scaleX', 'scaleY'] as const) {
        expect(Math.abs(before[key] - at[key]) / 0.1).toBeLessThan(0.00001)
        expect(Math.abs(after[key] - at[key]) / 0.1).toBeLessThan(0.00001)
      }
    }
  })

  it('suppresses breathing and sway immediately for reduced motion', () => {
    for (const species of SPECIES) for (const mood of moods) for (const time of [500, 1000, 2000, 3000]) {
      expect(idle(species, time, mood, true)).toEqual(idle(species, 0, mood, true))
    }
  })
})

const schedules = [
  { species: 'bun', single: 3000, double: 9000 },
  { species: 'mochi', single: 1300, double: 7300 },
  { species: 'sprout', single: 11700, double: 5700 },
] as const

function eyes(species: Species, blinkMs: number, action: MotionAction = 'idle', reducedMotion = false, elapsedMs = ACTION_MS[action] * 0.5) {
  return sampleMotion({ species, mood: 'happy', action, elapsedMs, blinkMs, distance: 0,
    durationMs: ACTION_MS[action], reducedMotion }).eyeOpen!
}

describe('occasional double blinks', () => {
  it.each(schedules)('$species keeps primary blink timing and alternates single and double clusters', ({ species, single, double }) => {
    for (const offset of [0, 12000, 24000]) {
      expect(eyes(species, single + offset + 70)).toBeCloseTo(0.1)
      expect(eyes(species, single + offset + 270)).toBe(1)
      expect(eyes(species, double + offset + 70)).toBeCloseTo(0.1)
      expect(eyes(species, double + offset + 270)).toBeCloseTo(0.1)
      for (const gap of [140, 170, 200, 340]) expect(eyes(species, double + offset + gap)).toBe(1)
      expect(eyes(species, double + offset + 225)).toBeCloseTo(0.55)
      expect(eyes(species, double + offset + 315)).toBeCloseTo(0.55)
    }
  })

  it('closes and reopens smoothly at every primary, secondary and lifetime-cycle join', () => {
    for (const { species, single, double } of schedules) {
      for (const t of [0, 12000, 24000, ...[single, double, double + 200].flatMap((start) => [start, start + 50, start + 90, start + 140])]) {
        const before = eyes(species, t - 0.01), at = eyes(species, t), after = eyes(species, t + 0.01)
        expect(Math.abs(before - at) / 0.01).toBeLessThan(0.00002)
        expect(Math.abs(after - at) / 0.01).toBeLessThan(0.00002)
      }
    }
  })

  it('preserves the second blink across action changes while retaining reduction and finite endpoint rules', () => {
    for (const { species, double } of schedules) for (const action of Object.keys(ACTION_MS) as MotionAction[]) {
      const time = double + 270
      expect(eyes(species, time, action)).toBeCloseTo(0.1)
      expect(eyes(species, time, action, false, ACTION_MS[action] * 0.6)).toBeCloseTo(0.1)
      expect(eyes(species, time, action, true)).toBe(1)
      if (action !== 'idle' && action !== 'walk') {
        expect(eyes(species, time, action, false, 0)).toBe(1)
        expect(eyes(species, time, action, false, ACTION_MS[action])).toBe(1)
      }
    }
  })
})
