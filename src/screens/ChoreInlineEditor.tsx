import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Chore, Schedule, Weekday } from '../domain/types'
import {
  N_MAX,
  N_MIN,
  NAME_MAX,
  SCHEDULE_KINDS,
  SHORT_MONTH_LIMIT,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  describeSchedule,
  ordinal,
  scheduleFromForm,
  stepN,
  toggleDay,
  validateForm,
  valueFromForm,
  type ScheduleKind,
} from './choreForm'
import { useChoreDraft } from './choreDrafts'
import { CharCounter } from './CharCounter'
import '../shell/controls.css'

// A compact chore form for the object sheet. The full-page ChoreEditor has its
// own title, delete flow and big cards, so it doesn't fit inside a card.
// All rules come from choreForm.ts.

export interface ChoreInlineEditorProps {
  /** Missing when adding a new chore. */
  chore?: Chore
  onSave: (value: { name: string; schedule: Schedule }) => void
  onCancel: () => void
  draftKey?: string
}

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export function ChoreInlineEditor({ chore, onSave, onCancel, draftKey }: ChoreInlineEditorProps) {
  const uid = useId()
  const { form, patch, clear } = useChoreDraft(chore, draftKey)
  const [submitted, setSubmitted] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const nRef = useRef<HTMLInputElement>(null)
  const daysRef = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const errors = validateForm(form)
  const schedule = scheduleFromForm(form)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const value = valueFromForm(form)
    if (value) { clear(); return onSave(value) }
    if (errors.name) nameRef.current?.focus()
    else if (errors.n) nRef.current?.focus()
    else if (errors.days) daysRef.current?.querySelector('input')?.focus()
  }

  const nameId = `${uid}-name`
  const kindId = `${uid}-kind`
  const nId = `${uid}-n`
  const domId = `${uid}-dom`
  const err = (k: 'name' | 'n' | 'days') => (submitted ? errors[k] : undefined)

  return (
    <form className="ce" onSubmit={submit} noValidate aria-label={chore ? 'Edit chore' : 'Add a chore'}>
      <div className="ce-field">
        <div className="ce-label-row">
          <label htmlFor={nameId}>Name</label>
          <CharCounter value={form.name} max={NAME_MAX} />
        </div>
        <input
          ref={nameRef}
          id={nameId}
          className="field ce-input"
          type="text"
          value={form.name}
          maxLength={NAME_MAX}
          placeholder="Wipe the counter"
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={err('name') ? true : undefined}
          aria-describedby={err('name') ? `${nameId}-err` : undefined}
          onChange={(e) => patch({ name: e.target.value })}
        />
        {err('name') && (
          <p className="ce-error" id={`${nameId}-err`} role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="ce-field">
        <label htmlFor={kindId}>How often?</label>
        <select
          id={kindId}
          className="field ce-input"
          value={form.kind}
          onChange={(e) => patch({ kind: e.target.value as ScheduleKind })}
        >
          {SCHEDULE_KINDS.map(({ kind, label }) => (
            <option key={kind} value={kind}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {form.kind === 'everyNDays' && (
        <div className="ce-field">
          <label htmlFor={nId}>Every how many days?</label>
          <div className="ce-stepper">
            <button type="button" className="btn ce-step" aria-label="One day fewer" onClick={() => patch({ n: stepN(form.n, -1) })}>
              <span aria-hidden="true">-</span>
            </button>
            <input
              ref={nRef}
              id={nId}
              className="field ce-input ce-n"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={form.n}
              aria-invalid={err('n') ? true : undefined}
              aria-describedby={err('n') ? `${nId}-err` : undefined}
              onChange={(e) => patch({ n: e.target.value })}
            />
            <button type="button" className="btn ce-step" aria-label="One day more" onClick={() => patch({ n: stepN(form.n, 1) })}>
              <span aria-hidden="true">+</span>
            </button>
            <span className="ce-unit" aria-hidden="true">
              days
            </span>
          </div>
          {err('n') ? (
            <p className="ce-error" id={`${nId}-err`} role="alert">
              {errors.n}
            </p>
          ) : (
            <p className="ce-hint">
              Pick a number from {N_MIN} to {N_MAX}.
            </p>
          )}
        </div>
      )}

      {(form.kind === 'weekdays' || form.kind === 'weekly') && (
        <fieldset ref={daysRef} className="ce-group" aria-describedby={err('days') ? `${uid}-days-err` : undefined}>
          <legend>{form.kind === 'weekdays' ? 'Which days?' : 'Which day?'}</legend>
          <div className="ce-chips">
            {WEEK_ORDER.map((d: Weekday) => (
              <label key={d} className="ce-chip">
                {form.kind === 'weekdays' ? (
                  <input type="checkbox" checked={form.days.includes(d)} onChange={() => patch({ days: toggleDay(form.days, d) })} />
                ) : (
                  <input type="radio" name={`${uid}-weekday`} checked={form.weekday === d} onChange={() => patch({ weekday: d })} />
                )}
                <span aria-hidden="true">{WEEKDAY_SHORT[d]}</span>
                <span className="sr-only">{WEEKDAY_LONG[d]}</span>
              </label>
            ))}
          </div>
          {err('days') && (
            <p className="ce-error" id={`${uid}-days-err`} role="alert">
              {errors.days}
            </p>
          )}
        </fieldset>
      )}

      {form.kind === 'monthly' && (
        <div className="ce-field">
          <label htmlFor={domId}>Day of the month</label>
          <select id={domId} className="field ce-input" value={form.dayOfMonth} onChange={(e) => patch({ dayOfMonth: Number(e.target.value) })}>
            {MONTH_DAYS.map((d) => (
              <option key={d} value={d}>
                {ordinal(d)}
              </option>
            ))}
          </select>
          {form.dayOfMonth > SHORT_MONTH_LIMIT && <p className="ce-hint">Shorter months use their last day.</p>}
        </div>
      )}

      {schedule && (
        <p className="ce-summary" aria-live="polite">
          {describeSchedule(schedule)}
        </p>
      )}

      <div className="ce-actions">
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        <button type="button" className="btn" onClick={() => { clear(); onCancel() }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
