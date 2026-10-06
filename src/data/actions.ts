import { SPECIES_COLOUR } from '../art/palette'
import { toISODate } from '../domain/dates'
import type { Chore, Home, Pet, Progress, Schedule, Species, VacationWindow } from '../domain/types'
import { deleteOp, upsertOp, type NewOp } from './state'

// Every user action as a pure function returning the changes to apply.
// The UI calls these and hands the result to store.apply(...ops).

const id = () => crypto.randomUUID()

/** First launch: the home, the chosen pet and an empty progress row. */
export function createHousehold(input: { species: Species; petName: string; userId: string | null }): NewOp[] {
  const home: Home = { id: id(), ownerId: input.userId ?? '', name: 'Home', vacations: [] }
  const pet: Pet = { id: id(), homeId: home.id, name: input.petName.trim() || 'Pip', species: input.species, bodyColour: SPECIES_COLOUR[input.species], equipped: {} }
  const progress: Progress = { homeId: home.id, choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [] }
  return [upsertOp('homes', home), upsertOp('pets', pet), upsertOp('progress', progress)]
}

export function addChore(home: Home, input: { name: string; schedule: Schedule; objectId?: string | null }, today: string): NewOp[] {
  const chore: Chore = { id: id(), homeId: home.id, objectId: input.objectId ?? null, name: input.name.trim(), schedule: input.schedule, createdOn: today, photoProof: false }
  return [upsertOp('chores', chore)]
}

export function updateChore(chore: Chore, patch: Partial<Pick<Chore, 'name' | 'schedule' | 'objectId'>>): NewOp[] {
  return [upsertOp('chores', { ...chore, ...patch })]
}

/** Also removes its completions (the database cascades the same way). */
export function removeChore(choreId: string): NewOp[] {
  return [deleteOp('chores', choreId)]
}

/** Record a completion on the local calendar date of `now`, and count it. */
export function completeChore(chore: Chore, progress: Progress | null, now: Date = new Date()): NewOp[] {
  const ops: NewOp[] = [upsertOp('completions', { id: id(), choreId: chore.id, completedAt: now.toISOString(), completedOn: toISODate(now) })]
  if (progress) ops.push(upsertOp('progress', { ...progress, choreCount: progress.choreCount + 1 }))
  return ops
}

export function setVacations(home: Home, vacations: VacationWindow[]): NewOp[] {
  const sorted = [...vacations].sort((a, b) => a.start.localeCompare(b.start))
  return [upsertOp('homes', { ...home, vacations: sorted })]
}

export function updatePet(pet: Pet, patch: Partial<Omit<Pet, 'id' | 'homeId'>>): NewOp[] {
  return [upsertOp('pets', { ...pet, ...patch })]
}
