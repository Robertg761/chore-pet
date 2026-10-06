import type { Mood, Species } from '../domain/types'
import type { Pose } from './slots'
import { bunIdle } from './species/bun'
import { mochiIdle } from './species/mochi'
import { sproutIdle } from './species/sprout'

/** `idle` is the happy pose; the rest map to moods plus two special moments. */
export type PoseName = 'idle' | 'content' | 'meh' | 'scruffy' | 'sick' | 'sleeping' | 'cheering'

type PoseSet = { idle: Pose } & Partial<Record<Exclude<PoseName, 'idle'>, Pose>>

/**
 * Every pose of every species. Each must define all six anchors. Missing poses
 * fall back to idle, which already shows mood through the face.
 */
export const POSES: Record<Species, PoseSet> = {
  mochi: { idle: mochiIdle },
  bun: { idle: bunIdle },
  sprout: { idle: sproutIdle },
}

export function poseNameFor(mood: Mood): PoseName {
  return mood === 'happy' ? 'idle' : mood
}

export function poseFor(species: Species, name: PoseName): Pose {
  return POSES[species][name] ?? POSES[species].idle
}
