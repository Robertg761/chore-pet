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
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    if (held) return
    const timer = window.setTimeout(() => closeRef.current(), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [held])

  return (
    <div
      className="undo-toast"
      role="status"
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
