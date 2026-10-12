// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render } from '../test/react'
import { setPetMotionReduced } from '../pet/motionPreference'
import { Cheer } from './Cheer'

let ui: ReturnType<typeof render> | undefined
let media: MediaQueryList
beforeEach(() => {
  setPetMotionReduced(false)
  vi.useFakeTimers()
  media = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => {
  ui?.unmount(); ui = undefined
  // jsdom queues a zero-delay cross-document StorageEvent for setItem.
  act(() => vi.advanceTimersByTime(0))
  expect(vi.getTimerCount()).toBe(0)
  setPetMotionReduced(false)
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks()
})
function mount(done = vi.fn()) {
  ui = render(<svg><Cheer onDone={done}><g className="ch-breathe"><g className="ch-eye" /></g></Cheer></svg>)
  act(() => vi.advanceTimersByTime(0))
  return done
}

it('starts device-reduced cheers still with one existing 1200ms deadline and no frame request', () => {
  setPetMotionReduced(true)
  const done = mount()
  expect(ui!.container.querySelector('.fx-cheer-reduced')).not.toBeNull()
  expect(media.matches).toBe(false)
  expect(vi.getTimerCount()).toBe(1)
  act(() => vi.advanceTimersByTime(1199))
  expect(done).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(1))
  expect(done).toHaveBeenCalledOnce()
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})

it.each(['device', 'system'])('settles a live %s change without replay or extending the original deadline', source => {
  const done = mount()
  const change = (value: boolean) => act(() => {
    if (source === 'device') setPetMotionReduced(value)
    else { Object.assign(media, { matches: value }); media.dispatchEvent(new Event('change')) }
    vi.advanceTimersByTime(0)
  })
  act(() => vi.advanceTimersByTime(400))
  change(true)
  expect(ui!.container.querySelector('.fx-cheer-settled')).not.toBeNull()
  expect(vi.getTimerCount()).toBe(1)
  change(false)
  expect(ui!.container.querySelector('.fx-cheer-settled')).not.toBeNull()
  act(() => vi.advanceTimersByTime(1349))
  expect(done).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(1))
  expect(done).toHaveBeenCalledOnce()
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})

it('does not replay an initially reduced cheer on restore and cleans up its deadline on unmount', () => {
  setPetMotionReduced(true)
  const done = mount()
  act(() => vi.advanceTimersByTime(400))
  act(() => setPetMotionReduced(false))
  expect(ui!.container.querySelector('.fx-cheer-settled')).not.toBeNull()
  act(() => vi.advanceTimersByTime(799))
  expect(done).not.toHaveBeenCalled()
  ui!.unmount(); ui = undefined
  act(() => vi.advanceTimersByTime(10000))
  expect(done).not.toHaveBeenCalled()
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})
