import type { Chore, Completion, Home, Pet, PlacedObject, Progress, Room } from '../domain/types'
import type { TableMap, TableName } from './tables'

// Domain objects (camelCase) <-> database rows (snake_case). owner_id is never
// written: the database fills it from auth.uid() and row-level security checks it.

type Row = Record<string, unknown>

interface Mapper<T> {
  toRow: (value: T) => Row
  fromRow: (row: Row) => T
}

const homes: Mapper<Home> = {
  toRow: (h) => ({ id: h.id, name: h.name, vacations: h.vacations }),
  fromRow: (r) => ({ id: r.id as string, ownerId: r.owner_id as string, name: r.name as string, vacations: (r.vacations as Home['vacations']) ?? [] }),
}

const rooms: Mapper<Room> = {
  toRow: (r) => ({ id: r.id, home_id: r.homeId, type: r.type, floor_style: r.floorStyle, wall_style: r.wallStyle }),
  fromRow: (r) => ({
    id: r.id as string,
    homeId: r.home_id as string,
    type: r.type as Room['type'],
    floorStyle: r.floor_style as string,
    wallStyle: r.wall_style as string,
  }),
}

const placedObjects: Mapper<PlacedObject> = {
  toRow: (o) => ({ id: o.id, room_id: o.roomId, catalog_id: o.catalogId, tile_x: o.tileX, tile_y: o.tileY, rotation: o.rotation }),
  fromRow: (r) => ({
    id: r.id as string,
    roomId: r.room_id as string,
    catalogId: r.catalog_id as string,
    tileX: r.tile_x as number,
    tileY: r.tile_y as number,
    rotation: r.rotation as PlacedObject['rotation'],
  }),
}

const chores: Mapper<Chore> = {
  toRow: (c) => ({
    id: c.id,
    home_id: c.homeId,
    object_id: c.objectId,
    name: c.name,
    schedule: c.schedule,
    created_on: c.createdOn,
    photo_proof: c.photoProof,
  }),
  fromRow: (r) => ({
    id: r.id as string,
    homeId: r.home_id as string,
    objectId: (r.object_id as string | null) ?? null,
    name: r.name as string,
    schedule: r.schedule as Chore['schedule'],
    createdOn: r.created_on as string,
    photoProof: Boolean(r.photo_proof),
  }),
}

const completions: Mapper<Completion> = {
  toRow: (c) => ({ id: c.id, chore_id: c.choreId, completed_at: c.completedAt, completed_on: c.completedOn }),
  fromRow: (r) => ({ id: r.id as string, choreId: r.chore_id as string, completedAt: r.completed_at as string, completedOn: r.completed_on as string }),
}

const pets: Mapper<Pet> = {
  toRow: (p) => ({ id: p.id, home_id: p.homeId, name: p.name, species: p.species, body_colour: p.bodyColour, equipped: p.equipped }),
  fromRow: (r) => ({
    id: r.id as string,
    homeId: r.home_id as string,
    name: r.name as string,
    species: (r.species as Pet['species']) ?? 'mochi',
    bodyColour: r.body_colour as string,
    equipped: (r.equipped as Pet['equipped']) ?? {},
  }),
}

const progress: Mapper<Progress> = {
  toRow: (p) => ({
    home_id: p.homeId,
    chore_count: p.choreCount,
    current_streak: p.currentStreak,
    best_streak: p.bestStreak,
    unlocked_items: p.unlockedItems,
  }),
  fromRow: (r) => ({
    homeId: r.home_id as string,
    choreCount: r.chore_count as number,
    currentStreak: r.current_streak as number,
    bestStreak: r.best_streak as number,
    unlockedItems: (r.unlocked_items as string[]) ?? [],
  }),
}

export const MAPPERS: { [T in TableName]: Mapper<TableMap[T]> } = {
  homes,
  rooms,
  placed_objects: placedObjects,
  chores,
  completions,
  pets,
  progress,
}

/** Primary key column for deletes. */
export const KEY_COLUMN: Record<TableName, string> = {
  homes: 'id',
  rooms: 'id',
  placed_objects: 'id',
  chores: 'id',
  completions: 'id',
  pets: 'id',
  progress: 'home_id',
}
