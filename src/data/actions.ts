import { SPECIES_COLOUR } from '../art/palette'
import { toISODate } from '../domain/dates'
import { archiveEnd, choreRetiredBy, completionCounts, resumeFrom, sameSchedule, SCHEDULE_HISTORY, SKIP_HISTORY, skipDays, trimHistory } from '../domain/schedule'
import type { CatalogEntry } from '../catalog/types'
import { applyUnlocks, choreCountOf, streakHistory, type Unlock } from '../domain/unlocks'
import type { Chore, Completion, Home, ISODate, Pet, PlacedObject, Progress, Room, RoomType, Schedule, Species, VacationWindow } from '../domain/types'
import { clearOp, deleteOp, selectHome, upsertOp, type NewOp, type Snapshot } from './state'

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

/** The retained history available when removing a chore or object. */
export interface History {
  progress: Progress | null
  chores: Chore[]
  completions: Completion[]
}

/** Remove furniture atomically, retaining its tasks as history or keeping them active. */
export function removeObject(objectId: string, _history?: History, today = toISODate(new Date()), keepChores = false): NewOp[] {
  return [{ ...deleteOp('placed_objects', objectId), removal: { archivedOn: today, keepChores } } as NewOp]
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
  const { before: _ignored, skips: _skips, ...next } = schedule
  const before = previous && trimHistory(previous, SCHEDULE_HISTORY - 1)
  // Skips stay with the chore: they are history, like its completions.
  const skips = chore.schedule.skips
  return [upsertOp('chores', { ...chore, ...rest, schedule: { ...next, since: today, ...(before && { before }), ...(skips?.length && { skips }) } as Schedule })]
}

/**
 * "Skip this time": the round owed on `today` isn't needed (no laundry this
 * week, ate out). It settles the round like a completion, so nothing turns
 * messy or late, but it is no completion: no reward, no streak day (see
 * Schedule.skips). The UI offers it only while the round is owed (canSkip).
 */
export function skipChore(chore: Chore, today: ISODate): NewOp[] {
  const days = skipDays(chore)
  if (days.includes(today)) return []
  const skips = [...days, today].sort().slice(-SKIP_HISTORY)
  return [upsertOp('chores', { ...chore, schedule: { ...chore.schedule, skips } })]
}

/** Take back a skip (the undo after skipping). */
export function unskipChore(chore: Chore, day: ISODate): NewOp[] {
  const days = skipDays(chore)
  if (!days.includes(day)) return []
  const skips = days.filter((d) => d !== day)
  const { skips: _old, ...schedule } = chore.schedule
  return [upsertOp('chores', { ...chore, schedule: (skips.length ? { ...schedule, skips } : schedule) as Schedule })]
}

/** Stop future obligations, retaining dated work and the schedule that earned it. */
export function removeChore(choreId: string, history?: History, today = toISODate(new Date())): NewOp[] {
  const chore = history?.chores.find((c) => c.id === choreId)
  return chore
    ? [upsertOp('chores', { ...chore, archivedOn: archiveEnd(chore, today) })]
    : [{ ...deleteOp('chores', choreId), removal: { archivedOn: today } } as NewOp]
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

/** Full retained history, including archived chores, never just today's active list. */
export interface ProgressContext {
  chores: Chore[]
  completions: Completion[]
  vacations: VacationWindow[]
}

/**
 * Recover earned progress after loading, merging, editing or a day rollover.
 * The replay recovers missed milestones even when the current streak has broken.
 * The dev clock may look ahead, but it must not persist future rewards.
 * Passive callers save the ops without replaying gifts; completion callers may
 * present `unlocked`. An unchanged replay returns no ops, so sync settles.
 */
export function reconcileProgress(
  progress: Progress | null,
  context: ProgressContext,
  today: ISODate,
  realToday: ISODate = toISODate(new Date()),
): { ops: NewOp[]; unlocked: Unlock[] } {
  if (!progress) return { ops: [], unlocked: [] }
  const through = today < realToday ? today : realToday
  const completions = context.completions.filter((c) => c.completedOn <= through)
  const history = streakHistory(context.chores, completions, through, context.vacations)
  const choreCount = choreCountOf(completions, progress.retired, context.chores.map((c) => c.id))
  const result = applyUnlocks({ ...progress, choreCount, bestStreak: Math.max(progress.bestStreak, history.bestStreak) }, history.currentStreak)
  // The server keeps its cached count with GREATEST, including after Undo.
  // Screens derive the actual count from history; trying to lower the cache
  // on every pull would cause an endless sync loop. Never award from the cache.
  if (choreCount <= progress.choreCount && result.progress.currentStreak === progress.currentStreak &&
    result.progress.bestStreak === progress.bestStreak && result.unlocked.length === 0) return { ops: [], unlocked: [] }
  return { ops: [upsertOp('progress', result.progress)], unlocked: result.unlocked }
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
  context: ProgressContext,
  now: Date = new Date(),
  realNow: Date = new Date(),
): { ops: NewOp[]; unlocked: Unlock[]; completion?: Completion } {
  const at = stampTime(now, realNow)
  const completion: Completion = { id: id(), choreId: chore.id, completedAt: at.toISOString(), completedOn: toISODate(at), counts: true }
  // A repeat the schedule ignores (same day, or a second early one) is neither recorded nor counted.
  if (!completionCounts(chore, context.completions, completion.completedOn)) return { ops: [], unlocked: [] }
  const ops: NewOp[] = [upsertOp('completions', completion)]
  if (!progress) return { ops, unlocked: [], completion }
  const result = reconcileProgress(progress, { ...context, completions: [...context.completions, completion] }, completion.completedOn, toISODate(realNow))
  ops.push(...result.ops)
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

/**
 * Clear the room and the chore list for a fresh start (a move, or a whole new
 * set of chores), keeping the pet, its looks and everything earned. Furniture
 * goes and every chore still on the list is retired the same way as removing
 * them one by one (one already ending later ends today instead), so past work
 * and rewards stay. Then one clear for the server catches anything another
 * device added before `now` that this one hasn't pulled yet.
 */
export function clearHome(history: History & { home: Home; objects: PlacedObject[] }, today: ISODate, now: Date = new Date()): NewOp[] {
  const placed = new Set(history.objects.map((o) => o.id))
  // Furniture goes keeping its chores (only detached), and each chore this device knows is
  // retired by itself: a chore another device put on that furniture after the clear stays.
  const detached = { ...history, chores: history.chores.map((c) => (c.objectId && placed.has(c.objectId) ? { ...c, objectId: null } : c)) }
  return [
    ...history.objects.flatMap((o) => removeObject(o.id, history, today, true)),
    ...detached.chores.filter((c) => !choreRetiredBy(c, today)).flatMap((c) => removeChore(c.id, detached, today)),
    clearOp(history.home.id, today, now.toISOString()),
  ]
}

/**
 * Add a removed chore back as a new one, starting today. If its current round
 * was already done, it resumes where the old one stood (see resumeFrom): due
 * when the old one would have been, so removing and adding back can neither
 * earn a round twice nor count as missing one.
 */
export function addChoreAgain(
  home: Home,
  chore: Chore,
  input: { name: string; schedule: Schedule; objectId: string | null },
  completions: Completion[],
  today: ISODate,
): NewOp[] {
  const resume = resumeFrom(chore, completions, today, home.vacations)
  return addChore(home, { ...input, schedule: resume ? { ...input.schedule, resume } : input.schedule }, today)
}

/** A row as a new one: the server stamps its own creation time. */
function fresh<T extends object>(row: T): T {
  const { createdAt: _createdAt, ...rest } = row as T & { createdAt?: string }
  return rest as T
}

/**
 * Bring a home kept on this device (a backup) into the current account. Every
 * row gets a new id, since the originals may still belong to another account
 * on the server. The account's current home, if any, is removed first: one
 * home per account. Returns nothing when the backup holds no home.
 */
export function restoreHome(saved: Snapshot, current: Snapshot): NewOp[] {
  const { home, pet, rooms, objects, chores, completions } = selectHome(saved.tables, saved.activeHomeId)
  if (!home) return []
  const progress = saved.tables.progress[home.id]
  const homeId = id()
  const roomIds = new Map(rooms.map((r) => [r.id, id()]))
  const objectIds = new Map(objects.map((o) => [o.id, id()]))
  const choreIds = new Map(chores.map((c) => [c.id, id()]))
  // Every home the account has goes (usually one; more after conflicting offline starts).
  const ops: NewOp[] = Object.keys(current.tables.homes).flatMap((homeKey) => removeHome(homeKey))
  ops.push(upsertOp('homes', { ...fresh(home), id: homeId, ownerId: current.userId ?? home.ownerId }))
  for (const r of rooms) ops.push(upsertOp('rooms', { ...fresh(r), id: roomIds.get(r.id)!, homeId }))
  if (pet) ops.push(upsertOp('pets', { ...fresh(pet), id: id(), homeId }))
  if (progress) {
    // Banked counts of live chores follow them to their new ids; those of deleted chores keep theirs.
    const retired = progress.retired && Object.fromEntries(Object.entries(progress.retired).map(([k, n]) => [choreIds.get(k) ?? k, n]))
    ops.push(upsertOp('progress', { ...fresh(progress), homeId, ...(retired && { retired }) }))
  }
  for (const o of objects) {
    const roomId = roomIds.get(o.roomId)
    if (roomId) ops.push(upsertOp('placed_objects', { ...fresh(o), id: objectIds.get(o.id)!, roomId }))
  }
  for (const c of chores) {
    ops.push(upsertOp('chores', { ...fresh(c), id: choreIds.get(c.id)!, homeId, objectId: c.objectId ? (objectIds.get(c.objectId) ?? null) : null }))
  }
  for (const c of completions) {
    const choreId = choreIds.get(c.choreId)
    if (choreId) ops.push(upsertOp('completions', { ...fresh(c), id: id(), choreId }))
  }
  return ops
}

/** Keep everything in a sample home and make it the player's own by renaming it away from the sample name. */
export function adoptSample(home: Home, name = 'Home'): NewOp[] {
  return [upsertOp('homes', { ...home, name: name.trim() || 'Home' })]
}
