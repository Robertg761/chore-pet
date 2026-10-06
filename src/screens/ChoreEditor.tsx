import { useId, useRef, useState, type FormEvent } from 'react'
import type { Chore, Schedule, Weekday } from '../domain/types'
import {
  N_MAX,
  N_MIN,
  SCHEDULE_KINDS,
  SHORT_MONTH_LIMIT,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  describeSchedule,
  formFromChore,
  ordinal,
  scheduleFromForm,
  stepN,
  toggleDay,
  validateForm,
  valueFromForm,
  type ChoreFormState,
  type ScheduleKind,
} from './choreForm'
import './ChoreEditor.css'

export interface ChoreEditorProps {
  /** Missing when adding a new chore. */
  chore?: Chore
  onSave: (value: { name: string; schedule: Schedule }) => void
  onDelete?: () => void
  onCancel: () => void
}

type Field = 'name' | 'n' | 'days'

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export function ChoreEditor({ chore, onSave, onDelete, onCancel }: ChoreEditorProps) {
  const uid = useId()
  const [form, setForm] = useState<ChoreFormState>(() => formFromChore(chore))
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const nRef = useRef<HTMLInputElement>(null)
  const daysRef = useRef<HTMLFieldSetElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  const errors = validateForm(form)
  const shown = (f: Field) => (touched[f] || submitted ? errors[f] : undefined)
  const touch = (f: Field) => setTouched((t) => (t[f] ? t : { ...t, [f]: true }))
  const patch = (p: Partial<ChoreFormState>) => setForm((f) => ({ ...f, ...p }))

  const schedule = scheduleFromForm(form)
  const summary = schedule ? describeSchedule(schedule) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const value = valueFromForm(form)
    if (value) {
      onSave(value)
      return
    }
    // Send focus to the first thing that needs fixing.
    if (errors.name) nameRef.current?.focus()
    else if (errors.n) nRef.current?.focus()
    else if (errors.days) daysRef.current?.querySelector('input')?.focus()
  }

  const askDelete = () => {
    setConfirmingDelete(true)
    requestAnimationFrame(() => keepRef.current?.focus())
  }
  const keep = () => {
    setConfirmingDelete(false)
    requestAnimationFrame(() => deleteRef.current?.focus())
  }

  const nameId = `${uid}-name`
  const nameErrId = `${uid}-name-err`
  const nId = `${uid}-n`
  const nErrId = `${uid}-n-err`
  const daysErrId = `${uid}-days-err`
  const domId = `${uid}-dom`
  const domHintId = `${uid}-dom-hint`

  return (
    <form className="editor" onSubmit={submit} noValidate>
      <h1 className="editor-title">{chore ? 'Edit chore' : 'New chore'}</h1>

      <div className="editor-cols">
        <div className="editor-col">
          <div className="editor-field">
            <label htmlFor={nameId}>Name</label>
            <input
              ref={nameRef}
              id={nameId}
              className="editor-input"
              type="text"
              value={form.name}
              placeholder="Wash the dishes"
              autoComplete="off"
              enterKeyHint="done"
              aria-invalid={shown('name') ? true : undefined}
              aria-describedby={shown('name') ? nameErrId : undefined}
              onChange={(e) => patch({ name: e.target.value })}
              onBlur={() => touch('name')}
            />
            {shown('name') && (
              <p className="editor-error" id={nameErrId} role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <fieldset className="editor-group">
            <legend>How often?</legend>
            <div className="editor-kinds">
              {SCHEDULE_KINDS.map(({ kind, label }) => (
                <label key={kind} className="editor-kind">
                  <input
                    type="radio"
                    name={`${uid}-kind`}
                    value={kind}
                    checked={form.kind === kind}
                    onChange={() => patch({ kind: kind as ScheduleKind })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="editor-col">
          {form.kind === 'everyNDays' && (
            <div className="editor-field">
              <label htmlFor={nId}>Every how many days?</label>
              <div className="editor-stepper">
                <button
                  type="button"
                  className="editor-step"
                  aria-label="One day fewer"
                  onClick={() => {
                    patch({ n: stepN(form.n, -1) })
                    touch('n')
                  }}
                >
                  <span aria-hidden="true">-</span>
                </button>
                <input
                  ref={nRef}
                  id={nId}
                  className="editor-input editor-n"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.n}
                  aria-invalid={shown('n') ? true : undefined}
                  aria-describedby={shown('n') ? nErrId : undefined}
                  onChange={(e) => patch({ n: e.target.value })}
                  onBlur={() => touch('n')}
                />
                <button
                  type="button"
                  className="editor-step"
                  aria-label="One day more"
                  onClick={() => {
                    patch({ n: stepN(form.n, 1) })
                    touch('n')
                  }}
                >
                  <span aria-hidden="true">+</span>
                </button>
                <span className="editor-unit" aria-hidden="true">
                  days
                </span>
              </div>
              {!shown('n') && <p className="editor-hint">Pick a number from {N_MIN} to {N_MAX}.</p>}
              {shown('n') && (
                <p className="editor-error" id={nErrId} role="alert">
                  {errors.n}
                </p>
              )}
            </div>
          )}

          {form.kind === 'weekdays' && (
            <fieldset
              ref={daysRef}
              className="editor-group"
              aria-describedby={shown('days') ? daysErrId : undefined}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) touch('days')
              }}
            >
              <legend>Which days?</legend>
              <div className="editor-chips">
                {WEEK_ORDER.map((d: Weekday) => (
                  <label key={d} className="editor-chip">
                    <input
                      type="checkbox"
                      checked={form.days.includes(d)}
                      onChange={() => patch({ days: toggleDay(form.days, d) })}
                    />
                    <span aria-hidden="true">{WEEKDAY_SHORT[d]}</span>
                    <span className="sr-only">{WEEKDAY_LONG[d]}</span>
                  </label>
                ))}
              </div>
              {shown('days') && (
                <p className="editor-error" id={daysErrId} role="alert">
                  {errors.days}
                </p>
              )}
            </fieldset>
          )}

          {form.kind === 'weekly' && (
            <fieldset className="editor-group">
              <legend>Which day?</legend>
              <div className="editor-chips">
                {WEEK_ORDER.map((d: Weekday) => (
                  <label key={d} className="editor-chip">
                    <input
                      type="radio"
                      name={`${uid}-weekday`}
                      checked={form.weekday === d}
                      onChange={() => patch({ weekday: d })}
                    />
                    <span aria-hidden="true">{WEEKDAY_SHORT[d]}</span>
                    <span className="sr-only">{WEEKDAY_LONG[d]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {form.kind === 'monthly' && (
            <div className="editor-field">
              <label htmlFor={domId}>Day of the month</label>
              <select
                id={domId}
                className="editor-input editor-select"
                value={form.dayOfMonth}
                aria-describedby={form.dayOfMonth > SHORT_MONTH_LIMIT ? domHintId : undefined}
                onChange={(e) => patch({ dayOfMonth: Number(e.target.value) })}
              >
                {MONTH_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {ordinal(d)}
                  </option>
                ))}
              </select>
              {form.dayOfMonth > SHORT_MONTH_LIMIT && (
                <p className="editor-hint" id={domHintId}>
                  Shorter months use their last day.
                </p>
              )}
            </div>
          )}

          {summary && (
            <p className="editor-summary" aria-live="polite">
              <span className="editor-summary-label">Repeats</span> {summary}
            </p>
          )}

          <div className="editor-actions">
            <button type="submit" className="editor-save">
              Save
            </button>
            <button type="button" className="editor-cancel" onClick={onCancel}>
              Cancel
            </button>
          </div>

          {onDelete && (
            <div className="editor-danger">
              {confirmingDelete ? (
                <div className="editor-confirm" role="group" aria-label="Delete this chore">
                  <p>Delete this chore? Its history goes too.</p>
                  <div className="editor-confirm-actions">
                    <button type="button" className="editor-delete" onClick={onDelete}>
                      Delete
                    </button>
                    <button ref={keepRef} type="button" className="editor-cancel" onClick={keep}>
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <button ref={deleteRef} type="button" className="link-button editor-delete-link" onClick={askDelete}>
                  Delete chore
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
