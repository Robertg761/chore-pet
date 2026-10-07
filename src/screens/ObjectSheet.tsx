import { useEffect, useId, useRef, useState } from 'react'
import type { CatalogEntry } from '../catalog/types'
import type { Chore, Completion, PlacedObject, Schedule, VacationWindow } from '../domain/types'
import { dueText } from './buildModel'
import { describeSchedule } from './choreForm'
import { ChoreInlineEditor } from './ChoreInlineEditor'
import { ObjectThumb } from './ObjectThumb'
import '../shell/controls.css'
import './ObjectSheet.css'

export interface ObjectSheetProps {
  object: PlacedObject
  entry: CatalogEntry
  /** This object's chores. */
  chores: Chore[]
  completions: Completion[]
  vacations: VacationWindow[]
  today: string
  /** False when turning it wouldn't fit. */
  canTurn: boolean
  /** `chore` is null for a new custom chore on this object. */
  onSaveChore: (chore: Chore | null, value: { name: string; schedule: Schedule }) => void
  onRemoveChore: (chore: Chore) => void
  onTurn: () => void
  /** Takes the object out of the room. `keepChores` leaves its chores in the list, no longer tied to a place. */
  onRemove: (keepChores: boolean) => void
  onClose: () => void
}

/** A fresh state per selected object, so an open editor never follows you to another object. */
export function ObjectSheet(props: ObjectSheetProps) {
  return <Sheet key={props.object.id} {...props} />
}

type Editing = null | 'new' | string
type Focusable = HTMLElement | null

function Sheet({
  object,
  entry,
  chores,
  completions,
  vacations,
  today,
  canTurn,
  onSaveChore,
  onRemoveChore,
  onTurn,
  onRemove,
  onClose,
}: ObjectSheetProps) {
  const uid = useId()
  const [editing, setEditing] = useState<Editing>(null)
  const [removingChore, setRemovingChore] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const rowRefs = useRef(new Map<string, Focusable>())
  const addRef = useRef<HTMLButtonElement>(null)
  const removeRef = useRef<HTMLButtonElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)
  const keepChoreRef = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef<(() => Focusable) | null>(null)

  // Put focus somewhere sensible after the screen reshapes itself.
  useEffect(() => {
    const next = pendingFocus.current
    if (!next) return
    pendingFocus.current = null
    next()?.focus()
  })

  const lowerName = entry.name.toLowerCase()
  const closeEditor = (focusId: string | 'new') => {
    pendingFocus.current = () => (focusId === 'new' ? addRef.current : (rowRefs.current.get(focusId) ?? addRef.current))
    setEditing(null)
  }

  return (
    <section className="sheet" aria-labelledby={`${uid}-title`}>
      <header className="sheet-head">
        <ObjectThumb entry={entry} className="sheet-art" />
        <h2 className="sheet-title" id={`${uid}-title`}>
          {entry.name}
        </h2>
        <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <p className="sheet-hint">Drag it in the room to move it.</p>

      <div className="sheet-block">
        <h3 className="sheet-subheading">Chores it brings</h3>
        {chores.length === 0 && editing !== 'new' && <p className="sheet-empty">No chores yet. Add one if you like.</p>}
        <ul className="sheet-chores">
          {chores.map((chore) => {
            if (editing === chore.id) {
              return (
                <li key={chore.id} className="sheet-chore sheet-chore-editing">
                  <ChoreInlineEditor
                    draftKey={`object:${object.id}`}
                    chore={chore}
                    onSave={(value) => {
                      onSaveChore(chore, value)
                      closeEditor(chore.id)
                    }}
                    onCancel={() => closeEditor(chore.id)}
                  />
                </li>
              )
            }
            const due = dueText(chore, completions, today, vacations)
            if (removingChore === chore.id) {
              return (
                <li key={chore.id} className="sheet-chore sheet-confirm" role="group" aria-label={`Remove ${chore.name}`}>
                  <p>Remove “{chore.name}”? Rewards you earned stay.</p>
                  <div className="sheet-pair">
                    <button
                      type="button"
                      className="btn btn-danger os-btn"
                      onClick={() => {
                        pendingFocus.current = () => addRef.current
                        setRemovingChore(null)
                        onRemoveChore(chore)
                      }}
                    >
                      Remove
                    </button>
                    <button
                      ref={keepChoreRef}
                      type="button"
                      className="btn os-btn"
                      onClick={() => {
                        pendingFocus.current = () => rowRefs.current.get(`${chore.id}:remove`) ?? null
                        setRemovingChore(null)
                      }}
                    >
                      Keep it
                    </button>
                  </div>
                </li>
              )
            }
            return (
              <li key={chore.id} className="sheet-chore">
                <button
                  type="button"
                  className="sheet-chore-main"
                  ref={(el) => void rowRefs.current.set(chore.id, el)}
                  onClick={() => {
                    setRemovingChore(null)
                    setEditing(chore.id)
                  }}
                >
                  <span className="sheet-chore-name">
                    <span className="sr-only">Edit </span>
                    {chore.name}
                  </span>
                  <span className="sheet-chore-when">{describeSchedule(chore.schedule)}</span>
                  <span className={`sheet-chore-due${due.late ? ' is-late' : ''}`}>{due.text}</span>
                </button>
                <button
                  type="button"
                  className="sheet-chore-remove"
                  ref={(el) => void rowRefs.current.set(`${chore.id}:remove`, el)}
                  aria-label={`Remove ${chore.name}`}
                  onClick={() => {
                    pendingFocus.current = () => keepChoreRef.current
                    setRemovingChore(chore.id)
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                    <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            )
          })}
          {editing === 'new' && (
            <li className="sheet-chore sheet-chore-editing">
              <ChoreInlineEditor
                draftKey={`object:${object.id}`}
                onSave={(value) => {
                  onSaveChore(null, value)
                  closeEditor('new')
                }}
                onCancel={() => closeEditor('new')}
              />
            </li>
          )}
        </ul>
        {editing !== 'new' && (
          <button
            ref={addRef}
            type="button"
            className="btn os-btn sheet-add"
            onClick={() => {
              setRemovingChore(null)
              setEditing('new')
            }}
          >
            Add a chore
          </button>
        )}
      </div>

      <div className="sheet-block">
        {removing ? (
          <div className="sheet-confirm" role="group" aria-label={`Remove ${lowerName} from room`}>
            <p>{chores.length > 0 ? `Remove the ${lowerName}? Its chores go too. Rewards stay.` : `Remove the ${lowerName}? Rewards stay.`}</p>
            <div className="sheet-choices">
              <button type="button" className="btn btn-danger os-btn" onClick={() => onRemove(false)}>
                {chores.length > 0 ? 'Remove with its chores' : 'Remove'}
              </button>
              {chores.length > 0 && (
                <button type="button" className="btn os-btn" onClick={() => onRemove(true)}>
                  Keep its chores
                </button>
              )}
              <button
                ref={keepRef}
                type="button"
                className="btn btn-quiet os-btn sheet-cancel"
                onClick={() => {
                  pendingFocus.current = () => removeRef.current
                  setRemoving(false)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="sheet-pair">
            <button type="button" className="btn os-btn" onClick={onTurn} disabled={!canTurn} aria-describedby={canTurn ? undefined : `${uid}-turn-hint`}>
              Turn
            </button>
            <button
              ref={removeRef}
              type="button"
              className="btn btn-danger os-btn"
              onClick={() => {
                pendingFocus.current = () => keepRef.current
                setRemoving(true)
              }}
            >
              Remove
            </button>
          </div>
        )}
        {!canTurn && !removing && (
          <p className="sheet-hint" id={`${uid}-turn-hint`}>
            There isn’t room to turn it here.
          </p>
        )}
      </div>
    </section>
  )
}
