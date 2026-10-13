import { expect, it } from 'vitest'
import { initialPet, positionAt, react, step, tap, type PetState, type ReactionKind, type World } from './behaviour'
import { motionFor } from './activityMotion'
const rest = 'rest' as ReactionKind
const world: World = { free: () => true, mood: 'happy', away: false, mess: null }

it('uses the existing grounded rest sampler for2400ms without moving a fractional invitation', () => {
  const moving: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), reactions: 3, activity: { kind: 'walk', path: [{ tx: 3, ty: 2 }], stepStart: 0, then: 'idle' } }
  const started = react(moving, 137, rest)
  expect(started.activity).toMatchObject({ kind: 'react', action: 'rest', start: 137, until: 2537 })
  expect(positionAt(started, 137)).toEqual(positionAt(moving, 137))
  expect(started.reactions).toBe(3)
  for (const species of ['mochi', 'bun', 'sprout'] as const) {
    expect(motionFor(started, 137, species, 'happy', false).frame).toEqual(motionFor(moving, 137, species, 'happy', false).frame)
    expect(motionFor(started, 1200, species, 'happy', false)).toMatchObject({ action: 'rest', durationMs: 2400, frame: { bodyX: 0, bodyY: 0, leftFoot: 0, rightFoot: 0, accentOpacity: 0, shadowScale: 1, shadowOpacity: 1 } })
  }
  expect(step(started, world, 2536, () => .99)).toBe(started)
  const settled = step(started, world, 2537, () => .99)
  expect(settled.activity.kind).toBe('walk')
  expect(positionAt(settled, 2537)).toEqual(positionAt(started, 2537))
  expect(tap(settled, 2600).activity).toMatchObject({ kind: 'react', action: 'affection' })
})

it('coalesces rest and other player choices without extending a deadline or queueing a response', () => {
  const started = react(initialPet({ tx: 2, ty: 2 }, 0), 100, rest)
  for (let n = 1; n <= 20; n++) for (const action of [rest, 'greet', 'stretch'] as const) expect(react(started, 100 + n * 10, action)).toBe(started)
  expect(started.pendingTap).toBe(false)
  const cheer = react(started, 400, 'celebrate')
  expect(cheer.activity).toMatchObject({ kind: 'react', action: 'celebrate', until: 2200 })
  expect(react(cheer, 500, rest)).toBe(cheer)
  const expired = step(started, world, 10000, () => .99)
  expect(expired.activity.kind).toBe('idle')
  expect(expired.pendingTap).toBe(false)
})
