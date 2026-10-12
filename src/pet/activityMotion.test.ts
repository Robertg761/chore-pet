import { describe, expect, it, vi } from 'vitest'
import { ACTION_MS, blendGroundFeet, sampleMotion, type MotionFrame, type MotionInput } from '../character/motion'
import * as motionSampler from '../character/motion'
import { poseNameFor } from '../character/poses'
import { articulatedTransform } from '../character/species/animatedBody'
import { PET_SCALE, roomPoint } from '../room/shell/geometry'
import { blendProgress, initialPet, positionAt, react, step, tap, TIMING, type PetState, type World } from './behaviour'
import { motionFor } from './activityMotion'

const world: World = { free: () => true, mood: 'happy', away: false, mess: null, interactions: [] }
const walk = (): PetState => ({ ...initialPet({ tx: 2, ty: 2 }, 0), activity: {
  kind: 'walk', path: [{ tx: 3, ty: 2 }, { tx: 4, ty: 2 }], stepStart: 0, then: 'idle',
} })
const motion = (pet: PetState, now: number, mood: World['mood'] = 'happy', reduced = false) => motionFor(pet, now, 'bun', mood, reduced)

it.each([
  { species: 'bun', arriveAt: 3070 },
  { species: 'mochi', arriveAt: 1370 },
  { species: 'sprout', arriveAt: 5770 },
] as const)('preserves a closed $species blink through the actual walk arrival blend', ({ species, arriveAt }) => {
  const walking: PetState = { ...initialPet({ tx: 2, ty: 2 }, arriveAt - 420), activity: {
    kind: 'walk', path: [{ tx: 3, ty: 2 }], stepStart: arriveAt - 420, then: 'idle',
  } }
  const before = motionFor(walking, arriveAt - 0.001, species, 'happy', false).frame
  const arrived = step(walking, world, arriveAt, () => 0.9)
  expect(arrived.activity.kind).toBe('idle')
  expect(positionAt(arrived, arriveAt)).toEqual({ tx: 3, ty: 2 })
  expect(arrived.facing).toBe(walking.facing)
  expect(before.eyeOpen).toBeCloseTo(0.1, 12)
  const joined = motionFor(arrived, arriveAt, species, 'happy', false).frame
  expect(joined.eyeOpen).toBeCloseTo(0.1, 12)
  for (const key of Object.keys(before) as (keyof MotionFrame)[]) {
    if (key !== 'expression') expect(Math.abs(joined[key]! - before[key]!)).toBeLessThan(0.001)
  }
  const snapshot = arrived.transition!.layers.at(-1)!.snapshot
  expect(snapshot.activity).toMatchObject({ kind: 'walk', origin: { tx: 2, ty: 2 } })
  if (snapshot.activity.kind !== 'walk') throw new Error('expected walking snapshot')
  expect(snapshot.activity.groundPath?.map((point) => point.distance)).toEqual([0, 1])
  let previous = 0.1
  for (const offset of [0, 16, 20, 30, 40, 70, 100, 119, 120]) {
    const frame = motionFor(arrived, arriveAt + offset, species, 'happy', false).frame
    expect(frame.eyeOpen).toBeGreaterThanOrEqual(previous - 1e-12)
    expect(frame.eyeOpen).toBeLessThanOrEqual(1)
    if (offset <= 20) expect(frame.eyeOpen).toBeCloseTo(0.1, 12)
    expect(frame.leftFoot).toBe(0)
    expect(frame.rightFoot).toBe(0)
    expect(frame.leftGroundX).toBe(0)
    expect(frame.rightGroundY).toBe(0)
    previous = frame.eyeOpen!
  }
  expect(previous).toBe(1)
})

// Renderer ground feet cancel torso scale/rotation. Reconstruct the sole in
// room pixels, including the outer character mirror and placement pivot.
function sole(pet: PetState, now: number, species: MotionInput['species'], side: 'left' | 'right', frame: MotionFrame) {
  const tile = positionAt(pet, now)
  const feet = roomPoint(tile.tx + 0.5, tile.ty + 0.5)
  const halfWidth = species === 'mochi' ? 26 : 22
  const groundContact = (['leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const)
    .some((field) => (frame[field] ?? 0) !== 0)
  const hop = frame.leftFoot > 0 || frame.rightFoot > 0 || groundContact ? 0 : Math.min(0, frame.bodyY)
  return {
    x: feet.x + pet.facing * ((side === 'left' ? -halfWidth : halfWidth) + frame.bodyX + (frame[`${side}GroundX`] ?? 0)) * PET_SCALE,
    y: feet.y + (5 + hop + (frame[`${side}GroundY`] ?? 0) - frame[`${side}Foot`]) * PET_SCALE,
  }
}

describe('local route ground mapping', () => {
  it.each([{}, { away: true }, { mood: 'sick' as const }])('validates retained corner contacts when a delayed block cancels the route for %j', (over) => {
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const facing of [1, -1] as const) {
      const origin = facing === 1 ? 2 : 5
      const pet: PetState = { ...initialPet({ tx: origin, ty: origin }, 0), facing, activity: {
        kind: 'walk', stepStart: 0, then: 'idle', path: [
          { tx: origin + facing, ty: origin }, { tx: origin + facing, ty: origin + facing },
          { tx: origin + facing, ty: origin + 2 * facing },
        ],
      } }
      const turning = step(pet, world, 830, () => 0.9)
      const blocked = pet.activity.kind === 'walk' ? pet.activity.path[1] : pet.tile
      const w = { ...world, ...over, free: (tile: PetState['tile']) => tile.tx !== blocked.tx || tile.ty !== blocked.ty }
      const stopped = step(turning, w, 841, () => 0.9)
      expect(positionAt(stopped, 841)).toEqual({ tx: origin + facing, ty: origin })
      expect(stopped.transition!.layers).toHaveLength(2)
      expect(stopped.transition!.groundReleases).toHaveLength(1)
      for (const offset of [0, 20, 60, 119, 120]) {
        const frame = motionFor(stopped, 841 + offset, species, w.mood, false).frame
        for (const field of ['leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const) {
          expect(Number.isFinite(frame[field])).toBe(true)
          expect(Math.abs(frame[field]!)).toBeLessThanOrEqual(48)
        }
        for (const side of ['left', 'right'] as const) {
          // Rejected traversal may not return through any frozen contact.
          expect(frame.bodyX + frame[`${side}GroundX`]!).toBeCloseTo(0, 10)
          expect(frame[`${side}GroundY`]).toBeCloseTo(0, 10)
        }
      }
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('keeps %s corrected corner contacts and release lifts continuous through nested input', (species) => {
    const pet: PetState = { ...walk(), activity: { kind: 'walk', stepStart: 0, then: 'idle',
      path: [{ tx: 3, ty: 2 }, { tx: 3, ty: 3 }, { tx: 3, ty: 4 }],
    } }
    const turning = step(pet, world, 830, () => 0.9)
    let current = step(turning, { ...world, free: (tile) => tile.tx !== 3 || tile.ty !== 3 }, 841, () => 0.9)
    for (const [now, kind] of [[861, 'tap'], [881, 'celebrate'], [901, 'celebrate-big']] as const) {
      const before = motionFor(current, now, species, 'happy', false).frame
      current = react(current, now, kind)
      const after = motionFor(current, now, species, 'happy', false).frame
      for (const field of Object.keys(before) as (keyof MotionFrame)[]) {
        if (field !== 'expression') expect(after[field]).toBeCloseTo(before[field]!, 10)
      }
      for (const offset of [0, 10, 19]) {
        const frame = motionFor(current, now + offset, species, 'happy', false).frame
        for (const side of ['left', 'right'] as const) {
          expect(Math.abs(frame[`${side}GroundX`]!)).toBeLessThanOrEqual(48)
          expect(Math.abs(frame[`${side}GroundY`]!)).toBeLessThanOrEqual(48)
          expect(frame.bodyX + frame[`${side}GroundX`]!).toBeCloseTo(0, 10)
          expect(frame[`${side}GroundY`]).toBeCloseTo(0, 10)
          expect(frame[`${side}Foot`]).toBeGreaterThanOrEqual(0)
          expect(frame[`${side}Foot`]).toBeLessThanOrEqual(24)
        }
      }
    }
    expect(current.transition!.groundReleases!.length).toBeGreaterThan(2)
    expect(motionFor(current, 1021, species, 'happy', false).frame)
      .toEqual(sampleMotion(motionFor(current, 1021, species, 'happy', false)))
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('preserves %s valid fractional cancellation during an unfinished corner blend', (species) => {
    const pet: PetState = { ...walk(), activity: { kind: 'walk', stepStart: 0, then: 'idle',
      path: [{ tx: 3, ty: 2 }, { tx: 3, ty: 3 }, { tx: 3, ty: 4 }],
    } }
    const turning = step(pet, world, 830, () => 0.9)
    const stopped = step(turning, { ...world, free: (tile) => tile.tx !== 3 || tile.ty !== 3 }, 835, () => 0.9)
    expect(positionAt(stopped, 835)).toEqual(positionAt(turning, 835))
    const before = motionFor(turning, 835, species, 'happy', false).frame
    const after = motionFor(stopped, 835, species, 'happy', false).frame
    for (const field of Object.keys(before) as (keyof MotionFrame)[]) {
      if (field !== 'expression') expect(after[field]).toBeCloseTo(before[field]!, 10)
    }
    for (const layer of stopped.transition!.layers) expect(layer.snapshot).not.toHaveProperty('groundPosition')
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('discards %s rejected replant terms already retained before cancellation', (species) => {
    // Legacy walks can contain short fractional segments. Two late corner
    // ticks retain a nested release before the next delayed collision clamps.
    const pet: PetState = { ...walk(), activity: { kind: 'walk', stepStart: 0, then: 'idle', path: [
      { tx: 3, ty: 2 }, { tx: 3, ty: 3 }, { tx: 3.01, ty: 3 }, { tx: 3.01, ty: 4 },
    ] } }
    const first = step(pet, world, 830, () => 0.9)
    const second = step(first, world, 841, () => 0.9)
    expect(second.transition!.groundReleases).toHaveLength(1)
    const original = structuredClone(second)
    const stopped = step(second, { ...world, free: (tile) => tile.tx !== 3.01 || tile.ty !== 3 }, 850, () => 0.9)
    expect(second).toEqual(original)
    expect(positionAt(stopped, 850)).toEqual({ tx: 3, ty: 3 })
    expect(stopped.transition!.groundReleases).toHaveLength(2)
    const withoutReleases = { ...stopped, transition: { ...stopped.transition!, groundReleases: [] } }
    for (const offset of [0, 20, 60, 119, 120]) {
      const frame = motionFor(stopped, 850 + offset, species, 'happy', false).frame
      const baseline = motionFor(withoutReleases, 850 + offset, species, 'happy', false).frame
      for (const side of ['left', 'right'] as const) {
        expect(Math.abs(frame[`${side}GroundX`]!)).toBeLessThanOrEqual(48)
        expect(frame.bodyX + frame[`${side}GroundX`]!).toBeCloseTo(0, 10)
        expect(frame[`${side}GroundY`]).toBeCloseTo(0, 10)
        // All replaced anchors coincide: old rejected displacements must not
        // add a release lift. Sampled gait lifts themselves are preserved.
        expect(frame[`${side}Foot`]).toBeCloseTo(baseline[`${side}Foot`], 10)
      }
    }
  })

  it.each([
    { name: 'first', blockedIndex: 0, now: 630, pathLength: 2 },
    { name: 'later', blockedIndex: 1, now: 1000, pathLength: 2 },
    { name: 'later during an ongoing journey', blockedIndex: 1, now: 1000, pathLength: 3 },
  ])('keeps delayed $name blocked-segment contacts at the validated origin', ({ blockedIndex, now, pathLength }) => {
    for (const species of ['mochi', 'bun', 'sprout'] as const) {
      for (const [dx, dy, facing] of [[1, 0, 1], [-1, 0, -1], [0, 1, -1], [0, -1, 1]] as const) {
        for (const materialized of [false, true]) {
          const origin = { tx: 3, ty: 3 }
          let pet: PetState = { ...initialPet(origin, 0), facing, activity: {
            kind: 'walk', path: Array.from({ length: pathLength }, (_, n) => ({ tx: 3 + (n + 1) * dx, ty: 3 + (n + 1) * dy })),
            stepStart: 0, then: 'idle',
          } }
          if (materialized) pet = step(pet, world, blockedIndex ? 500 : 100, () => 0.9)
          const blockedTile = { tx: 3 + (blockedIndex + 1) * dx, ty: 3 + (blockedIndex + 1) * dy }
          const stopped = step(pet, { ...world, free: (tile) => tile.tx !== blockedTile.tx || tile.ty !== blockedTile.ty }, now, () => 0.9)
          const safe = { tx: 3 + blockedIndex * dx, ty: 3 + blockedIndex * dy }
          expect(positionAt(stopped, now)).toEqual(safe)
          const start = roomPoint(3.5, 3.5), forward = roomPoint(3.5 + dx, 3.5 + dy)
          for (const offset of [0, 20, 60, 119, 120]) {
            const frame = motionFor(stopped, now + offset, species, 'happy', false).frame
            for (const field of ['leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const) {
              expect(Number.isFinite(frame[field])).toBe(true)
              expect(Math.abs(frame[field]!)).toBeLessThanOrEqual(48)
              if (pathLength === 2 && offset === 0) expect(frame[field]).toBe(0)
            }
            for (const side of ['left', 'right'] as const) {
              const x = facing * (frame.bodyX + frame[`${side}GroundX`]!) * PET_SCALE
              const y = frame[`${side}GroundY`]! * PET_SCALE
              // Remove normal rig foot spacing: no grounded landing may
              // carry forward traversal beyond the validated container.
              const rejected = x * (forward.x - start.x) + y * (forward.y - start.y)
              if (frame[`${side}Foot`] === 0) expect(rejected).toBeLessThanOrEqual(1e-8)
            }
          }
          const before = motionFor(stopped, now + 60, species, 'happy', false).frame
          const joined = motionFor(tap(stopped, now + 60), now + 60, species, 'happy', false).frame
          for (const field of ['leftFoot', 'rightFoot', 'leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const) {
            expect(joined[field]).toBeCloseTo(before[field]!, 10)
          }
        }
      }
    }
  })

  it.each([{ away: true }, { mood: 'sick' as const }])('uses validated blocked contacts during suppression for %j', (over) => {
    for (const [blockedTx, now, safeTx] of [[3, 630, 2], [4, 1000, 3]]) {
      const w = { ...world, ...over, free: (tile: PetState['tile']) => tile.tx !== blockedTx }
      const stopped = step(walk(), w, now, () => 0.9)
      expect(positionAt(stopped, now)).toEqual({ tx: safeTx, ty: 2 })
      for (const offset of [0, 20, 60, 120]) {
        const frame = motion(stopped, now + offset, w.mood).frame
        for (const side of ['left', 'right'] as const) {
          expect(Math.abs(frame[`${side}GroundX`]!)).toBeLessThanOrEqual(48)
          expect(Math.abs(frame[`${side}GroundY`]!)).toBeLessThanOrEqual(48)
          if (frame[`${side}Foot`] === 0) expect(frame.bodyX + frame[`${side}GroundX`]!).toBeLessThanOrEqual(1e-8)
        }
      }
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('retains exact %s contacts when cancellation preserves a valid fractional position', (species) => {
    const pet = step(walk(), world, 100, () => 0.9)
    const stopped = step(pet, { ...world, free: (tile) => tile.tx !== 3 }, 137, () => 0.9)
    expect(positionAt(stopped, 137)).toEqual(positionAt(pet, 137))
    expect(motionFor(stopped, 137, species, 'happy', false).frame).toEqual(motionFor(pet, 137, species, 'happy', false).frame)
    expect(stopped.transition!.layers.at(-1)!.snapshot.walkAt).toBeUndefined()
  })

  it('keeps lifetime blink time when a delayed collision rewinds route sampling', () => {
    const pet: PetState = { ...walk(), activity: { kind: 'walk', stepStart: 0, then: 'idle', path: [
      { tx: 3, ty: 2 }, { tx: 4, ty: 2 }, { tx: 5, ty: 2 }, { tx: 6, ty: 2 }, { tx: 7, ty: 2 },
      { tx: 7, ty: 3 }, { tx: 6, ty: 3 }, { tx: 5, ty: 3 }, { tx: 4, ty: 3 }, { tx: 3, ty: 3 },
    ] } }
    const stopped = step(pet, { ...world, free: (tile) => tile.tx !== 3 || tile.ty !== 2 }, 3070, () => 0.9)
    expect(motion(stopped, 3070).blinkMs).toBe(3070)
    expect(motion(stopped, 3070).frame.eyeOpen).toBeCloseTo(0.1)
    expect(stopped.transition!.layers.at(-1)!.snapshot).toMatchObject({ at: 3070, walkAt: 0 })
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('plants %s contacts in both world axes for every route direction', (species) => {
    const stride = { mochi: 0.9, bun: 0.72, sprout: 0.82 }[species]
    for (const [dx, dy, facing] of [[1, 0, 1], [-1, 0, -1], [0, 1, -1], [0, -1, 1]] as const) {
      let pet: PetState = { ...initialPet({ tx: 3, ty: 3 }, 0), facing, activity: {
        kind: 'walk', path: [1, 2, 3].map((n) => ({ tx: 3 + n * dx, ty: 3 + n * dy })), stepStart: 0, then: 'idle',
      } }
      let contact: ReturnType<typeof sole> | undefined
      for (const phase of [0.8, 0.95, 1.1, 1.2]) {
        const now = phase * stride * TIMING.stepMs
        pet = step(pet, world, now, () => 0.9)
        const input = motionFor(pet, now, species, 'happy', false)
        expect(input.facing).toBe(facing)
        expect(input.frame.rightFoot).toBe(0)
        const point = sole(pet, now, species, 'right', input.frame)
        if (contact) {
          expect(point.x).toBeCloseTo(contact.x, 10)
          expect(point.y).toBeCloseTo(contact.y, 10)
        }
        contact = point
      }
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('retains %s landings before a corner after the route is truncated', (species) => {
    const stride = { mochi: 0.9, bun: 0.72, sprout: 0.82 }[species]
    for (const facing of [1, -1] as const) {
      // Choose an integer corner crossed during right stance, whose landing
      // precedes that corner. Bun's shorter stride reaches this at tile three.
      const turnAfter = species === 'bun' ? 3 : 1
      let pet: PetState = { ...initialPet({ tx: 3, ty: 3 }, 0), facing, activity: {
        kind: 'walk', path: [...Array.from({ length: turnAfter }, (_, n) => ({ tx: 3 + (n + 1) * facing, ty: 3 })),
          { tx: 3 + turnAfter * facing, ty: 3 - facing }, { tx: 3 + turnAfter * facing, ty: 3 - 2 * facing }],
        stepStart: 0, then: 'idle',
      } }
      let contact: ReturnType<typeof sole> | undefined
      const phases = species === 'bun' ? [3.8, 3.95, 4.1, 4.2] : [0.8, 0.95, 1.1, 1.2]
      for (const phase of phases) {
        const now = phase * stride * TIMING.stepMs
        pet = step(pet, world, now, () => 0.9)
        const frame = motionFor(pet, now, species, 'happy', false).frame
        expect(frame.rightFoot).toBe(0)
        const point = sole(pet, now, species, 'right', frame)
        if (contact) {
          expect(point.x).toBeCloseTo(contact.x, 10)
          expect(point.y).toBeCloseTo(contact.y, 10)
        }
        contact = point
      }
    }
  })

  it('projects a fractional reconnect from its exact origin, with signed facing', () => {
    const interrupted = tap(walk(), 336)
    const resumed = step(interrupted, { ...world, free: (tile) => tile.tx !== 3 }, 2000, () => 0.9)
    const input = motion(resumed, 2000)
    expect(positionAt(resumed, 2000)).toEqual(positionAt(interrupted, 336))
    expect(input.facing).toBe(-1)
    expect(input.groundPath).toHaveLength(2)
    const from = roomPoint(3.3, 2.5), to = roomPoint(2.5, 2.5)
    expect(input.groundPath![0]).toEqual({ distance: 0, x: from.x / PET_SCALE, y: from.y / PET_SCALE })
    expect(input.groundPath![1].distance).toBeCloseTo(0.8)
    expect(input.groundPath![1].x).toBeCloseTo(to.x / PET_SCALE)
    expect(input.groundPath![1].y).toBeCloseTo(to.y / PET_SCALE)
    expect(input.frame).toEqual(sampleMotion(input))
    let contact: ReturnType<typeof sole> | undefined
    for (const distance of [0.40, 0.44, 0.48]) {
      const now = 2000 + distance * TIMING.stepMs
      const frame = motion(resumed, now).frame
      expect(frame.leftFoot).toBe(0)
      const point = sole(resumed, now, 'bun', 'left', frame)
      if (contact) {
        expect(point.x).toBeCloseTo(contact.x, 10)
        expect(point.y).toBeCloseTo(contact.y, 10)
      }
      contact = point
    }
    const end = motion(resumed, 2000 + input.durationMs)
    expect(end.frame).toEqual(sampleMotion({ ...end, elapsedMs: 0 }))
  })

  it('derives available legacy history safely when an older walk already has a distance offset', () => {
    const pet: PetState = { ...walk(), activity: { kind: 'walk', origin: { tx: 3, ty: 2 }, path: [{ tx: 4, ty: 2 }],
      distance: 1, stepStart: 420, journeyStart: 0, durationMs: 840, then: 'idle' } }
    const input = motion(pet, 500)
    expect(input.groundPath?.map((point) => point.distance)).toEqual([1, 2])
    expect(Object.values(input.frame).filter((value) => typeof value === 'number').every(Number.isFinite)).toBe(true)
  })

  it('skips zero-length legacy segments so fallback ground distances stay strictly increasing', () => {
    const pet: PetState = { ...walk(), activity: { kind: 'walk', stepStart: 0, then: 'idle',
      path: [{ tx: 2, ty: 2 }, { tx: 3, ty: 2 }, { tx: 3, ty: 2 }, { tx: 4, ty: 2 }] } }
    expect(motion(pet, 500).groundPath?.map((point) => point.distance)).toEqual([0, 1, 2])
    const canonical = motion(walk(), 500)
    expect(motion(pet, 500).frame).toEqual(canonical.frame)
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('uses shared contact release for %s and preserves it through another tap join', (species) => {
    const stride = { mochi: 0.9, bun: 0.72, sprout: 0.82 }[species]
    const pet = step(walk(), world, 0, () => 0.9)
    const now = 0.9 * stride * TIMING.stepMs
    const before = motionFor(pet, now, species, 'happy', false).frame
    const tapped = tap(pet, now)
    expect(motionFor(tapped, now, species, 'happy', false).frame).toEqual(before)
    const mid = now + 60
    const input = motionFor(tapped, mid, species, 'happy', false)
    const expected = blendGroundFeet(before, sampleMotion(input), blendProgress(now, mid))
    for (const field of ['leftFoot', 'rightFoot', 'leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const) {
      expect(input.frame[field]).toBeCloseTo(expected[field]!, 10)
    }
    // Transferred landings lift through the shared helper. The sampler may
    // anticipate either landing ahead of the stopped container.
    expect(input.frame.leftFoot).toBeGreaterThan(5)
    const celebrated = react(tapped, mid, 'celebrate')
    const joined = motionFor(celebrated, mid, species, 'happy', false).frame
    for (const field of Object.keys(input.frame) as (keyof MotionFrame)[]) {
      if (field === 'expression') expect(joined[field]).toBe(input.frame[field])
      else expect(joined[field]).toBeCloseTo(input.frame[field]!, 10)
    }
    expect(sole(celebrated, mid, species, 'left', joined).x).toBeCloseTo(sole(tapped, mid, species, 'left', input.frame).x, 10)
    expect(sole(celebrated, mid, species, 'left', joined).y).toBeCloseTo(sole(tapped, mid, species, 'left', input.frame).y, 10)
    expect(motionFor(celebrated, mid + TIMING.blendMs, species, 'happy', false).frame)
      .toEqual(sampleMotion(motionFor(celebrated, mid + TIMING.blendMs, species, 'happy', false)))
    const later = mid + 40
    const beforeUpgrade = motionFor(celebrated, later, species, 'happy', false).frame
    const upgraded = motionFor(react(celebrated, later, 'celebrate-big'), later, species, 'happy', false).frame
    for (const field of Object.keys(beforeUpgrade) as (keyof MotionFrame)[]) {
      if (field !== 'expression') expect(upgraded[field]).toBeCloseTo(beforeUpgrade[field]!, 10)
    }
  })

  it('mirrors a frozen release term onto the paired foot along with its snapshot', () => {
    // At the stance centre, the grounded right foot is under the container.
    // The swinging left landing cuts across the upcoming corner and replants.
    const petRoute: PetState = { ...walk(), activity: { kind: 'walk', stepStart: 0, then: 'idle',
      path: [{ tx: 3, ty: 2 }, { tx: 3, ty: 1 }, { tx: 4, ty: 1 }] } }
    const now = 0.72 * TIMING.stepMs
    const tapped = tap(petRoute, now)
    const pet = react(tapped, now + 60, 'celebrate')
    const before = motion(pet, now + 60).frame
    expect(before.leftFoot).toBeGreaterThan(5)
    expect(before.rightFoot).toBeCloseTo(0, 10)
    const mirrored = motion({ ...pet, facing: -1 }, now + 60).frame
    expect(mirrored.rightFoot).toBeCloseTo(before.leftFoot, 10)
    expect(mirrored.leftFoot).toBeCloseTo(before.rightFoot, 10)
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('rebases %s outgoing corner contacts while its world container keeps moving', (species) => {
    const pet: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), activity: {
      kind: 'walk', path: [{ tx: 3, ty: 2 }, { tx: 3, ty: 3 }, { tx: 3, ty: 4 }], stepStart: 0, then: 'idle',
    } }
    const old = motionFor(pet, 420, species, 'happy', false).frame
    const corner = step(pet, world, 420, () => 0.9)
    const now = 460
    const input = motionFor(corner, now, species, 'happy', false)
    const oldTile = positionAt(pet, 420), newTile = positionAt(corner, now)
    const oldPoint = roomPoint(oldTile.tx + 0.5, oldTile.ty + 0.5)
    const newPoint = roomPoint(newTile.tx + 0.5, newTile.ty + 0.5)
    const dx = (oldPoint.x - newPoint.x) / PET_SCALE * corner.facing
    const dy = (oldPoint.y - newPoint.y) / PET_SCALE
    const from = { ...old, bodyX: -old.bodyX, leftFoot: old.rightFoot, rightFoot: old.leftFoot,
      leftGroundX: -old.rightGroundX! + dx, rightGroundX: -old.leftGroundX! + dx,
      leftGroundY: old.rightGroundY! + dy, rightGroundY: old.leftGroundY! + dy }
    const expected = blendGroundFeet(from, sampleMotion(input), blendProgress(420, now))
    for (const field of ['leftFoot', 'rightFoot', 'leftGroundX', 'leftGroundY', 'rightGroundX', 'rightGroundY'] as const) {
      expect(input.frame[field]).toBeCloseTo(expected[field]!, 10)
    }
    // Input during the turn retains the rebased contact and shared release.
    const joined = motionFor(tap(corner, now), now, species, 'happy', false).frame
    for (const field of Object.keys(input.frame) as (keyof MotionFrame)[]) {
      if (field !== 'expression') expect(joined[field]).toBeCloseTo(input.frame[field]!, 10)
    }
  })

  it('defaults missing optional ground offsets to zero through interruption blends', () => {
    const sample = motionSampler.sampleMotion
    const legacySampler = vi.spyOn(motionSampler, 'sampleMotion').mockImplementation((input) => ({
      ...sample(input), leftGroundX: undefined, leftGroundY: undefined, rightGroundX: undefined, rightGroundY: undefined,
    }))
    try {
      const pet = tap(walk(), 210)
      for (const now of [210, 250, 330, 700]) {
        expect(motion(pet, now).frame).toMatchObject({ leftGroundX: 0, leftGroundY: 0, rightGroundX: 0, rightGroundY: 0 })
      }
      expect(motion(pet, 250, 'happy', true).frame).toMatchObject({ leftGroundX: 0, leftGroundY: 0, rightGroundX: 0, rightGroundY: 0 })
    } finally { legacySampler.mockRestore() }
  })
})

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
  it.each(['mochi', 'bun', 'sprout'] as const)('reflects the full rendered %s torso at local turns for every upright mood', (species) => {
    for (const mood of ['happy', 'content', 'meh', 'scruffy'] as const) for (const facing of [1, -1] as const) {
      const origin = facing === 1 ? 2 : 5
      const pet: PetState = { ...initialPet({ tx: origin, ty: origin }, 0), facing, activity: {
        kind: 'walk', stepStart: 0, then: 'idle', path: [
          { tx: origin + facing, ty: origin }, { tx: origin + facing, ty: origin + facing },
          { tx: origin + 2 * facing, ty: origin + facing },
        ],
      } }
      const angle = (state: PetState, now: number) => {
        const frame = motionFor(state, now, species, mood, false).frame
        const transform = articulatedTransform(species, frame, poseNameFor(mood))
        return state.facing * Number(/rotate\(([-\d.e]+) /.exec(transform)![1])
      }
      const corner = step(pet, { ...world, mood }, 420, () => 0.9)
      expect(corner.facing).toBe(-facing)
      expect(angle(corner, 420)).toBeCloseTo(angle(pet, 420), 12)
      // The next real corner reflects back into the original facing.
      const second = step(corner, { ...world, mood }, 850, () => 0.9)
      expect(second.facing).toBe(facing)
      expect(angle(second, 850)).toBeCloseTo(angle(corner, 850), 12)
      // Input during the first turn retains several poses. Reflect their
      // aggregate at the join to check each layer includes the mood tilt.
      const joined = tap(corner, 460)
      expect(joined.transition!.layers).toHaveLength(2)
      expect(angle(joined, 460)).toBeCloseTo(angle(corner, 460), 12)
      const reflected = { ...joined, facing: -joined.facing as 1 | -1 }
      expect(angle(reflected, 460)).toBeCloseTo(angle(joined, 460), 12)
      const settled = { ...corner, transition: undefined }
      expect(angle(corner, 540)).toBeCloseTo(angle(settled, 540), 12)
    }
  })

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
    expect(after.leftGroundX).toBeCloseTo(-before.rightGroundX!, 12)
    expect(after.rightGroundX).toBeCloseTo(-before.leftGroundX!, 12)
    expect(after.leftGroundY).toBeCloseTo(before.rightGroundY!, 12)
    expect(after.rightGroundY).toBeCloseTo(before.leftGroundY!, 12)
    expect(sole(corner, 420, species, 'left', after)).toEqual(sole(pet, 420, species, 'right', before))
    expect(sole(corner, 420, species, 'right', after)).toEqual(sole(pet, 420, species, 'left', before))
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
    const before = motion(pet, 2000).frame
    expect(moved.facing).toBe(-pet.facing)
    // Frames are local to the facing. The outgoing ears swap and negate so
    // the outer mirror preserves their screen positions at the handoff.
    expect(frame).toEqual({ ...before, leftAppendage: -before.rightAppendage, rightAppendage: -before.leftAppendage })
    expect(frame.leftFoot).toBeCloseTo(0)
  })
})
