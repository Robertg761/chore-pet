import { useState } from 'react'
import type { Chore, Schedule } from '../domain/types'

// PLACEHOLDER (Phase 1 batch B: chore editor). Keep the props.

export interface ChoreEditorProps {
  /** Missing when adding a new chore. */
  chore?: Chore
  onSave: (value: { name: string; schedule: Schedule }) => void
  onDelete?: () => void
  onCancel: () => void
}

export function ChoreEditor({ chore, onSave, onDelete, onCancel }: ChoreEditorProps) {
  const [name, setName] = useState(chore?.name ?? '')
  return (
    <section>
      <label>
        Name <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="button" disabled={!name.trim()} onClick={() => onSave({ name, schedule: chore?.schedule ?? { kind: 'daily' } })}>
        Save
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete}>
          Delete
        </button>
      )}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </section>
  )
}
