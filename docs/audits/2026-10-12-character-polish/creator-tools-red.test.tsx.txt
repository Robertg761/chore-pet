// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Mood, Pet, Species } from '../domain/types'
import { click, render } from '../test/react'
import { CharacterCreator, type PetLookPatch } from './CharacterCreator'

const pet: Pet = { id: 'pet', homeId: 'home', name: 'Mochi', species: 'mochi', bodyColour: '#FFCFDA', eyes: 'lashes', cheeks: 'hearts', equipped: { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' } }
let ui: ReturnType<typeof render>
let now: number, serial: number
let frames: Map<number, FrameRequestCallback>
let media: MediaQueryList, wide: MediaQueryList
let saved: ReturnType<typeof vi.fn<(patch: PetLookPatch) => void>>
const closed = vi.fn()
const content = (p = pet) => <StrictMode><CharacterCreator pet={p} onSave={saved} onClose={closed} /></StrictMode>

beforeEach(() => {
  now = 0; serial = 0; frames = new Map(); saved = vi.fn(); closed.mockClear()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  media = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
  wide = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
  vi.stubGlobal('matchMedia', (query: string) => query.includes('prefers-reduced-motion') ? media : wide)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  ui = render(content())
})
afterEach(() => { ui.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function button(name: string) {
  const node = [...ui.container.querySelectorAll('button')].find(node => node.textContent === name)
  expect(node, `button ${name}`).toBeTruthy(); return node!
}
const art = () => ui.container.querySelector('.cc-preview .ch-animated')!
const image = () => ui.container.querySelector('.cc-preview svg') as SVGSVGElement
function radio(name: string) { return ui.container.querySelector(`[role="radio"][aria-label="${name}"]`)! }
function mood(value: Mood) {
  const node = ui.container.querySelector('.cc-mood select') as HTMLSelectElement
  act(() => { node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })) })
}
function frame(at: number) { now = at; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(fn => fn(at))) }
function expectFacing(mirrored: boolean) {
  const group = ui.container.querySelector('[data-preview-facing]')
  expect(group).not.toBeNull()
  expect(group!.getAttribute('data-preview-facing')).toBe(mirrored ? 'mirrored' : 'normal')
  expect(group!.getAttribute('transform')).toBe(mirrored ? 'translate(200 0) scale(-1 1)' : null)
  expect(button('Mirror preview').getAttribute('aria-pressed')).toBe(String(mirrored))
}

it.each((['mochi', 'bun', 'sprout'] as Species[]).flatMap(species => (['happy', 'content', 'meh', 'scruffy', 'sick'] as Mood[]).map(value => [species, value] as const)))('mirrors the whole %s %s preview once without changing its art or saving', (species, value) => {
  ui.unmount(); ui = render(content({ ...pet, species }))
  click(button('Face')); mood(value)
  const node = art(), markup = node.innerHTML
  expectFacing(false)
  click(button('Mirror preview'))
  expectFacing(true)
  expect(art()).toBe(node); expect(art().innerHTML).toBe(markup)
  expect(image().getAttribute('aria-label')).toContain('mirrored')
  expect(frames.size).toBe(0); expect(saved).not.toHaveBeenCalled(); expect(closed).not.toHaveBeenCalled()
  click(button('Mirror preview'))
  expectFacing(false); expect(art().innerHTML).toBe(markup)
  expect(image().getAttribute('aria-label')).not.toContain('mirrored')
})

it('mirrors and reveals an active cheer without changing its delivered frame or deadline', () => {
  click(radio('Bun')); frame(756)
  const node = art(), markup = node.innerHTML
  expect(frames.size).toBe(1)
  click(button('Face')); click(button('Mirror preview'))
  const scroll = vi.fn(), focus = vi.fn()
  Object.assign(image(), { scrollIntoView: scroll, focus })
  click(button('Show preview'))
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'instant', block: 'center', inline: 'nearest' })
  expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
  expect(art()).toBe(node); expect(art().innerHTML).toBe(markup); expect(frames.size).toBe(1)
  frame(1799); expect(frames.size).toBe(1)
  frame(1800); expect(frames.size).toBe(0)
  expect(art().querySelector('[data-expression="happy"]')).not.toBeNull(); expectFacing(true)
  expect(saved).not.toHaveBeenCalled(); expect(closed).not.toHaveBeenCalled()
})

it('reveals a static reduced preview with a programmatic focus target and no saved changes', () => {
  act(() => { Object.defineProperty(media, 'matches', { value: true, configurable: true }); media.dispatchEvent(new Event('change')) })
  click(button('Face')); mood('sick'); click(button('Mirror preview'))
  const node = image(), markup = art().innerHTML, scroll = vi.fn(), focus = vi.fn()
  Object.assign(node, { scrollIntoView: scroll, focus })
  expect(node.getAttribute('tabindex')).toBe('-1'); expect(node.getAttribute('focusable')).toBe('true')
  expect(button('Show preview').getAttribute('type')).toBe('button')
  expect(button('Mirror preview').getAttribute('type')).toBe('button')
  click(button('Show preview'))
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'instant', block: 'center', inline: 'nearest' })
  expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
  expect(image()).toBe(node); expect(art().innerHTML).toBe(markup); expectFacing(true)
  expect(frames.size).toBe(0); expect(saved).not.toHaveBeenCalled(); expect(closed).not.toHaveBeenCalled()
})

it('keeps preview tools local through tab, resize, mood and look edits, then resets on reopening', () => {
  click(button('Face')); click(button('Mirror preview')); mood('meh')
  click(button('Who')); click(radio('Bun'))
  act(() => { Object.defineProperty(wide, 'matches', { value: true, configurable: true }); wide.dispatchEvent(new Event('change')) })
  expectFacing(true)
  click(radio('Sparkly')); click(radio('Hearts')); expectFacing(true)
  expect(image().getAttribute('aria-label')).toContain('Tired')
  expect(frames.size).toBe(0)
  click(button('Save'))
  expect(saved).toHaveBeenCalledExactlyOnceWith({ species: 'bun', bodyColour: '#FFFFFF', eyes: 'sparkly' })
  ui.unmount(); ui = render(content())
  expectFacing(false); expect(image().getAttribute('aria-label')).toContain('Happy')
  expect(frames.size).toBe(0)
})
