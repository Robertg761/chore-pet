import { SPECIES_COLOUR } from '../art/palette'
import { toISODate } from '../domain/dates'
import { completionCounts, sameSchedule, SCHEDULE_HISTORY, trimHistory } from '../domain/schedule'
import type { CatalogEntry } from '../catalog/types'
import { applyUnlocks, choreCountOf, currentStreak, type Unlock } from '../domain/unlocks'
import type { Chore, Completion, Home, ISODate, Pet, PlacedObject, Progress, Room, RoomType, Schedule, Species, VacationWindow } from '../domain/types'
import { deleteOp, upsertOp, type NewOp } from './state'

// Every user action as a pure function returning the changes to apply.
// The UI calls these and hands the result to store.apply(...ops).

const id = () => crypto.randomUUID()

/** First launch: the home, the chosen pet, an empty kitchen and an empty progress row. */
export function createHousehold(input: { species: Species; petName: string; userId: string | null }): NewOp[] {
  const home: Home = { id: id(), ownerId: input.userId ?? '', name: 'Home', vacations: [] }
  const pet: Pet = { id: id(), homeId: home.id, name: input.petName.trim() || 'Pip', species: input.species, bodyColour: SPECIES_COLOUR[input.species], equipped: {}, eyes: 'classic', cheeks: 'round', outfits: [] }
  const progress: Progress = { homeId: home.id, choreCount: 0, currentStreak: 0, bestStreak: 0, unlockedItems: [] }
  return [upsertOp('homes', home), upsertOp('pets', pet), upsertOp('progress', progress), ...createRoom(home)]
}

export function createRoom(home: Home, type: RoomType = 'kitchen'): NewOp[] {
  const room: Room = { id: id(), homeId: home.id, type, floorStyle: 'wood', wallStyle: 'peach' }
  return [upsertOp('rooms', room)]
}

/** Put an object in the room. Its default chores come with it: setup is play, not a form. */
export function placeObject(
  room: Room,
  entry: CatalogEntry,
  at: Pick<PlacedObject, 'tileX' | 'tileY' | 'rotation'>,
  today: string,
): NewOp[] {
  const object: PlacedObject = { id: id(), roomId: room.id, catalogId: entry.id, ...at }
  const chores: Chore[] = entry.chores.map((c) => ({
    id: id(),
    homeId: room.homeId,
    objectId: object.id,
    name: c.name,
    schedule: c.schedule,
    createdOn: today,
    photoProof: false,
  }))
  return [upsertOp('placed_objects', object), ...chores.map((c) => upsertOp('chores', c))]
}

export function moveObject(object: PlacedObject, to: Pick<PlacedObject, 'tileX' | 'tileY' | 'rotation'>): NewOp[] {
  return [upsertOp('placed_objects', { ...object, ...to })]
}

/** Also removes its chores and their history (the database cascades the same way). */
/** What a removal needs to keep the player's progress: their completions, and the chores going away with an object. */
export interface History {
  progress: Progress | null
  chores: Chore[]
  completions: Completion[]
}

/** Bank the counted chores of chores about to be deleted (their completions go with them). */
function retire(choreIds: string[], history?: History): NewOp[] {
  if (!history?.progress) return []
  const retired = { ...history.progress.retired }
  for (const choreId of choreIds) {
    const own = history.completions.filter((c) => c.choreId === choreId)
    const counted = choreCountOf(own)
    if (counted > 0) retired[choreId] = Math.max(retired[choreId] ?? 0, counted)
  }
  return [upsertOp('progress', { ...history.progress, retired })]
}

export function removeObject(objectId: string, history?: History): NewOp[] {
  const going = history?.chores.filter((c) => c.objectId === objectId).map((c) => c.id) ?? []
  return [...retire(going, history), deleteOp('placed_objects', objectId)]
}

export function updateRoom(room: Room, patch: Partial<Pick<Room, 'type' | 'floorStyle' | 'wallStyle'>>): NewOp[] {
  return [upsertOp('rooms', { ...room, ...patch })]
}

export function addChore(home: Home, input: { name: string; schedule: Schedule; objectId?: string | null }, today: string): NewOp[] {
  const chore: Chore = { id: id(), homeId: home.id, objectId: input.objectId ?? null, name: input.name.trim(), schedule: input.schedule, createdOn: today, photoProof: false }
  return [upsertOp('chores', chore)]
}

/**
 * Edit a chore. A new schedule takes effect from `today` (its `since`), so
 * nothing from before the change is owed and the chore can't turn late the
 * moment it is edited. Saving the same schedule again (say, with a rename)
 * keeps the old one, `since` and all.
 */
export function updateChore(chore: Chore, patch: Partial<Pick<Chore, 'name' | 'schedule' | 'objectId'>>, today: ISODate): NewOp[] {
  const { schedule, ...rest } = patch
  if (schedule === undefined || sameSchedule(schedule, chore.schedule)) return [upsertOp('chores', { ...chore, ...rest })]
  // A second change on the same day replaces the first, which never got to apply.
  const previous = chore.schedule.since === today ? chore.schedule.before : chore.schedule
  const { before: _ignored, ...next } = schedule
  const before = previous && trimHistory(previous, SCHEDULE_HISTORY - 1)
  return [upsertOp('chores', { ...chore, ...rest, schedule: { ...next, since: today, ...(before && { before }) } as Schedule })]
}

/** Also removes its completions (the database cascades the same way). */
export function removeChore(choreId: string, history?: History): NewOp[] {
  return [...retire([choreId], history), deleteOp('chores', choreId)]
}

/**
 * The moment to stamp a completion with: `now`, but never later than the real
 * clock, so the dev clock (src/lib/devClock.ts) set ahead can't record, and
 * sync for good, a day that hasn't happened. `realNow: null` turns this off.
 */
function stampTime(now: Date, realNow: Date | null): Date {
  return realNow && now.getTime() > realNow.getTime() ? realNow : now
}

/**
 * Record a completion on the local calendar date of `now` (never after the
 * real date), and count it. Seeded sample history passes counts: false, and
 * realNow: null because it is laid out around the app's own today.
 */
export function completeChore(
  chore: Chore,
  progress: Progress | null,
  now: Date = new Date(),
  { counts = true, realNow = new Date() }: { counts?: boolean; realNow?: Date | null } = {},
): NewOp[] {
  const at = stampTime(now, realNow)
  const ops: NewOp[] = [upsertOp('completions', { id: id(), choreId: chore.id, completedAt: at.toISOString(), completedOn: toISODate(at), counts })]
  if (progress) ops.push(upsertOp('progress', { ...progress, choreCount: progress.choreCount + 1 }))
  return ops
}

/**
 * Take back a completion tapped by mistake (the undo after Done). The chore
 * count follows, since it is worked out from completions; a reward that tap
 * earned stays, because rewards are never taken away.
 */
export function uncompleteChore(completionId: string, progress: Progress | null, completions: Completion[]): NewOp[] {
  const ops: NewOp[] = [deleteOp('completions', completionId)]
  if (progress) {
    const left = completions.filter((c) => c.id !== completionId)
    ops.push(upsertOp('progress', { ...progress, choreCount: choreCountOf(left, progress.retired) }))
  }
  return ops
}

/**
 * Finish a chore and count it toward rewards: records the completion (at
 * `now`, never after the real clock `realNow`), bumps the chore count, works
 * out today's streak with this completion included, and returns any rewards
 * newly earned so the UI can open a gift for each.
 */
export function completeChoreWithRewards(
  chore: Chore,
  progress: Progress | null,
  context: { chores: Chore[]; completions: Completion[]; vacations: VacationWindow[] },
  now: Date = new Date(),
  realNow: Date = new Date(),
): { ops: NewOp[]; unlocked: Unlock[]; completion?: Completion } {
  const at = stampTime(now, realNow)
  const completion: Completion = { id: id(), choreId: chore.id, completedAt: at.toISOString(), completedOn: toISODate(at), counts: true }
  // A repeat the schedule ignores (same day, or a second early one) is neither recorded nor counted.
  if (!completionCounts(chore, context.completions, completion.completedOn)) return { ops: [], unlocked: [] }
  const ops: NewOp[] = [upsertOp('completions', completion)]
  if (!progress) return { ops, unlocked: [], completion }
  const streak = currentStreak(context.chores, [...context.completions, completion], completion.completedOn, context.vacations)
  const choreCount = choreCountOf([...context.completions, completion], progress.retired)
  const result = applyUnlocks({ ...progress, choreCount }, streak)
  ops.push(upsertOp('progress', result.progress))
  return { ops, unlocked: result.unlocked, completion }
}

export function setVacations(home: Home, vacations: VacationWindow[]): NewOp[] {
  const sorted = [...vacations].sort((a, b) => a.start.localeCompare(b.start))
  return [upsertOp('homes', { ...home, vacations: sorted })]
}

export function updatePet(pet: Pet, patch: Partial<Omit<Pet, 'id' | 'homeId'>>): NewOp[] {
  return [upsertOp('pets', { ...pet, ...patch })]
}

/** Remove a whole home. Rooms, objects, chores, history, pet and progress go with it (the database cascades the same way). */
export function removeHome(homeId: string): NewOp[] {
  return [deleteOp('homes', homeId)]
}

/** Keep everything in a sample home and make it the player's own by renaming it away from the sample name. */
export function adoptSample(home: Home, name = 'Home'): NewOp[] {
  return [upsertOp('homes', { ...home, name: name.trim() || 'Home' })]
}
