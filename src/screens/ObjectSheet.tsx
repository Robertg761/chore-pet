import type { CatalogEntry } from '../catalog/types'
import type { Chore, Completion, PlacedObject, Schedule, VacationWindow } from '../domain/types'

// PLACEHOLDER (Phase 2 batch C: object sheet). Keep the props.

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
  onRemove: () => void
  onClose: () => void
}

export function ObjectSheet({ entry, chores, canTurn, onTurn, onRemove, onClose }: ObjectSheetProps) {
  return (
    <section aria-label={entry.name}>
      <h2>{entry.name}</h2>
      <ul>
        {chores.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
      <button type="button" onClick={onTurn} disabled={!canTurn}>
        Turn
      </button>
      <button type="button" onClick={onRemove}>
        Remove
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </section>
  )
}
