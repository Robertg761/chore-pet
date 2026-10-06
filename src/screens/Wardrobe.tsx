import { Character } from '../character/Character'
import type { Pet, Progress } from '../domain/types'

// PLACEHOLDER (Phase 6 batch G: wardrobe). Keep the props.

export interface WardrobeProps {
  pet: Pet
  progress: Progress | null
  onChange: (patch: Partial<Pick<Pet, 'equipped' | 'outfits'>>) => void
  onClose: () => void
}

export function Wardrobe({ pet, onClose }: WardrobeProps) {
  return (
    <section aria-label="Wardrobe">
      <Character species={pet.species} mood="happy" bodyColour={pet.bodyColour} equipped={pet.equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} />
      <button type="button" onClick={onClose}>
        Back
      </button>
    </section>
  )
}
