import { PALETTE } from '../art/palette'
import { mix } from '../art/color'
import type { CatalogEntry } from './types'

export const FURNITURE_STYLES = [
  { id: 'classic', name: 'Classic', description: 'Soft shapes and familiar details.' },
  { id: 'cottage', name: 'Cottage', description: 'Paneled wood, turned legs and scalloped edges.' },
  { id: 'modern', name: 'Modern', description: 'Low profiles, smooth fronts and rounded corners.' },
  { id: 'nordic', name: 'Nordic', description: 'Open frames, slender legs and simple joinery.' },
  { id: 'industrial', name: 'Industrial', description: 'Metal frames, cross braces and rivets.' },
  { id: 'playful', name: 'Playful', description: 'Chunky curves, bright accents and little surprises.' },
] as const

export const FURNITURE_FINISHES = [
  { id: 'natural', name: 'Honey oak', color: PALETTE.floorWood },
  { id: 'walnut', name: 'Walnut', color: PALETTE.woodDark },
  { id: 'birch', name: 'Birch', color: PALETTE.floorBirch },
  { id: 'white', name: 'Porcelain', color: PALETTE.cream },
  { id: 'charcoal', name: 'Charcoal', color: mix(PALETTE.ink, PALETTE.white, 0.18) },
  { id: 'sage', name: 'Sage', color: PALETTE.wallSageLeft },
  { id: 'rose', name: 'Dusty rose', color: PALETTE.floorCarpet },
  { id: 'blue', name: 'Blue lacquer', color: PALETTE.fabricBlue },
] as const

export const FURNITURE_FABRICS = [
  { id: 'blue', name: 'Cornflower', color: PALETTE.fabricBlue },
  { id: 'rose', name: 'Rose', color: PALETTE.blush },
  { id: 'sage', name: 'Sage linen', color: PALETTE.wallSageLeft },
  { id: 'cream', name: 'Oatmeal', color: PALETTE.creamDark },
  { id: 'sunshine', name: 'Sunshine', color: PALETTE.petDefault },
  { id: 'lavender', name: 'Lavender', color: PALETTE.wallLavenderLeft },
  { id: 'terracotta', name: 'Terracotta', color: PALETTE.warmRed },
  { id: 'sky', name: 'Sky', color: PALETTE.sky },
  { id: 'charcoal', name: 'Charcoal', color: PALETTE.steelDark },
  { id: 'mint', name: 'Mint', color: PALETTE.wallMintLeft },
] as const

export const FURNITURE_PATTERNS = [
  { id: 'plain', name: 'Plain' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'checks', name: 'Checks' },
  { id: 'dots', name: 'Dots' },
] as const

export type FurnitureStyle = typeof FURNITURE_STYLES[number]['id']
export type FurnitureFinish = typeof FURNITURE_FINISHES[number]['id']
export type FurnitureFabric = typeof FURNITURE_FABRICS[number]['id']
export type FurniturePattern = typeof FURNITURE_PATTERNS[number]['id']
export type FurnitureCategory = 'seating' | 'tables' | 'storage' | 'bedroom' | 'kitchen' | 'bathroom' | 'decor'

export interface FurnitureAppearance {
  style?: FurnitureStyle
  finish?: FurnitureFinish
  fabric?: FurnitureFabric
  pattern?: FurniturePattern
  details?: boolean
}

export const DEFAULT_APPEARANCE: Required<FurnitureAppearance> = {
  style: 'classic', finish: 'natural', fabric: 'blue', pattern: 'plain', details: true,
}

const option = <T extends string>(value: unknown, choices: readonly { id: T }[], fallback: T): T =>
  choices.find((choice) => choice.id === value)?.id ?? fallback

/** Keep old saves and unknown values usable without passing untrusted colors to SVG. */
export function normalizeAppearance(value?: unknown): Required<FurnitureAppearance> {
  const a = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return {
    style: option(a.style, FURNITURE_STYLES, DEFAULT_APPEARANCE.style),
    finish: option(a.finish, FURNITURE_FINISHES, DEFAULT_APPEARANCE.finish),
    fabric: option(a.fabric, FURNITURE_FABRICS, DEFAULT_APPEARANCE.fabric),
    pattern: option(a.pattern, FURNITURE_PATTERNS, DEFAULT_APPEARANCE.pattern),
    details: typeof a.details === 'boolean' ? a.details : true,
  }
}

export function appearanceColors(value?: FurnitureAppearance) {
  const a = normalizeAppearance(value)
  const wood = FURNITURE_FINISHES.find((f) => f.id === a.finish)!.color
  const fabric = FURNITURE_FABRICS.find((f) => f.id === a.fabric)!.color
  return {
    wood, woodDark: mix(wood, PALETTE.ink, 0.25), woodLight: mix(wood, PALETTE.white, 0.22),
    fabric, fabricDark: mix(fabric, PALETTE.ink, 0.22), fabricLight: mix(fabric, PALETTE.white, 0.28),
    metal: a.style === 'industrial' ? PALETTE.steelDark : PALETTE.creamDark,
    accent: fabric,
  }
}

export function furnitureCategory(entry: CatalogEntry): FurnitureCategory {
  if (entry.category) return entry.category
  if (['couch', 'bean-bag'].includes(entry.id)) return 'seating'
  if (['table', 'dining-table'].includes(entry.id)) return 'tables'
  if (entry.id === 'bookshelf') return 'storage'
  if (entry.id === 'bed') return 'bedroom'
  if (entry.rooms[0] === 'bathroom') return 'bathroom'
  if (entry.rooms[0] === 'kitchen') return 'kitchen'
  return 'decor'
}
