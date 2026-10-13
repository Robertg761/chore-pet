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

function mirror() {
  const node = ui.container.querySelector<HTMLButtonElement>('[aria-label="Mirror preview of Mochi"]')
  expect(node).not.toBeNull()
  return node!
}
function art() { return preview().querySelector('.ch-animated')! }
function facing() { return preview().querySelector('[data-preview-facing]')! }

function pauseButton(paused = false) {
  const node = ui.container.querySelector<HTMLButtonElement>(`[aria-label="${paused ? 'Resume' : 'Pause'} movement preview of Mochi"]`)
  expect(node).not.toBeNull()
  return node!
}
const actions = [
  { action: 'Wave', stop: 'Stop wave', duration: 1200 },
  { action: 'Gentle pats', stop: 'Stop pats', duration: 1600 },
  { action: 'Hop', stop: 'Stop hop', duration: 1800 },
  { action: 'Stretch', stop: 'Stop stretch', duration: 2400 },
  { action: 'Rest', stop: 'Stop rest', duration: 2400 },
] as const
const speciesList = ['mochi', 'bun', 'sprout'] as const

it('starts with a disabled pause control and no preview clock', () => {
  expect(pauseButton().disabled).toBe(true)
  expect(frames.size).toBe(0)
  click(pauseButton())
  expect(frames.size).toBe(0)
  expect(changed).not.toHaveBeenCalled()
})

it.each(speciesList.flatMap(species => actions.map(action => ({ species, ...action }))))('holds $species $action exactly and resumes only its remaining movement', ({ species, action, stop, duration }) => {
  ui.rerender(<StrictMode><Wardrobe pet={{ ...pet, species }} progress={null} onChange={changed} /></StrictMode>)
  const write = vi.spyOn(Storage.prototype, 'setItem')
  click(button(action)); frame(duration * .3)
  const node = art(), held = node.outerHTML, gridRenders = vi.mocked(model.itemsForSlot).mock.calls.length
  const pause = pauseButton(); expect(pause.disabled).toBe(false)
  act(() => pause.focus()); click(pause)
  expect(frames.size).toBe(0); expect(pauseButton(true)).toBe(pause)
  expect(document.activeElement).toBe(pause)
  expect(art()).toBe(node); expect(art().outerHTML).toBe(held)
  frame(now + 60000)
  expect(frames.size).toBe(0); expect(art().outerHTML).toBe(held)
  click(mirror())
  expect(facing().getAttribute('transform')).toBe('translate(200 0) scale(-1 1)')
  expect(art().outerHTML).toBe(held); expect(frames.size).toBe(0)
  const resumedAt = now
  click(pauseButton(true))
  expect(frames.size).toBe(1); expect(art().outerHTML).toBe(held)
  frame(resumedAt + duration * .7 - 1)
  expect(button(stop)).toBeTruthy(); expect(frames.size).toBe(1)
  frame(resumedAt + duration * .7)
  expect(button(action).disabled).toBe(false); expect(frames.size).toBe(0)
  expect(pauseButton().disabled).toBe(true)
  expect(mirror().getAttribute('aria-pressed')).toBe('true')
  expect(model.itemsForSlot).toHaveBeenCalledTimes(gridRenders)
  expect(changed).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled()
})

it('allows Stop and every static pose to cancel a paused run without replay', () => {
  for (const choice of ['Stop rest', 'Happy', 'Sleepy', 'Cheer', 'Poorly']) {
    click(button('Rest')); frame(now + 500); click(pauseButton())
    expect(frames.size).toBe(0)
    click(button(choice))
    expect(pauseButton().disabled).toBe(true); expect(frames.size).toBe(0)
    if (choice !== 'Stop rest') expect(button(choice).getAttribute('aria-pressed')).toBe('true')
  }
})

it.each(['system', 'device'] as const)('cancels a paused preview under live %s reduction and never replays it', policy => {
  click(button('Rest')); frame(1200); click(pauseButton())
  const change = (value: boolean) => act(() => {
    if (policy === 'device') setPetMotionReduced(value)
    else { Object.defineProperty(media, 'matches', { value, configurable: true }); media.dispatchEvent(new Event('change')) }
  })
  change(true)
  expect(frames.size).toBe(0); expect(button('Rest').disabled).toBe(true)
  expect(pauseButton().disabled).toBe(true)
  click(mirror()); expect(mirror().getAttribute('aria-pressed')).toBe('true')
  change(false)
  expect(frames.size).toBe(0); expect(button('Rest').disabled).toBe(false)
  expect(pauseButton().disabled).toBe(true)
})

it('keeps a paused outfit update held, preserves pause while hidden, and expires a resumed hidden run', () => {
  click(button('Stretch')); frame(900); click(pauseButton())
  const node = art(), body = node.querySelector('[data-character-body]')!.getAttribute('transform')
  ui.rerender(<StrictMode><Wardrobe pet={{ ...pet, equipped: { back: 'backpack' } }} progress={null} onChange={changed} /></StrictMode>)
  expect(art()).toBe(node); expect(node.querySelector('[data-character-body]')!.getAttribute('transform')).toBe(body)
  const held = node.outerHTML
  hidden = true; act(() => document.dispatchEvent(new Event('visibilitychange')))
  frame(60000); expect(frames.size).toBe(0)
  hidden = false; act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(frames.size).toBe(0); expect(art().outerHTML).toBe(held)
  click(pauseButton(true)); expect(frames.size).toBe(1)
  frame(60100); expect(art().outerHTML).not.toBe(held)
  hidden = true; act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(frames.size).toBe(0)
  now = 120000; hidden = false; act(() => document.dispatchEvent(new Event('visibilitychange')))
  frame(now); expect(frames.size).toBe(0); expect(button('Stretch').disabled).toBe(false)
  expect(pauseButton().disabled).toBe(true); expect(changed).not.toHaveBeenCalled()
})

it('repeatedly pauses and resumes with at most one owner clock and clears on unmount', () => {
  click(button('Rest')); frame(300)
  for (let i = 0; i < 10; i++) {
    const held = art().outerHTML
    click(pauseButton()); frame(now + 10000)
    expect(frames.size).toBe(0); expect(art().outerHTML).toBe(held)
    click(pauseButton(true)); expect(frames.size).toBe(1)
    frame(now + 100)
  }
  ui.unmount(); expect(frames.size).toBe(0)
  ui = render(<StrictMode><Wardrobe pet={pet} progress={null} onChange={changed} /></StrictMode>)
  expect(pauseButton().disabled).toBe(true); expect(frames.size).toBe(0)
})
