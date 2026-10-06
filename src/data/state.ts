import type { Chore, Completion, Home, Pet, PlacedObject, Progress, Room } from '../domain/types'
import { CASCADES, TABLES, keyOf, type TableMap, type TableName } from './tables'

// Pure state for the offline-first data layer. No IO here, so it's all testable.
//
// Sync rule: the local copy is what the UI reads. Every change is applied
// locally and queued in the outbox. The outbox keeps only the latest change
// per row, and flushing sends whole rows, so the last write to reach the
// server wins per row. After a flush we pull everything and re-apply anything
// still queued on top, so unsynced local edits are never lost.

export type Tables = { [T in TableName]: Record<string, TableMap[T]> }

export type Op =
  | { [T in TableName]: { table: T; kind: 'upsert'; key: string; value: TableMap[T]; seq: number } }[TableName]
  | { table: TableName; kind: 'delete'; key: string; seq: number }

/** Latest pending change per row, keyed `${table}:${key}`. */
export type Outbox = Record<string, Op>

export interface Snapshot {
  /** The account this data belongs to. null until a session first appears (offline first launch). */
  userId: string | null
  tables: Tables
  outbox: Outbox
  /** Monotonic counter for op sequence numbers. */
  seq: number
}

export function emptyTables(): Tables {
  return { homes: {}, rooms: {}, placed_objects: {}, chores: {}, completions: {}, pets: {}, progress: {} }
}

export function emptySnapshot(userId: string | null = null): Snapshot {
  return { userId, tables: emptyTables(), outbox: {}, seq: 0 }
}

function outboxKey(table: TableName, key: string): string {
  return `${table}:${key}`
}

/** Remove a row and, like the database, every row that cascades from it. */
function removeCascading(tables: Tables, table: TableName, key: string): Tables {
  let next = { ...tables, [table]: { ...tables[table] } } as Tables
  delete (next[table] as Record<string, unknown>)[key]
  for (const c of CASCADES) {
    if (c.parent !== table) continue
    for (const [childKey, row] of Object.entries(next[c.child] as Record<string, never>)) {
      if (c.fk(row) === key) next = removeCascading(next, c.child, childKey)
    }
  }
  return next
}

export function applyOp(tables: Tables, op: Op): Tables {
  if (op.kind === 'delete') return removeCascading(tables, op.table, op.key)
  return { ...tables, [op.table]: { ...tables[op.table], [op.key]: op.value } }
}

/** Apply a change locally and queue it, replacing any older queued change to the same row. */
export function change(snapshot: Snapshot, op: Omit<Op, 'seq'>): Snapshot {
  const seq = snapshot.seq + 1
  const full = { ...op, seq } as Op
  return {
    ...snapshot,
    seq,
    tables: applyOp(snapshot.tables, full),
    outbox: { ...snapshot.outbox, [outboxKey(op.table, op.key)]: full },
  }
}

export function upsertOp<T extends TableName>(table: T, value: TableMap[T]): Omit<Op, 'seq'> {
  return { table, kind: 'upsert', key: keyOf(table, value), value } as Omit<Op, 'seq'>
}

export function deleteOp(table: TableName, key: string): Omit<Op, 'seq'> {
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
    if (batch.length) steps.push({ table, kind: 'delete', ops: batch })
  }
  return steps
}

/** Drop ops that were sent, unless the row changed again while they were in flight. */
export function acknowledge(outbox: Outbox, sent: Op[]): Outbox {
  const next = { ...outbox }
  for (const op of sent) {
    const k = outboxKey(op.table, op.key)
    if (next[k]?.seq === op.seq) delete next[k]
  }
  return next
}

/** Server state with everything still queued re-applied on top. */
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

/** Everything the app shows for the player's home. One home per account for now. */
export interface HomeData {
  home: Home | null
  pet: Pet | null
  progress: Progress | null
  rooms: Room[]
  objects: PlacedObject[]
  chores: Chore[]
  completions: Completion[]
}

export function selectHome(tables: Tables): HomeData {
  // Sorted so a stray second home (two devices onboarding offline) never flips which one shows.
  const home = Object.values(tables.homes).sort((a, b) => a.id.localeCompare(b.id))[0] ?? null
  if (!home) return { home: null, pet: null, progress: null, rooms: [], objects: [], chores: [], completions: [] }
  const rooms = Object.values(tables.rooms).filter((r) => r.homeId === home.id)
  const roomIds = new Set(rooms.map((r) => r.id))
  const chores = Object.values(tables.chores)
    .filter((c) => c.homeId === home.id)
    .sort((a, b) => a.createdOn.localeCompare(b.createdOn) || a.name.localeCompare(b.name))
  const choreIds = new Set(chores.map((c) => c.id))
  return {
    home,
    pet: Object.values(tables.pets).find((p) => p.homeId === home.id) ?? null,
    progress: tables.progress[home.id] ?? null,
    rooms,
    objects: Object.values(tables.placed_objects).filter((o) => roomIds.has(o.roomId)),
    chores,
    completions: Object.values(tables.completions).filter((c) => choreIds.has(c.choreId)),
  }
}
