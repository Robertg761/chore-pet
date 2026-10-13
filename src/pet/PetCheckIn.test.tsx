// @vitest-environment jsdom
import { act, createRef } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as petLines from '../content/petLines'
import * as sfx from '../audio/sfx'
import type { Pet } from '../domain/types'
import { render } from '../test/react'
import { LivingRoom, type LivingRoomControl, type LivingRoomProps } from './LivingRoom'

const pet: Pet = { id: 'pet', homeId: 'home', name: 'Bun', species: 'bun', bodyColour: '#eee', equipped: {} }
const props: LivingRoomProps = { room: { floorStyle: 'wood', wallStyle: 'cream' }, objects: [], stages: {}, pet, mood: 'meh', away: false, chores: [], statuses: [], initialTile: { tx: 3, ty: 2 } }
let now: number
let frames: Map<number, FrameRequestCallback>
let serial: number
let media: MediaQueryList
const cleanups: (() => void)[] = []
beforeEach(() => {
  now = 0; serial = 0; frames = new Map()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(Math, 'random').mockReturnValue(0.99)
  media = Object.assign(new EventTarget(), { matches: false, media: '(prefers-reduced-motion: reduce)' }) as MediaQueryList
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function mount(content: Parameters<typeof render>[0]) { const ui = render(content); cleanups.push(ui.unmount); return ui }
function frame(at: number) { now = at; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(fn => fn(at))) }
function preference(value: boolean) { act(() => { Object.defineProperty(media, 'matches', { value, configurable: true }); media.dispatchEvent(new Event('change')) }) }
function art(container: Element) { return container.querySelector('.ch-animated')! }
function observeResident() {
  let target: Element, callback: IntersectionObserverCallback
  vi.stubGlobal('IntersectionObserver', class {
    constructor(fn: IntersectionObserverCallback) { callback = fn }
    observe(node: Element) { target = node }
    disconnect() {}
  })
  return { show(visible: boolean) { act(() => callback([{ target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 } as IntersectionObserverEntry], {} as IntersectionObserver)) } }
}

function restingBodyWithoutFace(container: Element) {
  const body = container.querySelector('[data-character-body]')!.cloneNode(true) as Element
  body.querySelectorAll('[data-expression]').forEach(node => node.remove())
  return body.outerHTML
}

it.each(['sick', 'away'] as const)('accepts one quiet %s Check in without waking the body or extending600ms', resting => {
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood={resting === 'sick' ? 'sick' : 'happy'} away={resting === 'away'} control={control} />)
  expect(typeof control.current!.checkIn).toBe('function')
  const resident = ui.container.querySelector('.room-pet')!, node = art(ui.container), position = resident.getAttribute('transform')
  const body = restingBodyWithoutFace(ui.container), ground = ui.container.querySelector('[data-character-ground]')!.outerHTML
  const face = ui.container.querySelector('[data-expression]')!.outerHTML
  const chirp = vi.spyOn(sfx, 'play')
  expect(frames.size).toBe(0)
  act(() => { expect(control.current!.checkIn()).toBe('started') })
  const heard = ui.container.querySelector('[aria-live]')!.textContent
  expect(petLines.CHECK_IN_LINES).toContain(heard)
  expect(frames.size).toBe(1)
  frame(240)
  expect(ui.container.querySelector('[data-expression]')!.outerHTML).not.toBe(face)
  expect(restingBodyWithoutFace(ui.container)).toBe(body)
  expect(ui.container.querySelector('[data-character-ground]')!.outerHTML).toBe(ground)
  expect(art(ui.container)).toBe(node)
  expect(resident.getAttribute('transform')).toBe(position)
  act(() => { expect(control.current!.checkIn()).toBe('busy') })
  expect(chirp).toHaveBeenCalledExactlyOnceWith('chirp')
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(heard)
  frame(599); expect(frames.size).toBe(1)
  frame(600); expect(frames.size).toBe(0)
  expect(ui.container.querySelector('[data-expression]')!.outerHTML).toBe(face)
  act(() => { expect(control.current!.checkIn()).toBe('started') })
  frame(1200); expect(frames.size).toBe(0)
})

it.each(['sick', 'away'] as const)('keeps a reduced %s Check in visually still and expires at its original deadline', resting => {
  Object.defineProperty(media, 'matches', { value: true, configurable: true })
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood={resting === 'sick' ? 'sick' : 'happy'} away={resting === 'away'} control={control} />)
  expect(typeof control.current!.checkIn).toBe('function')
  const still = art(ui.container).outerHTML
  act(() => { expect(control.current!.checkIn()).toBe('started') })
  frame(240); expect(art(ui.container).outerHTML).toBe(still)
  act(() => { expect(control.current!.checkIn()).toBe('busy') })
  frame(600); expect(frames.size).toBe(0)
  preference(false); expect(frames.size).toBe(0)
  frame(900); expect(art(ui.container).outerHTML).toBe(still)
})

it.each(['sick', 'away'] as const)('uses current %s props for Check in before a frame and declines it when healthy', resting => {
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood="happy" control={control} />)
  expect(typeof control.current!.checkIn).toBe('function')
  act(() => { expect(control.current!.checkIn()).toBe('unavailable') })
  ui.rerender(<LivingRoom {...props} mood={resting === 'sick' ? 'sick' : 'happy'} away={resting === 'away'} control={control} />)
  act(() => { expect(control.current!.checkIn()).toBe('started') })
  expect(art(ui.container).getAttribute('data-character-pose')).toBe(resting === 'away' ? 'sleeping' : 'sick')
  frame(600); expect(frames.size).toBe(0)
})

it.each(['sick', 'away'] as const)('lets an offscreen %s Check in expire without replay or a hidden clock', resting => {
  const observer = observeResident(), control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood={resting === 'sick' ? 'sick' : 'happy'} away={resting === 'away'} control={control} />)
  expect(typeof control.current!.checkIn).toBe('function')
  const still = art(ui.container).outerHTML
  observer.show(false)
  act(() => { expect(control.current!.checkIn()).toBe('started') })
  expect(frames.size).toBe(0)
  now = 900
  observer.show(true)
  expect(frames.size).toBe(0)
  expect(art(ui.container).outerHTML).toBe(still)
  expect(petLines.CHECK_IN_LINES).toContain(ui.container.querySelector('[aria-live]')!.textContent)
})

it.each(['sick', 'away'] as const)('keeps an existing chore acknowledgment ahead of a %s Check in', resting => {
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood={resting === 'sick' ? 'sick' : 'happy'} away={resting === 'away'} control={control}
    celebrate={{ key: 91, choreName: 'Wash dishes' }} />)
  const heard = ui.container.querySelector('[aria-live]')!.textContent
  expect(heard).not.toBe('')
  act(() => { expect(control.current!.checkIn()).toBe('busy') })
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(heard)
  frame(240)
  act(() => { expect(control.current!.checkIn()).toBe('busy') })
  frame(600); expect(frames.size).toBe(0)
  act(() => { expect(control.current!.checkIn()).toBe('started') })
  expect(petLines.CHECK_IN_LINES).toContain(ui.container.querySelector('[aria-live]')!.textContent)
})
