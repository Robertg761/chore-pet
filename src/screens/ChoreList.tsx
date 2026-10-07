import { useCallback, useEffect, useRef, useState } from 'react'
import { completionCounts } from '../domain/schedule'
import type { Chore, Completion, VacationWindow } from '../domain/types'
import { buildSections, onVacation, type ChoreRow } from './choreListModel'
import './ChoreList.css'

export interface ChoreListProps {
  chores: Chore[]
  completions: Completion[]
  vacations: VacationWindow[]
  today: string
  onComplete: (chore: Chore) => void
  onEdit: (chore: Chore) => void
  onAdd: () => void
  /**
   * Show only the first few rows (late, then today, then coming up) under one
   * "Up next" heading, with a button to see them all. Leave unset for the full list.
   */
  limit?: number
  onSeeAll?: () => void
}

/** How long the check shows before the chore is completed and the row moves. */
const FEEDBACK_MS = 450

function CheckIcon() {
  return (
    <svg className="cl-check" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChoreList({ chores, completions, vacations, today, onComplete, onEdit, onAdd, limit, onSeeAll }: ChoreListProps) {
  const sections = buildSections(chores, completions, vacations, today)
  const away = onVacation(today, vacations)

  // Chores that were just tapped: they show a check for a moment, then complete.
  const [finishing, setFinishing] = useState<ReadonlySet<string>>(new Set())
  const timers = useRef(new Map<string, { timer: number; chore: Chore }>())
  const completeRef = useRef(onComplete)
  useEffect(() => {
    completeRef.current = onComplete
  })

  const finish = useCallback((chore: Chore) => {
    if (timers.current.has(chore.id)) return
    setFinishing((prev) => new Set(prev).add(chore.id))
    const timer = window.setTimeout(() => {
      timers.current.delete(chore.id)
      setFinishing((prev) => {
        const next = new Set(prev)
        next.delete(chore.id)
        return next
      })
      completeRef.current(chore)
    }, FEEDBACK_MS)
    timers.current.set(chore.id, { timer, chore })
  }, [])

  // If the screen closes mid-feedback, still save the chore as done.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const { timer, chore } of pending.values()) {
        window.clearTimeout(timer)
        completeRef.current(chore)
      }
      pending.clear()
    }
  }, [])

  const renderRow = ({ chore, status, label }: ChoreRow) => {
    const early = status.state === 'upcoming'
    const justDone = finishing.has(chore.id)
    return (
      <li key={chore.id} className={`cl-row cl-row-${status.state}${justDone ? ' cl-row-done' : ''}`}>
        <div className="cl-info">
          <button type="button" className="cl-name" onClick={() => onEdit(chore)}>
            {chore.name}
          </button>
          <span className={`tag tag-${status.state}`}>{label}</span>
        </div>
        {justDone ? (
          <span className="cl-action cl-done-mark" role="status">
            <CheckIcon />
            <span>Nice</span>
          </span>
        ) : early && !completionCounts(chore, completions, today) ? (
          // Already done for this round: doing it again wouldn't count, so there's nothing to tap.
          <span className="cl-action cl-done-mark cl-set">
            <CheckIcon />
            <span>All set</span>
          </span>
        ) : early ? (
          <button type="button" className="cl-action cl-early" aria-label={`Do ${chore.name} early`} onClick={() => finish(chore)}>
            Do it early
          </button>
        ) : (
          <button type="button" className="cl-action cl-done" aria-label={`Mark ${chore.name} done`} onClick={() => finish(chore)}>
            Done
          </button>
        )}
      </li>
    )
  }

  const rows = sections.flatMap((s) => s.rows)
  const shown = limit === undefined ? rows : rows.slice(0, limit)

  return (
    <section className={limit === undefined ? 'cl' : 'cl cl-short'} aria-label="Chores">
      {away && (
        <p className="cl-banner" role="status">
          On vacation. Chores are paused.
        </p>
      )}

      {chores.length === 0 ? (
        <p className="cl-empty">No chores yet. Add one and your pet will cheer you on.</p>
      ) : limit !== undefined ? (
        <section className="cl-section" aria-labelledby="cl-h-next">
          <h2 id="cl-h-next" className="cl-heading">
            Up next
          </h2>
          <ul className="cl-rows">{shown.map(renderRow)}</ul>
        </section>
      ) : (
        sections.map((section) => (
          <section key={section.id} className="cl-section" aria-labelledby={`cl-h-${section.id}`}>
            <h2 id={`cl-h-${section.id}`} className={`cl-heading cl-heading-${section.id}`}>
              {section.title}
            </h2>
            <ul className="cl-rows">{section.rows.map(renderRow)}</ul>
          </section>
        ))
      )}

      <div className="cl-foot">
        {onSeeAll && rows.length > 0 && (
          <button type="button" className="cl-add cl-all" onClick={onSeeAll}>
            {rows.length > shown.length ? `All chores (${rows.length})` : 'All chores'}
          </button>
        )}
        <button type="button" className="cl-add" onClick={onAdd}>
          Add a chore
        </button>
      </div>
    </section>
  )
}
