import type { Species } from '../domain/types'

// Palette tokens from docs/ART.md. Art code uses these names, never raw hex.

export const PALETTE = {
  ink: '#2B1E2F',
  ground: '#EFE9FF',
  accent: '#6F5CF0',
  wallLeft: '#F4B8A0',
  wallRight: '#F9D0BC',
  floorWood: '#D19A6A',
  woodDark: '#A0673F',
  fabricBlue: '#6F95F0',
  warmRed: '#E86A4A',
  sky: '#9ED8F5',
  blush: '#F28FA0',
  petDefault: '#FFD65C',
  sakura: '#FFCFDA',
  sickTint: '#7BAE3A',
  dirt: '#8A6A4A',
  leaf: '#8CCB5E',
  leafDark: '#6FB24A',
  cream: '#FFF6E6',
  creamDark: '#EBDCC6',
  steel: '#C9D3E6',
  steelDark: '#97A3BE',
  white: '#FFFFFF',
  // Room shell styles (docs/ART.md, "Room shell styles")
  floorWoodSide: '#BC8559',
  floorCarpetLight: '#F0B8C6',
  floorCarpet: '#E29BAE',
  floorCarpetDark: '#C27D93',
  wallMintLeft: '#9FD4B6',
  wallMintRight: '#C4EAD3',
  wallLavenderLeft: '#BFAEE8',
  wallLavenderRight: '#D9CDF5',
} as const

/** Outline weight in a 200x200 character viewBox. */
export const CHARACTER_STROKE = 4
/** Outline weight at room scale (object art). */
export const ROOM_STROKE = 3

/** Each pet's own starting colour: sakura-pink Mochi, snow-white Bun, sunny Sprout. */
export const SPECIES_COLOUR: Record<Species, string> = {
  mochi: PALETTE.sakura,
  bun: PALETTE.white,
  sprout: PALETTE.petDefault,
}
