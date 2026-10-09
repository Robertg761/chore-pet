import { PALETTE } from '../../art/palette'
import type { RoomType } from '../../domain/types'

// Room shell styles. Ids match the `rooms.floor_style` / `rooms.wall_style`
// columns. Each room kind starts with its own free look (ROOM_START_STYLES);
// the other styles are rewards (src/domain/unlocks.ts).

const P = PALETTE

export type FloorStyleId = 'wood' | 'tile' | 'carpet' | 'seaside' | 'mosaic' | 'oat' | 'birch'
export type WallStyleId = 'peach' | 'mint' | 'lavender' | 'sky' | 'cloud' | 'butter' | 'sage'

export interface FloorStyle {
  id: FloorStyleId
  label: string
  /** Pattern drawn on the floor top. */
  pattern: 'planks' | 'checker' | 'rug' | 'mosaic'
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
  // Free starting looks for new rooms (kept next to the default so they are easy to find).
  { id: 'mosaic', label: 'Mosaic', pattern: 'mosaic', top: P.floorMosaic, alt: P.floorMosaicAlt, edgeLeft: P.floorMosaicDark, edgeRight: P.floorMosaicSide },
  { id: 'oat', label: 'Oat rug', pattern: 'rug', top: P.floorOat, alt: P.floorOatBorder, edgeLeft: P.floorOatDark, edgeRight: P.floorOatSide },
  { id: 'birch', label: 'Birch', pattern: 'planks', top: P.floorBirch, alt: P.floorBirch, edgeLeft: P.floorBirchDark, edgeRight: P.floorBirchSide },
  // Rewards.
  { id: 'tile', label: 'Tile', pattern: 'checker', top: P.cream, alt: P.steel, edgeLeft: P.steelDark, edgeRight: P.creamDark },
  { id: 'carpet', label: 'Carpet', pattern: 'rug', top: P.floorCarpetLight, alt: P.floorCarpet, edgeLeft: P.floorCarpetDark, edgeRight: P.floorCarpet },
  { id: 'seaside', label: 'Seaside', pattern: 'checker', top: P.white, alt: P.sky, edgeLeft: P.skyDark, edgeRight: P.sky },
]

export const WALL_STYLES: readonly WallStyle[] = [
  { id: 'peach', label: 'Peach', left: P.wallLeft, right: P.wallRight, stripes: false },
  // Free starting looks for new rooms (kept next to the default so they are easy to find).
  { id: 'cloud', label: 'Cloud', left: P.wallCloudLeft, right: P.wallCloudRight, stripes: false },
  { id: 'butter', label: 'Butter', left: P.wallButterLeft, right: P.wallButterRight, stripes: false },
  { id: 'sage', label: 'Sage', left: P.wallSageLeft, right: P.wallSageRight, stripes: false },
  // Rewards.
  { id: 'mint', label: 'Mint', left: P.wallMintLeft, right: P.wallMintRight, stripes: true },
  { id: 'lavender', label: 'Lavender', left: P.wallLavenderLeft, right: P.wallLavenderRight, stripes: false },
  { id: 'sky', label: 'Sky', left: P.wallSkyLeft, right: P.wallSkyRight, stripes: true },
]

export const DEFAULT_FLOOR_STYLE: FloorStyleId = 'wood'
export const DEFAULT_WALL_STYLE: WallStyleId = 'peach'

/** What a brand-new room of each kind starts with. Only free styles belong here. */
export const ROOM_START_STYLES: Record<RoomType, { wallStyle: WallStyleId; floorStyle: FloorStyleId }> = {
  kitchen: { wallStyle: 'peach', floorStyle: 'wood' },
  bathroom: { wallStyle: 'cloud', floorStyle: 'mosaic' },
  bedroom: { wallStyle: 'butter', floorStyle: 'oat' },
  living: { wallStyle: 'sage', floorStyle: 'birch' },
  other: { wallStyle: DEFAULT_WALL_STYLE, floorStyle: DEFAULT_FLOOR_STYLE },
}

export function startStylesOf(type: RoomType): { wallStyle: WallStyleId; floorStyle: FloorStyleId } {
  return ROOM_START_STYLES[type] ?? ROOM_START_STYLES.other
}

export function floorStyleOf(id: string): FloorStyle {
  return FLOOR_STYLES.find((s) => s.id === id) ?? FLOOR_STYLES[0]
}

export function wallStyleOf(id: string): WallStyle {
  return WALL_STYLES.find((s) => s.id === id) ?? WALL_STYLES[0]
}
