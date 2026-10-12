import { useId, useLayoutEffect, useState } from 'react'
import { catalogEntry } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import { objectNames } from '../room/roomSummary'
import type { VisitResult } from './LivingRoom'
import './PetExplore.css'

export interface PetExploreProps {
  objects: PlacedObject[]
  petName: string
  blocked?: 'travel' | 'away' | 'sick'
  onLook: (objectId: string) => VisitResult
  /** Decorative room marker only; previewing never starts a visit. */
  onPreview?: (objectId: string | null) => void
}

/** Optional room play. Selection and feedback belong to this room visit only. */
export function PetExplore({ objects, petName, blocked, onLook, onPreview }: PetExploreProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [feedback, setFeedback] = useState<{ objectId: string; result: VisitResult } | null>(null)
  const names = objectNames(objects)
  const choices = objects.flatMap(object => {
    const entry = catalogEntry(object.catalogId)
    return entry ? [{ object, name: names[object.id] }] : []
  })
  const selected = choices.find(choice => choice.object.id === selectedId) ?? choices[0]
  const previewId = open && !blocked ? selected?.object.id ?? null : null
  useLayoutEffect(() => {
    onPreview?.(previewId)
    return () => onPreview?.(null)
  }, [onPreview, previewId])
  const disabled = Boolean(blocked || !selected)
  const note = blocked === 'travel' ? `${petName} is on the way.`
    : blocked === 'away' ? `${petName} is resting while you're away.`
    : blocked === 'sick' ? `${petName} is resting today.`
    : !selected ? 'Add a furnishing to explore together.' : ''
  const result = feedback?.objectId === selected?.object.id ? feedback?.result : null
  const name = selected?.name.toLowerCase()
  const message = result === 'started' ? `You invited ${petName} to look at the ${name}.`
    : result === 'still' ? `${petName} noticed the ${name} from here.`
    : result === 'busy' ? `${petName} is busy for a moment. Try again shortly.`
    : result === 'resting' ? `${petName} is resting. Try again later.`
    : result === 'unreachable' ? "There isn't a clear way to that spot."
    : result === 'unavailable' ? `${petName} is on the way. Try again when they arrive.` : ''

  return <div className="pet-explore">
    <button type="button" className="btn btn-quiet pet-explore-toggle" aria-expanded={open} aria-controls={`${id}-panel`}
      onClick={() => setOpen(value => !value)}>Explore together</button>
    <div id={`${id}-panel`} className="pet-explore-panel" hidden={!open}>
      <div className="pet-explore-row">
        <div className="pet-explore-choice">
          <label htmlFor={`${id}-object`}>Show {petName}</label>
          <select id={`${id}-object`} className="field" disabled={disabled} value={selected?.object.id ?? ''}
            aria-describedby={note ? `${id}-note` : undefined}
            onChange={event => { setSelectedId(event.target.value); setFeedback(null) }}>
            {choices.map(({ object, name }) => <option key={object.id} value={object.id}>{name}</option>)}
          </select>
        </div>
        <button type="button" className="btn" disabled={disabled} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => {
            if (!disabled && selected) setFeedback({ objectId: selected.object.id, result: onLook(selected.object.id) })
          }}>Look together</button>
      </div>
      {note && <p id={`${id}-note`} className="pet-explore-note">{note}</p>}
      <p className="pet-explore-feedback" role="status">{blocked ? '' : message}</p>
    </div>
  </div>
}
