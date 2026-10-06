import { choreStatus } from '../domain/schedule'
import type { Chore, Completion, VacationWindow } from '../domain/types'

// PLACEHOLDER (Phase 1 batch B: chore list). Keep the props.

export interface ChoreListProps {
  chores: Chore[]
  completions: Completion[]
  vacations: VacationWindow[]
  today: string
  onComplete: (chore: Chore) => void
  onEdit: (chore: Chore) => void
  onAdd: () => void
}

export function ChoreList({ chores, completions, vacations, today, onComplete, onEdit, onAdd }: ChoreListProps) {
  return (
    <section aria-label="Chores">
      {chores.map((c) => {
        const s = choreStatus(c, completions, today, vacations)
        return (
          <div key={c.id}>
            <button type="button" onClick={() => onEdit(c)}>
              {c.name}
            </button>{' '}
            {s.state} <button type="button" disabled={s.state === 'upcoming'} onClick={() => onComplete(c)}>Done</button>
          </div>
        )
      })}
      <button type="button" onClick={onAdd}>
        Add a chore
      </button>
    </section>
  )
}
