import { describe, expect, it, vi } from 'vitest'
import { ACTION_MS, sampleMotion } from '../character/motion'
import * as motionSampler from '../character/motion'
import { initialPet, positionAt, react, step, tap, TIMING, type PetState, type World } from './behaviour'
import { motionFor } from './activityMotion'

const world: World = { free: () => true, mood: 'happy', away: false, mess: null, interactions: [] }
const walk = (): PetState => ({ ...initialPet({ tx: 2, ty: 2 }, 0), activity: {
  kind: 'walk', path: [{ tx: 3, ty: 2 }, { tx: 4, ty: 2 }], stepStart: 0, then: 'idle',
} })
const motion = (pet: PetState, now: number, mood: World['mood'] = 'happy', reduced = false) => motionFor(pet, now, 'bun', mood, reduced)

describe('activity motion', () => {
  it('passes the application clock for blinking across action restarts', () => {
    const greeted = tap(initialPet({ tx: 2, ty: 2 }, 0), 100)
    const celebrated = react(greeted, 500, 'celebrate')
    for (const pet of [walk(), greeted, celebrated]) {
      expect(motion(pet, 700)).toMatchObject({ blinkMs: 700 })
    }
  })

  it('defaults absent eye openness to one before blending optional sampler fields', () => {
    const sample = motionSampler.sampleMotion
    const legacySampler = vi.spyOn(motionSampler, 'sampleMotion').mockImplementation((input) => ({
      ...sample(input), eyeOpen: undefined,
    }))
    try {
      const pet = tap(walk(), 210)
      for (const now of [210, 250, 330, 700]) {
        expect(motion(pet, now).frame).toMatchObject({ eyeOpen: 1 })
      }
      expect(motion(pet, 250, 'happy', true).frame).toMatchObject({ eyeOpen: 1 })
    } finally {
      legacySampler.mockRestore()
    }
  })

  it('preserves a sampled blink through nested interruption blends', () => {
    const idle = initialPet({ tx: 2, ty: 2 }, 0)
    const before = motion(idle, 3070).frame
    expect(before.eyeOpen).toBeCloseTo(0.1)
    const greeted = tap(idle, 3070)
    expect(motion(greeted, 3070).frame.eyeOpen).toBe(before.eyeOpen)
    const partial = motion(greeted, 3090).frame.eyeOpen!
    expect(motion(react(greeted, 3090, 'celebrate'), 3090).frame.eyeOpen).toBeCloseTo(partial, 12)
    for (const now of [3070, 3090, 3130, 3190]) {
      const eyeOpen = motion(greeted, now).frame.eyeOpen!
      expect(Number.isFinite(eyeOpen)).toBe(true)
      expect(eyeOpen).toBeGreaterThanOrEqual(0)
      expect(eyeOpen).toBeLessThanOrEqual(1)
    }
    expect(motion(greeted, 3190).frame.eyeOpen).toBe(1)
  })

  it('starts a greeting neutral and uses sampler timing', () => {
    const pet = tap(initialPet({ tx: 2, ty: 2 }, 100), 100)
    expect(motion(pet, 100)).toMatchObject({ action: 'greet', elapsedMs: 0, durationMs: 1200, distance: 0 })
    expect(motion(pet, 100).frame).toEqual(sampleMotion({ species: 'bun', mood: 'happy', action: 'greet', elapsedMs: 0, durationMs: 1200, distance: 0, reducedMotion: false }))
    expect(motion(pet, 700).frame.expression).toBe('pleased')
    expect(motion(pet, 1300, 'meh').frame.expression).toBe('mood')
  })

  it('keeps accumulated gait distance and the whole journey clock across tile boundaries', () => {
    const first = walk()
    const later = step(first, world, 500, () => 0.9)
    expect(motion(first, 419).distance).toBeCloseTo(419 / 420)
    expect(motion(later, 500)).toMatchObject({ action: 'walk', elapsedMs: 500, durationMs: 840 })
    expect(motion(later, 500).distance).toBeCloseTo(500 / 420)
    expect(motion(later, 840).frame.bodyY).toBeCloseTo(0)
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('blends a moving %s through interruption without a pose pop', (species) => {
    const pet = walk()
    const before = motionFor(pet, 210, species, 'happy', false).frame
    const interrupted = tap(pet, 210)
    expect(motionFor(interrupted, 210, species, 'happy', false).frame).toEqual(before)
    expect(motionFor(interrupted, 330, species, 'happy', false).frame).toEqual(sampleMotion(motionFor(interrupted, 330, species, 'happy', false)))
  })

  it('preserves an in-progress blend when celebration interrupts it', () => {
    const tapped = tap(walk(), 210)
    const before = motion(tapped, 250).frame
    const celebrated = react(tapped, 250, 'celebrate')
    const after = motion(celebrated, 250).frame
    for (const field of ['bodyY', 'lean', 'rightArm', 'scaleY'] as const) expect(after[field]).toBeCloseTo(before[field], 12)
    expect(after.expression).toBe(before.expression)
  })

  it('faces and gazes upward toward the actual elevated target in either direction', () => {
    for (const gaze of [{ tx: 0, ty: 1 }, { tx: 1, ty: 0 }]) {
      const target = { objectId: 'lamp', signature: 'lamp:0', tile: { tx: 2, ty: 2 }, gaze, action: 'inspect' as const, contact: false }
      const w = { ...world, interactions: [target] }
      let pet = step(initialPet({ tx: 2, ty: 2 }, 0), w, 2000, () => 0)
      expect(pet.facing).toBe(gaze.tx > gaze.ty ? 1 : -1)
      pet = step(pet, w, 2360, () => 0)
      const frame = motion(pet, 3260).frame
      expect(frame.gazeY).toBeLessThan(0)
      // Frame is local to mirrored character art. Mirroring it must face the target.
      expect(Math.sign(frame.gazeX * pet.facing)).toBe(gaze.tx > gaze.ty ? 1 : -1)
      expect(motion(pet, 2360).frame.gazeX).toBe(0)
      expect(motion(pet, 4160).frame.gazeY).toBeCloseTo(0)
    }
  })

  it('projects target gaze relative to the centre where the pet stands', () => {
    const pet: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), activity: {
      kind: 'interact', phase: 'action', start: 0, until: ACTION_MS.inspect,
      target: { objectId: 'decor', signature: 'decor:0', tile: { tx: 2, ty: 2 },
        gaze: { tx: 2.25, ty: 2.25 }, action: 'inspect', contact: false },
    } }
    // This point is above the tile centre but below its back corner on screen.
    expect(motion(pet, 900).frame.gazeY).toBeLessThan(0)
  })

  it.each(['sick', 'sleep'] as const)('maps %s input to a gentle finite notice', (kind) => {
    const w = { ...world, mood: kind === 'sick' ? 'sick' as const : 'happy' as const, away: kind === 'sleep' }
    const pet = tap(step(initialPet({ tx: 2, ty: 2 }, 0), w, 0, () => 0), 10)
    expect(motion(pet, 310, w.mood)).toMatchObject({ action: 'notice', elapsedMs: 300, durationMs: ACTION_MS.notice })
    expect(motion(pet, 1000, w.mood).frame.expression).toBe('mood')
  })

  it('reduced motion suppresses outgoing motion, gaze shifts and particles immediately', () => {
    const pet = react(walk(), 210, 'celebrate-big')
    for (const now of [210, 250, 1000]) {
      const frame = motion(pet, now, 'happy', true).frame
      expect(frame.bodyY).toBeCloseTo(0)
      expect(frame.scaleX).toBe(1)
      expect(frame.leftFoot).toBe(0)
      expect(frame.leftAppendage).toBe(0)
      expect(frame.accentOpacity).toBe(0)
    }
  })
})


describe('phase transition continuity', () => {
  it.each(['mochi', 'bun', 'sprout'] as const)('blends the %s corner pose in screen space without restarting travel', (species) => {
    const pet: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), activity: {
      kind: 'walk', path: [{ tx: 3, ty: 2 }, { tx: 3, ty: 3 }], stepStart: 0, then: 'idle',
    } }
    const at = (state: PetState, now: number, reduced = false) => motionFor(state, now, species, 'happy', reduced)
    const before = at(pet, 420).frame
    const corner = step(pet, world, 420, () => 0.9)
    const after = at(corner, 420).frame
    expect(corner.facing).toBe(-1)
    expect(positionAt(corner, 420)).toEqual(positionAt(pet, 420))
    expect(after.bodyX * corner.facing).toBeCloseTo(before.bodyX * pet.facing, 12)
    expect(after.lean * corner.facing).toBeCloseTo(before.lean * pet.facing, 12)
    expect(after.leftFoot).toBeCloseTo(before.rightFoot, 12)
    expect(after.rightFoot).toBeCloseTo(before.leftFoot, 12)
    expect(after.leftArm * corner.facing).toBeCloseTo(before.rightArm * pet.facing, 12)
    expect(after.rightArm * corner.facing).toBeCloseTo(before.leftArm * pet.facing, 12)
    expect(corner.transition?.start).toBe(420)
    expect(corner.beat).toBe(pet.beat + 1)

    const during = step(corner, world, 600, () => 0.9)
    const motion = at(during, 600)
    expect(motion).toMatchObject({ action: 'walk', elapsedMs: 600, durationMs: 840 })
    expect(motion.distance).toBeCloseTo(600 / TIMING.stepMs)
    expect(positionAt(during, 600)).toEqual(positionAt(pet, 600))
    // The turn adds compression while gait retains its original distance phase.
    expect(motion.frame.scaleY).toBeLessThan(sampleMotion(motion).scaleY - 0.02)
    expect(at(during, 600, true).frame).toEqual(sampleMotion(at(during, 600, true)))
    expect(at(tap(during, 600), 600).frame).toEqual(motion.frame)

    const settled = step(during, world, 780, () => 0.9)
    expect(at(settled, 780).frame).toEqual(sampleMotion(at(settled, 780)))
  })

  it('keeps the current breathing posture when player input interrupts idle', () => {
    const pet = initialPet({ tx: 2, ty: 2 }, 0)
    const before = motion(pet, 1000).frame
    expect(before.scaleY).toBeGreaterThan(1)
    expect(motion(tap(pet, 1000), 1000).frame).toEqual(before)
  })

  it('preserves an idle blend when input interrupts cancellation', () => {
    const walking = walk()
    const cancelled = step(walking, { ...world, free: (tile) => tile.tx !== 3 }, 210, () => 0.9)
    const before = motion(cancelled, 250).frame
    const after = motion(tap(cancelled, 250), 250).frame
    for (const field of ['scaleX', 'scaleY', 'shadowScale', 'bodyY'] as const) expect(after[field]).toBeCloseTo(before[field], 12)
  })

  it('starts wandering from the current idle breathing frame', () => {
    const pet = initialPet({ tx: 2, ty: 2 }, 0)
    const moved = step(pet, world, 2000, () => 0.3)
    const frame = motion(moved, 2000).frame
    expect(frame).toEqual(motion(pet, 2000).frame)
    expect(frame.leftFoot).toBeCloseTo(0)
  })
})
