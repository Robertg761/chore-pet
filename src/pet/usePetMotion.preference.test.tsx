// @vitest-environment jsdom
import { act, useLayoutEffect } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render } from '../test/react'
import { setPetMotionReduced } from './motionPreference'
import { usePetMotion } from './usePetMotion'

const mounted: ReturnType<typeof render>[] = []
let frames: Map<number, FrameRequestCallback>
let media: MediaQueryList
beforeEach(() => {
  localStorage.clear(); setPetMotionReduced(false)
  frames = new Map(); let serial = 0
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  media = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++serial; frames.set(id, callback); return id })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})
afterEach(() => {
  mounted.splice(0).forEach(ui => ui.unmount())
  expect(frames.size).toBe(0)
  setPetMotionReduced(false); localStorage.clear()
  vi.restoreAllMocks(); vi.unstubAllGlobals()
})
function Clock({ changed, active = true }: { changed?: (value: boolean) => void; active?: boolean }) {
  const { reducedMotion } = usePetMotion(() => {}, active ? { normal: true, reduced: false } : false, changed)
  return <output>{String(reducedMotion)}</output>
}
function mount(props: Parameters<typeof Clock>[0] = {}) {
  const ui = render(<Clock {...props} />); mounted.push(ui); return ui
}
function system(value: boolean) {
  act(() => { Object.assign(media, { matches: value }); media.dispatchEvent(new Event('change')) })
}

it('starts with the saved device policy and no pending frame when reduced art is settled', () => {
  setPetMotionReduced(true)
  const changed = vi.fn(), ui = mount({ changed })
  expect(ui.container.textContent).toBe('true')
  expect(frames.size).toBe(0)
  expect(changed).not.toHaveBeenCalled()
})

it('cancels the existing frame on a live device change and resumes only one frame', () => {
  const changed = vi.fn(), ui = mount({ changed })
  expect(frames.size).toBe(1)
  act(() => setPetMotionReduced(true))
  expect(ui.container.textContent).toBe('true')
  expect(frames.size).toBe(0)
  expect(changed.mock.calls).toEqual([[true]])
  act(() => setPetMotionReduced(true))
  expect(changed).toHaveBeenCalledOnce()
  act(() => setPetMotionReduced(false))
  expect(ui.container.textContent).toBe('false')
  expect(frames.size).toBe(1)
  expect(changed.mock.calls).toEqual([[true], [false]])
})

it('respects the system policy and only announces effective OR-policy changes', () => {
  Object.assign(media, { matches: true })
  const changed = vi.fn(), ui = mount({ changed })
  expect(ui.container.textContent).toBe('true')
  expect(frames.size).toBe(0)
  act(() => setPetMotionReduced(true))
  system(false)
  expect(ui.container.textContent).toBe('true')
  expect(frames.size).toBe(0)
  expect(changed).not.toHaveBeenCalled()
  system(true)
  act(() => setPetMotionReduced(false))
  expect(ui.container.textContent).toBe('true')
  expect(changed).not.toHaveBeenCalled()
  system(false)
  expect(ui.container.textContent).toBe('false')
  expect(changed.mock.calls).toEqual([[false]])
  expect(frames.size).toBe(1)
})

it('delivers device changes to the latest inactive handler without matchMedia and removes the subscription', () => {
  vi.stubGlobal('matchMedia', undefined)
  const first = vi.fn(), latest = vi.fn(), ui = mount({ changed: first, active: false })
  ui.rerender(<Clock changed={latest} active={false} />)
  act(() => setPetMotionReduced(true))
  expect(ui.container.textContent).toBe('true')
  expect(latest.mock.calls).toEqual([[true]])
  expect(first).not.toHaveBeenCalled()
  expect(frames.size).toBe(0)
  ui.unmount(); mounted.splice(mounted.indexOf(ui), 1)
  act(() => setPetMotionReduced(false))
  expect(latest).toHaveBeenCalledOnce()
})

it('reconciles a preference changed between rendering and subscribing before a frame runs', () => {
  const changed = vi.fn()
  function LatePreference() {
    useLayoutEffect(() => { setPetMotionReduced(true) }, [])
    return <Clock changed={changed} />
  }
  const ui = render(<LatePreference />); mounted.push(ui)
  expect(ui.container.textContent).toBe('true')
  expect(frames.size).toBe(0)
  expect(changed.mock.calls).toEqual([[true]])
})
