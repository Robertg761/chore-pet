import { useId, useRef, useState, type FormEvent } from 'react'
import type { Chore, Weekday } from '../domain/types'
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
  resolveObjectId,
  scheduleFromForm,
  stepN,
  toggleDay,
  validateForm,
  valueFromForm,
  type ChorePlace,
  type ChoreValue,
  type ScheduleKind,
} from './choreForm'
import { useChoreDraft } from './choreDrafts'
import { ScreenHeader } from '../shell/ScreenHeader'
import { CharCounter } from './CharCounter'
import './ChoreEditor.css'

export interface ChoreEditorProps {
  /** Missing when adding a new chore. */
  chore?: Chore
  /** The placed objects in the room, already labelled ("Sink", "Rug 2"). Empty hides the "Where is it?" field. */
  places?: ChorePlace[]
  /** objectId is always set: an id, or null for "nowhere in particular". */
  onSave: (value: ChoreValue) => void
  onDelete?: () => void
  /** "Skip this time": shown while the chore's round is owed (due or late). */
  onSkip?: () => void
  /** Take back today's skip: shown once the chore was skipped today. */
  onUnskip?: () => void
  onCancel: () => void
}

type Field = 'name' | 'n' | 'days'

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export function ChoreEditor({ chore, places = [], onSave, onDelete, onSkip, onUnskip, onCancel }: ChoreEditorProps) {
  const uid = useId()
  const { form, patch, clear } = useChoreDraft(chore)
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

  const schedule = scheduleFromForm(form)
  const summary = schedule ? describeSchedule(schedule) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const value = valueFromForm(form, places)
    if (value) {
      clear()
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
  const nHintId = `${uid}-n-hint`
  const daysErrId = `${uid}-days-err`
  const domId = `${uid}-dom`
  const domHintId = `${uid}-dom-hint`
  const whereId = `${uid}-where`
  const whereHintId = `${uid}-where-hint`
  const where = resolveObjectId(form.objectId, places)

  return (
    <form
      className="editor"
      onSubmit={submit}
      aria-labelledby={`${uid}-title`}
      noValidate
      // Escape backs out like Cancel (the delete question first, if it's open).
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return
        e.preventDefault()
        if (confirmingDelete) keep()
        else { clear(); onCancel() }
      }}
    >
      <ScreenHeader
        id={`${uid}-title`}
        title={chore ? 'Edit chore' : 'New chore'}
        onBack={() => { clear(); onCancel() }}
        backLabel="Cancel"
        actions={
          onDelete &&
          !confirmingDelete && (
            <button ref={deleteRef} type="button" className="btn btn-quiet btn-danger editor-trash" onClick={askDelete}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="editor-trash-text">Delete chore</span>
            </button>
          )
        }
      />

      <div className="editor-cols">
        <div className="editor-col">
          <div className="editor-field">
            <div className="editor-label-row">
              <label htmlFor={nameId}>Name</label>
              <CharCounter value={form.name} max={NAME_MAX} />
            </div>
            <input
              ref={nameRef}
              id={nameId}
              className="field editor-input"
              type="text"
              value={form.name}
              maxLength={NAME_MAX}
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
                    className="check check-radio"
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
                  className="btn editor-step"
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
                  className="field editor-input editor-n"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.n}
                  aria-invalid={shown('n') ? true : undefined}
                  aria-describedby={shown('n') ? nErrId : nHintId}
                  onChange={(e) => patch({ n: e.target.value })}
                  onBlur={() => touch('n')}
                />
                <button
                  type="button"
                  className="btn editor-step"
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
              {!shown('n') && <p className="editor-hint editor-hint-n" id={nHintId}>Pick a number from {N_MIN} to {N_MAX}.</p>}
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
                className="field editor-input editor-select"
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
              {summary}
            </p>
          )}

          {places.length > 0 && (
            <div className="editor-field editor-where">
              <label htmlFor={whereId}>Where is it?</label>
              <select
                id={whereId}
                className="field editor-input editor-select"
                value={where ?? ''}
                aria-describedby={whereHintId}
                onChange={(e) => patch({ objectId: e.target.value || null })}
              >
                <option value="">Nowhere in particular</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="editor-hint" id={whereHintId}>
                Late chores show as mess on this.
              </p>
            </div>
          )}

          <div className={onSkip || onUnskip ? 'editor-actions editor-actions-skip' : 'editor-actions'}>
            <button type="submit" className="btn btn-primary editor-save">
              Save
            </button>
            {/* Not needed this round (no laundry, ate out): it settles the round without counting as done.
                Unsaved edits stay as a draft, so nothing typed is lost. */}
            {onSkip ? (
              <button type="button" className="btn editor-skip" onClick={onSkip}>
                Skip this time
              </button>
            ) : onUnskip ? (
              <button type="button" className="btn editor-skip" onClick={onUnskip}>
                Undo skip
              </button>
            ) : null}
          </div>

          {onDelete && confirmingDelete && (
            <div className="editor-danger">
              <div className="editor-confirm" role="group" aria-label="Delete this chore">
                <p>Remove this chore? Your past work and rewards stay.</p>
                <div className="editor-confirm-actions">
                  <button type="button" className="btn btn-danger" onClick={() => { clear(); onDelete?.() }}>
                    Delete
                  </button>
                  <button ref={keepRef} type="button" className="btn" onClick={keep}>
                    Keep it
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
