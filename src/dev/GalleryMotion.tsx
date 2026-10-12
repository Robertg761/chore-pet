import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { usePetMotion } from '../pet/usePetMotion'
import './GalleryMotion.css'

const noFrame = () => {}

/** CSS examples need visibility and a user switch, never another frame clock. */
export default function GalleryMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const description = useId()
  const [playing, setPlaying] = useState(false)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.visibilityState === 'hidden')
  const { reducedMotion } = usePetMotion(noFrame, false, (reduced) => { if (reduced) setPlaying(false) })
  const supported = typeof IntersectionObserver !== 'undefined'
  const requested = playing && !reducedMotion && supported
  const enabled = requested && !hidden

  useEffect(() => {
    const visibility = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', visibility)
    visibility()
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])

  useEffect(() => {
    if (!enabled || !root.current) return
    const rows = [...root.current.querySelectorAll<HTMLElement>('.gallery-row:not(.gallery-effects)')]
    let disposed = false
    const observer = new IntersectionObserver((entries) => {
      if (disposed) return
      for (const entry of entries) {
        const row = entry.target as HTMLElement
        row.dataset.galleryVisible = String(entry.isIntersecting && entry.intersectionRatio >= 0.01)
      }
    }, { threshold: 0.01 })
    for (const row of rows) observer.observe(row)
    return () => {
      disposed = true
      observer.disconnect()
      for (const row of rows) row.dataset.galleryVisible = 'false'
    }
  }, [enabled])

  return <div ref={root} className="gallery-examples" data-examples-motion={enabled ? 'running' : 'paused'}
    data-examples-requested={requested} data-document-visible={!hidden}>
    <div className="gallery-motion-controls" role="group" aria-label="Example animation controls">
      <button type="button" aria-pressed={requested} aria-describedby={description}
        disabled={reducedMotion || !supported} onClick={() => setPlaying((value) => !value)}>
        {requested ? 'Stop example animations' : 'Start example animations'}
      </button>
      <p id={description}>{reducedMotion ? 'Reduced motion is active. Examples stay still.'
        : !supported ? 'Animation visibility tracking is unavailable. Examples stay still.'
          : 'Examples start still. Only visible rows animate. Effects replay on demand; motion review has its own controls.'}</p>
    </div>
    {children}
  </div>
}
