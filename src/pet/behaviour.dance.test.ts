import { expect, it } from 'vitest'
import { ACTION_MS } from '../character/motion'
import { motionFor } from './activityMotion'
import { initialPet, positionAt, react, step, tap, type PetState, type ReactionKind, type World } from './behaviour'
const dance = 'dance' as ReactionKind
const world: World = { free: () => true, mood: 'happy', away: false, mess: null }

it('invites a finite dance from a fractional walk without relocating or changing tap alternation', () => {
  const moving: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), reactions: 3, activity: { kind: 'walk', path: [{ tx: 3, ty: 2 }], stepStart: 0, then: 'idle' } }
  const started = react(moving, 137, dance)
  expect(started.activity).toMatchObject({ kind: 'react', action: 'dance', start: 137, until: 2937 })
  expect(positionAt(started, 137)).toEqual(positionAt(moving, 137))
  expect(started.reactions).toBe(3)
  for (const species of ['mochi', 'bun', 'sprout'] as const) {
    expect(motionFor(started, 137, species, 'happy', false).frame).toEqual(motionFor(moving, 137, species, 'happy', false).frame)
    const sample = motionFor(started, 837, species, 'happy', false)
    expect(sample).toMatchObject({ action: 'dance', durationMs: 2800, frame: { bodyY: 0, leftFoot: 0, rightFoot: 0, accentOpacity: 0, shadowScale: 1, shadowOpacity: 1 } })
  }
  expect(step(started, world, 2936, () => .99)).toBe(started)
  const settled = step(started, world, 2937, () => .99)
  expect(settled.activity.kind).toBe('walk')
  expect(positionAt(settled, 2937)).toEqual(positionAt(started, 2937))
  expect(tap(settled, 3000).activity).toMatchObject({ kind: 'react', action: 'affection' })
})

it('keeps all explicit choices busy with no deadline extension, queue or tap count change', () => {
  const started = react(initialPet({ tx: 2, ty: 2 }, 0), 100, dance)
  for (let n = 1; n <= 20; n++) for (const action of [dance, 'greet', 'affection', 'hop', 'stretch', 'rest'] as const) expect(react(started, 100 + n * 10, action)).toBe(started)
  expect(started.pendingTap).toBe(false)
  const expired = step(started, world, 10000, () => .99)
  expect(expired.activity.kind).toBe('idle')
  expect(expired.pendingTap).toBe(false)
  expect(expired.reactions).toBe(0)
})

it.each(['celebrate', 'celebrate-big'] as const)('lets %s interrupt dance and declines a dance during that cheer', action => {
  const initial = initialPet({ tx: 2, ty: 2 }, 0)
  const started = react(initial, 100, dance)
  const cheer = react(started, 800, action)
  expect(cheer.activity).toMatchObject({ kind: 'react', action, until: 800 + ACTION_MS[action] })
  expect(positionAt(cheer, 800)).toEqual(positionAt(started, 800))
  expect(react(cheer, 900, dance)).toBe(cheer)
  expect(cheer.pendingTap).toBe(false)
  expect(step(cheer, world, 10000, () => .99).activity.kind).toBe('idle')
})

it.each(['sleep', 'sick'] as const)('keeps legacy %s reaction at the existing gaze-only notice', kind => {
  const state: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), activity: { kind } }
  const next = react(state, 100, dance)
  expect(next.activity).toBe(state.activity)
  expect(next.noticeStart).toBe(100)
  expect(next.reactions).toBe(state.reactions)
  expect(react(next, 200, dance)).toBe(next)
})
