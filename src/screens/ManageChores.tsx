import { useEffect, useId, useRef, useState } from 'react'
import type { Chore, ISODate, PlacedObject } from '../domain/types'
import { PencilIcon } from '../shell/PencilIcon'
import { ScreenHeader } from '../shell/ScreenHeader'
import { shortDate } from './choreListModel'
import { describeSchedule } from './choreForm'
import { choreGroups, pastChores } from './manageModel'
import './ManageChores.css'

// Every chore in one place, grouped by where it lives: edit one, remove a few
// at once, or add back one that was removed before.

export interface ManageChoresProps {
  chores: Chore[]
  /** The objects in the home, in the rooms' order. */
  objects: PlacedObject[]
  /** Each object's name ("Sink, Kitchen" once there are several rooms). */
  places?: { id: string; name: string }[]
  today: ISODate
  onEdit: (chore: Chore) => void
  onAdd: () => void
  /** Retires these chores; past work and rewards stay. */
  onRemove: (chores: Chore[]) => void
  onAddAgain: (chore: Chore) => void
  onClose: () => void
}

const plural = (n: number) => (n === 1 ? '1 chore' : `${n} chores`)

export function ManageChores({ chores, objects, places, today, onEdit, onAdd, onRemove, onAddAgain, onClose }: ManageChoresProps) {
  const uid = useId()
  const groups = choreGroups(chores, objects, today, places)
  const past = pastChores(chores, today)
  const listed = groups.flatMap((g) => g.chores)
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [notice, setNotice] = useState('')
  const keepRef = useRef<HTMLButtonElement>(null)
  const removeRef = useRef<HTMLButtonElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  // Only chores still on the list count (one may be removed on another device meanwhile).
  const selected = listed.filter((c) => picked.has(c.id))
  // The question is about the picks it was asked with: nothing picked any more, nothing to ask.
  if (confirming && selected.length === 0) setConfirming(false)

  useEffect(() => {
    if (confirming) keepRef.current?.focus()
  }, [confirming])

  // Changing the picks while asking goes back a step, so Remove always follows "Remove N chores".
  const toggle = (id: string) => (setConfirming(false), setPicked((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }))
  const remove = () => {
    onRemove(selected)
    setNotice(`Removed ${plural(selected.length)}.`)
    setPicked(new Set())
    setConfirming(false)
    // The rows and the question are gone; land on the button that takes their place.
    requestAnimationFrame(() => addRef.current?.focus())
  }
  const keep = () => {
    setConfirming(false)
    // The button that asked is back once the question closes.
    requestAnimationFrame(() => removeRef.current?.focus())
  }

  return (
    <section className="manage screen-fit" aria-labelledby={`${uid}-title`}>
      <ScreenHeader id={`${uid}-title`} title="Chores" onBack={onClose} />

      <div className="manage-body">
        <div className="manage-col">
          {groups.length === 0 ? (
            <p className="manage-empty">No chores yet. Add one, or place things in Build and they bring their own.</p>
          ) : (
            groups.map((group) => (
              <section key={group.id} className="manage-group" aria-labelledby={`${uid}-${group.id}`}>
                <h2 id={`${uid}-${group.id}`} className="manage-heading">{group.title}</h2>
                <ul className="manage-list">
                  {group.chores.map((chore) => (
                    <li key={chore.id} className={picked.has(chore.id) ? 'manage-row manage-row-picked' : 'manage-row'}>
                      <label className="manage-pick">
                        <input type="checkbox" className="check" checked={picked.has(chore.id)} onChange={() => toggle(chore.id)} />
                        <span className="manage-text">
                          <span className="manage-name">{chore.name}</span>
                          <span className="manage-when">
                            {describeSchedule(chore.schedule)}
                            {/* Added back with its round already done, or dated ahead: it joins the list on this day. */}
                            {chore.createdOn > today && `, from ${shortDate(chore.createdOn)}`}
                          </span>
                        </span>
                      </label>
                      <button type="button" className="btn btn-quiet manage-edit" aria-label={`Edit ${chore.name}`} title="Edit chore" onClick={() => onEdit(chore)}>
                        <PencilIcon />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {past.length > 0 && (
          <div className="manage-col">
            <section className="manage-group manage-past" aria-labelledby={`${uid}-past`}>
              <h2 id={`${uid}-past`} className="manage-heading">Removed chores</h2>
              <p className="manage-hint">Add one back to put it on the list again.</p>
              <ul className="manage-list">
                {past.map((chore) => (
                  <li key={chore.id} className="manage-row manage-row-past">
                    <span className="manage-text">
                      <span className="manage-name">{chore.name}</span>
                      <span className="manage-when">{describeSchedule(chore.schedule)}</span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label={`Add ${chore.name} again`}
                      onClick={() => (onAddAgain(chore), setNotice(`Added ${chore.name} again.`))}
                    >
                      Add again
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>

      <p className="sr-only" role="status">{notice}</p>

      <div className="manage-foot">
        {confirming ? (
          <div className="confirm manage-confirm" role="group" aria-label="Remove chores">
            <p>Remove {plural(selected.length)}? Your past work and rewards stay.</p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-danger" onClick={remove}>
                Remove
              </button>
              <button ref={keepRef} type="button" className="btn" onClick={keep}>
                Keep them
              </button>
            </div>
          </div>
        ) : selected.length > 0 ? (
          <div className="manage-actions">
            <button type="button" className="btn" onClick={() => (setPicked(new Set()), requestAnimationFrame(() => addRef.current?.focus()))}>
              Clear picks
            </button>
            <button ref={removeRef} type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
              Remove {plural(selected.length)}
            </button>
          </div>
        ) : (
          <button ref={addRef} type="button" className="btn btn-primary manage-add" onClick={onAdd}>
            Add a chore
          </button>
        )}
      </div>
    </section>
  )
}
