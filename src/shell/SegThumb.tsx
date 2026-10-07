import { useCallback, useLayoutEffect, useRef } from 'react'

// The ink thumb behind a segmented control (.seg). Render it as the first child of
// the .seg container. It measures the selected .seg-btn (aria-pressed or
// aria-selected) and glides there; styles are in shell/controls.css.
// It lives inside the scrolling row, so it scrolls with the buttons.

const SELECTED = '.seg-btn[aria-pressed="true"], .seg-btn[aria-selected="true"]'

export function SegThumb() {
  const ref = useRef<HTMLSpanElement>(null)
  const placed = useRef(false) // has the thumb been put anywhere yet?
  const lastKey = useRef('') // the geometry it was last given
  const watched = useRef(new Set<Element>())
  const roRef = useRef<ResizeObserver | null>(null)

  // `animate` is false for resizes and the first placement: the thumb just snaps.
  const place = useCallback((animate: boolean) => {
    const thumb = ref.current
    const box = thumb?.parentElement
    if (!thumb || !box) return
    const btn = box.querySelector<HTMLElement>(SELECTED)
    if (!btn || box.offsetWidth === 0) {
      // Nothing selected, or not on screen yet: back to the plain look.
      thumb.hidden = true
      box.classList.remove('seg-has-thumb')
      placed.current = false
      lastKey.current = ''
      return
    }
    const { offsetLeft: x, offsetTop: y, offsetWidth: w, offsetHeight: h } = btn
    const key = `${x}|${y}|${w}|${h}`
    if (key === lastKey.current) return
    lastKey.current = key
    const snap = !animate || !placed.current
    if (snap) thumb.style.transition = 'none'
    thumb.style.translate = `${x}px ${y}px`
    thumb.style.width = `${w}px`
    thumb.style.height = `${h}px`
    thumb.hidden = false
    box.classList.add('seg-has-thumb')
    if (snap) {
      void thumb.offsetWidth // commit the jump before transitions come back
      thumb.style.transition = ''
    }
    placed.current = true
  }, [])

  // Resizes, wrapping and fonts arriving: re-measure without animating.
  useLayoutEffect(() => {
    const box = ref.current?.parentElement
    const watchedNow = watched.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => place(false))
    roRef.current = ro
    ro.observe(box)
    return () => {
      ro.disconnect()
      roRef.current = null
      watchedNow.clear()
      box.classList.remove('seg-has-thumb')
      placed.current = false
      lastKey.current = ''
    }
  }, [place])

  // After every render of the parent: the selection may have moved. (Runs after the observer is set up.)
  useLayoutEffect(() => {
    place(true)
    const ro = roRef.current
    const box = ref.current?.parentElement
    if (!ro || !box) return
    // Follow buttons that come and go.
    const now = new Set<Element>(box.querySelectorAll('.seg-btn'))
    for (const el of watched.current) {
      if (!now.has(el)) {
        ro.unobserve(el)
        watched.current.delete(el)
      }
    }
    for (const el of now) {
      if (!watched.current.has(el)) {
        ro.observe(el)
        watched.current.add(el)
      }
    }
  })

  return <span ref={ref} className="seg-thumb" aria-hidden="true" hidden />
}
