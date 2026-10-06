import type { Chore, Completion, Home, Pet, PlacedObject, Progress, Room } from '../domain/types'

/** Every synced table and the domain type its rows map to. */
export interface TableMap {
  homes: Home
  rooms: Room
  placed_objects: PlacedObject
  chores: Chore
  completions: Completion
  pets: Pet
  progress: Progress
}

export type TableName = keyof TableMap

/** Parents before children: the order upserts are sent in (deletes go in reverse). */
export const TABLES: readonly TableName[] = ['homes', 'rooms', 'placed_objects', 'chores', 'completions', 'pets', 'progress']

/** Primary key of a row. Progress is keyed by its home; everything else by id. */
export function keyOf<T extends TableName>(table: T, row: TableMap[T]): string {
  return table === 'progress' ? (row as Progress).homeId : (row as { id: string }).id
}

/**
 * Foreign keys that cascade on delete in the schema (supabase/migrations),
 * mirrored here so a local delete removes the same rows the server will.
 */
export const CASCADES: readonly { parent: TableName; child: TableName; fk: (row: never) => string | null }[] = [
  { parent: 'homes', child: 'rooms', fk: (r: Room) => r.homeId },
  { parent: 'homes', child: 'chores', fk: (r: Chore) => r.homeId },
  { parent: 'homes', child: 'pets', fk: (r: Pet) => r.homeId },
  { parent: 'homes', child: 'progress', fk: (r: Progress) => r.homeId },
  { parent: 'rooms', child: 'placed_objects', fk: (r: PlacedObject) => r.roomId },
  { parent: 'placed_objects', child: 'chores', fk: (r: Chore) => r.objectId },
  { parent: 'chores', child: 'completions', fk: (r: Completion) => r.choreId },
]
