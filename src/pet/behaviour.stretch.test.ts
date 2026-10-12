import { expect, it } from 'vitest'
import { initialPet, positionAt, react, step, tap, type PetState, type ReactionKind, type World } from './behaviour'
const stretch = 'stretch' as ReactionKind
const world: World = { free: () => true, mood: 'happy', away: false, mess: null }

it('starts a finite stretch at the drawn position without changing tap alternation', () => {
  const moving: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), reactions: 3, activity: {
    kind: 'walk', origin: { tx: 2, ty: 2 }, path: [{ tx: 3, ty: 2 }], stepStart: 0, then: 'idle',
  } }
  const started = react(moving, 137, stretch)
  expect(started.activity).toMatchObject({ kind: 'react', action: 'stretch', start: 137, until: 2537 })
  expect(positionAt(started, 137)).toEqual(positionAt(moving, 137))
  expect(started.reactions).toBe(3)
  expect(started.pendingTap).toBe(false)
  expect(react(started, 200, stretch)).toBe(started)
  expect(react(started, 200, 'greet')).toBe(started)
  const cheer = react(started, 300, 'celebrate')
  expect(cheer.activity).toMatchObject({ kind: 'react', action: 'celebrate' })
  expect(react(cheer, 400, stretch)).toBe(cheer)
})

it('expires a hidden stretch without replay and resumes normal tap alternation', () => {
  const started = react(initialPet({ tx: 2, ty: 2 }, 0), 100, stretch)
  expect(step(started, world, 2499, () => .99)).toBe(started)
  const settled = step(started, world, 10000, () => .99)
  expect(settled.activity.kind).toBe('idle')
  expect(settled.pendingTap).toBe(false)
  expect(tap(settled, 10100).activity).toMatchObject({ kind: 'react', action: 'greet' })
})
