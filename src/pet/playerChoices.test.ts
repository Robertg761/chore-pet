import { expect, it } from 'vitest'
import { ACTION_MS } from '../character/motion'
import { motionFor } from './activityMotion'
import { initialPet, positionAt, react, step, tap, type PetState } from './behaviour'

const world = { free: () => true, mood: 'happy' as const, away: false, mess: null, interactions: [] }
for (const action of ['greet', 'affection'] as const) {
  it(`uses the chosen ${action} deadline and preserves a moving pose`, () => {
    const state: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), activity: {
      kind: 'walk', stepStart: 0, path: [{ tx: 3, ty: 2 }, { tx: 4, ty: 2 }], then: 'idle',
    } }
    const next = react(state, 210, action)
    expect(next.activity).toMatchObject({ kind: 'react', action, start: 210, until: 210 + ACTION_MS[action] })
    expect(positionAt(next, 210)).toEqual({ tx: 2.5, ty: 2 })
    for (const species of ['mochi', 'bun', 'sprout'] as const) {
      expect(motionFor(next, 210, species, 'happy', false).frame).toEqual(motionFor(state, 210, species, 'happy', false).frame)
    }
    for (let n = 1; n <= 20; n++) expect(react(next, 210 + n * 10, action)).toBe(next)
    expect(next.pendingTap).toBe(false)
    expect(step(next, world, 210 + ACTION_MS[action], () => .99).activity.kind).not.toBe('react')
  })

  it(`keeps a chore cheer ahead of ${action} and does not queue it`, () => {
    const cheer = react(initialPet({ tx: 2, ty: 2 }, 0), 0, 'celebrate-big')
    expect(react(cheer, 100, action)).toBe(cheer)
    expect(cheer.pendingTap).toBe(false)
    expect(step(cheer, world, 2200, () => .99).activity.kind).toBe('idle')
  })
}

it('keeps tap alternation independent of explicit choices', () => {
  const chosen = react(initialPet({ tx: 2, ty: 2 }, 0), 0, 'affection')
  const tapped = tap(step(chosen, world, 1600, () => .99), 1700)
  expect(tapped.activity).toMatchObject({ action: 'greet' })
})
