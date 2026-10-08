import { PALETTE } from '../../art/palette'

// Room shell styles. Ids match the `rooms.floor_style` / `rooms.wall_style`
// columns (defaults 'wood' and 'peach').

const P = PALETTE

export type FloorStyleId = 'wood' | 'tile' | 'carpet' | 'seaside'
export type WallStyleId = 'peach' | 'mint' | 'lavender' | 'sky'

export interface FloorStyle {
  id: FloorStyleId
  label: string
  /** Pattern drawn on the floor top. */
  pattern: 'planks' | 'checker' | 'rug'
  /** Floor top. */
  top: string
  /** Second tile colour (checker) or rug border colour. Same as `top` when unused. */
  alt: string
  /** Slab edge under the floor, left-front (darker) and right-front (lighter). */
  edgeLeft: string
  edgeRight: string
}

export interface WallStyle {
  id: WallStyleId
  label: string
  /** Left wall (darker) and right wall (lighter). */
  left: string
  right: string
  /** Faint wallpaper stripes. */
  stripes: boolean
}

export const FLOOR_STYLES: readonly FloorStyle[] = [
  { id: 'wood', label: 'Wood', pattern: 'planks', top: P.floorWood, alt: P.floorWood, edgeLeft: P.woodDark, edgeRight: P.floorWoodSide },
  { id: 'tile', label: 'Tile', pattern: 'checker', top: P.cream, alt: P.steel, edgeLeft: P.steelDark, edgeRight: P.creamDark },
  { id: 'carpet', label: 'Carpet', pattern: 'rug', top: P.floorCarpetLight, alt: P.floorCarpet, edgeLeft: P.floorCarpetDark, edgeRight: P.floorCarpet },
  { id: 'seaside', label: 'Seaside', pattern: 'checker', top: P.white, alt: P.sky, edgeLeft: P.skyDark, edgeRight: P.sky },
]

export const WALL_STYLES: readonly WallStyle[] = [
  { id: 'peach', label: 'Peach', left: P.wallLeft, right: P.wallRight, stripes: false },
  { id: 'mint', label: 'Mint', left: P.wallMintLeft, right: P.wallMintRight, stripes: true },
  { id: 'lavender', label: 'Lavender', left: P.wallLavenderLeft, right: P.wallLavenderRight, stripes: false },
  { id: 'sky', label: 'Sky', left: P.wallSkyLeft, right: P.wallSkyRight, stripes: true },
]

export const DEFAULT_FLOOR_STYLE: FloorStyleId = 'wood'
export const DEFAULT_WALL_STYLE: WallStyleId = 'peach'

export function floorStyleOf(id: string): FloorStyle {
  return FLOOR_STYLES.find((s) => s.id === id) ?? FLOOR_STYLES[0]
}

export function wallStyleOf(id: string): WallStyle {
  return WALL_STYLES.find((s) => s.id === id) ?? WALL_STYLES[0]
}
