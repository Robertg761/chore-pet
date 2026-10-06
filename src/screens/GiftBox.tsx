import type { Pet } from '../domain/types'
import type { Unlock } from '../domain/unlocks'

// PLACEHOLDER (Phase 5 batch F: gift box unlock moment). Keep the props.

export interface GiftBoxProps {
  /** The reward being given. Shown one at a time; the app queues the rest. */
  unlock: Unlock
  pet: Pet
  /** Wear it now (items only) or put it away; either closes the gift. */
  onClose: (choice: { wear: boolean }) => void
}

export function GiftBox({ unlock, onClose }: GiftBoxProps) {
  return (
    <div role="dialog" aria-label="A gift">
      <p>You unlocked: {unlock.name}</p>
      {unlock.kind === 'item' && (
        <button type="button" onClick={() => onClose({ wear: true })}>
          Put it on
        </button>
      )}
      <button type="button" onClick={() => onClose({ wear: false })}>
        Nice!
      </button>
    </div>
  )
}
