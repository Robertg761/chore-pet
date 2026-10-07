import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { PALETTE } from '../art/palette'
import { addDays } from '../domain/dates'
import type { VacationWindow } from '../domain/types'
import { ScreenHeader } from '../shell/ScreenHeader'
import './VacationScreen.css'
import {
  addWindow,
  earliestStart,
  endEarly,
  formatRange,
  formatShortDate,
  removeWindow,
  splitVacations,
  validateRange,
} from './vacationModel'
import type { RangeErrors } from './vacationModel'

export interface VacationScreenProps {
  vacations: VacationWindow[]
  today: string
  onChange: (vacations: VacationWindow[]) => void
  onClose: () => void
}

/** A small hand-drawn suitcase for the empty list. */
function Suitcase() {
  const { ink, fabricBlue, cream, blush, white } = PALETTE
  const line = { stroke: ink, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  return (
    <svg className="vacation-art" viewBox="0 0 64 52" aria-hidden="true" focusable="false">
      <ellipse cx="32" cy="48" rx="22" ry="3" fill={ink} opacity="0.14" />
      <path d="M24 15 V10 a3 3 0 0 1 3 -3 h10 a3 3 0 0 1 3 3 V15" fill="none" {...line} />
      <rect x="8" y="15" width="48" height="30" rx="8" fill={fabricBlue} {...line} />
      <path d="M21 15 V45 M43 15 V45" fill="none" stroke={cream} strokeWidth="5" />
      <path d="M21 15 V45 M43 15 V45" fill="none" {...line} strokeWidth="2" />
      <rect x="28" y="26" width="8" height="7" rx="2.5" fill={white} {...line} strokeWidth="2.5" />
      <circle cx="49" cy="22" r="3" fill={blush} {...line} strokeWidth="2" />
      <path d="M13 21 H17" fill="none" stroke={white} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

export function VacationScreen({ vacations, today, onChange, onClose }: VacationScreenProps) {
  const uid = useId()
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(addDays(today, 7))
  const [errors, setErrors] = useState<RangeErrors>({})
  const [notice, setNotice] = useState('')

  const { current, upcoming, past } = splitVacations(vacations, today)

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = validateRange(start, end, today)
    setErrors(found)
    if (found.start || found.end) {
      setNotice('')
      return
    }
    onChange(addWindow(vacations, { start, end }))
    setNotice(`Trip added: ${formatRange({ start, end }, today)}.`)
    setStart(today)
    setEnd(addDays(today, 7))
  }

  function edit(setter: (v: string) => void, value: string) {
    setter(value)
    if (errors.start || errors.end) setErrors({})
    setNotice('')
  }

  const hintId = `${uid}-hint`
  const startErrId = `${uid}-start-err`
  const endErrId = `${uid}-end-err`

  return (
    <section className="vacation screen-fit" aria-labelledby={`${uid}-title`}>
      <ScreenHeader id={`${uid}-title`} title="Vacation mode" onBack={onClose} />
      <p className="vacation-lede">While you're away, chores pause. Your first day back is free.</p>

      <div className="vacation-body">
        <div className="vacation-main">
          {current && (
            <div className="vacation-card vacation-now">
              <p className="vacation-now-text">You're on vacation until {formatShortDate(current.end, today)}</p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onChange(endEarly(vacations, current, today))
                  setNotice('')
                  setErrors({})
                }}
              >
                I'm back early
              </button>
            </div>
          )}

          <form className="vacation-card vacation-form" onSubmit={submit} noValidate>
            <h2 className="vacation-subtitle">Add a vacation</h2>

            <div className="vacation-fields">
              <div className="vacation-field">
                <label htmlFor={`${uid}-start`}>Start date</label>
                <input
                  id={`${uid}-start`}
                  className="field"
                  type="date"
                  value={start}
                  min={earliestStart(today)}
                  required
                  aria-invalid={errors.start ? true : undefined}
                  aria-describedby={errors.start ? startErrId : hintId}
                  onChange={(e) => edit(setStart, e.target.value)}
                />
                {errors.start && (
                  <p id={startErrId} className="vacation-error">
                    {errors.start}
                  </p>
                )}
              </div>

              <div className="vacation-field">
                <label htmlFor={`${uid}-end`}>End date</label>
                <input
                  id={`${uid}-end`}
                  className="field"
                  type="date"
                  value={end}
                  min={start || today}
                  required
                  aria-invalid={errors.end ? true : undefined}
                  aria-describedby={errors.end ? endErrId : undefined}
                  onChange={(e) => edit(setEnd, e.target.value)}
                />
                {errors.end && (
                  <p id={endErrId} className="vacation-error">
                    {errors.end}
                  </p>
                )}
              </div>
            </div>

            {!errors.start && (
              <p id={hintId} className="vacation-hint">
                Pick a date up to 2 weeks back, or one coming up.
              </p>
            )}

            <button type="submit" className="btn btn-primary">
              Add vacation
            </button>
            <p className="vacation-notice" role="status">
              {notice}
            </p>
          </form>
        </div>

        <div className="vacation-side">
          <div className="vacation-group">
            <h2 className="vacation-subtitle">Upcoming trips</h2>
            {upcoming.length === 0 ? (
              <div className="vacation-empty">
                <Suitcase />
                <p>No trips planned.</p>
              </div>
            ) : (
              <ul className="vacation-list">
                {upcoming.map((w) => {
                  const label = formatRange(w, today)
                  return (
                    <li key={`${w.start}_${w.end}`} className="vacation-item">
                      <span className="vacation-dates">{label}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-quiet btn-danger"
                        aria-label={`Remove trip ${label}`}
                        onClick={() => onChange(removeWindow(vacations, w))}
                      >
                        Remove
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {past.length > 0 && (
            <details className="vacation-past">
              <summary>Past trips ({past.length})</summary>
              <ul className="vacation-list">
                {past.map((w) => {
                  const label = formatRange(w, today)
                  return (
                    <li key={`${w.start}_${w.end}`} className="vacation-item vacation-item-past">
                      <span className="vacation-dates">{label}</span>
                      {/* A recent trip can still be taken back out, in case the dates were wrong. */}
                      {w.end >= earliestStart(today) && (
                        <button type="button" className="btn btn-sm btn-quiet btn-danger" aria-label={`Remove trip ${label}`} onClick={() => onChange(removeWindow(vacations, w))}>
                          Remove
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </details>
          )}
        </div>
      </div>
    </section>
  )
}
