import { describe, expect, it } from 'vitest'
import { SPECIES, type Mood } from '../domain/types'
import { ACTION_MS, sampleMotion, type MotionAction, type MotionFrame, type MotionInput } from './motion'

const actions: MotionAction[] = [
  'idle', 'walk', 'turn', 'greet', 'affection', 'celebrate', 'celebrate-big',
  'notice', 'inspect', 'wave', 'reach', 'rest', 'dust', 'smell', 'concern',
]
const moods: Mood[] = ['happy', 'content', 'meh', 'scruffy', 'sick']
const finiteActions = actions.filter((action) => action !== 'idle' && action !== 'walk')
const neutral: MotionFrame = {
  bodyX: 0, bodyY: 0, scaleX: 1, scaleY: 1, lean: 0,
  leftFoot: 0, rightFoot: 0, leftArm: 0, rightArm: 0,
  leftAppendage: 0, rightAppendage: 0, gazeX: 0, gazeY: 0,
  shadowScale: 1, shadowOpacity: 1, accentOpacity: 0, expression: 'mood',
}
const input = (over: Partial<MotionInput> = {}): MotionInput => ({
  species: 'mochi', mood: 'happy', action: 'greet', elapsedMs: 0,
  distance: 0, durationMs: ACTION_MS[over.action ?? 'greet'], reducedMotion: false, ...over,
})
const numbers = (frame: MotionFrame): number[] => Object.values(frame).filter((value) => typeof value === 'number')

describe('motion vocabulary', () => {
  it('provides every action duration and the agreed player reaction timing', () => {
    expect(Object.keys(ACTION_MS).sort()).toEqual([...actions].sort())
    expect(ACTION_MS).toMatchObject({ greet: 1200, affection: 1600, celebrate: 1800, 'celebrate-big': 2200 })
    expect(Object.values(ACTION_MS).every((ms) => Number.isFinite(ms) && ms > 0)).toBe(true)
  })

  it('samples deterministically without mutating its input or sharing mutable frames', () => {
    const source = Object.freeze(input({ elapsedMs: 520 }))
    const first = sampleMotion(source)
    expect(sampleMotion(source)).toEqual(first)
    first.bodyY = 999
    expect(sampleMotion(source).bodyY).not.toBe(999)
  })

  it('returns exact neutral endpoints for every finite action, species, and mood', () => {
    for (const species of SPECIES) for (const mood of moods) for (const action of finiteActions) {
      for (const elapsedMs of [-500, 0, ACTION_MS[action], ACTION_MS[action] * 5, Infinity]) {
        expect(sampleMotion(input({ species, mood, action, elapsedMs, distance: 0.35 }))).toEqual(neutral)
      }
    }
  })

  it('honors a supplied duration and treats zero or negative finite durations as complete', () => {
    expect(sampleMotion(input({ elapsedMs: 1000, durationMs: 2000 }))).not.toEqual(neutral)
    expect(sampleMotion(input({ elapsedMs: 2000, durationMs: 2000 }))).toEqual(neutral)
    for (const durationMs of [0, -10]) {
      expect(sampleMotion(input({ elapsedMs: 10, durationMs }))).toEqual(neutral)
    }
    for (const durationMs of [NaN, Infinity, -Infinity]) {
      expect(sampleMotion(input({ elapsedMs: 520, durationMs }))).toEqual(sampleMotion(input({ elapsedMs: 520 })))
    }
  })

  it('keeps every action bounded and finite at phase boundaries and at 16ms intervals', () => {
    for (const species of SPECIES) for (const mood of moods) for (const action of actions) {
      const durationMs = ACTION_MS[action]
      const times = [0, ...[0.1, 0.18, 0.22, 0.3, 0.35, 0.42, 0.62, 0.64, 0.68, 0.76, 0.8, 0.84, 0.92, 1].map((p) => p * durationMs)]
      for (let t = 0; t <= durationMs; t += 16) times.push(t)
      const frames = times.map((elapsedMs) => sampleMotion(input({ species, mood, action, elapsedMs, distance: elapsedMs / 500 })))
      expect(frames.every((frame) => numbers(frame).every(Number.isFinite)), `${species}/${mood}/${action} finite`).toBe(true)
      expect(frames.every((f) => f.bodyY >= -24 && f.bodyY <= 0), `${action} lift`).toBe(true)
      expect(frames.every((f) => f.scaleX >= 0.85 && f.scaleX <= 1.15 && f.scaleY >= 0.85 && f.scaleY <= 1.15), `${action} scale`).toBe(true)
      expect(frames.every((f) => f.shadowOpacity >= 0 && f.shadowOpacity <= 1 && f.shadowScale > 0 && f.accentOpacity >= 0 && f.accentOpacity <= 1), `${action} shadow/accent`).toBe(true)
    }
  })

  it('handles invalid time and distance without producing invalid SVG values', () => {
    for (const species of SPECIES) for (const mood of moods) for (const action of actions) {
      for (const durationMs of [0, ACTION_MS[action]]) for (const elapsedMs of [NaN, Infinity, -Infinity, -1, Number.MAX_VALUE]) {
        for (const distance of [NaN, Infinity, -Infinity, -1, Number.MAX_VALUE]) {
          expect(numbers(sampleMotion(input({ species, mood, action, durationMs, elapsedMs, distance }))).every(Number.isFinite)).toBe(true)
        }
      }
    }
    for (const action of actions) {
      expect(sampleMotion(input({ action, elapsedMs: -1 }))).toEqual(sampleMotion(input({ action, elapsedMs: 0 })))
    }
  })

  it('has continuous position and velocity across joins and finite endpoints', () => {
    for (const species of SPECIES) for (const action of actions) {
      const durationMs = ACTION_MS[action]
      for (const phase of [0, 0.1, 0.18, 0.22, 0.3, 0.35, 0.42, 0.62, 0.64, 0.68, 0.76, 0.8, 0.84, 0.92, 1]) {
        const at = (offset: number) => numbers(sampleMotion(input({ species, action, durationMs, elapsedMs: phase * durationMs + offset, distance: 0.2 })))
        const before = at(-0.1), center = at(0), after = at(0.1)
        expect(center.every((v, i) => Math.abs(v - before[i]) < 0.1 && Math.abs(after[i] - v) < 0.1), `${species}/${action}/${phase} position`).toBe(true)
        expect(center.every((v, i) => Math.abs((v - before[i]) - (after[i] - v)) < 0.002), `${species}/${action}/${phase} velocity`).toBe(true)
      }
    }
  })
})

describe('grounded gait and personalities', () => {
  it('alternates lifted feet with a grounded contact foot for each species', () => {
    for (const species of SPECIES) {
      const frames = Array.from({ length: 100 }, (_, i) => sampleMotion(input({ species, action: 'walk', elapsedMs: 400, durationMs: 2000, distance: i / 40 })))
      expect(frames.every((f) => f.leftFoot >= 0 && f.rightFoot >= 0 && f.leftFoot * f.rightFoot === 0)).toBe(true)
      expect(frames.some((f) => f.leftFoot > 1 && f.rightFoot === 0)).toBe(true)
      expect(frames.some((f) => f.rightFoot > 1 && f.leftFoot === 0)).toBe(true)
    }
  })

  it('derives gait from traveled distance rather than elapsed time', () => {
    for (const species of SPECIES) {
      const at = (distance: number, elapsedMs = 400) => sampleMotion(input({ species, action: 'walk', distance, elapsedMs, durationMs: 2000 }))
      expect(at(0.2)).toEqual(at(0.2, 800))
      expect(at(0.2)).not.toEqual(at(0.55))
      expect(at(0).leftFoot).toBe(0)
      expect(at(0).rightFoot).toBe(0)
    }
  })

  it('uses species-specific body amplitudes and delayed appendage motion', () => {
    const frames = SPECIES.map((species) => sampleMotion(input({ species, action: 'celebrate', elapsedMs: 756 })))
    expect(new Set(frames.map((f) => f.bodyY)).size).toBe(3)
    expect(new Set(frames.map((f) => f.leftAppendage)).size).toBe(3)
    for (const species of SPECIES) {
      const frame = sampleMotion(input({ species, action: 'celebrate', elapsedMs: 1512 }))
      expect(Math.abs(frame.leftAppendage) + Math.abs(frame.rightAppendage)).toBeGreaterThan(0)
    }
  })

  it('keeps idle grounded and gives big celebrations more lift', () => {
    const peak = (action: MotionAction) => Math.min(...Array.from({ length: 101 }, (_, i) => sampleMotion(input({ action, elapsedMs: ACTION_MS[action] * i / 100 })).bodyY))
    expect(peak('celebrate-big')).toBeLessThan(peak('celebrate'))
    for (const elapsedMs of [0, 1000, 2500, 4000]) expect(sampleMotion(input({ action: 'idle', elapsedMs })).bodyY).toBe(0)
  })

  it('shrinks and fades the shadow as a celebration lifts off the ground', () => {
    const airborne = sampleMotion(input({ action: 'celebrate-big', elapsedMs: 924 }))
    expect(airborne.bodyY).toBeLessThan(-10)
    expect(airborne.shadowScale).toBeLessThan(1)
    expect(airborne.shadowOpacity).toBeLessThan(1)
  })
})

describe('readable reactions and accessibility', () => {
  it('distinguishes greeting, affection, and environmental gestures', () => {
    const greeting = sampleMotion(input({ action: 'greet', elapsedMs: 600 }))
    const affection = sampleMotion(input({ action: 'affection', elapsedMs: 800 }))
    expect(greeting.rightArm).not.toBe(0)
    expect(greeting.expression).toBe('pleased')
    expect(affection.lean).not.toBe(0)
    expect(affection.accentOpacity).toBeGreaterThan(0)
    const ambient: MotionAction[] = ['turn', 'notice', 'inspect', 'wave', 'reach', 'rest', 'dust', 'smell', 'concern']
    const poses = ambient.map((action) => sampleMotion(input({ action, elapsedMs: ACTION_MS[action] / 2 })))
    expect(poses.every((frame) => numbers(frame).some((v, i) => v !== numbers(neutral)[i]))).toBe(true)
    expect(new Set(poses.map((frame) => JSON.stringify(frame))).size).toBe(ambient.length)
  })

  it('preserves sick expression and softens energetic actions', () => {
    for (const action of ['greet', 'affection', 'celebrate', 'celebrate-big'] as const) {
      const healthy = sampleMotion(input({ action, elapsedMs: ACTION_MS[action] * 0.42 }))
      const sick = sampleMotion(input({ action, mood: 'sick', elapsedMs: ACTION_MS[action] * 0.42 }))
      expect(sick.expression).toBe('mood')
      expect(sick.accentOpacity).toBe(0)
      expect(Math.abs(sick.bodyY)).toBeLessThanOrEqual(Math.abs(healthy.bodyY) * 0.3)
      expect(Math.abs(sick.rightArm)).toBeLessThan(Math.abs(healthy.rightArm))
    }
  })

  it('removes all motion and accents while retaining still reaction expressions', () => {
    for (const species of SPECIES) for (const mood of moods) for (const action of actions) {
      const early = sampleMotion(input({ species, mood, action, reducedMotion: true, elapsedMs: ACTION_MS[action] * 0.3, distance: 0.2 }))
      const late = sampleMotion(input({ species, mood, action, reducedMotion: true, elapsedMs: ACTION_MS[action] * 0.7, distance: 0.8 }))
      expect({ ...early, expression: 'mood' }).toEqual(neutral)
      expect(late).toEqual(early)
      if (mood === 'sick') expect(early.expression).toBe('mood')
    }
    expect(sampleMotion(input({ action: 'greet', elapsedMs: 500, reducedMotion: true })).expression).toBe('pleased')
    expect(sampleMotion(input({ action: 'notice', elapsedMs: 250, reducedMotion: true })).expression).toBe('alert')
    expect(sampleMotion(input({ elapsedMs: 1200, reducedMotion: true }))).toEqual(neutral)
  })
})
