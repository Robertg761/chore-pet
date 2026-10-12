import { describe, expect, it } from 'vitest'
import { SPECIES, type Mood } from '../domain/types'
import { ACTION_MS, blendGroundFeet, sampleMotion, type MotionAction, type MotionFrame, type MotionInput } from './motion'

const actions: MotionAction[] = [
  'idle', 'walk', 'turn', 'greet', 'affection', 'celebrate', 'celebrate-big',
  'notice', 'inspect', 'wave', 'reach', 'rest', 'dust', 'smell', 'concern',
]
const moods: Mood[] = ['happy', 'content', 'meh', 'scruffy', 'sick']
const finiteActions = actions.filter((action) => action !== 'idle' && action !== 'walk')
const neutral: MotionFrame = {
  bodyX: 0, bodyY: 0, scaleX: 1, scaleY: 1, lean: 0,
  leftFoot: 0, rightFoot: 0, leftGroundX: 0, leftGroundY: 0, rightGroundX: 0, rightGroundY: 0, leftArm: 0, rightArm: 0,
  leftAppendage: 0, rightAppendage: 0, gazeX: 0, gazeY: 0, eyeOpen: 1,
  shadowScale: 1, shadowOpacity: 1, accentOpacity: 0, expression: 'mood', pleasedWeight: 0,
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
  it('hands off initial support before the trailing foot swings', () => {
    for (const [species, stride] of [['bun', 0.72], ['mochi', 0.9], ['sprout', 0.82]] as const) {
      for (const y of [128, -128]) for (const phase of [0.05, 0.15, 0.25, 0.3, 0.45, 0.6, 0.9]) {
        const frame = sampleMotion(input({ species, action: 'walk', distance: stride * phase, elapsedMs: 400, durationMs: 1680, groundPath: [{ distance: 0, x: 0, y: 0 }, { distance: 4, x: 256, y }] }))
        expect(frame.leftFoot * frame.rightFoot, `${species}/${phase} initial support`).toBe(0)
      }
    }
  })

  it('leaves heavy-outline clearance without sliding contacts on fast, short and cornered routes', () => {
    const paths = [
      ...[[64, 32], [-64, 32], [64, -32], [-64, -32]].map(([x, y]) => [{ distance: 0, x: 0, y: 0 }, { distance: 3, x: x * 3, y: y * 3 }]),
      ...[32, -32].map((y) => [{ distance: 0, x: 0, y: 0 }, { distance: 0.8, x: 51.2, y: y * 0.8 }, { distance: 3, x: -89.6, y: y * 3 }]),
      [{ distance: 0, x: 0, y: 0 }, { distance: 0.31, x: 19.84, y: -9.92 }, { distance: 1.13, x: -32.64, y: -36.16 }],
      [{ distance: 0, x: 0, y: 0 }, { distance: 0.2, x: 12.8, y: -6.4 }],
    ]
    let bottom = 0, drift = 0, contacts = 0
    for (const species of SPECIES) for (const mood of moods) for (const facing of [1, -1] as const) {
      for (const durationMs of [270, 1260]) for (const groundPath of paths) {
        const end = groundPath.at(-1)!.distance
        const at = (distance: number) => sampleMotion(input({ species, mood, action: 'walk', distance, elapsedMs: distance / end * durationMs, durationMs, groundPath, facing, blinkMs: 0 }))
        const world = (frame: MotionFrame, distance: number, side: 'left' | 'right') => {
          const i = Math.max(1, groundPath.findIndex((p) => p.distance >= distance))
          const a = groundPath[i - 1], b = groundPath[i], t = (distance - a.distance) / (b.distance - a.distance)
          return [a.x + (b.x - a.x) * t + facing * (frame.bodyX + frame[`${side}GroundX`]!), a.y + (b.y - a.y) * t + frame[`${side}GroundY`]!]
        }
        let before = at(0)
        for (let i = 1; i <= 160; i++) {
          const distance = end * i / 160, frame = at(distance), mid = at(end * (i - 0.5) / 160)
          for (const side of ['left', 'right'] as const) {
            bottom = Math.max(bottom, frame[`${side}GroundY`]! - frame[`${side}Foot`])
            if (before[`${side}Foot`] === 0 && frame[`${side}Foot`] === 0 && mid[`${side}Foot`] === 0) {
              const a = world(before, end * (i - 1) / 160, side), b = world(frame, distance, side)
              drift = Math.max(drift, Math.hypot(a[0] - b[0], a[1] - b[1]))
              contacts++
            }
          }
          before = frame
        }
      }
    }
    // Neutral sole 187 + 9 clearance + 3.2 half-outline stays below 200.
    expect(bottom).toBeLessThan(9)
    expect(contacts).toBeGreaterThan(1000)
    expect(drift).toBeLessThan(1e-9)
  })

  it('starts and finishes projected routes neutral, releasing each final contact through a lifted swing', () => {
    for (const species of SPECIES) for (const facing of [1, -1] as const) for (const length of [0.2, 1.13, 2.77]) {
      const groundPath = [{ distance: 0, x: 0, y: 0 }, { distance: length, x: length * 64, y: length * -32 }]
      const at = (distance: number) => sampleMotion(input({ species, action: 'walk', elapsedMs: distance / length * 1600, durationMs: 1600, distance, groundPath, facing, blinkMs: 0 }))
      expect(at(0)).toEqual(neutral)
      expect(at(length)).toEqual(neutral)
      for (const key of ['leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const) {
        expect(Math.abs(at(0.0000001)[key]!)).toBeLessThan(0.001)
        expect(Math.abs(at(length - 0.0000001)[key]!)).toBeLessThan(0.001)
      }
      // Each foot must actually leave the floor as its final landing is recovered.
      for (const side of ['left', 'right'] as const) {
        const frames = Array.from({ length: 401 }, (_, i) => at(length * i / 400))
        expect(frames.some((frame) => frame[`${side}Foot`] > 0.1)).toBe(true)
        for (let i = 1; i < frames.length - 1; i++) if (frames[i][`${side}Foot`] === 0 && frames[i - 1][`${side}Foot`] === 0) {
          const worldX = (index: number) => length * index / 400 * 64 + facing * (frames[index].bodyX + frames[index][`${side}GroundX`]!)
          const worldY = (index: number) => -length * index / 400 * 32 + frames[index][`${side}GroundY`]!
          expect(worldX(i)).toBeCloseTo(worldX(i - 1), 7)
          expect(worldY(i)).toBeCloseTo(worldY(i - 1), 7)
        }
      }
    }
  })

  it('lifts a released stance contact during interruption blending and settles at exact endpoints', () => {
    const from = sampleMotion(input({ species: 'bun', action: 'walk', elapsedMs: 400, durationMs: 2000, distance: 0.1, groundPath: [{ distance: 0, x: 0, y: 0 }, { distance: 3, x: 192, y: 96 }] }))
    expect(from.rightFoot).toBe(0)
    const fields = ['leftFoot', 'rightFoot', 'leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const
    for (const key of fields) {
      expect(blendGroundFeet(from, neutral, 0)[key]).toBe(from[key])
      expect(blendGroundFeet(from, neutral, 1)[key]).toBe(neutral[key])
    }
    for (const progress of [0.001, 0.25, 0.5, 0.75, 0.999]) {
      const blended = blendGroundFeet(from, neutral, progress)
      expect(blended.rightFoot).toBeGreaterThan(0)
      expect(blended.rightGroundX).not.toBe(from.rightGroundX)
      expect(blended.rightGroundX).not.toBe(0)
    }
    expect(blendGroundFeet({ ...neutral, leftFoot: 3.7 }, { ...neutral, leftFoot: 0.1 }, 1).leftFoot).toBe(0.1)
  })

  it('countertranslates stance against projected route movement and recovers the swing continuously', () => {
    for (const [species, stride] of [['bun', 0.72], ['mochi', 0.9], ['sprout', 0.82]] as const) {
      const groundPath = [{ distance: 0, x: 0, y: 0 }, { distance: 4, x: 256, y: 128 }]
      const at = (distance: number, facing: 1 | -1 = 1) => sampleMotion(input({ species, action: 'walk', elapsedMs: 400, durationMs: 2000, distance, groundPath, facing }))
      const a = at(stride * 0.8), b = at(stride * 1.2)
      expect((b.rightGroundX! + b.bodyX) - (a.rightGroundX! + a.bodyX)).toBeCloseTo(-stride * 0.4 * 64, 7)
      expect(b.rightGroundY! - a.rightGroundY!).toBeCloseTo(-stride * 0.4 * 32, 7)
      for (const distance of [stride * 0.25, stride * 0.75, stride * 1.25, stride * 1.75, stride * 2.25]) {
        const before = at(distance - 0.00001), center = at(distance), after = at(distance + 0.00001)
        for (const key of ['leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const) {
          expect(Math.abs(before[key]! - center[key]!)).toBeLessThan(0.002)
          expect(Math.abs(after[key]! - center[key]!)).toBeLessThan(0.002)
        }
      }
      const mirrored = at(stride * 0.8, -1)
      expect(mirrored.rightGroundX! + mirrored.bodyX).toBeCloseTo(-(a.rightGroundX! + a.bodyX), 7)
      expect(mirrored.rightGroundY).toBe(a.rightGroundY)
      for (const reducedMotion of [true, false]) {
        const stopped = sampleMotion(input({ species, action: reducedMotion ? 'walk' : 'greet', elapsedMs: 400, distance: 1, groundPath, reducedMotion }))
        expect(stopped.leftGroundX ?? 0).toBe(0)
        expect(stopped.rightGroundY ?? 0).toBe(0)
      }
    }
  })

  it('keeps malformed or oversized projected paths finite and bounds foot offsets', () => {
    for (const groundPath of [
      [], [{ distance: 0, x: NaN, y: 0 }],
      [{ distance: 1, x: 0, y: 0 }, { distance: 0, x: 0, y: 0 }],
      [{ distance: 0, x: 0, y: 0 }, { distance: 0, x: 1, y: 1 }],
      [{ distance: 0, x: -Number.MAX_VALUE, y: 0 }, { distance: 3, x: Number.MAX_VALUE, y: Number.MAX_VALUE }],
    ]) {
      const frame = sampleMotion(input({ action: 'walk', elapsedMs: 400, distance: 1, durationMs: 2000, groundPath }))
      expect(numbers(frame).every(Number.isFinite)).toBe(true)
      for (const key of ['leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const) expect(Math.abs(frame[key]!)).toBeLessThanOrEqual(48)
    }
  })

  function expectContinuousWalk(species: MotionInput['species'], mood: Mood, time: number, durationMs: number, distanceAt: (time: number) => number) {
    const epsilon = 0.01
    const at = (elapsedMs: number) => numbers(sampleMotion(input({ species, mood, action: 'walk',
      elapsedMs, durationMs, distance: distanceAt(elapsedMs), blinkMs: 0 })))
    const before = at(time - epsilon), center = at(time), after = at(time + epsilon)
    const context = `${species}/${mood}/walk at ${time}ms`
    expect(center.every((v, i) => Math.abs(v - before[i]) < 0.01 && Math.abs(after[i] - v) < 0.01), `${context} position`).toBe(true)
    expect(center.every((v, i) => Math.abs((v - before[i]) / epsilon - (after[i] - v) / epsilon) < 0.001), `${context} velocity`).toBe(true)
  }

  it('keeps moving gait position and velocity continuous at departure and arrival fade joins', () => {
    for (const species of SPECIES) for (const mood of moods) {
      for (const time of [0, 120, 720, 900]) {
        // Deliberately avoid a zero gait phase at the fade joins.
        expectContinuousWalk(species, mood, time, 900, (t) => 0.2 + t / 500)
      }
      // Departure and arrival fades overlap throughout a short journey.
      for (const time of [0, 45, 90]) {
        expectContinuousWalk(species, mood, time, 90, (t) => 0.2 + t / 500)
      }
    }
  })

  it('keeps moving gait position and velocity continuous through alternating feet and stride wraps', () => {
    for (const [species, stride] of [['mochi', 0.9], ['bun', 0.72], ['sprout', 0.82]] as const) {
      for (const mood of moods) for (const strides of [0.5, 1, 1.5, 2]) {
        expectContinuousWalk(species, mood, strides * stride * 500, 2000, (t) => t / 500)
      }
    }
  })

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
  it.each([
    { species: 'bun', closedAt: 3070 },
    { species: 'mochi', closedAt: 1370 },
    { species: 'sprout', closedAt: 5770 },
  ] as const)('keeps the $species lifetime blink at neutral walking endpoints', ({ species, closedAt }) => {
    const at = (elapsedMs: number, blinkMs: number = closedAt) => sampleMotion(input({ species, action: 'walk',
      elapsedMs, blinkMs, durationMs: 420, distance: Math.max(0, Math.min(1, elapsedMs / 420)),
      groundPath: [{ distance: 0, x: 0, y: 0 }, { distance: 1, x: 64, y: -32 }],
    }))
    expect(at(419.999).eyeOpen).toBeCloseTo(0.1, 12)
    for (const elapsedMs of [-1, 0, 420, 421, Infinity]) {
      const frame = at(elapsedMs)
      expect(frame.eyeOpen).toBeCloseTo(0.1, 12)
      expect({ ...frame, eyeOpen: 1 }).toEqual(neutral)
      expect(at(elapsedMs, closedAt + 70)).toEqual(neutral)
    }
    expect(sampleMotion(input({ species, action: 'walk', elapsedMs: 420, durationMs: 420,
      blinkMs: closedAt, reducedMotion: true }))).toEqual(neutral)
    expect(sampleMotion(input({ species, action: 'walk', elapsedMs: 0, durationMs: 0,
      blinkMs: closedAt })).eyeOpen).toBeCloseTo(0.1, 12)
  })

  it('samples a short deterministic blink with a separate phase for each species', () => {
    for (const [species, start] of [['bun', 3000], ['mochi', 1300], ['sprout', 5700]] as const) {
      const at = (blinkMs: number) => sampleMotion(input({ species, action: 'idle', elapsedMs: 400, blinkMs })).eyeOpen
      expect(at(start)).toBe(1)
      expect(at(start + 25)).toBeCloseTo(0.55)
      expect(at(start + 70)).toBeCloseTo(0.1)
      expect(at(start + 115)).toBeCloseTo(0.55)
      expect(at(start + 140)).toBe(1)
      expect(at(start + 6070)).toBe(at(start + 70))
      expect(sampleMotion(input({ species, action: 'idle', elapsedMs: start + 70 })).eyeOpen).toBe(at(start + 70))
    }
    for (const species of SPECIES) expect(sampleMotion(input({ species, action: 'idle', elapsedMs: 400, blinkMs: 3070 })).eyeOpen).toBeCloseTo(species === 'bun' ? 0.1 : 1)
  })

  it('keeps blink phase through action time resets and opens eyes for reduced motion and finite endpoints', () => {
    for (const action of actions) {
      const active = input({ species: 'bun', action, elapsedMs: ACTION_MS[action] * 0.4, blinkMs: 3070 })
      expect(sampleMotion(active).eyeOpen).toBeCloseTo(0.1)
      expect(sampleMotion({ ...active, elapsedMs: ACTION_MS[action] * 0.6 }).eyeOpen).toBeCloseTo(0.1)
      expect(sampleMotion({ ...active, reducedMotion: true }).eyeOpen).toBe(1)
      if (action !== 'idle' && action !== 'walk') for (const elapsedMs of [0, ACTION_MS[action], Infinity]) {
        expect(sampleMotion({ ...active, elapsedMs }).eyeOpen).toBe(1)
      }
    }
  })

  it('bounds blink openness for a lifetime cycle and malformed lifetime inputs', () => {
    for (const species of SPECIES) {
      for (const blinkMs of [undefined, NaN, Infinity, -Infinity, -10, Number.MAX_VALUE, ...Array.from({ length: 751 }, (_, i) => i * 8)]) {
        const eyeOpen = sampleMotion(input({ species, action: 'idle', elapsedMs: 400, blinkMs })).eyeOpen!
        expect(Number.isFinite(eyeOpen)).toBe(true)
        expect(eyeOpen).toBeGreaterThanOrEqual(0)
        expect(eyeOpen).toBeLessThanOrEqual(1)
      }
    }
  })

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

  it('forwards only sick notice attention to the resting closed-eye art', () => {
    for (const species of SPECIES) {
      const notice = sampleMotion(input({ species, mood: 'sick', action: 'notice', elapsedMs: ACTION_MS.notice * 0.42 }))
      expect(notice.expression).toBe('alert')
      expect(notice.gazeY).toBeLessThan(0)
      expect(Math.abs(notice.gazeY)).toBeLessThanOrEqual(0.44)
      for (const action of actions.filter((action) => action !== 'notice')) {
        expect(sampleMotion(input({ species, mood: 'sick', action, elapsedMs: ACTION_MS[action] * 0.42 })).expression).toBe('mood')
      }
    }
  })

  it('removes all motion and accents while retaining still reaction expressions', () => {
    for (const species of SPECIES) for (const mood of moods) for (const action of actions) {
      const early = sampleMotion(input({ species, mood, action, reducedMotion: true, elapsedMs: ACTION_MS[action] * 0.3, distance: 0.2 }))
      const late = sampleMotion(input({ species, mood, action, reducedMotion: true, elapsedMs: ACTION_MS[action] * 0.7, distance: 0.8 }))
      expect({ ...early, expression: 'mood', pleasedWeight: 0 }).toEqual(neutral)
      expect(early.pleasedWeight).toBe(early.expression === 'pleased' ? 1 : 0)
      expect(late).toEqual(early)
      if (mood === 'sick') expect(early.expression).toBe(action === 'notice' ? 'alert' : 'mood')
    }
    expect(sampleMotion(input({ action: 'greet', elapsedMs: 500, reducedMotion: true })).expression).toBe('pleased')
    expect(sampleMotion(input({ action: 'notice', elapsedMs: 250, reducedMotion: true })).expression).toBe('alert')
    expect(sampleMotion(input({ elapsedMs: 1200, reducedMotion: true }))).toEqual(neutral)
  })
})
