import { useEffect, useRef, useState } from 'react'
import './UndoToast.css'

const SHOW_MS = 5000

/**
 * A short "Done: X · Undo" note after a chore is ticked off, for the tap that
 * was a slip. It waits while hovered or focused, so there is always time to
 * reach the button.
 */
export function UndoToast({ choreName, onUndo, onClose }: { choreName: string; onUndo: () => void; onClose: () => void }) {
  const [held, setHeld] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    if (held) return
    // Slide away, then go (the animation's end closes it; see onAnimationEnd).
    const timer = window.setTimeout(() => setLeaving(true), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [held])

  return (
    <div
      className={`undo-toast${leaving ? ' undo-toast-out' : ''}`}
      role="status"
      onAnimationEnd={(e) => leaving && e.target === e.currentTarget && closeRef.current()}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <span className="undo-toast-text">Done: {choreName}</span>
      <button type="button" onClick={onUndo}>
        Undo
      </button>
    </div>
  )
}
