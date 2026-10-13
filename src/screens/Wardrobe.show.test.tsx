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
function preview() { return ui.container.querySelector('.wd-preview')! }

function mockView() {
  const svg = preview()
  const scroll = vi.fn(), focus = vi.fn()
  Object.defineProperty(svg, 'scrollIntoView', { configurable: true, value: scroll })
  Object.defineProperty(svg, 'focus', { configurable: true, value: focus })
  return { svg, scroll, focus }
}

it.each([{ action: 'Wave', stop: 'Stop wave', deadline: 1200 }, { action: 'Rest', stop: 'Stop rest', deadline: 2400 }])('shows the current $action preview without changing its original deadline or outfit', ({ action, stop, deadline }) => {
  const view = mockView(), art = preview().querySelector('.ch-animated')
  const write = vi.spyOn(Storage.prototype, 'setItem')
  click(button(action)); frame(deadline / 2)
  const gridRenders = vi.mocked(model.itemsForSlot).mock.calls.length
  const at = preview().innerHTML
  const show = button('Show preview')
  expect(show.getAttribute('aria-label')).toBe('Show preview of Mochi')
  expect(show.disabled).toBe(false)
  click(show)
  expect(view.scroll).toHaveBeenCalledExactlyOnceWith({ block: 'center', behavior: 'instant' })
  expect(view.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
  expect(view.scroll.mock.invocationCallOrder[0]).toBeLessThan(view.focus.mock.invocationCallOrder[0])
  expect(preview().getAttribute('tabindex')).toBe('-1')
  expect(preview().innerHTML).toBe(at)
  expect(preview().querySelector('.ch-animated')).toBe(art)
  expect(frames.size).toBe(1)
  frame(deadline - 1); expect(button(stop)).toBeTruthy()
  frame(deadline); expect(button(action)).toBeTruthy(); expect(frames.size).toBe(0)
  expect(model.itemsForSlot).toHaveBeenCalledTimes(gridRenders)
  expect(changed).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled()
})

it('shows an idle outfit without changing the selected pose or starting a preview clock', () => {
  click(button('Sleepy'))
  const view = mockView(), at = preview().innerHTML
  click(button('Show preview'))
  expect(view.scroll).toHaveBeenCalledOnce(); expect(view.focus).toHaveBeenCalledOnce()
  expect(preview().innerHTML).toBe(at); expect(button('Sleepy').getAttribute('aria-pressed')).toBe('true')
  expect(frames.size).toBe(0); expect(changed).not.toHaveBeenCalled()
})

it.each(['system', 'device'] as const)('can show the settled preview under %s reduction without replaying', policy => {
  click(button('Rest')); frame(1200)
  act(() => {
    if (policy === 'device') setPetMotionReduced(true)
    else { Object.defineProperty(media, 'matches', { value: true, configurable: true }); media.dispatchEvent(new Event('change')) }
  })
  const view = mockView(), still = preview().innerHTML
  expect(button('Rest').disabled).toBe(true)
  const show = button('Show preview'); expect(show.disabled).toBe(false); click(show)
  expect(view.scroll).toHaveBeenCalledOnce(); expect(view.focus).toHaveBeenCalledOnce()
  expect(frames.size).toBe(0); frame(5000)
  expect(preview().innerHTML).toBe(still); expect(changed).not.toHaveBeenCalled()
})
