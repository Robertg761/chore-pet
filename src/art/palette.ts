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
  sickTint: '#7BAE3A',
  dirt: '#8A6A4A',
  leaf: '#8CCB5E',
  cream: '#FFF6E6',
  creamDark: '#EBDCC6',
  steel: '#C9D3E6',
  steelDark: '#97A3BE',
  white: '#FFFFFF',
} as const

/** Outline weight in a 200x200 character viewBox. */
export const CHARACTER_STROKE = 4
/** Outline weight at room scale (object art). */
export const ROOM_STROKE = 3
