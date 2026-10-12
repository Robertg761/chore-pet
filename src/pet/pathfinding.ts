import { ROOM_SIZE } from '../room/grid'

export interface Tile { tx: number; ty: number }

const key = (t: Tile) => `${t.tx},${t.ty}`
const NEIGHBOURS: Tile[] = [
  { tx: 1, ty: 0 },
  { tx: -1, ty: 0 },
  { tx: 0, ty: 1 },
  { tx: 0, ty: -1 },
]

function inRoom(t: Tile): boolean {
  return t.tx >= 0 && t.ty >= 0 && t.tx < ROOM_SIZE && t.ty < ROOM_SIZE
}

/** Shortest path from `from` to any goal tile over free tiles (excluding `from`), or null. */
export function findPath(from: Tile, goals: Tile[], free: (t: Tile) => boolean): Tile[] | null {
  const goalKeys = new Set(goals.map(key))
  const prev = new Map<string, Tile | null>([[key(from), null]])
  const queue: Tile[] = [from]
  while (queue.length) {
    const t = queue.shift()!
    if (goalKeys.has(key(t)) && key(t) !== key(from)) {
      const path: Tile[] = []
      for (let c: Tile | null = t; c && key(c) !== key(from); c = prev.get(key(c)) ?? null) path.unshift(c)
      return path
    }
    for (const n of NEIGHBOURS) {
      const next = { tx: t.tx + n.tx, ty: t.ty + n.ty }
      if (!inRoom(next) || prev.has(key(next)) || !free(next)) continue
      prev.set(key(next), t)
      queue.push(next)
    }
  }
  return null
}

/** Free tiles touching an object's tiles: where the pet stands to look at it. */
export function besideTiles(tiles: Tile[], free: (t: Tile) => boolean): Tile[] {
  const own = new Set(tiles.map(key))
  const out = new Map<string, Tile>()
  for (const t of tiles) {
    for (const n of NEIGHBOURS) {
      const c = { tx: t.tx + n.tx, ty: t.ty + n.ty }
      if (inRoom(c) && !own.has(key(c)) && free(c)) out.set(key(c), c)
    }
  }
  return [...out.values()]
}

