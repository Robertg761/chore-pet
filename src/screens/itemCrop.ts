import { poseFor } from '../character/poses'
import type { CharacterSlot, Species } from '../domain/types'

// One crop window for every item tile (Rewards and Wardrobe), so each item shows the pet's
// whole head with a little air above it, whichever part of the body the item goes on.

/** Air above the head dome, in the 200x200 character box. Bun's tall ears may be cut; the dome never is. */
const AIR = 20

/** How much of the pet each slot needs to read: glasses and a scarf are small, a sweater or backpack wide. */
const SIZE: Record<Exclude<CharacterSlot, 'body'>, number> = { head: 124, face: 124, neck: 124, outfit: 140, back: 140 }

/** The viewBox (a square, in the pet's 200x200 box) that frames an item on a pet. */
export function itemCropViewBox(species: Species, slot: Exclude<CharacterSlot, 'body'>): string {
  const { anchors } = poseFor(species, 'idle')
  const size = SIZE[slot]
  const x = anchors[slot].x - size / 2
  // Hats start higher (the chef's hat and the crown stand tall); the rest start just above the dome.
  // The head anchor sits about 6 units below the top of the dome.
  const y = slot === 'head' ? anchors.head.y + 2 - size / 2 : anchors.head.y - 6 - AIR
  return `${x} ${y} ${size} ${size}`
}
