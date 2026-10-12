import { describe, expect, it } from 'vitest'
import type { Mood, Species } from '../domain/types'
import { ACTION_MS, sampleMotion, type MotionFrame } from '../character/motion'
import { motionFor } from './activityMotion'
import { initialPet, react, type PetState } from './behaviour'

const speciesList: Species[] = ['mochi', 'bun', 'sprout']
const moods: Mood[] = ['happy', 'content', 'meh', 'scruffy']

// Construct an absolute target from independent room-screen offsets from the
// standing tile centre. One room tile projects to42.5x21.25 SVG units.
function inspecting(dx: number, dy: number, facing: 1 | -1 = 1): PetState {
  return { ...initialPet({ tx: 2, ty: 2 }, 0), facing, activity: {
    kind: 'interact', phase: 'action', start: 0, until: ACTION_MS.inspect,
    target: { objectId: 'detail', signature: 'detail:0', tile: { tx: 2, ty: 2 },
      gaze: { tx: 2.5 + dx / 42.5 + dy / 21.25, ty: 2.5 - dx / 42.5 + dy / 21.25 },
      action: 'inspect', contact: false },
  } }
}

describe('attention from the character eyes', () => {
  it.each(speciesList)('%s looks down at a low detail that is still above the floor', species => {
    for (const mood of moods) for (const facing of [1, -1] as const) {
      const frame = motionFor(inspecting(24 * facing, -8, facing), 900, species, mood, false).frame
      expect(frame.gazeY).toBeGreaterThan(0)
      expect(frame.gazeX).toBeGreaterThan(0)
      expect(frame.lean).toBeGreaterThan(0)
      expect(frame.leftFoot).toBe(0)
      expect(frame.rightFoot).toBe(0)
      expect(frame.shadowScale).toBe(1)
    }
  })

  it.each(speciesList)('%s eases back to inspect an overhead detail in either facing', species => {
    for (const facing of [1, -1] as const) {
      const frame = motionFor(inspecting(12 * facing, -80, facing), 900, species, 'happy', false).frame
      expect(frame.gazeY).toBeLessThan(0)
      expect(frame.lean).toBeLessThan(0)
      expect(frame.lean).toBeGreaterThanOrEqual(-2.01)
      expect(frame.bodyX).toBe(0)
      expect(frame.bodyY).toBe(0)
    }
  })

  it.each(speciesList)('%s keeps target attention bounded and neutral at phase joins', species => {
    for (const mood of moods) for (const facing of [1, -1] as const) for (const height of [-80, -8, 25]) {
      const state = inspecting(24 * facing, height, facing)
      for (const now of [0, .001, 16, 119, 400, 900, 1500, 1799.999, 1800]) {
        const input = motionFor(state, now, species, mood, false)
        const frame = input.frame
        expect(Number.isFinite(frame.gazeX)).toBe(true)
        expect(Number.isFinite(frame.gazeY)).toBe(true)
        expect(Math.hypot(frame.gazeX / 3, frame.gazeY / 2)).toBeLessThanOrEqual(1 + 1e-12)
        expect(Math.abs(frame.lean)).toBeLessThanOrEqual(8)
        if (now === 0 || now === 1800) expect(frame).toEqual(sampleMotion(input))
      }
      const still = motionFor(state, 900, species, mood, true)
      expect(still.frame).toEqual(sampleMotion(still))
    }
  })

  it.each(speciesList)('preserves the outgoing %s environment pose when a player interrupts', species => {
    for (const facing of [1, -1] as const) for (const height of [-80, -8]) {
      const state = inspecting(24 * facing, height, facing)
      const before = motionFor(state, 900, species, 'happy', false).frame
      const next = react(state, 900, 'celebrate')
      const after = motionFor(next, 900, species, 'happy', false).frame
      for (const field of Object.keys(before) as (keyof MotionFrame)[]) {
        if (field === 'expression') expect(after[field]).toBe(before[field])
        else expect(after[field]).toBeCloseTo(before[field]!, 10)
      }
    }
  })
})
