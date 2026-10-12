// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { click, render } from '../test/react'
import GalleryMotion from './GalleryMotion'
import EffectReview from './EffectReview'
import { setPetMotionReduced } from '../pet/motionPreference'

let ui: ReturnType<typeof render> | undefined
let media: MediaQueryList
let observers: { callback: IntersectionObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[]

beforeEach(() => {
  setPetMotionReduced(false)
  vi.useFakeTimers()
  media = Object.assign(new EventTarget(), { matches: false, media: '(prefers-reduced-motion: reduce)' }) as MediaQueryList
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  observers = []
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn()
    disconnect = vi.fn()
    callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) { this.callback = callback; observers.push(this) }
  })
})

afterEach(() => {
  ui?.unmount()
  ui = undefined
  setPetMotionReduced(false)
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function button(name: string) {
  const found = [...ui!.container.querySelectorAll('button')].find((el) => el.textContent === name)
  expect(found, name).toBeTruthy()
  return found!
}
function mountGallery() {
  ui = render(<GalleryMotion><section className="gallery-row"><span className="ch-breathe" /></section><section className="gallery-row" /></GalleryMotion>)
  return ui.container.querySelector<HTMLElement>('.gallery-examples')!
}
function intersect(index: number, row: Element, visible: boolean) {
  act(() => observers[index].callback([{ target: row, isIntersecting: visible, intersectionRatio: visible ? 0.5 : 0 } as IntersectionObserverEntry], {} as IntersectionObserver))
}
function visibility(value: DocumentVisibilityState) {
  act(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value })
    document.dispatchEvent(new Event('visibilitychange'))
  })
}
function reduction(matches: boolean) {
  act(() => {
    Object.defineProperty(media, 'matches', { configurable: true, value: matches })
    media.dispatchEvent(Object.assign(new Event('change'), { matches, media: media.media }))
  })
}

it('starts still without a frame request, timer or observer', () => {
  const gallery = mountGallery()
  expect(gallery.dataset.examplesMotion).toBe('paused')
  expect(button('Start example animations').getAttribute('aria-pressed')).toBe('false')
  expect(observers).toHaveLength(0)
  expect(requestAnimationFrame).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

it('uses one observer for all rows and changes only the visible rows', () => {
  const gallery = mountGallery()
  const rows = [...gallery.querySelectorAll<HTMLElement>('.gallery-row')]
  const art = rows[0].firstChild
  click(button('Start example animations'))
  expect(gallery.dataset.examplesMotion).toBe('running')
  expect(observers).toHaveLength(1)
  expect(observers[0].observe.mock.calls.map(([row]) => row)).toEqual(rows)
  intersect(0, rows[0], true)
  intersect(0, rows[1], false)
  expect(rows[0].dataset.galleryVisible).toBe('true')
  expect(rows[1].dataset.galleryVisible).toBe('false')
  expect(rows[0].firstChild).toBe(art)
  intersect(0, rows[0], false)
  expect(rows[0].dataset.galleryVisible).toBe('false')
  click(button('Stop example animations'))
  expect(gallery.dataset.examplesMotion).toBe('paused')
  expect(observers[0].disconnect).toHaveBeenCalledOnce()
  intersect(0, rows[0], true)
  expect(rows[0].dataset.galleryVisible).toBe('false')
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})

it('pauses hidden examples, discards stale observer callbacks and resumes only the existing intent', () => {
  const gallery = mountGallery()
  const row = gallery.querySelector<HTMLElement>('.gallery-row')!
  click(button('Start example animations'))
  intersect(0, row, true)
  visibility('hidden')
  expect(gallery.dataset.documentVisible).toBe('false')
  expect(gallery.dataset.examplesMotion).toBe('paused')
  expect(observers[0].disconnect).toHaveBeenCalledOnce()
  intersect(0, row, true)
  expect(row.dataset.galleryVisible).toBe('false')
  visibility('visible')
  expect(gallery.dataset.examplesMotion).toBe('running')
  expect(observers).toHaveLength(2)
  intersect(1, row, true)
  expect(row.dataset.galleryVisible).toBe('true')
})

it('honors initial/live reduction and does not restart when the preference is restored', () => {
  const gallery = mountGallery()
  click(button('Start example animations'))
  reduction(true)
  expect(gallery.dataset.examplesMotion).toBe('paused')
  expect(button('Start example animations').disabled).toBe(true)
  reduction(false)
  expect(gallery.dataset.examplesMotion).toBe('paused')
  expect(button('Start example animations').disabled).toBe(false)
  ui!.unmount()
  ui = undefined
  reduction(true)
  const initial = mountGallery()
  expect(initial.dataset.examplesMotion).toBe('paused')
  expect(button('Start example animations').disabled).toBe(true)
})

it('settles a device-reduced gallery without replay or claiming the system setting is active', () => {
  const gallery = mountGallery()
  click(button('Start example animations'))
  act(() => setPetMotionReduced(true))
  expect(media.matches).toBe(false)
  expect(gallery.dataset.examplesMotion).toBe('paused')
  expect(button('Start example animations').disabled).toBe(true)
  expect(gallery.textContent).toContain('Reduced motion is active. Examples stay still.')
  expect(gallery.textContent).not.toContain('System reduced motion is active.')
  act(() => setPetMotionReduced(false))
  expect(gallery.dataset.examplesMotion).toBe('paused')
  expect(button('Start example animations').disabled).toBe(false)
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})

it('keeps examples still when observation is unavailable and cleans up on unmount', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const gallery = mountGallery()
  expect(button('Start example animations').disabled).toBe(true)
  expect(gallery.textContent).toContain('Animation visibility tracking is unavailable')
  expect(gallery.dataset.examplesMotion).toBe('paused')
  ui!.unmount()
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn()
    disconnect = vi.fn()
    callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) { this.callback = callback; observers.push(this) }
  })
  mountGallery()
  click(button('Start example animations'))
  ui!.unmount()
  ui = undefined
  expect(observers[0].disconnect).toHaveBeenCalledOnce()
  visibility('hidden')
  expect(vi.getTimerCount()).toBe(0)
})

it('keeps effect examples static until requested, then finishes without replay', () => {
  ui = render(<EffectReview />)
  expect(vi.getTimerCount()).toBe(0)
  expect(ui.container.querySelector('.fx-cheer-hop')).toBeNull()
  expect(ui.container.querySelector('.fx-sparkle-star')).toBeNull()
  click(button('Replay sparkle'))
  click(button('Replay cheers'))
  expect(vi.getTimerCount()).toBe(4)
  expect(ui.container.querySelectorAll('.fx-cheer-hop')).toHaveLength(3)
  act(() => vi.advanceTimersByTime(900))
  expect(ui.container.querySelector('.fx-sparkle-star')).toBeNull()
  act(() => vi.advanceTimersByTime(850))
  expect(ui.container.querySelector('.fx-cheer-hop')).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
  act(() => vi.advanceTimersByTime(30000))
  expect(ui.container.querySelector('.fx-cheer-hop')).toBeNull()
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})

it('bounds rapid effect replays and cancels every finite deadline on unmount', () => {
  ui = render(<EffectReview />)
  for (let i = 0; i < 20; i++) {
    click(button('Replay sparkle'))
    click(button('Replay cheers'))
  }
  expect(vi.getTimerCount()).toBe(4)
  expect(ui.container.querySelectorAll('.fx-cheer-hop')).toHaveLength(3)
  expect(ui.container.querySelectorAll('.fx-sparkle-ring')).toHaveLength(1)
  ui.unmount()
  ui = undefined
  expect(vi.getTimerCount()).toBe(0)
})

it.each([false, true])('settles manual effects on either live preference change, initially reduced=%s', (initialReduced) => {
  Object.defineProperty(media, 'matches', { configurable: true, value: initialReduced })
  ui = render(<EffectReview />)
  click(button('Replay sparkle'))
  click(button('Replay cheers'))
  expect(vi.getTimerCount()).toBe(4)
  reduction(!initialReduced)
  expect(ui.container.querySelectorAll('.fx-cheer-hop,.fx-sparkle-star').length).toBe(0)
  expect(vi.getTimerCount()).toBe(0)
  reduction(initialReduced)
  expect(ui.container.querySelectorAll('.fx-cheer-hop,.fx-sparkle-star').length).toBe(0)
  click(button('Replay cheers'))
  expect(ui.container.querySelectorAll('.fx-cheer-hop')).toHaveLength(3)
})
