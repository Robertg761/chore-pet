import { useCallback, useEffect, useId, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import './Sheet.css'

export interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** 'bottom' slides up from the bottom on phones; 'menu' is a small list. */
  variant?: 'bottom' | 'menu'
}

/** How far down a drag on the handle has to go before letting go closes the sheet. */
const DISMISS_PX = 90
/** A quick flick closes it from a shorter drag. */
const FLICK_PX_PER_MS = 0.6

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A modal sheet on the native <dialog>: focus is kept inside, Escape and a tap
 * outside close it, and the page behind can't be reached. On a phone it can
 * also be dragged down by its handle. Closing plays a short exit first.
 */
export function Sheet({ title, onClose, children, variant = 'bottom' }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  const closing = useRef(false)

  /** Play the exit, then tell the owner (who removes the sheet). */
  const requestClose = useCallback(() => {
    const dialog = ref.current
    if (closing.current) return
    closing.current = true
    if (!dialog || reducedMotion() || typeof dialog.getAnimations !== 'function') {
      closeRef.current()
      return
    }
    dialog.classList.add('app-sheet-closing')
    let done = false
    const finish = () => {
      if (done) return
      done = true
      closeRef.current()
    }
    dialog.addEventListener('animationend', (e) => e.target === dialog && finish())
    // In case the animation never runs (a hidden tab, say).
    window.setTimeout(finish, 400)
  }, [])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // Remember who opened the sheet so focus can go back there on close.
    // (Ignore focus that is already inside the sheet, as on a dev double-mount.)
    const active = document.activeElement
    if (active instanceof HTMLElement && !dialog.contains(active)) openerRef.current = active
    if (!dialog.open) dialog.showModal?.()
    // Start on Close, not the scrolling body, so the first Tab stays short and nothing jumps.
    closeButton.current?.focus({ preventScroll: true })
    const cancel = (e: Event) => {
      e.preventDefault()
      requestClose()
    }
    dialog.addEventListener('cancel', cancel)
    return () => {
      dialog.removeEventListener('cancel', cancel)
      const opener = openerRef.current
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [requestClose])

  // Drag down by the handle (or the title bar) to close, as on a phone's own sheets.
  const drag = useRef<{ id: number; y: number; t: number; dy: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' || closing.current) return
    drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0 }
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current
    const dialog = ref.current
    if (!d || !dialog || e.pointerId !== d.id) return
    d.dy = Math.max(0, e.clientY - d.y)
    if (d.dy > 4) {
      if (!dialog.hasPointerCapture(e.pointerId)) dialog.setPointerCapture(e.pointerId)
      dialog.classList.add('app-sheet-dragging')
      dialog.style.setProperty('--sheet-drag', `${d.dy}px`)
    }
  }
  const onPointerEnd = (e: ReactPointerEvent) => {
    const d = drag.current
    const dialog = ref.current
    if (!d || !dialog || e.pointerId !== d.id) return
    drag.current = null
    dialog.classList.remove('app-sheet-dragging')
    const speed = d.dy / Math.max(1, e.timeStamp - d.t)
    if (d.dy > DISMISS_PX || (d.dy > 24 && speed > FLICK_PX_PER_MS)) requestClose()
    // Otherwise it springs back up (the transition on --sheet-drag in Sheet.css).
    else dialog.style.setProperty('--sheet-drag', '0px')
  }

  return (
    <dialog
      ref={ref}
      className={`app-sheet app-sheet-${variant}`}
      aria-labelledby={titleId}
      // A tap on the backdrop lands on the dialog itself.
      onClick={(e) => e.target === e.currentTarget && requestClose()}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div className="app-sheet-body">
        <div className="app-sheet-grab" onPointerDown={onPointerDown}>
          <span className="app-sheet-handle" aria-hidden="true" />
          <header className="app-sheet-head">
            <h2 id={titleId}>{title}</h2>
            <button ref={closeButton} type="button" className="app-sheet-close" onClick={requestClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
          </header>
        </div>
        {children}
      </div>
    </dialog>
  )
}
