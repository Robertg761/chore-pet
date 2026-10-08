import { useEffect, useRef, useState } from 'react'
import './UndoToast.css'

const SHOW_MS = 5000

/** A correction stays available while focused, hovered, or blocked by a dialog. */
export function UndoToast({ choreName, verb = 'Done', onUndo, onClose, paused = false, inline = false }: {
  choreName: string
  /** What happened to the chore: "Done" or "Skipped". */
  verb?: string
  onUndo: () => void
  onClose: () => void
  /** Gifts keep the correction available throughout the reveal and queue. */
  paused?: boolean
  /** A sheet footer or gift owns its layout instead of floating over the page. */
  inline?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    // Includes More and any future native modal, without coupling to navigation.
    const check = () => setBlocked(document.hidden || Array.from(document.querySelectorAll('dialog:modal')).some((dialog) => !dialog.contains(ref.current)))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] })
    document.addEventListener('visibilitychange', check)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  const held = paused || blocked || hovered || focused
  if (held && leaving) setLeaving(false)
  useEffect(() => {
    if (held) return
    const timer = window.setTimeout(() => setLeaving(true), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [held])
  useEffect(() => {
    if (!leaving || held) return
    // Also close when animations are disabled or their end event is interrupted.
    const timer = window.setTimeout(() => closeRef.current(), 300)
    return () => window.clearTimeout(timer)
  }, [leaving, held])

  return (
    <div
      ref={ref}
      className={`undo-toast${inline ? ' undo-toast-inline' : ''}${leaving && !held ? ' undo-toast-out' : ''}`}
      role="status"
      onAnimationEnd={(e) => leaving && !held && e.target === e.currentTarget && closeRef.current()}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
    >
      <span className="undo-toast-text" title={`${verb}: ${choreName}`}>{verb}: {choreName}</span>
      <button type="button" onClick={() => {
        const dialog = ref.current?.closest('dialog')
        onUndo()
        queueMicrotask(() => {
          if (document.activeElement !== document.body) return
          const target = dialog?.querySelector<HTMLElement>('button:not(:disabled)') ?? document.querySelector<HTMLElement>('#cl-h-next, .app-view h1')
          if (target) {
            if (target.matches('h1, h2')) target.setAttribute('tabindex', '-1')
            target.focus({ preventScroll: true })
          }
        })
      }}>
        Undo
      </button>
    </div>
  )
}
