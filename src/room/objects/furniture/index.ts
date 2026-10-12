import { createElement } from 'react'
import { PALETTE, ROOM_STROKE } from '../../../art/palette'
import { appearanceColors, normalizeAppearance } from '../../../catalog/customization'
import type { ObjectArt } from '../types'
import { bathroomVanity, bathtub, laundryHamper } from './bathroom'
import { furnitureMess, type FurnitureDrawing } from './parts'
import { armchair, bench, diningChair, ottoman, petBed } from './seating'
import { dresser, nightstand, shoeRack, tvStand, wardrobe } from './storage'
import { coffeeTable, desk, sideTable } from './tables'
import { mirror, wallShelf } from './wall'

interface FurnitureSpec {
  id: string
  w: number
  d: number
  /** Highest clean art point, including optional ornaments. */
  top: number
  /** Approximate surface for the dust layer. */
  surface: number
  draw: FurnitureDrawing
  wall?: boolean
  ownMess?: boolean
}

const furniture: FurnitureSpec[] = [
  { id: 'armchair', w: 1, d: 1, top: -67, surface: 30, draw: armchair },
  { id: 'dining-chair', w: 1, d: 1, top: -73, surface: 37, draw: diningChair },
  { id: 'bench', w: 1, d: 2, top: -65, surface: 34, draw: bench },
  { id: 'ottoman', w: 1, d: 1, top: -35, surface: 33, draw: ottoman },
  { id: 'coffee-table', w: 2, d: 1, top: -45, surface: 29, draw: coffeeTable },
  { id: 'side-table', w: 1, d: 1, top: -55, surface: 37, draw: sideTable },
  { id: 'desk', w: 1, d: 2, top: -73, surface: 51, draw: desk },
  { id: 'nightstand', w: 1, d: 1, top: -62, surface: 42, draw: nightstand },
  { id: 'dresser', w: 1, d: 2, top: -73, surface: 55, draw: dresser },
  { id: 'wardrobe', w: 1, d: 2, top: -128, surface: 113, draw: wardrobe },
  { id: 'tv-stand', w: 1, d: 2, top: -86, surface: 36, draw: tvStand },
  { id: 'shoe-rack', w: 1, d: 2, top: -56, surface: 44, draw: shoeRack },
  { id: 'bathtub', w: 2, d: 2, top: -75, surface: 43, draw: bathtub },
  { id: 'bathroom-vanity', w: 1, d: 2, top: -75, surface: 54, draw: bathroomVanity },
  { id: 'laundry-hamper', w: 1, d: 1, top: -56, surface: 49, draw: laundryHamper },
  { id: 'mirror', w: 1, d: 1, top: -132, surface: 100, draw: mirror, wall: true, ownMess: true },
  { id: 'wall-shelf', w: 1, d: 2, top: -126, surface: 105, draw: wallShelf, wall: true },
  { id: 'pet-bed', w: 2, d: 1, top: -54, surface: 24, draw: petBed },
]

/** Handmade construction variants. All styles retain the same placement footprint. */
export const furnitureArt: ObjectArt[] = furniture.map(({ id, w, d, top, surface, draw, wall, ownMess }) => ({
  catalogId: id,
  footprint: { w, d },
  bounds: { x: -d * 32 - 9, y: top - 10, width: (w + d) * 32 + 18, height: -top + (w + d) * 16 + 20 },
  cueY: top,
  render: (stage, appearance) => {
    const options = normalizeAppearance(appearance)
    const colors = appearanceColors(options)
    return createElement('g', { stroke: PALETTE.ink, strokeWidth: ROOM_STROKE, strokeLinejoin: 'round', strokeLinecap: 'round' },
      draw({ options, colors }, stage), !ownMess && furnitureMess(stage, w, d, surface, wall))
  },
}))
