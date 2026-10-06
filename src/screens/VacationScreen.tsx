import type { VacationWindow } from '../domain/types'

// PLACEHOLDER (Phase 1 batch B: vacation mode). Keep the props.

export interface VacationScreenProps {
  vacations: VacationWindow[]
  today: string
  onChange: (vacations: VacationWindow[]) => void
  onClose: () => void
}

export function VacationScreen({ vacations, onChange, onClose }: VacationScreenProps) {
  return (
    <section>
      <h2>Vacation</h2>
      {vacations.map((v) => (
        <p key={v.start}>
          {v.start} to {v.end}{' '}
          <button type="button" onClick={() => onChange(vacations.filter((x) => x !== v))}>
            Remove
          </button>
        </p>
      ))}
      <button type="button" onClick={onClose}>
        Back
      </button>
    </section>
  )
}
