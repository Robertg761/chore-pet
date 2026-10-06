import type { CatalogEntry } from './types'

// The starting catalog. Footprints, placement and layer are fixed by the lead
// (object art is drawn to them); names, rooms and default chores are content.
// Rotation 0 has the object's back against the left wall (tx = 0); the room
// mirrors it for rotation 1 (back against the right wall), swapping w and d.

export const CATALOG: CatalogEntry[] = [
  { id: 'sink', name: 'Sink', rooms: ['kitchen'], footprint: { w: 1, d: 1 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'stove', name: 'Stove', rooms: ['kitchen'], footprint: { w: 1, d: 1 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'fridge', name: 'Fridge', rooms: ['kitchen'], footprint: { w: 1, d: 1 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'dishwasher', name: 'Dishwasher', rooms: ['kitchen'], footprint: { w: 1, d: 1 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'trash', name: 'Trash can', rooms: ['kitchen'], footprint: { w: 1, d: 1 }, placement: 'floor', layer: 'solid', chores: [] },
  { id: 'recycling', name: 'Recycling', rooms: ['kitchen'], footprint: { w: 1, d: 1 }, placement: 'floor', layer: 'solid', chores: [] },
  { id: 'bed', name: 'Bed', rooms: ['bedroom'], footprint: { w: 3, d: 2 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'washer', name: 'Washing machine', rooms: ['bathroom', 'kitchen'], footprint: { w: 1, d: 1 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'toilet', name: 'Toilet', rooms: ['bathroom'], footprint: { w: 1, d: 1 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'shower', name: 'Shower', rooms: ['bathroom'], footprint: { w: 2, d: 2 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'couch', name: 'Couch', rooms: ['living'], footprint: { w: 1, d: 2 }, placement: 'wall', layer: 'solid', chores: [] },
  { id: 'rug', name: 'Floor rug', rooms: ['living', 'bedroom'], footprint: { w: 2, d: 3 }, placement: 'floor', layer: 'flat', chores: [] },
  { id: 'table', name: 'Table', rooms: ['kitchen', 'living'], footprint: { w: 2, d: 2 }, placement: 'floor', layer: 'solid', chores: [] },
]

export function catalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id)
}
