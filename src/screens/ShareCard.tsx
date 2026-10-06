import type { Pet, PlacedObject, Room } from '../domain/types'

// PLACEHOLDER (Phase 7 batch H: shareable "my home" card). Keep the props.

export interface ShareCardProps {
  pet: Pet
  room: Room
  objects: PlacedObject[]
  /** Chores done so far and the current streak, for the card's caption. */
  choreCount: number
  streak: number
  onClose: () => void
}

export function ShareCard({ onClose }: ShareCardProps) {
  return (
    <section aria-label="Share your home">
      <button type="button" onClick={onClose}>
        Back
      </button>
    </section>
  )
}
