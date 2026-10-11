// Layout sums for the single-screen home.

/**
 * How many chores fit under the room on a phone. Short phones get one row so the
 * room and pet stay big; taller ones get more, and the sample banner takes a row.
 */
export function upNextRows(height: number, sampleBanner: boolean): number {
  if (height < 700) return 1
  const rows = Math.floor((height - 600) / 90) + 3 - (sampleBanner ? 1 : 0)
  return Math.min(5, Math.max(2, rows))
}
