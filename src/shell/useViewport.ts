import { useEffect, useState } from 'react'

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

/** Wide enough for the side rail and the two-column home. Matches `--wide` in index.css. */
export const WIDE_MIN = 900
