import type { CSSProperties } from 'react'
import { ROOM_VIEWBOX } from '../room/shell/geometry'

// Layout sums for the single-screen home.

/**
 * The room's width and height as CSS variables, so the home can keep the room's shape
 * (see `.home-stage .living-room` in index.css). Set as `style` on `.home-stage`.
 */
export const ROOM_ASPECT_VARS = { '--room-w': ROOM_VIEWBOX.width, '--room-h': ROOM_VIEWBOX.height } as CSSProperties

/**
 * How many chores fit under the room on a phone. Short phones get one row so the
 * room and pet stay big; taller ones get more, and the sample banner takes a row.
 */
export function upNextRows(height: number, sampleBanner: boolean): number {
  if (height < 700) return 1
  const rows = Math.floor((height - 600) / 90) + 3 - (sampleBanner ? 1 : 0)
  return Math.min(5, Math.max(2, rows))
}
