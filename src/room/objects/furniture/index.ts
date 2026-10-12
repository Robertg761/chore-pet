import { createElement } from 'react'
import { PALETTE, ROOM_STROKE } from '../../../art/palette'
import { appearanceColors, normalizeAppearance } from '../../../catalog/customization'
import type { ObjectArt } from '../types'
import { bathroomVanity, bathtub, laundryHamper } from './bathroom'
import { cabinetTop, furnitureMess, type FurnitureDrawing, type FurnitureLook } from './parts'
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
  /** Actual supporting surface, including the style's molding or cushion. */
  surface: number | ((look: FurnitureLook) => number)
  dustAt?: [number, number]
  draw: FurnitureDrawing
  ownMess?: boolean
}

const furniture: FurnitureSpec[] = [
  { id: 'armchair', w: 1, d: 1, top: -67, surface: ({ options: a }) => a.style === 'modern' ? 24 : 27, dustAt: [0.7, 0.5], draw: armchair },
  { id: 'dining-chair', w: 1, d: 1, top: -73, surface: ({ options: a }) => a.style === 'playful' ? 32 : 36, draw: diningChair },
  { id: 'bench', w: 1, d: 2, top: -65, surface: ({ options: a }) => a.style === 'playful' ? 27 : a.style === 'nordic' || a.style === 'industrial' ? 30 : 33, dustAt: [0.55, 0.85], draw: bench },
  { id: 'ottoman', w: 1, d: 1, top: -35, surface: ({ options: a }) => a.style === 'playful' ? 33 : a.style === 'modern' ? 26 : 29, draw: ottoman },
  { id: 'coffee-table', w: 2, d: 1, top: -45, surface: 27, draw: coffeeTable },
  { id: 'side-table', w: 1, d: 1, top: -55, surface: 35, dustAt: [0.5, 0.72], draw: sideTable },
  { id: 'desk', w: 1, d: 2, top: -73, surface: 49, dustAt: [0.78, 0.95], draw: desk },
  { id: 'nightstand', w: 1, d: 1, top: -62, surface: (look) => cabinetTop(look, 39), dustAt: [0.6, 0.32], draw: nightstand },
  { id: 'dresser', w: 1, d: 2, top: -73, surface: (look) => cabinetTop(look, look.options.style === 'nordic' ? 55 : look.options.style === 'modern' ? 46 : 51), draw: dresser },
  { id: 'wardrobe', w: 1, d: 2, top: -128, surface: (look) => look.options.style === 'classic' && look.options.details ? 115 : cabinetTop(look, look.options.style === 'modern' ? 103 : 110), dustAt: [0.68, 1.55], draw: wardrobe },
  { id: 'tv-stand', w: 1, d: 2, top: -86, surface: (look) => cabinetTop(look, look.options.style === 'modern' ? 26 : 34), draw: tvStand },
  { id: 'shoe-rack', w: 1, d: 2, top: -56, surface: ({ options: a }) => a.style === 'playful' ? 40 : 45, draw: shoeRack },
  { id: 'bathtub', w: 2, d: 2, top: -75, surface: 38, draw: bathtub },
  { id: 'bathroom-vanity', w: 1, d: 2, top: -75, surface: ({ options: a }) => a.style === 'modern' ? 51 : 49, dustAt: [0.82, 1], draw: bathroomVanity },
  { id: 'laundry-hamper', w: 1, d: 1, top: -56, surface: ({ options: a }) => a.style === 'playful' ? 43 : a.style === 'nordic' || a.style === 'industrial' ? 47 : 49, dustAt: [0.65, 0.67], draw: laundryHamper },
  { id: 'mirror', w: 1, d: 1, top: -132, surface: 100, draw: mirror, ownMess: true },
  { id: 'wall-shelf', w: 1, d: 2, top: -126, surface: 105, draw: wallShelf, ownMess: true },
  { id: 'pet-bed', w: 2, d: 1, top: -54, surface: 21, dustAt: [0.85, 0.5], draw: petBed },
]

/** Handmade construction variants. All styles retain the same placement footprint. */
export const furnitureArt: ObjectArt[] = furniture.map(({ id, w, d, top, surface, dustAt, draw, ownMess }) => ({
  catalogId: id,
  footprint: { w, d },
  bounds: { x: -d * 32 - 9, y: top - 10, width: (w + d) * 32 + 18, height: -top + (w + d) * 16 + 20 },
  cueY: top,
  render: (stage, appearance) => {
    const options = normalizeAppearance(appearance)
    const colors = appearanceColors(options)
    const look = { options, colors }
    return createElement('g', { stroke: PALETTE.ink, strokeWidth: ROOM_STROKE, strokeLinejoin: 'round', strokeLinecap: 'round' },
      draw(look, stage), !ownMess && furnitureMess(stage, w, d, typeof surface === 'function' ? surface(look) : surface, dustAt))
  },
}))
