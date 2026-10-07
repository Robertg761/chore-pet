import type { ReactNode } from 'react'
import './controls.css'
import './ScreenHeader.css'

export interface ScreenHeaderProps {
  title: string
  /** Lets the screen point `aria-labelledby` at the title. */
  id?: string
  /** Shown as a Back button when there is somewhere to go back to. Tab roots leave it out. */
  onBack?: () => void
  /** "Back" by default; "Cancel" where leaving drops changes. */
  backLabel?: string
  /** Buttons on the right, such as Save. */
  actions?: ReactNode
}

/**
 * The title row every screen shares. The title is a focusable h1 (tabIndex -1,
 * `data-screen-title`) so the app can move focus to it when the screen changes.
 */
export function ScreenHeader({ title, id, onBack, backLabel = 'Back', actions }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      {onBack && (
        <button type="button" className="btn btn-quiet sh-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sh-back-text">{backLabel}</span>
        </button>
      )}
      <h1 id={id} className="sh-title" tabIndex={-1} data-screen-title>
        {title}
      </h1>
      {actions && <div className="sh-actions">{actions}</div>}
    </header>
  )
}
