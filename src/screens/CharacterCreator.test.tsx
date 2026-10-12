// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Pet } from '../domain/types'
import { click, render } from '../test/react'
import * as model from './creatorModel'
import { CharacterCreator, type PetLookPatch } from './CharacterCreator'

const pet: Pet = { id: 'pet', homeId: 'home', name: 'Mochi', species: 'mochi', bodyColour: '#FFCFDA', eyes: 'classic', cheeks: 'round', equipped: { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' } }
let ui: ReturnType<typeof render>
let now: number, serial: number, hidden: boolean
let frames: Map<number, FrameRequestCallback>
let media: MediaQueryList
let saved: ReturnType<typeof vi.fn<(patch: PetLookPatch) => void>>
let closed: ReturnType<typeof vi.fn<() => void>>
const content = () => <StrictMode><CharacterCreator pet={pet} onSave={saved} onClose={closed} /></StrictMode>

beforeEach(() => {
  now = 0; serial = 0; hidden = false; frames = new Map(); saved = vi.fn(); closed = vi.fn()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  media = Object.assign(new EventTarget(), { matches: false, media: '(prefers-reduced-motion: reduce)' }) as MediaQueryList
  const narrow = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
  vi.stubGlobal('matchMedia', (query: string) => query.includes('prefers-reduced-motion') ? media : narrow)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(model, 'swatchesFor')
  ui = render(content())
})
afterEach(() => { ui.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function button(name: string) {
  const node = [...ui.container.querySelectorAll('button')].find(node => node.textContent === name)
  expect(node, `button ${name}`).toBeTruthy(); return node!
}
function radio(name: string) {
  const node = ui.container.querySelector(`[role="radio"][aria-label="${name}"]`)
  expect(node, `radio ${name}`).not.toBeNull(); return node!
}
function frame(at: number) { now = at; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(fn => fn(at))) }
function preference(matches: boolean) { act(() => { Object.defineProperty(media, 'matches', { value: matches, configurable: true }); media.dispatchEvent(new Event('change')) }) }
function visibility(value: boolean) { act(() => { hidden = value; document.dispatchEvent(new Event('visibilitychange')) }) }
function preview() { return ui.container.querySelector('.cc-preview')! }
function body() { return preview().querySelector('[data-character-body]')!.getAttribute('transform') }

it('reacts with the sampled character while its card and choice grid stay still, then settles exactly', () => {
  expect(preview().querySelector('.ch-animated')).not.toBeNull()
  expect(frames.size).toBe(0)
  click(radio('Bun'))
  const art = preview().querySelector('.ch-animated')
  const gridRenders = vi.mocked(model.swatchesFor).mock.calls.length
  const neutral = body()
  expect(frames.size).toBe(1)
  expect(preview().classList.contains('cc-cheer')).toBe(false)
  frame(756)
  expect(body()).toMatch(/^translate\(0 -/)
  for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) expect(preview().querySelector(`[data-slot="${slot}"]`)).not.toBeNull()
  expect(model.swatchesFor).toHaveBeenCalledTimes(gridRenders)
  expect(saved).not.toHaveBeenCalled()
  frame(1800)
  expect(body()).toBe(neutral)
  expect(preview().querySelector('.ch-animated')).toBe(art)
  expect(frames.size).toBe(0)
  click(button('Save'))
  expect(saved).toHaveBeenCalledWith({ species: 'bun', bodyColour: '#FFFFFF' })
  expect(closed).toHaveBeenCalledOnce()
})

it.each(['Sparkly', 'Hearts'])('ends an active reaction immediately when choosing %s so the face choice is visible', name => {
  click(radio('Bun')); frame(756)
  expect(preview().querySelector('[data-expression="cheering"]')).not.toBeNull()
  click(button('Face'))
  const choice = radio(name)
  act(() => (choice as HTMLElement).focus())
  click(choice)
  expect(frames.size).toBe(0)
  expect(preview().querySelector('[data-expression="happy"]')).not.toBeNull()
  expect(body()).toMatch(/^translate\(0 0\)/)
  expect(document.activeElement).toBe(choice)
  expect(choice.getAttribute('aria-checked')).toBe('true')
  frame(2000)
  expect(preview().querySelector('[data-expression="happy"]')).not.toBeNull()
  expect(saved).not.toHaveBeenCalled()
})

it('coalesces rapid species and colour changes without extending the reaction deadline', () => {
  click(radio('Bun')); frame(756)
  click(radio('Sprout'))
  click(button('Colour'))
  click(radio('Sky'))
  expect(frames.size).toBe(1)
  frame(1800)
  expect(frames.size).toBe(0)
  expect(body()).toMatch(/^translate\(0 0\)/)
  click(button('Save'))
  expect(saved).toHaveBeenCalledWith({ species: 'sprout', bodyColour: '#9ED8F5' })
})

it('settles immediately on live reduction and does not replay after restoration', () => {
  click(radio('Bun')); frame(756)
  preference(true)
  expect(body()).toMatch(/^translate\(0 0\)/)
  expect(preview().querySelector('[data-expression="happy"]')).not.toBeNull()
  expect(frames.size).toBe(0)
  preference(false)
  expect(frames.size).toBe(0)
  click(button('Colour')); click(radio('Sky'))
  expect(frames.size).toBe(1)
})

it('honors initial reduced motion while still applying look choices', () => {
  ui.unmount()
  Object.defineProperty(media, 'matches', { value: true, configurable: true })
  ui = render(content())
  click(radio('Bun'))
  expect(frames.size).toBe(0)
  expect(body()).toMatch(/^translate\(0 0\)/)
  click(button('Save'))
  expect(saved).toHaveBeenCalledWith({ species: 'bun', bodyColour: '#FFFFFF' })
})

it('suspends hidden motion, settles after the deadline, and cleans up pending frames', () => {
  click(radio('Bun')); frame(300)
  const stale = [...frames.values()][0]
  visibility(true)
  expect(frames.size).toBe(0)
  now = 2000; visibility(false); frame(now)
  expect(frames.size).toBe(0)
  click(radio('Sprout'))
  expect(frames.size).toBe(1)
  ui.unmount()
  expect(frames.size).toBe(0)
  act(() => stale(5000))
  expect(frames.size).toBe(0)
})
