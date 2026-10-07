import { afterEach, describe, expect, it, vi } from 'vitest'
import { withViewTransition } from './viewTransition'

/** A stand-in document: just what withViewTransition reads. */
function fakeDocument(start?: (update: () => void) => { finished: Promise<void> }) {
  const doc = { documentElement: { dataset: {} as Record<string, string> }, visibilityState: 'visible', startViewTransition: start }
  vi.stubGlobal('document', doc)
  return doc
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('withViewTransition', () => {
  it('just applies the change where the browser has no view transitions', () => {
    fakeDocument()
    const update = vi.fn()
    withViewTransition(update, 'forward')
    expect(update).toHaveBeenCalledOnce()
  })

  it('applies the change at once for players who asked for less motion', () => {
    const start = vi.fn()
    fakeDocument(start)
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const update = vi.fn()
    withViewTransition(update)
    expect(update).toHaveBeenCalledOnce()
    expect(start).not.toHaveBeenCalled()
  })

  it('runs the change inside a transition, marked with its kind until it ends', async () => {
    let finish = () => {}
    const finished = new Promise<void>((resolve) => (finish = resolve))
    const doc = fakeDocument((run) => {
      run()
      return { finished }
    })
    const update = vi.fn()
    withViewTransition(update, 'back')
    expect(update).toHaveBeenCalledOnce()
    expect(doc.documentElement.dataset.vt).toBe('back')
    finish()
    await finished
    await new Promise((r) => setTimeout(r, 0))
    expect(doc.documentElement.dataset.vt).toBeUndefined()
  })

  it('leaves the marker to a newer transition that cut an older one short', async () => {
    const finishes: (() => void)[] = []
    const doc = fakeDocument((run) => {
      run()
      return { finished: new Promise<void>((resolve) => finishes.push(resolve)) }
    })
    withViewTransition(() => {}, 'forward')
    withViewTransition(() => {}, 'forward')
    finishes[0]() // the first one is skipped as the second starts
    await new Promise((r) => setTimeout(r, 0))
    expect(doc.documentElement.dataset.vt).toBe('forward')
    finishes[1]()
    await new Promise((r) => setTimeout(r, 0))
    expect(doc.documentElement.dataset.vt).toBeUndefined()
  })
})
