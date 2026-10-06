import { useState } from 'react'
import { Character } from '../character/Character'
import { PALETTE } from '../art/palette'
import { SPECIES, type Species } from '../domain/types'

// PLACEHOLDER (Phase 1 batch B: pet picker). Keep the props.

export interface PetPickerProps {
  onChoose: (choice: { species: Species; name: string }) => void
}

export function PetPicker({ onChoose }: PetPickerProps) {
  const [species, setSpecies] = useState<Species>('mochi')
  const [name, setName] = useState('')
  return (
    <section>
      <h1>Pick your pet</h1>
      {SPECIES.map((s) => (
        <button key={s} type="button" aria-pressed={s === species} onClick={() => setSpecies(s)}>
          <Character species={s} mood="happy" bodyColour={PALETTE.petDefault} size={90} />
        </button>
      ))}
      <label>
        Name <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="button" onClick={() => onChoose({ species, name })}>
        Start
      </button>
    </section>
  )
}
