import { ROOM_TILE_H, ROOM_TILE_W, ROOM_TILES, ROOM_VIEWBOX } from './shell/geometry'

export interface HomeLayout {
  rooms: { id: string; col: number; row: number; x: number; y: number; depth: number }[]
  width: number
  height: number
}

/** Expand a square along its outside edges so adding a room never reshuffles its neighbours. */
export function homeLayout(ids: readonly string[]): HomeLayout {
  const cells: { col: number; row: number }[] = []
  for (let edge = 0; cells.length < ids.length; edge++) {
    for (let row = 0; row < edge; row++) cells.push({ col: edge, row })
    for (let col = 0; col <= edge; col++) cells.push({ col, row: edge })
  }
  const positions = ids.map((id, i) => {
    const { col, row } = cells[i]
    return {
      id, col, row,
      x: (col - row) * ROOM_TILES * ROOM_TILE_W / 2,
      y: (col + row) * ROOM_TILES * ROOM_TILE_H / 2,
      depth: col + row,
    }
  })
  const left = Math.min(0, ...positions.map((p) => p.x))
  const right = Math.max(0, ...positions.map((p) => p.x))
  const bottom = Math.max(0, ...positions.map((p) => p.y))
  return {
    rooms: positions.map((p) => ({ ...p, x: p.x - left + 16, y: p.y + 16 })),
    width: right - left + ROOM_VIEWBOX.width + 32,
    height: bottom + ROOM_VIEWBOX.height + 64,
  }
}

export function fitHome(width: number, height: number, layout: Pick<HomeLayout, 'width' | 'height'>): number {
  return Math.min(Math.max(0, width) / layout.width, Math.max(0, height) / layout.height)
}
