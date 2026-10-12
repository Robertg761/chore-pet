import { describe, expect, it } from 'vitest'
import type { Species } from '../domain/types'
import { ACTION_MS, sampleMotion } from './motion'

type WaveAction = 'greet' | 'wave'
function arm(species: Species, action: WaveAction, phase: number) {
  return sampleMotion({ species, action, mood: 'happy', elapsedMs: phase * ACTION_MS[action],
    durationMs: ACTION_MS[action], distance: 0, reducedMotion: false }).rightArm
}
function heldSpeed(species: Species, action: WaveAction) {
  let maximum = 0
  for (let phase = .35; phase < .64; phase += .001) {
    maximum = Math.max(maximum, Math.abs(arm(species, action, phase + .001) - arm(species, action, phase)) / (.001 * ACTION_MS[action] / 1000))
  }
  return maximum
}

describe('species wave cadence', () => {
  it.each([
    ['mochi', 'greet', 160], ['sprout', 'greet', 100],
    ['mochi', 'wave', 150], ['sprout', 'wave', 100],
  ] as const)('%s %s keeps a calm held hand sweep below %s degrees per second', (species, action, limit) => {
    expect(heldSpeed(species, action)).toBeGreaterThan(35)
    expect(heldSpeed(species, action)).toBeLessThan(limit)
  })

  it.each(['greet', 'wave'] as const)('retains Bun’s lively %s sweep', action => {
    expect(heldSpeed('bun', action)).toBeGreaterThan(200)
    expect(heldSpeed('bun', action)).toBeLessThan(260)
  })

  it.each(['greet', 'wave'] as const)('gives %s distinct timing rather than scaling one shared sweep', action => {
    // Compare normalized held shapes, independent of species amplitude and arm
    // lift. Different cadence must move the hand at different relative times.
    const amplitude = { mochi: .82, bun: 1, sprout: .72 }
    const sweep = (species: Species) => [.4, .48, .56, .64].map(phase =>
      (arm(species, action, phase) - arm(species, action, .35)) / amplitude[species])
    const mochi = sweep('mochi'), bun = sweep('bun'), sprout = sweep('sprout')
    expect(mochi).not.toEqual(bun)
    expect(sprout).not.toEqual(bun)
    expect(sprout).not.toEqual(mochi)
    expect(Math.max(...mochi.map((value, i) => Math.abs(value - bun[i])))).toBeGreaterThan(5)
    expect(Math.max(...sprout.map((value, i) => Math.abs(value - mochi[i])))).toBeGreaterThan(5)
  })
})
