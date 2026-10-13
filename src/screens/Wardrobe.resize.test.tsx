// @vitest-environment jsdom
import { act, StrictMode, useLayoutEffect, useState } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Pet } from '../domain/types'
import { click, input, render } from '../test/react'
import { Wardrobe, type WardrobeProps } from './Wardrobe'

const viewport = vi.hoisted(() => ({ wide: false }))
vi.mock('../shell/useViewport', () => ({ useWide: () => viewport.wide }))
const original: Pet = { id: 'pet', homeId: 'home', name: 'Mochi', species: 'mochi', bodyColour: '#ffcfda',
  equipped: { outfit: 'hoodie' }, outfits: [
    { id: 'a', name: 'Weekend', equipped: { head: 'bow', neck: 'scarf' } },
    { id: 'b', name: 'Cosy', equipped: { outfit: 'hoodie' } },
    { id: 'c', name: 'Party', equipped: { head: 'crown', outfit: 'dress' } },
  ] }
let ui: ReturnType<typeof render>, current: Pet, update: (pet: Pet) => void
let changed: ReturnType<typeof vi.fn<WardrobeProps['onChange']>>
let now: number, serial: number, frames: Map<number, FrameRequestCallback>
function Harness() {
  const [pet, setPet] = useState(current)
  useLayoutEffect(() => { current = pet; update = setPet }, [pet])
  return <Wardrobe pet={pet} progress={null} onChange={patch => { changed(patch); setPet(value => ({ ...value, ...patch })) }} />
}
beforeEach(() => {
  current = structuredClone(original); changed = vi.fn(); now = 0; serial = 0; frames = new Map(); viewport.wide = false
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: false }))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  ui = render(<StrictMode><Harness /></StrictMode>)
})
afterEach(() => { ui.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function button(name: string) {
  const node = [...ui.container.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === name || node.textContent === name)
  expect(node, name).toBeTruthy(); return node!
}
function saved() { if (!viewport.wide) click(button('Saved')) }
function field() { const node = ui.container.querySelector<HTMLInputElement>('.wd-name-form input'); expect(node).not.toBeNull(); return node! }
function frame(at: number) { now = at; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(fn => fn(at))) }

it.each([false, true])('keeps a dirty rename and caret through a live layout change from wide=%s', wide => {
  viewport.wide = wide; act(() => update({ ...current }))
  click(button('Rest')); frame(800); click(button('Pause movement preview of Mochi')); click(button('Mirror preview of Mochi'))
  const art = ui.container.querySelector('.wd-preview .ch-animated')!, held = art.outerHTML
  saved(); click(button('Rename Weekend')); input(field(), 'Sunday outfit'); field().setSelectionRange(2, 6, 'backward')
  viewport.wide = !wide; act(() => update({ ...current }))
  expect(field().value).toBe('Sunday outfit'); expect(document.activeElement).toBe(field())
  expect(field().selectionStart).toBe(2); expect(field().selectionEnd).toBe(6); expect(field().selectionDirection).toBe('backward')
  expect(ui.container.querySelector('.wd-preview .ch-animated')).toBe(art); expect(art.outerHTML).toBe(held)
  expect(frames.size).toBe(0); expect(changed).not.toHaveBeenCalled()
  click(button('Save name')); expect(current.outfits![0].name).toBe('Sunday outfit')
  expect(document.activeElement).toBe(button('Rename Sunday outfit'))
})

it.each([[false, 'Save name'], [true, 'Save name'], [false, 'Not now'], [true, 'Not now']] as const)('keeps focused %s/%s controls through a live layout change', (wide, action) => {
  viewport.wide = wide; act(() => update({ ...current })); saved()
  click(button('Rename Weekend')); input(field(), 'Sunday outfit'); act(() => button(action).focus())
  viewport.wide = !wide; act(() => update({ ...current }))
  expect(field().value).toBe('Sunday outfit'); expect(document.activeElement).toBe(button(action)); expect(changed).not.toHaveBeenCalled()
  click(button(action)); expect(current.outfits![0].name).toBe(action === 'Save name' ? 'Sunday outfit' : 'Weekend')
})

it.each([false, true])('preserves the draft without stealing preview focus on layout change from wide=%s', wide => {
  viewport.wide = wide; act(() => update({ ...current })); saved()
  click(button('Rename Weekend')); input(field(), 'Sunday outfit')
  const mirror = button('Mirror preview of Mochi'); act(() => mirror.focus())
  viewport.wide = !wide; act(() => update({ ...current }))
  expect(field().value).toBe('Sunday outfit'); expect(document.activeElement).toBe(mirror)
  expect(changed).not.toHaveBeenCalled(); expect(frames.size).toBe(0)
})

it('keeps a new-look draft available when a wide layout becomes narrow', () => {
  viewport.wide = true; act(() => update({ ...current, outfits: current.outfits!.slice(0, 2), equipped: { neck: 'scarf' } }))
  click(button('Save this outfit')); input(field(), 'New look'); field().setSelectionRange(4, 4)
  viewport.wide = false; act(() => update({ ...current }))
  expect(field().value).toBe('New look'); expect(document.activeElement).toBe(field()); expect(field().selectionStart).toBe(4)
  expect(changed).not.toHaveBeenCalled(); click(button('Save outfit'))
  expect(current.outfits!.map(o => o.name)).toEqual(['Weekend', 'Cosy', 'New look'])
})
