import { Character } from '../character/Character'
import type { Pet } from '../domain/types'

// PLACEHOLDER (Phase 6 batch G: character creator). Keep the props.

export type PetLookPatch = Partial<Pick<Pet, 'name' | 'species' | 'bodyColour' | 'eyes' | 'cheeks'>>

export interface CharacterCreatorProps {
  pet: Pet
  onSave: (patch: PetLookPatch) => void
  onClose: () => void
}

export function CharacterCreator({ pet, onClose }: CharacterCreatorProps) {
  return (
    <section aria-label="Change your pet's look">
      <Character species={pet.species} mood="happy" bodyColour={pet.bodyColour} equipped={pet.equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} />
      <button type="button" onClick={onClose}>
        Back
      </button>
    </section>
  )
}
