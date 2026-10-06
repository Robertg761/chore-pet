import { mix } from '../art/color'
import { PALETTE, SPECIES_COLOUR } from '../art/palette'
import type { CheekStyle, EyeStyle, Pet, Species } from '../domain/types'

// Pure helpers for the character creator, so the UI never decides what "changed" means.

export interface BodyColourOption {
  id: string
  name: string
  hex: string
}

/** Ten soft body colours. Light enough that the ink outline and blush cheeks always show. */
export const BODY_COLOURS: readonly BodyColourOption[] = [
  { id: 'pink', name: 'Pink', hex: PALETTE.sakura },
  { id: 'white', name: 'White', hex: PALETTE.white },
  { id: 'yellow', name: 'Yellow', hex: PALETTE.petDefault },
  { id: 'sky', name: 'Sky', hex: PALETTE.sky },
  { id: 'mint', name: 'Mint', hex: mix(PALETTE.leaf, PALETTE.white, 0.55) },
  { id: 'lavender', name: 'Lavender', hex: mix(PALETTE.accent, PALETTE.white, 0.68) },
  { id: 'peach', name: 'Peach', hex: mix(PALETTE.wallLeft, PALETTE.white, 0.15) },
  { id: 'caramel', name: 'Caramel', hex: mix(PALETTE.floorWood, PALETTE.white, 0.3) },
  { id: 'cocoa', name: 'Cocoa', hex: mix(PALETTE.woodDark, PALETTE.white, 0.5) },
  { id: 'grey', name: 'Grey', hex: mix(PALETTE.ink, PALETTE.white, 0.82) },
]

export const EYE_OPTIONS: readonly { value: EyeStyle; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'sparkly', label: 'Sparkly' },
  { value: 'button', label: 'Button' },
  { value: 'lashes', label: 'Lashes' },
]

export const CHEEK_OPTIONS: readonly { value: CheekStyle; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'hearts', label: 'Hearts' },
  { value: 'freckles', label: 'Freckles' },
  { value: 'none', label: 'None' },
]

export const sameColour = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** The swatch list, plus the pet's current colour when it is not one of ours (older saves). */
export function swatchesFor(current: string): BodyColourOption[] {
  return BODY_COLOURS.some((c) => sameColour(c.hex, current)) ? [...BODY_COLOURS] : [...BODY_COLOURS, { id: 'current', name: 'Current', hex: current }]
}

export function colourName(hex: string): string {
  return swatchesFor(hex).find((c) => sameColour(c.hex, hex))?.name ?? 'Custom'
}

/**
 * Switching species keeps a custom colour but follows the species default:
 * if the colour is still the old species' own, it becomes the new one's.
 */
export function colourAfterSpeciesChange(colour: string, from: Species, to: Species): string {
  return sameColour(colour, SPECIES_COLOUR[from]) ? SPECIES_COLOUR[to] : colour
}

export interface CreatorDraft {
  name: string
  species: Species
  bodyColour: string
  eyes: EyeStyle
  cheeks: CheekStyle
}

export function draftFromPet(pet: Pet): CreatorDraft {
  return { name: pet.name, species: pet.species, bodyColour: pet.bodyColour, eyes: pet.eyes ?? 'classic', cheeks: pet.cheeks ?? 'round' }
}

/** Only the fields that differ from the pet. The name is trimmed. */
export function changesFrom(pet: Pet, draft: CreatorDraft): Partial<CreatorDraft> {
  const before = draftFromPet(pet)
  const patch: Partial<CreatorDraft> = {}
  const name = draft.name.trim()
  if (name !== before.name) patch.name = name
  if (draft.species !== before.species) patch.species = draft.species
  if (draft.bodyColour !== before.bodyColour) patch.bodyColour = draft.bodyColour
  if (draft.eyes !== before.eyes) patch.eyes = draft.eyes
  if (draft.cheeks !== before.cheeks) patch.cheeks = draft.cheeks
  return patch
}
