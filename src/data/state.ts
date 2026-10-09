import { toISODate } from '../domain/dates'
import { archiveEnd } from '../domain/schedule'
import type { Chore, Completion, Home, Pet, PlacedObject, Progress, Room } from '../domain/types'
import { applyUnlocks, choreCountOf } from '../domain/unlocks'
import { CASCADES, TABLES, keyOf, type Created, type TableMap, type TableName } from './tables'

// Pure state for the offline-first data layer. No IO here, so it's all testable.
//
// Sync rule: the local copy is what the UI reads. Every change is applied
// locally and queued in the outbox. The outbox keeps only the latest change
// per row, and flushing sends whole rows, so the last write to reach the
// server wins per row. After a flush we pull everything and re-apply anything
// still queued on top, so unsynced local edits are never lost.

export type Tables = { [T in TableName]: Record<string, TableMap[T]> }

/** Extra intent for an atomic furniture removal. Missing on old queued deletes. */
export interface Removal {
  archivedOn?: string
  keepChores?: boolean
  /**
   * On a home's clear op (see clearOp): clear on the server everything in the
   * home stored before this moment (an ISO time), including rows this device
   * hasn't pulled yet. Rows added after it, on any device, stay.
   */
  clearBefore?: string
}

/** The outbox key of a home's clear op, kept apart from the home row's own key so neither replaces the other. */
const CLEAR_PREFIX = 'clear:'

/**
 * "Clear room and chores" as one server instruction (the clear_home RPC,
 * migration 0008), sent after the per-row changes that clear the device's own
 * copy. Locally it changes nothing; it exists so rows another device added and
 * this one hasn't pulled are cleared too.
 */
export function clearOp(homeId: string, archivedOn: string, clearBefore: string): NewOp {
  return { table: 'homes', kind: 'delete', key: CLEAR_PREFIX + homeId, removal: { archivedOn, clearBefore } }
}

/** The home a queued clear op is for, or null for any other op key. */
export function clearedHome(table: TableName, key: string): string | null {
  return table === 'homes' && key.startsWith(CLEAR_PREFIX) ? key.slice(CLEAR_PREFIX.length) : null
}

/**
 * A queued change. `seq` orders changes within a snapshot; `id` tells two
 * changes apart across tabs, whose seq counters can collide (missing on
 * changes queued before ids existed).
 */
export type Op =
  | { [T in TableName]: { table: T; kind: 'upsert'; key: string; value: TableMap[T]; seq: number; id?: string } }[TableName]
  | { table: TableName; kind: 'delete'; key: string; seq: number; id?: string; removal?: Removal }

/** A change before it is queued (no sequence number or id yet). */
export type NewOp = Op extends infer O ? (O extends Op ? Omit<O, 'seq' | 'id'> : never) : never

/** Latest pending change per row, keyed `${table}:${key}`. */
export type Outbox = Record<string, Op>

export interface AccountCleanup {
  kind: 'sign-out' | 'delete'
  ownerId: string | null
  stage: 'prepared' | 'server-deleted' | 'local-cleared'
  serverDeleted?: boolean
  deviceOnly?: boolean
  backup?: boolean
  forNext?: boolean
}

export interface Snapshot {
  /** Missing on legacy caches: never assume those belonged to a guest. */
  ownerKind?: 'guest' | 'saved'
  /** Device-local choice, scoped to this snapshot's user and reset generation. */
  activeHomeId?: string
  /** Stops sync until a partially completed account operation is retried. */
  cleanup?: AccountCleanup
  /** The account this data belongs to. null until a session first appears (offline first launch). */
  userId: string | null
  tables: Tables
  outbox: Outbox
  /** Monotonic counter for op sequence numbers. */
  seq: number
  /**
   * Changes the server refused for good (or kept refusing), set aside so they
   * stop blocking the queue but are never dropped silently. Missing on
   * snapshots saved before this existed.
   */
  rejected?: RejectedOp[]
  /** When `tables` last came from the server (an ISO time), so tabs can tell whose copy is fresher. */
  pulledAt?: string
  /**
   * On a backup only: the account it may be offered back to (missing means its
   * own account). A guest home replaced by a sign-in is held for the account
   * that replaced it, so a shared browser never offers one person's home to
   * the next.
   */
  heldFor?: string | null
  /**
   * On the stored copy only: changes each time this device is reset (sign-out,
   * account deletion). A tab still holding an older one must not write over it.
   */
  generation?: string
  /**
   * On a backup only: the restore that last wrote it (a swapped-out copy) or
   * claimed it (the copy being brought back), so that restore only ever
   * deletes its own copy, never a newer one written over it.
   */
  restoreToken?: string
}

/**
 * heldFor of a guest's home kept at sign-out: the guest can never sign back in,
 * so it is held for whoever uses this device next (the first account to claim
 * the device takes it over).
 */
export const HELD_FOR_NEXT = 'next-on-this-device'

/** The account a backup may be offered back to. */
export function heldFor(backup: Snapshot): string | null {
  return backup.heldFor !== undefined ? backup.heldFor : backup.userId
}

export interface RejectedOp {
  op: Op
  /** What the server said. */
  message: string
  /** When it was set aside, as an ISO timestamp. */
  at: string
}

export function emptyTables(): Tables {
  return { homes: {}, rooms: {}, placed_objects: {}, chores: {}, completions: {}, pets: {}, progress: {} }
}

export function emptySnapshot(userId: string | null = null): Snapshot {
  return { userId, tables: emptyTables(), outbox: {}, seq: 0, rejected: [] }
}

function newOpId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Identifies one queued change, even across tabs. */
export function opIdOf(op: Op): string {
  return op.id ?? `${op.table}:${op.key}#${op.seq}`
}

function sameOp(a: Op | undefined, b: Op | undefined): boolean {
  if (!a || !b) return a === b
  return opIdOf(a) === opIdOf(b) && a.seq === b.seq
}

function outboxKey(table: TableName, key: string): string {
  return `${table}:${key}`
}

/** Remove a row and, like the database, every row that cascades from it. */
function removeCascading(tables: Tables, table: TableName, key: string, removal: Removal = {}, hard = false): Tables {
  const archivedOn = removal.archivedOn ?? toISODate(new Date())
  if (table === 'chores' && !hard) {
    const chore = tables.chores[key]
    return chore ? { ...tables, chores: { ...tables.chores, [key]: { ...chore, archivedOn: archiveEnd(chore, archivedOn) } } } : tables
  }
  if (table === 'placed_objects' && !hard) {
    tables = { ...tables, chores: Object.fromEntries(Object.entries(tables.chores).map(([id, chore]) => [id, chore.objectId === key
      ? { ...chore, objectId: null, ...(!removal.keepChores && { archivedOn: archiveEnd(chore, archivedOn) }) }
      : chore])) }
  }
  let next = { ...tables, [table]: { ...tables[table] } } as Tables
  delete (next[table] as Record<string, unknown>)[key]
  for (const c of CASCADES) {
    if (c.parent !== table) continue
    for (const [childKey, row] of Object.entries(next[c.child] as Record<string, never>)) {
      if (c.fk(row) === key) next = removeCascading(next, c.child, childKey, removal, hard || table === 'homes')
    }
  }
  return next
}

export function applyOp(tables: Tables, op: Op): Tables {
  // A clear is a server instruction; the device's copy is cleared by the ops sent with it.
  if (op.kind === 'delete' && clearedHome(op.table, op.key)) return tables
  if (op.kind === 'delete') return removeCascading(tables, op.table, op.key, op.removal)
  // A delayed edit cannot reopen an archived task or rewrite its old schedule.
  // Only an earlier end date gets through, so removals settle on the earliest (as the server does).
  if (op.table === 'chores' && tables.chores[op.key]?.archivedOn) {
    const old = tables.chores[op.key]
    const end = op.value.archivedOn ? archiveEnd(old, op.value.archivedOn) : old.archivedOn
    return { ...tables, chores: { ...tables.chores, [op.key]: { ...old, archivedOn: end, objectId: op.value.objectId === null ? null : old.objectId } } }
  }
  return { ...tables, [op.table]: { ...tables[op.table], [op.key]: op.value } }
}

/** Apply a change locally and queue it, replacing any older queued change to the same row. */
export function change(snapshot: Snapshot, op: NewOp): Snapshot {
  if (op.kind === 'delete' && op.table === 'placed_objects') {
    // Save even never-synced tasks detached before dropping their object's upsert.
    for (const chore of Object.values(snapshot.tables.chores)) {
      if (chore.objectId !== op.key) continue
      snapshot = change(snapshot, upsertOp('chores', { ...chore, objectId: null,
        ...(!op.removal?.keepChores && { archivedOn: archiveEnd(chore, op.removal?.archivedOn ?? toISODate(new Date())) }),
      }))
    }
  }
  if (op.kind === 'delete' && op.table === 'chores' && snapshot.tables.chores[op.key]) {
    const chore = snapshot.tables.chores[op.key]
    return change(snapshot, upsertOp('chores', { ...chore, archivedOn: archiveEnd(chore, op.removal?.archivedOn ?? toISODate(new Date())) }))
  }
  const seq = snapshot.seq + 1
  const full = { ...op, seq, id: newOpId() } as Op
  const key = outboxKey(op.table, op.key)
  const tables = applyOp(snapshot.tables, full)
  const outbox = { ...snapshot.outbox, [key]: full }
  if (op.kind !== 'delete') return { ...snapshot, seq, tables, outbox }

  // Rows that went with it (the cascade) have nothing left to send, queued or set aside:
  // the server removes them the same way, and a child of a row that never reached it
  // would only be refused.
  const removed = new Map<TableName, Set<string>>(TABLES.map((t) => [t, new Set(Object.keys(snapshot.tables[t]).filter((k) => !(k in tables[t])))]))
  if (!(op.key in tables[op.table])) removed.get(op.table)!.add(op.key)
  const under = (o: Op) =>
    o.kind === 'upsert' &&
    (removed.get(o.table)!.has(o.key) || CASCADES.some((c) => c.child === o.table && removed.get(c.parent)!.has(c.fk(o.value as never) ?? '')))
  for (const [k, queued] of Object.entries(outbox)) if (k !== key && under(queued)) delete outbox[k]
  // Set-aside rows may hang under other set-aside rows (not in the tables), so follow them down.
  let rejected = snapshot.rejected
  for (let grew = true; grew && rejected?.length; ) {
    grew = false
    rejected = rejected.filter((r) => {
      if (!under(r.op)) return true
      removed.get(r.op.table)!.add(r.op.key)
      grew = true
      return false
    })
  }
  return { ...snapshot, seq, tables, outbox, ...(rejected && { rejected }) }
}

export function upsertOp<T extends TableName>(table: T, value: TableMap[T]): NewOp {
  return { table, kind: 'upsert', key: keyOf(table, value), value } as NewOp
}

export function deleteOp(table: TableName, key: string): NewOp {
  return { table, kind: 'delete', key }
}

export interface FlushStep {
  table: TableName
  kind: 'upsert' | 'delete'
  ops: Op[]
}

/**
 * Group queued ops into one request per table and kind, ordered so foreign
 * keys hold: upserts parents-first, then deletes children-first.
 */
export function planFlush(outbox: Outbox): FlushStep[] {
  const ops = Object.values(outbox)
  const steps: FlushStep[] = []
  for (const table of TABLES) {
    const batch = ops.filter((o) => o.table === table && o.kind === 'upsert')
    if (batch.length) steps.push({ table, kind: 'upsert', ops: batch })
  }
  for (const table of [...TABLES].reverse()) {
    const batch = ops.filter((o) => o.table === table && o.kind === 'delete')
    const groups = new Map<string, Op[]>()
    for (const op of batch) {
      const key = JSON.stringify(op.kind === 'delete' ? op.removal ?? {} : {})
      groups.set(key, [...(groups.get(key) ?? []), op])
    }
    for (const ops of groups.values()) steps.push({ table, kind: 'delete', ops })
  }
  return steps
}

/** Drop ops that were sent, unless the row changed again while they were in flight. */
export function acknowledge(outbox: Outbox, sent: Op[]): Outbox {
  const next = { ...outbox }
  for (const op of sent) {
    const k = outboxKey(op.table, op.key)
    if (sameOp(next[k], op)) delete next[k]
  }
  return next
}

/**
 * Take refused changes out of the queue and keep them on the snapshot's
 * rejected list. A change already replaced by a newer one to the same row is
 * moot (the newer one gets its own try), so it isn't kept.
 */
export function reject(snapshot: Snapshot, ops: Op[], message: string, at: string): Snapshot {
  const current = ops.filter((op) => sameOp(snapshot.outbox[outboxKey(op.table, op.key)], op))
  const gone = new Set(current.map(opIdOf))
  const kept = (snapshot.rejected ?? []).filter((r) => !gone.has(opIdOf(r.op)))
  return {
    ...snapshot,
    outbox: acknowledge(snapshot.outbox, current),
    rejected: [...kept, ...current.map((op) => ({ op, message, at }))],
  }
}

/** Queue rejected changes again (fresh sequence numbers, so they win over nothing newer). */
export function requeueRejected(snapshot: Snapshot): Snapshot {
  const rejected = snapshot.rejected ?? []
  const cleared: Snapshot = { ...snapshot, rejected: [] }
  return rejected
    .filter((r) => !cleared.outbox[outboxKey(r.op.table, r.op.key)]) // a newer change to the row wins
    .sort((a, b) => a.op.seq - b.op.seq)
    .reduce((s, r) => change(s, stripQueue(r.op)), cleared)
}

function stripQueue(op: Op): NewOp {
  const { seq: _seq, id: _id, ...rest } = op
  return rest as NewOp
}

/** Server state with everything still queued re-applied on top. */
/**
 * The server's rooms, keeping the madeAt this device gave them when the server has none (rooms
 * from before made_at, or written by an older app): rooms sent up together get the same server
 * creation time, and madeAt is what still tells them apart.
 */
export function keepMadeAt(server: Tables, local: Tables): Tables {
  let rooms: Tables['rooms'] | null = null
  for (const [key, room] of Object.entries(server.rooms)) {
    const madeAt = local.rooms[key]?.madeAt
    if (madeAt && !room.madeAt) (rooms ??= { ...server.rooms })[key] = { ...room, madeAt }
  }
  return rooms ? { ...server, rooms } : server
}

export function rebase(server: Tables, outbox: Outbox): Tables {
  return Object.values(outbox)
    .sort((a, b) => a.seq - b.seq)
    .reduce(applyOp, server)
}

/**
 * Decide what to keep when a session appears. Data made before any session
 * (offline first launch) is adopted by the new account; data that belongs to
 * a different account is dropped.
 */
export function claim(snapshot: Snapshot, userId: string): Snapshot {
  if (snapshot.userId === userId) return snapshot
  if (snapshot.userId === null) return { ...snapshot, userId }
  return emptySnapshot(userId)
}

/** Whether claim() would drop this snapshot for `userId`. */
export function claimDrops(snapshot: Snapshot, userId: string): boolean {
  return snapshot.userId !== null && snapshot.userId !== userId
}

/**
 * Worth a backup before it is dropped: anything not yet on the server, or any
 * home at all (a guest's home lives only under its anonymous account, which is
 * gone once this device signs in elsewhere).
 */
export function worthBackingUp(snapshot: Snapshot): boolean {
  return (
    Object.keys(snapshot.outbox).length > 0 ||
    (snapshot.rejected?.length ?? 0) > 0 ||
    Object.keys(snapshot.tables.homes).length > 0
  )
}

/**
 * Fold what another tab saved (`stored`) into this tab's snapshot (`mine`).
 * `base` is what this tab last read from or wrote to storage, so each queued
 * row gets a three-way merge: a change the other tab sent is gone from
 * storage but was in base, while one it never saw is missing from both.
 * Changes only the other tab made are applied to this tab's tables.
 *
 * When the two belong to different accounts, `prefer` decides: a save keeps
 * this tab's (it is the newer decision), a reload takes the stored one.
 */
export function mergeSnapshots(mine: Snapshot, base: Snapshot | null, stored: Snapshot, prefer: 'mine' | 'stored'): Snapshot {
  if (mine.userId !== null && stored.userId !== null && mine.userId !== stored.userId) return prefer === 'mine' ? mine : stored
  const baseOutbox = base?.outbox ?? {}
  const outbox: Outbox = {}
  const incoming: Op[] = []
  const take = (op: Op | undefined) => {
    if (op) incoming.push(op)
    return op
  }
  for (const k of new Set([...Object.keys(mine.outbox), ...Object.keys(stored.outbox), ...Object.keys(baseOutbox)])) {
    const m = mine.outbox[k]
    const s = stored.outbox[k]
    const b = baseOutbox[k]
    let pick: Op | undefined
    if (sameOp(m, s) || sameOp(b, s)) pick = m // nothing new from the other tab
    else if (sameOp(b, m)) pick = take(s) // only the other tab changed it (or sent it)
    else if (!m) pick = take(s) // this tab sent it; the other tab changed it again
    else if (!s) pick = m // the other tab sent it; this tab changed it again
    else pick = s.seq > m.seq || (s.seq === m.seq && opIdOf(s) > opIdOf(m)) ? take(s) : m
    if (pick) outbox[k] = pick
  }

  const baseRejected = new Set((base?.rejected ?? []).map((r) => opIdOf(r.op)))
  const storedRejected = new Set((stored.rejected ?? []).map((r) => opIdOf(r.op)))
  const rejected = [
    ...(mine.rejected ?? []).filter((r) => storedRejected.has(opIdOf(r.op)) || !baseRejected.has(opIdOf(r.op))),
    ...(stored.rejected ?? []).filter((r) => !baseRejected.has(opIdOf(r.op)) && !(mine.rejected ?? []).some((x) => opIdOf(x.op) === opIdOf(r.op))),
  ]

  const userId = mine.userId ?? stored.userId
  const seq = Math.max(mine.seq, stored.seq)
  // The other tab pulled from the server more recently: its tables are the fresher view
  // of the server (renames, deletions, rows from other devices), with every pending change
  // still to send applied on top.
  const fresher = stored.pulledAt !== undefined && (mine.pulledAt === undefined || stored.pulledAt > mine.pulledAt)
  const cleanup = JSON.stringify(stored.cleanup) !== JSON.stringify(base?.cleanup) ? stored.cleanup : mine.cleanup
  const activeHomeId = stored.activeHomeId !== base?.activeHomeId && mine.activeHomeId === base?.activeHomeId ? stored.activeHomeId : mine.activeHomeId
  const ownerKind = mine.ownerKind === 'saved' || stored.ownerKind === 'saved' ? 'saved' : mine.ownerKind ?? stored.ownerKind
  const unchanged =
    cleanup === mine.cleanup && activeHomeId === mine.activeHomeId && ownerKind === mine.ownerKind &&
    !fresher &&
    incoming.length === 0 &&
    userId === mine.userId &&
    seq === mine.seq &&
    Object.keys(outbox).length === Object.keys(mine.outbox).length &&
    Object.keys(outbox).every((k) => outbox[k] === mine.outbox[k]) &&
    rejected.length === (mine.rejected ?? []).length &&
    rejected.every((r, i) => r === mine.rejected?.[i])
  if (unchanged) return mine
  return {
    ...mine,
    cleanup, activeHomeId, ownerKind,
    userId,
    tables: fresher ? rebase(stored.tables, outbox) : incoming.sort((a, b) => a.seq - b.seq).reduce(applyOp, mine.tables),
    outbox,
    seq,
    rejected,
    ...((fresher ? stored.pulledAt : mine.pulledAt) !== undefined && { pulledAt: fresher ? stored.pulledAt : mine.pulledAt }),
  }
}

/** Row by row, what one copy of the tables changed since another: rows added or changed, and rows removed. */
export interface TableChanges {
  put: { table: TableName; key: string; row: unknown }[]
  removed: { table: TableName; key: string }[]
}

/** What `after` changed since `before`. */
export function tableChanges(before: Tables, after: Tables): TableChanges {
  const changes: TableChanges = { put: [], removed: [] }
  for (const table of TABLES) {
    const was = before[table] as Record<string, unknown>
    const now = after[table] as Record<string, unknown>
    for (const [key, row] of Object.entries(now)) if (!(key in was) || JSON.stringify(was[key]) !== JSON.stringify(row)) changes.put.push({ table, key, row })
    for (const key of Object.keys(was)) if (!(key in now)) changes.removed.push({ table, key })
  }
  return changes
}

/** The changes `tables` doesn't have yet (none when it already matches them). */
export function unapplied(changes: TableChanges, tables: Tables): TableChanges {
  const rows = (table: TableName) => tables[table] as Record<string, unknown>
  return {
    put: changes.put.filter(({ table, key, row }) => JSON.stringify(rows(table)[key]) !== JSON.stringify(row)),
    removed: changes.removed.filter(({ table, key }) => key in rows(table)),
  }
}

/** `tables` with the changes made. */
export function withChanges(tables: Tables, changes: TableChanges): Tables {
  const out = { ...tables } as Record<TableName, Record<string, unknown>>
  for (const { table, key, row } of changes.put) out[table] = { ...out[table], [key]: row }
  for (const { table, key } of changes.removed) {
    const { [key]: _gone, ...rest } = out[table]
    out[table] = rest
  }
  return out as Tables
}

/** A home kept on this device (a backup), as offered back to the player. */
export interface SavedHome {
  ownerId: string
  homeId: string
  petName: string
  species: Pet['species']
  bodyColour: string
  choreCount: number
}

/** What a backup holds, for offering it back; null when it holds no home with a pet. */
export function savedHomeOf(ownerId: string, snapshot: Snapshot): SavedHome | null {
  const { home, pet, chores } = selectHome(snapshot.tables, snapshot.activeHomeId)
  if (!home || !pet) return null
  return { ownerId, homeId: home.id, petName: pet.name, species: pet.species, bodyColour: pet.bodyColour, choreCount: chores.length }
}

/** Everything the app shows for the player's home. One home per account for now. */
export interface HomeData {
  home: Home | null
  pet: Pet | null
  progress: Progress | null
  rooms: Room[]
  objects: PlacedObject[]
  /** Includes archives: history/rewards need all rows; current UI uses choreActiveOn. */
  chores: Chore[]
  completions: Completion[]
}

/** Server creation time, or last when the row has not been pulled yet. */
function createdTime(row: Created): number {
  const t = row.createdAt ? Date.parse(row.createdAt) : Number.NaN
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

/**
 * Oldest first; rows not yet on the server last; rows with the same server time (or none) in the
 * order this device made them; ties by id so the order never flips.
 */
function byCreation(a: Created & { id: string }, b: Created & { id: string }): number {
  const ta = createdTime(a)
  const tb = createdTime(b)
  if (ta !== tb) return ta < tb ? -1 : 1
  // Same server time (sent up together) or none yet: the order this device made them in.
  // Rows from before madeAt existed sort first: they were made earlier.
  if ((a.madeAt ?? '') !== (b.madeAt ?? '')) return (a.madeAt ?? '') < (b.madeAt ?? '') ? -1 : 1
  return a.id.localeCompare(b.id)
}

/**
 * The home to show when an account somehow has several (two devices
 * onboarding offline): the one with the most placed objects, which is the one
 * being lived in, then the oldest. Used once when no valid persisted choice exists.
 */
function pickHome(tables: Tables): (Home & Created) | null {
  const homes = Object.values(tables.homes)
  if (homes.length <= 1) return homes[0] ?? null
  const homeOfRoom = new Map(Object.values(tables.rooms).map((r) => [r.id, r.homeId]))
  const objects = new Map<string, number>()
  for (const o of Object.values(tables.placed_objects)) {
    const h = homeOfRoom.get(o.roomId)
    if (h) objects.set(h, (objects.get(h) ?? 0) + 1)
  }
  return homes.sort((a, b) => (objects.get(b.id) ?? 0) - (objects.get(a.id) ?? 0) || byCreation(a, b))[0]
}

export function selectHome(tables: Tables, activeHomeId?: string): HomeData {
  const home = (activeHomeId && tables.homes[activeHomeId]) || pickHome(tables)
  if (!home) return { home: null, pet: null, progress: null, rooms: [], objects: [], chores: [], completions: [] }
  const rooms = Object.values(tables.rooms)
    .filter((r) => r.homeId === home.id)
    .sort(byCreation)
  const roomIds = new Set(rooms.map((r) => r.id))
  const chores = Object.values(tables.chores)
    .filter((c) => c.homeId === home.id)
    .sort((a, b) => a.createdOn.localeCompare(b.createdOn) || a.name.localeCompare(b.name))
  const choreIds = new Set(chores.map((c) => c.id))
  const completions = Object.values(tables.completions).filter((c) => choreIds.has(c.choreId))
  const stored = tables.progress[home.id] ?? null
  return {
    home,
    pet: Object.values(tables.pets).find((p) => p.homeId === home.id) ?? null,
    // The chore count comes from the completions themselves, so it is right whichever device recorded them.
    // Live chore ids, so a deleted chore's completions still waiting to be removed aren't counted on top of its banked count.
    progress: stored && { ...stored, choreCount: choreCountOf(completions, stored.retired, choreIds) },
    rooms,
    objects: Object.values(tables.placed_objects).filter((o) => roomIds.has(o.roomId)),
    chores,
    completions,
  }
}

/**
 * Repairs for a home whose progress row is missing (a refused or lost
 * upsert): recreate it, with the chore count and every reward it has earned.
 * Only run once the server's copy has been pulled (or with no server), or a
 * fresh row could overwrite the real one's streak.
 */
export function repairOps(tables: Tables, activeHomeId?: string): NewOp[] {
  const { home, completions, chores } = selectHome(tables, activeHomeId)
  if (!home || tables.progress[home.id]) return []
  const choreCount = choreCountOf(completions, {}, new Set(chores.map((c) => c.id)))
  const { progress } = applyUnlocks({ homeId: home.id, choreCount, retired: {}, currentStreak: 0, bestStreak: 0, unlockedItems: [] }, 0)
  return [upsertOp('progress', progress)]
}
