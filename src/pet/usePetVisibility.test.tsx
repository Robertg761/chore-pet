// @vitest-environment jsdom
import { act, createRef, StrictMode, type RefObject } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render } from '../test/react'
import { usePetVisibility } from './usePetVisibility'

const instances: VisibilityObserver[] = [], cleanups: (() => void)[] = []
class VisibilityObserver {
  previous: { intersecting: boolean; thresholdIndex: number } | null = null
  target: Element | null = null
  callback: IntersectionObserverCallback
  observe = vi.fn((node: Element) => { this.target = node })
  disconnect = vi.fn()
  constructor(callback: IntersectionObserverCallback) { this.callback = callback; instances.push(this) }
  deliver(visible: boolean, ratio = visible ? 1 : 0, target = this.target!) {
    this.callback([{ target, isIntersecting: visible, intersectionRatio: ratio } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
  // Native default thresholds are[0]. Model notification filtering, rather
  // than manually delivering a positive-area entry the platform may omit.
  sample(intersecting: boolean, ratio: number): boolean {
    const thresholds = [0], above = thresholds.findIndex(value => value > ratio)
    const thresholdIndex = above < 0 ? thresholds.length : above
    const notify = !this.previous || intersecting !== this.previous.intersecting || thresholdIndex !== this.previous.thresholdIndex
    this.previous = { intersecting, thresholdIndex }
    if (notify) this.deliver(intersecting, ratio)
    return notify
  }
}
function Probe({ nodeRef }: { nodeRef: RefObject<SVGGElement | null> }) {
  const visible = usePetVisibility(nodeRef)
  return <><svg><g ref={nodeRef} /></svg><output>{String(visible)}</output></>
}
beforeEach(() => { instances.length = 0; vi.stubGlobal('IntersectionObserver', VisibilityObserver) })
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.unstubAllGlobals(); vi.restoreAllMocks() })
function mount() {
  const nodeRef = createRef<SVGGElement>(), ui = render(<Probe nodeRef={nodeRef} />)
  cleanups.push(ui.unmount)
  return { ...ui, nodeRef, visible: () => ui.container.querySelector('output')!.textContent }
}

it('uses one observer, keeps partial visibility and zero-area edge contact active', () => {
  const ui = mount(), observer = instances[0]
  expect(ui.visible()).toBe('true')
  expect(observer.observe).toHaveBeenCalledExactlyOnceWith(ui.nodeRef.current)
  act(() => { observer.deliver(false); observer.deliver(false) })
  expect(ui.visible()).toBe('false')
  act(() => observer.deliver(true, .001))
  expect(ui.visible()).toBe('true')
  act(() => observer.deliver(true, 0))
  expect(ui.visible()).toBe('true')
  act(() => observer.deliver(false))
  expect(ui.visible()).toBe('false')
  act(() => observer.deliver(true, 1, document.createElement('div')))
  expect(ui.visible()).toBe('false')
  expect(instances).toHaveLength(1)
})

it('retains the existing visible policy when observation is unavailable', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const ui = mount()
  expect(ui.visible()).toBe('true')
  expect(instances).toHaveLength(0)
})

it('stays active when native edge contact becomes positive area without another notification', () => {
  const ui = mount(), observer = instances[0]
  act(() => { expect(observer.sample(false, 0)).toBe(true) })
  expect(ui.visible()).toBe('false')
  act(() => { expect(observer.sample(true, 0)).toBe(true) })
  act(() => { expect(observer.sample(true, .4)).toBe(false) })
  expect(ui.visible()).toBe('true')
})

it('disconnects and ignores already queued callbacks after cleanup', () => {
  const ui = mount(), observer = instances[0]
  const error = vi.spyOn(console, 'error')
  ui.unmount(); cleanups.pop()
  act(() => observer.deliver(false))
  expect(observer.disconnect).toHaveBeenCalledOnce()
  expect(error).not.toHaveBeenCalled()
})

it('keeps only the current observer active through development Strict Mode remounts', () => {
  const nodeRef = createRef<SVGGElement>()
  const ui = render(<StrictMode><Probe nodeRef={nodeRef} /></StrictMode>)
  cleanups.push(ui.unmount)
  expect(instances).toHaveLength(2)
  expect(instances[0].disconnect).toHaveBeenCalledOnce()
  expect(instances[1].disconnect).not.toHaveBeenCalled()
  act(() => instances[0].deliver(false))
  expect(ui.container.querySelector('output')!.textContent).toBe('true')
  act(() => instances[1].deliver(false))
  expect(ui.container.querySelector('output')!.textContent).toBe('false')
  ui.unmount(); cleanups.pop()
  expect(instances[1].disconnect).toHaveBeenCalledOnce()
})

it('disconnects the former ref and starts a new ref visible until its observation arrives', () => {
  const ui = mount(), former = instances[0]
  act(() => former.deliver(false))
  const replacement = createRef<SVGGElement>()
  ui.rerender(<Probe nodeRef={replacement} />)
  expect(former.disconnect).toHaveBeenCalledOnce()
  expect(ui.visible()).toBe('true')
  expect(instances[1].observe).toHaveBeenCalledExactlyOnceWith(replacement.current)
  act(() => former.deliver(false))
  expect(ui.visible()).toBe('true')
  act(() => instances[1].deliver(false))
  expect(ui.visible()).toBe('false')
})

it('uses the last matching native entry without creating a frame or timer', () => {
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  vi.stubGlobal('setInterval', vi.fn())
  const ui = mount(), observer = instances[0]
  act(() => observer.callback([
    { target: ui.nodeRef.current!, isIntersecting: false, intersectionRatio: 0 },
    { target: ui.nodeRef.current!, isIntersecting: true, intersectionRatio: .5 },
  ] as unknown as IntersectionObserverEntry[], observer as unknown as IntersectionObserver))
  expect(ui.visible()).toBe('true')
  expect(requestAnimationFrame).not.toHaveBeenCalled()
  expect(setInterval).not.toHaveBeenCalled()
})
