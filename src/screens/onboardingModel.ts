import { choreStatus } from '../domain/schedule'
import type { Chore, Completion, ISODate, VacationWindow } from '../domain/types'

// Pure helpers for the first-run path (coach card in build mode, hint on the home
// screen). The only side effect is reading and writing two small flags, and both
// are safe when storage is missing or blocked (private windows, strict settings).

export interface FlagStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Set once a home has been through its first build (or the player skipped it). */
export const onboardedKey = (homeId: string) => `chore-pet:onboarded:${homeId}`
/** Set once the "Tap Done" hint has been used or closed. */
export const hintKey = (homeId: string) => `chore-pet:first-done-hint:${homeId}`

function defaultStorage(): FlagStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readFlag(key: string, storage: FlagStorage | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeFlag(key: string, storage: FlagStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(key, '1')
  } catch {
    // Nothing to do: the card may simply show again.
  }
}

export type CoachStep = 1 | 2 | 3

/** Step 1 with an empty room, step 2 with one thing, step 3 with two or more. */
export function coachStep(objectCount: number): CoachStep {
  if (objectCount >= 2) return 3
  return objectCount === 1 ? 2 : 1
}

export function coachCopy(step: CoachStep, choreCount: number, sheetOpen = false): { text: string; count: string | null } {
  if (step === 1) return { text: 'Tap something to put it in your room.', count: null }
  const count = `${choreCount} ${choreCount === 1 ? 'chore' : 'chores'} so far`
  if (step === 2) {
    // With the object sheet open the tray is hidden, so say how to get it back.
    return { text: sheetOpen ? 'Every thing brings its chores. Tap the X to add one or two more.' : 'Every thing brings its chores. Add one or two more.', count }
  }
  return { text: 'Looks cosy! Tap Done to meet your chores.', count }
}

/** Whether the "Tap Done" hint has something to point at: a chore that can be done today. */
export function hasDueChore(chores: Chore[], completions: Completion[], today: ISODate, vacations: VacationWindow[]): boolean {
  return chores.some((c) => {
    const state = choreStatus(c, completions, today, vacations).state
    return state === 'due' || state === 'overdue'
  })
}

/** Show the hint only after a first build, before any chore has been done. */
export function showFirstDoneHint(input: { onboarded: boolean; hintDone: boolean; completionCount: number; dueChore: boolean }): boolean {
  return input.onboarded && !input.hintDone && input.completionCount === 0 && input.dueChore
}
