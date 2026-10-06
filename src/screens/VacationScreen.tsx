import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { addDays } from '../domain/dates'
import type { VacationWindow } from '../domain/types'
import './VacationScreen.css'
import {
  addWindow,
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

  const startErrId = `${uid}-start-err`
  const endErrId = `${uid}-end-err`

  return (
    <section className="vacation" aria-labelledby={`${uid}-title`}>
      <button type="button" className="link-button vacation-back" onClick={onClose}>
        Back
      </button>

      <h2 id={`${uid}-title`} className="vacation-title">
        Vacation mode
      </h2>
      <p className="vacation-lede">While you're away, chores pause and your pet won't get sick.</p>

      {current && (
        <div className="vacation-card vacation-now">
          <p className="vacation-now-text">You're on vacation until {formatShortDate(current.end, today)}</p>
          <button
            type="button"
            className="vacation-btn"
            onClick={() => onChange(endEarly(vacations, current, today))}
          >
            I'm back early
          </button>
        </div>
      )}

      <form className="vacation-card vacation-form" onSubmit={submit} noValidate>
        <h3 className="vacation-subtitle">Add a vacation</h3>

        <div className="vacation-field">
          <label htmlFor={`${uid}-start`}>Start date</label>
          <input
            id={`${uid}-start`}
            type="date"
            value={start}
            min={today}
            required
            aria-invalid={errors.start ? true : undefined}
            aria-describedby={errors.start ? startErrId : undefined}
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

        <button type="submit" className="vacation-btn">
          Add vacation
        </button>
        <p className="vacation-notice" role="status">
          {notice}
        </p>
      </form>

      <div className="vacation-group">
        <h3 className="vacation-subtitle">Upcoming trips</h3>
        {upcoming.length === 0 ? (
          <p className="vacation-empty">No trips planned.</p>
        ) : (
          <ul className="vacation-list">
            {upcoming.map((w) => {
              const label = formatRange(w, today)
              return (
                <li key={`${w.start}_${w.end}`} className="vacation-item">
                  <span className="vacation-dates">{label}</span>
                  <button
                    type="button"
                    className="vacation-btn vacation-btn-quiet"
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
            {past.map((w) => (
              <li key={`${w.start}_${w.end}`} className="vacation-item vacation-item-past">
                <span className="vacation-dates">{formatRange(w, today)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
