import { useEffect, useId, useRef, type ReactNode } from 'react'
import './Sheet.css'

export interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** 'bottom' slides up from the bottom on phones; 'menu' is a small list. */
  variant?: 'bottom' | 'menu'
}

/**
 * A modal sheet on the native <dialog>: focus is kept inside, Escape and a tap
 * outside close it, and the page behind can't be reached.
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
      closeRef.current()
    }
    dialog.addEventListener('cancel', cancel)
    return () => {
      dialog.removeEventListener('cancel', cancel)
      const opener = openerRef.current
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className={`app-sheet app-sheet-${variant}`}
      aria-labelledby={titleId}
      // A tap on the backdrop lands on the dialog itself.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="app-sheet-body">
        <header className="app-sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeButton} type="button" className="app-sheet-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
