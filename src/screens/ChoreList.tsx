import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { withViewTransition } from '../shell/viewTransition'
import type { Chore, Completion, VacationWindow } from '../domain/types'
import { allCaughtUp, buildSections, nextUpcoming, onVacation, shortRows, whenPhrase, type ChoreRow } from './choreListModel'
import { PencilIcon } from '../shell/PencilIcon'
import './ChoreList.css'

export interface ChoreListProps {
  chores: Chore[]
  completions: Completion[]
  vacations: VacationWindow[]
  today: string
  onComplete: (chore: Chore) => void
  onEdit: (chore: Chore) => void
  onAdd: () => void
  /** Opens the chores screen (edit, remove several, add back removed ones). Shown on the full list. */
  onManage?: () => void
  /**
   * Show only the first few rows (late, then today, then coming up) under one
   * "Up next" heading, with a button to see them all. Leave unset for the full list.
   */
  limit?: number
  onSeeAll?: () => void
  /** Shown in place of the buttons under the list while set: the home screen's undo toast, so it covers nothing. */
  footer?: ReactNode
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

/** A small hand-drawn flourish for the all-done card: two stars and a dot, in the same thick outline as the rest. */
function Sparkles() {
  return (
    <svg className="cl-sparkles" viewBox="0 0 64 56" width="56" height="49" aria-hidden="true" focusable="false">
      <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="3" stroke="#2b1e2f">
        <path d="M24 6c1.6 10 5.4 14 16 16-10.600 2-14.400 6-16 16-1.600-10-5.400-14-16-16 10.600-2 14.400-6 16-16z" fill="#FFD65C" />
        <path d="M48 30c1 6.200 3.400 8.600 10 10-6.600 1.400-9 3.800-10 10-1-6.200-3.400-8.600-10-10 6.600-1.400 9-3.800 10-10z" fill="#F28FA0" />
        <circle cx="9" cy="40" r="3.200" fill="#fff" />
      </g>
    </svg>
  )
}

/** A row has something to tap unless it's an upcoming chore that's already covered. */
const hasAction = (row: ChoreRow) => !row.allSet

/** How long after a completion to keep trying to put focus back where it was lost. */
const REFOCUS_MS = 3000

export function ChoreList({ chores, completions, vacations, today, onComplete, onEdit, onAdd, onManage, limit, onSeeAll, footer }: ChoreListProps) {
  const sections = buildSections(chores, completions, vacations, today)
  const away = onVacation(today, vacations)
  const short = limit !== undefined
  const caughtUp = allCaughtUp(sections)
  const uid = useId()
  const rootRef = useRef<HTMLElement>(null)
  const rows = sections.flatMap((s) => s.rows)
  const shown = short ? shortRows(sections).slice(0, limit) : rows
  const shownRef = useRef<ChoreRow[]>(shown)
  const shortRef = useRef(short)
  useEffect(() => {
    shownRef.current = shown
    shortRef.current = short
  })

  // Chores that were just tapped: they show a check for a moment, then complete.
  const [finishing, setFinishing] = useState<ReadonlySet<string>>(new Set())
  const timers = useRef(new Map<string, { timer: number; chore: Chore }>())
  const refocus = useRef<{ next: string | null; until: number } | null>(null)
  const completeRef = useRef(onComplete)
  useEffect(() => {
    completeRef.current = onComplete
  })

  const finish = useCallback((chore: Chore) => {
    if (timers.current.has(chore.id)) return
    // A light tick under the thumb, where the phone can.
    navigator.vibrate?.(12)
    setFinishing((prev) => new Set(prev).add(chore.id))
    const timer = window.setTimeout(() => {
      timers.current.delete(chore.id)
      // Once the row moves away, focus goes to the next row's button (or the heading) rather than the page.
      const list = shownRef.current
      const at = list.findIndex((r) => r.chore.id === chore.id)
      const next = list.slice(at + 1).find((r) => hasAction(r) && !timers.current.has(r.chore.id))
      refocus.current = { next: next?.chore.id ?? null, until: Date.now() + REFOCUS_MS }
      const complete = () => {
        setFinishing((prev) => {
          const next = new Set(prev)
          next.delete(chore.id)
          return next
        })
        completeRef.current(chore)
      }
      // On the home screen the row folds away and the rest glide into place (rows and room
      // carry view-transition names while it runs; see ChoreList.css). The full list just updates.
      if (shortRef.current) withViewTransition(complete, 'chores')
      else complete()
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

  // After a chore completes its row moves away; if that took focus with it, put focus somewhere useful.
  useEffect(() => {
    const pending = refocus.current
    const root = rootRef.current
    if (!pending || !root) return
    if (Date.now() > pending.until) {
      refocus.current = null
      return
    }
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected) return
    refocus.current = null
    const target =
      (pending.next && root.querySelector<HTMLElement>(`[data-chore-action="${CSS.escape(pending.next)}"]`)) ||
      root.querySelector<HTMLElement>('[data-cl-fallback]')
    target?.focus({ preventScroll: true })
  })

  const renderRow = (row: ChoreRow) => {
    const { chore, status, label } = row
    const early = status.state === 'upcoming'
    const justDone = finishing.has(chore.id)
    return (
      <li key={chore.id} className={`cl-row cl-row-${status.state}${status.neglect ? ` cl-row-late${status.neglect}` : ''}${justDone ? ' cl-row-done' : ''}${row.doneToday ? ' cl-row-doneToday' : ''}`}
        style={{ '--cl-vt': `cl-${chore.id.replace(/[^\w-]/g, '_')}` } as CSSProperties}
        // Ticked but not saved until the feedback ends: an app update must not reload over it.
        data-unsaved={justDone || undefined}
      >
        <div className="cl-info">
          <button type="button" className="cl-name" aria-label={`Edit ${chore.name}`} title="Edit chore" onClick={() => onEdit(chore)}>
            <span className="cl-name-text">{chore.name}</span>
            {/* A pencil after the name, so it reads as tappable: tap to change or remove the chore. */}
            <PencilIcon className="cl-pencil" size={16} />
          </button>
          <span className={`tag tag-${status.state}${status.neglect ? ` tag-late${status.neglect}` : ''}`}>{label}</span>
        </div>
        {!hasAction(row) && !justDone ? (
          // Already done for this round: doing it again wouldn't count, so there's nothing to tap.
          <span className={`cl-action cl-done-mark cl-set${row.skippedToday ? ' cl-skipped' : ''}`}>
            {/* A skip isn't a completion, so it gets no check. */}
            {!row.skippedToday && <CheckIcon />}
            <span>{row.skippedToday ? 'Skipped' : row.doneToday ? 'Done' : 'All set'}</span>
          </span>
        ) : (
          // One button for every state, so focus stays put while the check shows.
          <button
            type="button"
            className={`cl-action ${justDone ? 'cl-done-mark cl-nice' : early ? 'cl-early' : 'cl-done'}`}
            data-chore-action={chore.id}
            aria-disabled={justDone ? 'true' : undefined}
            aria-label={justDone ? `Nice, ${chore.name} is done` : early ? `Do it early: ${chore.name}` : `Done: ${chore.name}`}
            onClick={() => !justDone && finish(chore)}
          >
            {justDone ? (
              <>
                <CheckIcon />
                <span>Nice</span>
              </>
            ) : early ? (
              'Do it early'
            ) : (
              'Done'
            )}
          </button>
        )}
        <span className="sr-only" role="status">
          {justDone ? `Nice, ${chore.name} is done` : ''}
        </span>
      </li>
    )
  }

  const next = nextUpcoming(sections)

  return (
    <section ref={rootRef} className={short ? 'cl cl-short' : 'cl'} aria-label="Chores">
      {away && (
        <p className="cl-banner" role="status">
          On vacation. Chores are paused.
        </p>
      )}

      {chores.length === 0 ? (
        <p className="cl-empty">No chores yet. Add one and your pet will cheer you on.</p>
      ) : short && caughtUp ? (
        <section className="cl-caught" aria-labelledby={`${uid}-caught`}>
          <Sparkles />
          <div className="cl-caught-text">
            <h2 id={`${uid}-caught`} className="cl-caught-title" tabIndex={-1} data-cl-fallback>
              {away ? 'Nothing due right now' : 'All done for today!'}
            </h2>
            {next && (
              <p className="cl-caught-next">
                Next: {next.chore.name}, {whenPhrase(next.label)}
              </p>
            )}
          </div>
        </section>
      ) : short ? (
        <section className="cl-section" aria-labelledby={`${uid}-next`}>
          <h2 id={`${uid}-next`} className="cl-heading" tabIndex={-1} data-cl-fallback>
            Up next
          </h2>
          <ul className="cl-rows">{shown.map(renderRow)}</ul>
        </section>
      ) : (
        sections.map((section, i) => (
          <section key={section.id} className="cl-section" aria-labelledby={`${uid}-${section.id}`}>
            <h2 id={`${uid}-${section.id}`} className={`cl-heading cl-heading-${section.id}`} tabIndex={-1} data-cl-fallback={i === 0 ? '' : undefined}>
              {section.title}
            </h2>
            <ul className="cl-rows">{section.rows.map(renderRow)}</ul>
          </section>
        ))
      )}

      {footer ? <div className="cl-foot cl-foot-toast">{footer}</div> : <div className="cl-foot">
        {onSeeAll && rows.length > 0 && (
          <button type="button" className="cl-add cl-all" onClick={onSeeAll}>
            All<span className="cl-all-extra"> chores</span>
            {rows.length > shown.length ? ` (${rows.length})` : ''}
          </button>
        )}
        {onManage && (
          <button type="button" className="cl-add" onClick={onManage}>
            Manage
          </button>
        )}
        <button type="button" className="cl-add" onClick={onAdd}>
          Add a chore
        </button>
      </div>}
    </section>
  )
}
