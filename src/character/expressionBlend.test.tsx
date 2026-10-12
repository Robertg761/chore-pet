// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EYE_STYLES, type EyeStyle, type Mood, type Species } from '../domain/types'
import { initialPet, step, type PetState, type World } from '../pet/behaviour'
import { motionFor } from '../pet/activityMotion'
import type { InteractionTarget } from '../pet/interactions'
import { AnimatedCharacterArt } from './AnimatedCharacter'
import { ACTION_MS, sampleMotion, type MotionAction, type MotionFrame } from './motion'

const neutral = sampleMotion({ species: 'bun', mood: 'happy', action: 'idle', elapsedMs: 0, durationMs: 4000, distance: 0, reducedMotion: false })
// The extension keeps the pre-feature regression type-valid before the optional field exists.
const weight = (frame: MotionFrame) => (frame as MotionFrame & { pleasedWeight?: number }).pleasedWeight
const weighted = (value: number): MotionFrame => ({ ...neutral, expression: 'pleased', pleasedWeight: value } as MotionFrame)
const legacy = (frame: MotionFrame, expression: MotionFrame['expression']): MotionFrame => {
  const copy = { ...frame, expression } as MotionFrame & { pleasedWeight?: number }
  delete copy.pleasedWeight
  return copy
}
function markup(frame: MotionFrame, mood: Mood = 'happy', species: Species = 'bun', eyes: EyeStyle = 'classic') {
  return renderToStaticMarkup(<svg><AnimatedCharacterArt species={species} mood={mood} bodyColour="#38243b"
    equipped={{ head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }}
    look={{ eyes }} frame={frame} /></svg>)
}
function tree(frame: MotionFrame, mood: Mood = 'happy', species: Species = 'bun') {
  const node = document.createElement('div')
  node.innerHTML = markup(frame, mood, species)
  return node
}

describe('pleased expression transitions', () => {
  it.each(['mochi', 'bun', 'sprout'] as const)('%s warms and settles its finite smile without changing reduced stills', species => {
    for (const action of ['greet', 'affection', 'celebrate', 'celebrate-big', 'wave'] satisfies MotionAction[]) {
      const at = (phase: number, reducedMotion = false) => sampleMotion({ species, mood: 'happy', action,
        elapsedMs: ACTION_MS[action] * phase, durationMs: ACTION_MS[action], distance: 0, reducedMotion })
      expect(weight(at(0))).toBe(0)
      expect(weight(at(.05))).toBeGreaterThan(0)
      expect(weight(at(.05))).toBeLessThan(.25)
      expect(weight(at(.1))).toBeGreaterThan(weight(at(.05))!)
      expect(weight(at(.5))).toBe(1)
      expect(weight(at(.95))).toBeGreaterThan(0)
      expect(weight(at(.95))).toBeLessThan(.25)
      expect(weight(at(1))).toBe(0)
      for (const phase of [.05, .5, .95]) expect(weight(at(phase, true))).toBe(1)
    }
  })

  it('crossfades existing healthy eye shapes with complementary opacity and one contrast backing', () => {
    for (const mood of ['happy', 'content', 'meh'] as const) {
      const node = tree(weighted(.25), mood)
      const base = node.querySelector('[data-expression-layer="mood"]')!
      const pleased = node.querySelector('[data-expression-layer="pleased"]')!
      expect(base).not.toBeNull()
      expect(pleased).not.toBeNull()
      expect(Number(base.getAttribute('opacity'))).toBe(.75)
      expect(Number(pleased.getAttribute('opacity'))).toBe(.25)
      expect(base.querySelectorAll('[data-eye-gaze]')).toHaveLength(2)
      expect(pleased.querySelectorAll('[data-eye-gaze]')).toHaveLength(0)
      expect(node.querySelectorAll('[data-face-contrast]')).toHaveLength(1)
      expect(node.querySelector('[data-face-contrast] ellipse')!.getAttribute('ry')).toBe('13.5')
      for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) expect(node.querySelectorAll(`[data-slot="${slot}"]`)).toHaveLength(1)
    }
  })

  it('keeps exact legacy endpoint art for every species and eye style with no extra face nodes', () => {
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const mood of ['happy', 'content', 'meh'] as const) {
      for (const eyes of EYE_STYLES) {
        expect(markup(weighted(0), mood, species, eyes)).toBe(markup(legacy(neutral, 'mood'), mood, species, eyes))
        expect(markup(weighted(1), mood, species, eyes)).toBe(markup(legacy(neutral, 'pleased'), mood, species, eyes))
      }
    }
    for (const value of [0, 1]) expect(tree(weighted(value)).querySelectorAll('[data-expression-layer]')).toHaveLength(0)
  })

  it('preserves scruffy and sick art independently of the optional smile weight', () => {
    for (const species of ['mochi', 'bun', 'sprout'] as const) for (const mood of ['scruffy', 'sick'] as const) {
      expect(markup(weighted(.5), mood, species)).toBe(markup(legacy(neutral, 'pleased'), mood, species))
    }
  })

  it('bounds malformed weights without dropping legacy expression fallbacks', () => {
    expect(markup(weighted(-2))).toBe(markup(weighted(0)))
    expect(markup(weighted(2))).toBe(markup(weighted(1)))
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(markup(weighted(value))).toBe(markup(weighted(1)))
      expect(markup({ ...weighted(value), expression: 'mood' })).toBe(markup(weighted(0)))
    }
  })

  it('closes the outgoing healthy eyes as the smile appears without reopening a blink', () => {
    for (const mood of ['happy', 'content', 'meh'] as const) for (const eyeOpen of [0, .8, 1]) {
      const node = tree({ ...weighted(.5), eyeOpen }, mood)
      const openness = [...node.querySelectorAll('[data-expression-layer="mood"] [data-eye-open]')]
        .map(eye => Number(eye.getAttribute('data-eye-open')))
      expect(openness).toEqual([eyeOpen * .5, eyeOpen * .5])
      expect(node.querySelectorAll('[data-expression-layer="pleased"] [data-eye-open]')).toHaveLength(0)
    }
  })

  it('keeps sleeping art settled when an outgoing smile is still present', () => {
    for (const species of ['mochi', 'bun', 'sprout'] as const) {
      const render = (frame: MotionFrame) => renderToStaticMarkup(<svg><AnimatedCharacterArt species={species}
        mood="happy" pose="sleeping" bodyColour="#38243b" frame={frame} /></svg>)
      expect(render(weighted(.5))).toBe(render(weighted(0)))
      expect(render(weighted(.5))).not.toContain('data-expression-layer')
    }
  })

  it.each(['mochi', 'bun', 'sprout'] as const)('carries the outgoing %s plant-wave smile through actual target removal', species => {
    const target: InteractionTarget = { objectId: 'plant', signature: 'plant-clean', tile: { tx: 2, ty: 2 },
      gaze: { tx: 3, ty: 2 }, action: 'wave', contact: false }
    const state: PetState = { ...initialPet(target.tile, 0), activity: {
      kind: 'interact', phase: 'action', target, start: 0, until: ACTION_MS.wave,
    } }
    const world: World = { free: () => true, mood: 'happy', away: false, mess: null, interactions: [] }
    const stopped = step(state, world, 700, () => .99)
    expect(stopped.activity.kind).toBe('idle')
    expect(weight(motionFor(stopped, 700, species, 'happy', false).frame)).toBe(1)
    const halfway = motionFor(stopped, 760, species, 'happy', false).frame
    expect(weight(halfway)).toBeCloseTo(.5, 10)
    expect(tree(halfway, 'happy', species).querySelectorAll('[data-expression-layer]')).toHaveLength(2)
    expect(weight(motionFor(stopped, 820, species, 'happy', false).frame)).toBe(0)
  })
})
