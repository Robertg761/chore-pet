// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render } from '../test/react'
import { usePetMotion } from './usePetMotion'

let frames: Map<number, FrameRequestCallback>
let nextFrame: number
let hidden: boolean
let media: MediaQueryList
const mounted = new Set<ReturnType<typeof render>>()

beforeEach(() => {
  frames = new Map()
  nextFrame = 0
  hidden = false
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  media = Object.assign(new EventTarget(), {
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }) as MediaQueryList
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})

afterEach(() => {
  for (const ui of mounted) ui.unmount()
  mounted.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function Clock({ tick, active = true }: {
  tick: (now: number, reducedMotion: boolean) => void
  active?: boolean | { normal: boolean; reduced: boolean }
}) {
  const { reducedMotion } = usePetMotion(tick, active)
  return <output>{String(reducedMotion)}</output>
}

it('delivers real preference changes to the latest handler while inactive, and cleans up', () => {
  const first = vi.fn(), latest = vi.fn()
  function Preference({ changed }: { changed: (reduced: boolean) => void }) {
    const { reducedMotion } = usePetMotion(() => {}, false, changed)
    return <output>{String(reducedMotion)}</output>
  }
  const ui = render(<StrictMode><Preference changed={first} /></StrictMode>)
  mounted.add(ui)
  expect(first).not.toHaveBeenCalled()
  act(() => preference(true))
  expect(first.mock.calls).toEqual([[true]])
  expect(ui.container.textContent).toBe('true')
  act(() => preference(true))
  expect(first).toHaveBeenCalledTimes(1)
  ui.rerender(<StrictMode><Preference changed={latest} /></StrictMode>)
  act(() => preference(false))
  expect(latest.mock.calls).toEqual([[false]])
  expect(first).toHaveBeenCalledTimes(1)
  expect(frames.size).toBe(0)
  ui.unmount(); mounted.delete(ui)
  act(() => preference(true))
  expect(latest).toHaveBeenCalledTimes(1)
})

it('delivers a preference changed between initial read and subscription without an animation frame', () => {
  const firstRead = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
  Object.defineProperty(media, 'matches', { value: true, configurable: true })
  let reads = 0
  vi.stubGlobal('matchMedia', () => reads++ === 0 ? firstRead : media)
  const changed = vi.fn()
  function Preference() {
    const { reducedMotion } = usePetMotion(() => {}, false, changed)
    return <output>{String(reducedMotion)}</output>
  }
  const ui = render(<Preference />)
  mounted.add(ui)
  expect(changed.mock.calls).toEqual([[true]])
  expect(ui.container.textContent).toBe('true')
  expect(frames.size).toBe(0)
})

function mount(tick = vi.fn(), active = true, strict = false) {
  const clock = <Clock tick={tick} active={active} />
  const ui = render(strict ? <StrictMode>{clock}</StrictMode> : clock)
  mounted.add(ui)
  return ui
}

function frame(now: number) {
  const pending = [...frames.values()]
  frames.clear()
  act(() => { for (const callback of pending) callback(now) })
}

function visibility(value: boolean) {
  act(() => {
    hidden = value
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

function preference(value: boolean) {
  Object.defineProperty(media, 'matches', { configurable: true, value })
  media.dispatchEvent(Object.assign(new Event('change'), { matches: value, media: media.media }))
}

it('can pause only reduced-motion scheduling while retaining live preferences and stable pending callbacks', () => {
  const tick = vi.fn()
  const ui = render(<Clock tick={tick} active={{ normal: true, reduced: false }} />)
  mounted.add(ui)
  const pending = [...frames.keys()]
  ui.rerender(<Clock tick={tick} active={{ normal: true, reduced: false }} />)
  expect([...frames.keys()]).toEqual(pending)
  act(() => preference(true))
  expect(ui.container.textContent).toBe('true')
  expect(frames.size).toBe(0)
  visibility(true); visibility(false)
  expect(frames.size).toBe(0)
  act(() => preference(false))
  expect(frames.size).toBe(1)
  frame(200)
  expect(tick.mock.calls).toEqual([[200, false]])
})

it('starts a finite reduced-motion consumer on demand and returns to no frames', () => {
  Object.defineProperty(media, 'matches', { value: true, configurable: true })
  const tick = vi.fn()
  const ui = render(<Clock tick={tick} active={{ normal: false, reduced: false }} />)
  mounted.add(ui)
  expect(frames.size).toBe(0)
  ui.rerender(<Clock tick={tick} active={{ normal: false, reduced: true }} />)
  expect(frames.size).toBe(1)
  frame(200)
  expect(tick.mock.calls).toEqual([[200, true]])
  ui.rerender(<Clock tick={tick} active={{ normal: false, reduced: false }} />)
  expect(frames.size).toBe(0)
  act(() => preference(false))
  expect(frames.size).toBe(0)
})

it('keeps exactly one frame outstanding while active, including Strict Mode replay', () => {
  const tick = vi.fn()
  mount(tick, true, true)
  expect(frames.size).toBe(1)
  frame(100)
  expect(tick.mock.calls).toEqual([[100, false]])
  expect(frames.size).toBe(1)
  frame(116)
  expect(tick.mock.calls).toEqual([[100, false], [116, false]])
  expect(frames.size).toBe(1)
})

it('uses the latest callback without replacing the pending frame', () => {
  const oldTick = vi.fn()
  const newTick = vi.fn()
  const ui = mount(oldTick)
  const pending = [...frames.keys()]
  ui.rerender(<Clock tick={newTick} />)
  expect(frames.size).toBe(1)
  expect([...frames.keys()]).toEqual(pending)
  frame(120)
  expect(oldTick).not.toHaveBeenCalled()
  expect(newTick.mock.calls).toEqual([[120, false]])
})

it('starts only when active and cancels when deactivated', () => {
  const tick = vi.fn()
  const ui = mount(tick, false)
  expect(frames.size).toBe(0)
  ui.rerender(<Clock tick={tick} />)
  expect(frames.size).toBe(1)
  frame(30)
  ui.rerender(<Clock tick={tick} active={false} />)
  expect(frames.size).toBe(0)
  frame(40)
  expect(tick.mock.calls).toEqual([[30, false]])
  ui.rerender(<Clock tick={tick} />)
  expect(frames.size).toBe(1)
})

it('cancels on unmount and ignores a callback already queued for delivery', () => {
  const tick = vi.fn()
  const ui = mount(tick)
  expect(frames.size).toBe(1)
  const queued = [...frames.values()][0]
  ui.unmount()
  mounted.delete(ui)
  expect(frames.size).toBe(0)
  act(() => queued(50))
  expect(tick).not.toHaveBeenCalled()
  expect(frames.size).toBe(0)
})

it('waits for visibility when mounted in a hidden tab', () => {
  hidden = true
  const tick = vi.fn()
  mount(tick)
  expect(frames.size).toBe(0)
  visibility(false)
  expect(frames.size).toBe(1)
  frame(500)
  expect(tick.mock.calls).toEqual([[500, false]])
})

it('suspends hidden tabs and resumes once using monotonic browser time, including hidden elapsed time', () => {
  const tick = vi.fn()
  mount(tick)
  frame(100)
  visibility(true)
  expect(frames.size).toBe(0)
  frame(5_000)
  expect(tick.mock.calls).toEqual([[100, false]])
  visibility(false)
  visibility(false)
  expect(frames.size).toBe(1)
  frame(10_100)
  expect(tick.mock.calls).toEqual([[100, false], [10_100, false]])
  expect(frames.size).toBe(1)
})

it('does not tick if the tab becomes hidden before its visibility event is delivered', () => {
  const tick = vi.fn()
  mount(tick)
  hidden = true
  frame(50)
  expect(tick).not.toHaveBeenCalled()
  expect(frames.size).toBe(0)
  visibility(false)
  expect(frames.size).toBe(1)
})

it('ignores a cancelled frame delivered after a hidden tab has resumed', () => {
  const tick = vi.fn()
  mount(tick)
  const stale = [...frames.values()][0]
  visibility(true)
  visibility(false)
  act(() => stale(70))
  expect(tick).not.toHaveBeenCalled()
  expect(frames.size).toBe(1)
  frame(80)
  expect(tick.mock.calls).toEqual([[80, false]])
  expect(frames.size).toBe(1)
})

it('reads the initial reduced-motion preference and continues ticking for reduced-motion consumers', () => {
  Object.defineProperty(media, 'matches', { configurable: true, value: true })
  const tick = vi.fn()
  const ui = mount(tick)
  expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  expect(ui.container.textContent).toBe('true')
  frame(90)
  expect(tick.mock.calls).toEqual([[90, true]])
  expect(frames.size).toBe(1)
})

it('updates rendered preference and the next tick live without replacing the pending frame', () => {
  const tick = vi.fn()
  const ui = mount(tick)
  const pending = [...frames.keys()]
  act(() => preference(true))
  expect(ui.container.textContent).toBe('true')
  expect([...frames.keys()]).toEqual(pending)
  frame(100)
  act(() => preference(false))
  expect(ui.container.textContent).toBe('false')
  frame(116)
  expect(tick.mock.calls).toEqual([[100, true], [116, false]])
  expect(frames.size).toBe(1)
})

it('uses a media change immediately even before the state update commits', () => {
  const tick = vi.fn()
  mount(tick)
  act(() => {
    preference(true)
    frame(100)
  })
  expect(tick.mock.calls).toEqual([[100, true]])
})

it('tracks preference while inactive or hidden without starting frames', () => {
  const tick = vi.fn()
  const ui = mount(tick, false)
  visibility(true)
  act(() => preference(true))
  expect(ui.container.textContent).toBe('true')
  visibility(false)
  expect(frames.size).toBe(0)
  ui.rerender(<Clock tick={tick} />)
  visibility(true)
  act(() => preference(false))
  expect(ui.container.textContent).toBe('false')
  expect(frames.size).toBe(0)
  visibility(false)
  frame(200)
  expect(tick.mock.calls).toEqual([[200, false]])
})

it('removes visibility and media listeners on unmount, including Strict Mode replay', () => {
  const addVisibility = vi.spyOn(document, 'addEventListener')
  const removeVisibility = vi.spyOn(document, 'removeEventListener')
  const addMedia = vi.spyOn(media, 'addEventListener')
  const removeMedia = vi.spyOn(media, 'removeEventListener')
  const tick = vi.fn()
  const ui = mount(tick, true, true)
  ui.unmount()
  mounted.delete(ui)
  const visibilityListeners = addVisibility.mock.calls.filter(([type]) => type === 'visibilitychange')
  const mediaListeners = addMedia.mock.calls.filter(([type]) => type === 'change')
  expect(visibilityListeners.length).toBeGreaterThan(0)
  expect(mediaListeners.length).toBeGreaterThan(0)
  expect(removeVisibility.mock.calls.filter(([type]) => type === 'visibilitychange')).toEqual(visibilityListeners)
  expect(removeMedia.mock.calls.filter(([type]) => type === 'change')).toEqual(mediaListeners)
  act(() => preference(true))
  visibility(true)
  visibility(false)
  expect(frames.size).toBe(0)
  expect(tick).not.toHaveBeenCalled()
})

it('does not schedule another frame if the tick unmounts its consumer', () => {
  const tick = vi.fn(() => {
    ui.unmount()
    mounted.delete(ui)
  })
  const ui = mount(tick)
  frame(100)
  expect(tick).toHaveBeenCalledTimes(1)
  expect(frames.size).toBe(0)
})

it('defaults to full motion when matchMedia is unavailable', () => {
  vi.stubGlobal('matchMedia', undefined)
  const tick = vi.fn()
  const ui = mount(tick)
  expect(ui.container.textContent).toBe('false')
  frame(100)
  expect(tick.mock.calls).toEqual([[100, false]])
})

it('notifies the latest resume handler before the first delivered tick after activity or document pause', () => {
  const tick = vi.fn(), first = vi.fn(), latest = vi.fn()
  function ResumeClock({ resumed, active = true }: { resumed: () => void; active?: boolean }) {
    usePetMotion(tick, active, undefined, resumed)
    return null
  }
  const ui = render(<StrictMode><ResumeClock resumed={first} /></StrictMode>)
  mounted.add(ui)
  expect(first).not.toHaveBeenCalled()
  expect(frames.size).toBe(1)
  frame(100)
  expect(first).toHaveBeenCalledOnce()
  expect(first.mock.invocationCallOrder[0]).toBeLessThan(tick.mock.invocationCallOrder[0])
  frame(116)
  expect(first).toHaveBeenCalledOnce()
  ui.rerender(<StrictMode><ResumeClock resumed={latest} /></StrictMode>)
  visibility(true); visibility(false); visibility(false)
  expect(latest).not.toHaveBeenCalled()
  frame(10_000)
  expect(latest).toHaveBeenCalledOnce()
  expect(tick.mock.calls).toEqual([[100, false], [116, false], [10_000, false]])
  ui.rerender(<StrictMode><ResumeClock resumed={latest} active={false} /></StrictMode>)
  expect(frames.size).toBe(0)
  ui.rerender(<StrictMode><ResumeClock resumed={latest} /></StrictMode>)
  frame(10_050)
  expect(latest).toHaveBeenCalledTimes(2)
  ui.unmount(); mounted.delete(ui)
  visibility(true); visibility(false)
  expect(frames.size).toBe(0)
  expect(latest).toHaveBeenCalledTimes(2)
})
