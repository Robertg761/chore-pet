import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Supplies browser rAF timestamps in the same monotonic time domain as
 * performance.now(). Hidden tabs receive no ticks; the first visible frame
 * includes elapsed hidden time, so existing activity deadlines remain valid.
 * Preference handlers share the query subscription and run only on changes,
 * even while inactive, so finite previews can cancel in the same event batch.
 */
export function usePetMotion(
  tick: (now: number, reducedMotion: boolean) => void,
  active: boolean,
  onPreferenceChange?: (reducedMotion: boolean) => void,
): { reducedMotion: boolean } {
  const latestTick = useRef(tick)
  useLayoutEffect(() => { latestTick.current = tick }, [tick])
  const latestPreferenceChange = useRef(onPreferenceChange)
  useLayoutEffect(() => { latestPreferenceChange.current = onPreferenceChange }, [onPreferenceChange])

  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
  )
  const preference = useRef(reducedMotion)

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = () => {
      const changed = preference.current !== query.matches
      preference.current = query.matches
      setReducedMotion(query.matches)
      if (changed) latestPreferenceChange.current?.(query.matches)
    }
    query.addEventListener('change', update)
    update()
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!active) return
    let disposed = false
    let pending: number | null = null
    const cancel = () => {
      if (pending !== null) cancelAnimationFrame(pending)
      pending = null
    }
    const schedule = () => {
      if (disposed || document.hidden || pending !== null) return
      const id = requestAnimationFrame((now) => {
        if (disposed || pending !== id) return
        pending = null
        if (document.hidden) return
        latestTick.current(now, preference.current)
        schedule()
      })
      pending = id
    }
    const onVisibility = () => {
      if (document.hidden) cancel()
      else schedule()
    }
    document.addEventListener('visibilitychange', onVisibility)
    schedule()
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      cancel()
    }
  }, [active])

  return { reducedMotion }
}
