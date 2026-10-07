import { useEffect, useState, useSyncExternalStore } from 'react'

export interface Viewport {
  width: number
  height: number
}

const read = (): Viewport => ({ width: window.innerWidth, height: window.innerHeight })

/** The window size, kept up to date on resize and rotation. */
export function useViewport(): Viewport {
  const [size, setSize] = useState(read)
  useEffect(() => {
    const update = () => setSize(read())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

/** Wide enough for the side rail and the two-column home. Kept for compatibility; prefer `useWide()`. */
export const WIDE_MIN = 900

/**
 * The one "wide layout" condition: a desktop-sized window, or a phone on its side
 * (landscape, short, and wide enough for a rail and two columns).
 * Screens' CSS repeats this exact query: `@media (min-width: 900px), (orientation: landscape) and (max-height: 500px) and (min-width: 640px)`.
 */
export const WIDE_QUERY = '(min-width: 900px), (orientation: landscape) and (max-height: 500px) and (min-width: 640px)'

const subscribe = (notify: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY)
  mq.addEventListener('change', notify)
  return () => mq.removeEventListener('change', notify)
}
const snapshot = () => window.matchMedia(WIDE_QUERY).matches

/** True when the wide layout applies (rail on the left, room and panel side by side). */
export function useWide(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
