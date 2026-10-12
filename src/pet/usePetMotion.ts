import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Boolean callers keep one activity policy for both motion preferences. */
export type MotionActivity = boolean | { normal: boolean; reduced: boolean }

/**
 * Supplies browser rAF timestamps in the same monotonic time domain as
 * performance.now(). Hidden tabs receive no ticks; the first visible frame
 * includes elapsed hidden time, so existing activity deadlines remain valid.
 * Preference handlers share the query subscription and run only on changes,
 * even while inactive, so finite previews can cancel in the same event batch.
 * Optional resume handlers run before the first delivered tick after starting
 * or resuming, allowing relative playback to exclude paused time. Absolute
 * timestamps and existing two-argument tick callbacks remain unchanged.
 */
export function usePetMotion(
  tick: (now: number, reducedMotion: boolean) => void,
  active: MotionActivity,
  onPreferenceChange?: (reducedMotion: boolean) => void,
  onResume?: () => void,
): { reducedMotion: boolean } {
  const latestTick = useRef(tick)
  useLayoutEffect(() => { latestTick.current = tick }, [tick])
  const latestPreferenceChange = useRef(onPreferenceChange)
  useLayoutEffect(() => { latestPreferenceChange.current = onPreferenceChange }, [onPreferenceChange])
  const latestResume = useRef(onResume)
  useLayoutEffect(() => { latestResume.current = onResume }, [onResume])

  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
  )
  const preference = useRef(reducedMotion)
  const running = typeof active === 'boolean' ? active : reducedMotion ? active.reduced : active.normal

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
    if (!running) return
    let disposed = false
    let pending: number | null = null
    let resuming = true
    const cancel = () => {
      if (pending !== null) cancelAnimationFrame(pending)
      pending = null
      resuming = true
    }
    const schedule = () => {
      if (disposed || document.hidden || pending !== null) return
      const id = requestAnimationFrame((now) => {
        if (disposed || pending !== id) return
        pending = null
        if (document.hidden) { resuming = true; return }
        if (resuming) { resuming = false; latestResume.current?.() }
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
  }, [running])

  return { reducedMotion }
}
