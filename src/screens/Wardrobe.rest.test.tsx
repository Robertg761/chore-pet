// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Pet } from '../domain/types'
import { setPetMotionReduced } from '../pet/motionPreference'
import { click, render } from '../test/react'
import { Wardrobe, type WardrobeProps } from './Wardrobe'
import * as model from './wardrobeModel'

const pet: Pet = { id: 'pet', homeId: 'home', name: 'Mochi', species: 'mochi', bodyColour: '#ffcfda',
  equipped: { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' } }
let ui: ReturnType<typeof render>, now: number, serial: number, hidden: boolean, media: MediaQueryList
let frames: Map<number, FrameRequestCallback>, changed: ReturnType<typeof vi.fn<WardrobeProps['onChange']>>
beforeEach(() => {
  setPetMotionReduced(false)
  now = 0; serial = 0; hidden = false; frames = new Map(); changed = vi.fn()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  media = Object.assign(new EventTarget(), { matches: false, media: '(prefers-reduced-motion: reduce)' }) as MediaQueryList
  const narrow = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
  vi.stubGlobal('matchMedia', (query: string) => query.includes('prefers-reduced-motion') ? media : narrow)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(model, 'itemsForSlot')
  ui = render(<StrictMode><Wardrobe pet={pet} progress={null} onChange={changed} /></StrictMode>)
})
afterEach(() => { ui.unmount(); setPetMotionReduced(false); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function button(name: string) {
  const node = [...ui.container.querySelectorAll('button')].find(node => node.textContent === name)
  expect(node, `button ${name}`).toBeTruthy()
  return node!
}
function frame(at: number) { now = at; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(fn => fn(at))) }
function visibility(value: boolean) { act(() => { hidden = value; document.dispatchEvent(new Event('visibilitychange')) }) }
function preview() { return ui.container.querySelector('.wd-preview')! }
function body() { return preview().querySelector('[data-character-body]')!.getAttribute('transform') }
function arms() { return [...preview().querySelectorAll('[data-arm]')].map(node => node.getAttribute('transform')) }

it.each(['mochi', 'bun', 'sprout'] as const)('previews a quiet grounded dressed %s rest for exactly2400ms without saving or redrawing items', species => {
  ui.rerender(<StrictMode><Wardrobe pet={{ ...pet, species }} progress={null} onChange={changed} /></StrictMode>)
  const write = vi.spyOn(Storage.prototype, 'setItem'), art = preview().querySelector('.ch-animated')
  const neutralBody = body(), neutralArms = arms(), ground = preview().querySelector('[data-character-ground]')!.outerHTML
  click(button('Sleepy')); click(button('Rest'))
  expect(button('Happy').getAttribute('aria-pressed')).toBe('true')
  const gridRenders = vi.mocked(model.itemsForSlot).mock.calls.length
  expect(frames.size).toBe(1)
  frame(1200)
  expect(body()).toMatch(/^translate\(0 0\)/)
  expect(body()).not.toBe(neutralBody)
  const restingArms = arms()
  expect(restingArms).toHaveLength(2)
  restingArms.forEach((value, index) => expect(value).not.toBe(neutralArms[index]))
  expect(preview().querySelector('[data-character-ground]')!.outerHTML).toBe(ground)
  expect(preview().querySelector('[data-character-accents]')!.getAttribute('opacity')).toBe('0')
  for (const slot of ['head', 'face', 'neck', 'outfit', 'back']) expect(preview().querySelector(`[data-slot="${slot}"]`)).not.toBeNull()
  frame(2399)
  expect(button('Stop rest')).toBeTruthy(); expect(frames.size).toBe(1)
  frame(2400)
  expect(button('Rest')).toBeTruthy(); expect(frames.size).toBe(0)
  expect(body()).toBe(neutralBody); expect(arms()).toEqual(neutralArms)
  expect(preview().querySelector('.ch-animated')).toBe(art)
  expect(model.itemsForSlot).toHaveBeenCalledTimes(gridRenders)
  expect(changed).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled()
})

it('keeps the rest stop control focused, rejects competing actions and lets pose selection stop it', () => {
  const control = button('Rest'); act(() => control.focus()); click(control); frame(1200)
  const at = body()
  for (const name of ['Wave', 'Gentle pats', 'Hop', 'Stretch']) { expect(button(name).disabled).toBe(true); click(button(name)) }
  expect(body()).toBe(at); expect(frames.size).toBe(1)
  expect(button('Stop rest')).toBe(control); expect(document.activeElement).toBe(control)
  click(control)
  expect(button('Rest')).toBe(control); expect(document.activeElement).toBe(control); expect(frames.size).toBe(0)
  click(control); frame(1800); click(button('Poorly'))
  expect(frames.size).toBe(0); expect(preview().querySelector('[data-character-pose="sick"]')).not.toBeNull()
})

it.each(['system', 'device'] as const)('settles rest on live %s reduction without replaying', policy => {
  const change = (value: boolean) => act(() => {
    if (policy === 'device') setPetMotionReduced(value)
    else { Object.defineProperty(media, 'matches', { value, configurable: true }); media.dispatchEvent(new Event('change')) }
  })
  click(button('Rest')); frame(1200); change(true)
  expect(frames.size).toBe(0)
  for (const name of ['Wave', 'Gentle pats', 'Hop', 'Stretch', 'Rest']) expect(button(name).disabled).toBe(true)
  const still = preview().innerHTML
  frame(5000); change(false)
  expect(button('Rest').disabled).toBe(false); expect(frames.size).toBe(0)
  frame(6000); expect(preview().innerHTML).toBe(still); expect(changed).not.toHaveBeenCalled()
})

it('expires hidden rest on return and ignores a stale frame after unmount', () => {
  click(button('Rest')); frame(900)
  const stale = [...frames.values()][0]
  visibility(true); expect(frames.size).toBe(0)
  now = 2500; visibility(false); frame(now)
  expect(frames.size).toBe(0); expect(button('Rest')).toBeTruthy()
  click(button('Rest')); expect(frames.size).toBe(1)
  ui.unmount(); expect(frames.size).toBe(0)
  act(() => stale(5000)); expect(frames.size).toBe(0)
})

it('updates an outfit during rest without extending its original deadline', () => {
  click(button('Rest')); frame(1200)
  ui.rerender(<StrictMode><Wardrobe pet={{ ...pet, equipped: { face: 'glasses', neck: 'scarf' } }} progress={null} onChange={changed} /></StrictMode>)
  expect(preview().querySelector('[data-slot="head"]')).toBeNull()
  for (const slot of ['face', 'neck']) expect(preview().querySelector(`[data-slot="${slot}"]`)).not.toBeNull()
  expect(frames.size).toBe(1)
  frame(2400); expect(frames.size).toBe(0); expect(button('Rest')).toBeTruthy()
  expect(changed).not.toHaveBeenCalled()
})
