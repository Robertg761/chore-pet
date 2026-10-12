// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Pet } from '../domain/types'
import { click, render } from '../test/react'
import * as model from './wardrobeModel'
import { Wardrobe, type WardrobeProps } from './Wardrobe'

const pet: Pet = { id: 'pet', homeId: 'home', name: 'Mochi', species: 'mochi', bodyColour: '#ffcfda', equipped: { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' } }
let ui: ReturnType<typeof render>
let now: number, serial: number, hidden: boolean
let frames: Map<number, FrameRequestCallback>
let media: MediaQueryList
let changed: ReturnType<typeof vi.fn<WardrobeProps['onChange']>>

beforeEach(() => {
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
afterEach(() => { ui.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function button(name: string) {
  const node = [...ui.container.querySelectorAll('button')].find(node => node.textContent === name)
  expect(node, `button ${name}`).toBeTruthy()
  return node!
}
function frame(at: number) { now = at; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(fn => fn(at))) }
function preference(matches: boolean) { act(() => { Object.defineProperty(media, 'matches', { value: matches, configurable: true }); media.dispatchEvent(new Event('change')) }) }
function visibility(value: boolean) { act(() => { hidden = value; document.dispatchEvent(new Event('visibilitychange')) }) }
function preview() { return ui.container.querySelector('.wd-preview')! }
function body() { return preview().querySelector('[data-character-body]')!.getAttribute('transform') }

it('plays a finite wave on demand without redrawing the item grid or changing saved data', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const art = preview().querySelector('.ch-animated')
  expect(art).not.toBeNull()
  expect(frames.size).toBe(0)
  expect(ui.container.querySelector('.wd-tile-art .ch-animated')).toBeNull()
  click(button('Sleepy'))
  expect(preview().querySelector('[data-character-pose="sleeping"]')).not.toBeNull()
  click(button('Wave'))
  expect(button('Happy').getAttribute('aria-pressed')).toBe('true')
  expect(frames.size).toBe(1)
  const gridRenders = vi.mocked(model.itemsForSlot).mock.calls.length
  const neutral = body()
  frame(420)
  expect(body()).not.toBe(neutral)
  expect(preview().querySelector('[data-slot="head"]')).not.toBeNull()
  expect(preview().querySelector('[data-slot="face"]')).not.toBeNull()
  frame(1199)
  expect(button('Stop wave')).toBeTruthy()
  frame(1200)
  expect(button('Wave')).toBeTruthy()
  expect(body()).toBe(neutral)
  expect(frames.size).toBe(0)
  expect(preview().querySelector('.ch-animated')).toBe(art)
  expect(model.itemsForSlot).toHaveBeenCalledTimes(gridRenders)
  expect(changed).not.toHaveBeenCalled()
  expect(write).not.toHaveBeenCalled()
})

it('shows a grounded small hop, bounds rapid activation and keeps the same focused control for stopping', () => {
  const control = button('Hop')
  act(() => control.focus())
  click(control)
  expect(button('Wave').disabled).toBe(true)
  click(button('Wave'))
  frame(756)
  expect(body()).toMatch(/^translate\(0 -/)
  expect(preview().querySelector('[data-character-ground]')!.getAttribute('transform')).toMatch(/^translate\(100 186\)/)
  expect(button('Stop hop')).toBe(control)
  expect(document.activeElement).toBe(control)
  expect(frames.size).toBe(1)
  click(control)
  expect(frames.size).toBe(0)
  expect(body()).toMatch(/^translate\(0 0\)/)
  click(control)
  frame(2556)
  expect(frames.size).toBe(0)
  expect(button('Hop')).toBe(control)
})

it('updates worn layers during playback without restarting its deadline', () => {
  click(button('Hop'))
  frame(500)
  ui.rerender(<StrictMode><Wardrobe pet={{ ...pet, equipped: { neck: 'scarf', outfit: 'overalls', back: 'backpack' } }} progress={null} onChange={changed} /></StrictMode>)
  expect(preview().getAttribute('aria-label')).toContain('Scarf')
  expect(preview().querySelector('[data-slot="head"]')).toBeNull()
  for (const slot of ['neck', 'outfit', 'back']) expect(preview().querySelector(`[data-slot="${slot}"]`)).not.toBeNull()
  frame(1800)
  expect(frames.size).toBe(0)
  expect(button('Hop')).toBeTruthy()
})

it('pose selection stops the preview and retains the special pose wardrobe rules', () => {
  click(button('Wave'))
  frame(300)
  click(button('Poorly'))
  expect(frames.size).toBe(0)
  expect(preview().querySelector('[data-character-pose="sick"]')).not.toBeNull()
  expect(preview().querySelector('[data-slot="head"]')).not.toBeNull()
  for (const slot of ['neck', 'outfit', 'back']) expect(preview().querySelector(`[data-slot="${slot}"]`)).toBeNull()
  click(button('Cheer'))
  expect(preview().querySelector('[data-character-pose="cheering"]')).not.toBeNull()
  expect(preview().querySelector('[data-slot="head"]')).not.toBeNull()
  expect(frames.size).toBe(0)
})

it('cancels immediately on live reduced motion and never replays when the preference clears', () => {
  click(button('Hop'))
  frame(756)
  preference(true)
  expect(frames.size).toBe(0)
  expect(body()).toMatch(/^translate\(0 0\)/)
  expect(button('Wave').disabled).toBe(true)
  expect(button('Hop').disabled).toBe(true)
  expect(ui.container.textContent).toContain('Motion previews are off while reduced motion is on.')
  preference(false)
  expect(button('Wave').disabled).toBe(false)
  expect(frames.size).toBe(0)
})

it('suspends while hidden, settles past its deadline on return and cleans up stale frames', () => {
  click(button('Wave'))
  frame(300)
  const stale = [...frames.values()][0]
  visibility(true)
  expect(frames.size).toBe(0)
  now = 2000
  visibility(false)
  expect(frames.size).toBe(1)
  frame(now)
  expect(frames.size).toBe(0)
  expect(button('Wave')).toBeTruthy()
  click(button('Hop'))
  expect(frames.size).toBe(1)
  ui.unmount()
  expect(frames.size).toBe(0)
  act(() => stale(5000))
  expect(frames.size).toBe(0)
})
