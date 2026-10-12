import type { Mood } from '../domain/types'

/** The shared open-eye drawing sits slightly lower in tired expressions. */
export function eyeCentreOffset(mood: Mood | 'sleeping' | 'cheering'): number {
  return mood === 'meh' ? 1 : mood === 'scruffy' ? 1.5 : 0
}
