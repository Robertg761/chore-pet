// Layout sums for the single-screen home.

/** How many chores fit under the room on a phone: more on taller screens, one fewer under the sample banner. */
export function upNextRows(height: number, sampleBanner: boolean): number {
  const rows = Math.floor((height - 600) / 90) + 3 - (sampleBanner ? 1 : 0)
  return Math.min(5, Math.max(2, rows))
}
