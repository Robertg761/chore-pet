import { describe, expect, it } from 'vitest'
import { ALL_ENTRIES, catalogEntry } from '../catalog/objects'
import type { MessStage, PlacedObject } from '../domain/types'
import { footprintOf, ROOM_SIZE, tilesOf } from '../room/grid'
import type { Tile } from './behaviour'
import { chooseInteraction, interactionTargets } from './interactions'

const object = (catalogId: string, over: Partial<PlacedObject> = {}): PlacedObject => ({
  id: 'object', roomId: 'room', catalogId, tileX: 2, tileY: 2, rotation: 0, ...over,
})
const key = (tile: Tile) => `${tile.tx},${tile.ty}`
const inRoom = (tile: Tile) => Number.isInteger(tile.tx) && Number.isInteger(tile.ty)
  && tile.tx >= 0 && tile.ty >= 0 && tile.tx < ROOM_SIZE && tile.ty < ROOM_SIZE
const room = (objects: readonly PlacedObject[], blocked: Tile[] = []) => {
  const occupied = new Set([...blocked, ...objects.flatMap((o) => {
    const entry = catalogEntry(o.catalogId)
    return entry?.layer === 'solid' ? tilesOf(footprintOf(o, entry)) : []
  })].map(key))
  return (tile: Tile) => inRoom(tile) && !occupied.has(key(tile))
}

describe('environmental profiles', () => {
  it.each([
    ['plant', 'wave'], ['fish-tank', 'wave'], ['bookshelf', 'inspect'],
    ['teddy', 'inspect'], ['poster', 'inspect'], ['fairy-lights', 'inspect'],
    ['wall-clock', 'inspect'], ['lamp', 'inspect'], ['sink', 'inspect'],
    ['bed', 'rest'], ['couch', 'rest'], ['bean-bag', 'rest'], ['rug', 'rest'],
  ])('uses a safe %s action', (id, action) => {
    const objects = [object(id)]
    const targets = interactionTargets(objects, room(objects), {})
    expect(targets.length).toBeGreaterThan(0)
    expect(targets.every((target) => target.action === action && !target.contact)).toBe(true)
  })

  it.each([
    ['bookshelf', 'dust'], ['bed', 'dust'], ['rug', 'dust'],
    ['trash', 'smell'], ['fish-tank', 'smell'], ['sink', 'smell'],
    ['plant', 'concern'],
  ])('reacts to the condition of %s', (id, action) => {
    const objects = [object(id)]
    for (const stage of ['messy1', 'messy2'] as const) {
      const targets = interactionTargets(objects, room(objects), { object: stage })
      expect(targets.length).toBeGreaterThan(0)
      expect(targets.every((target) => target.action === action && !target.contact)).toBe(true)
    }
  })

  it('ignores missing catalog IDs while unclassified catalog objects get inspect', () => {
    const objects = [object('not-in-catalog'), object('__proto__'), object('washer', { id: 'washer' })]
    const targets = interactionTargets(objects, room(objects), {})
    expect(new Set(targets.map((target) => target.objectId))).toEqual(new Set(['washer']))
    expect(targets.every((target) => target.action === 'inspect' && !target.contact)).toBe(true)
  })

  it.each([0, 1, 2, 3] as const)('prefers the rendered front at rotation %s', (rotation) => {
    const objects = [object('couch', { rotation })]
    const free = room(objects)
    const targets = interactionTargets(objects, free, {})
    const expected = rotation % 2 === 0 ? { tx: 3, ty: 2 } : { tx: 2, ty: 3 }
    expect(targets[0].tile).toEqual(expected)
    // Even when the pet is already at the back, prefer a reachable front.
    const from = rotation % 2 === 0 ? { tx: 1, ty: 2 } : { tx: 2, ty: 1 }
    expect(chooseInteraction(from, targets, free, 0)?.target.tile).toEqual(expected)
  })

  it.each([0, 1] as const)('falls back safely when the front is blocked at rotation %s', (rotation) => {
    const objects = [object('couch', { rotation })]
    const front = rotation === 0 ? [{ tx: 3, ty: 2 }, { tx: 3, ty: 3 }]
      : [{ tx: 2, ty: 3 }, { tx: 3, ty: 3 }]
    const free = room(objects, front)
    const targets = interactionTargets(objects, free, {})
    expect(targets.length).toBeGreaterThan(0)
    expect(targets.every((target) => !front.some((tile) => key(tile) === key(target.tile)) && !target.contact)).toBe(true)
    expect(chooseInteraction({ tx: 0, ty: 0 }, targets, free, 0)).not.toBeNull()
  })

  it('gazes at the visible plant leaves and tank glass, mirrored with the art', () => {
    const plant = [object('plant')]
    // Plant leaves occupy x=0,y=-28 in object SVG units. Inverse iso maps
    // that elevated screen point to tx=ty=-28/32, relative to the origin.
    expect(interactionTargets(plant, room(plant), {})[0].gaze).toEqual({ tx: 1.125, ty: 1.125 })
    const tank = [object('fish-tank')]
    // Front glass at local tx=.92,ty=.5,z=40, mirrored by swapping axes.
    const gaze = interactionTargets(tank, room(tank), {})[0].gaze
    expect(gaze.tx).toBeCloseTo(1.67)
    expect(gaze.ty).toBeCloseTo(1.25)
    const turned = [object('fish-tank', { rotation: 1 })]
    const mirrored = interactionTargets(turned, room(turned), {})[0].gaze
    expect(mirrored.tx).toBeCloseTo(gaze.ty)
    expect(mirrored.ty).toBeCloseTo(gaze.tx)
  })

  it.each([
    ['poster', -16, -76], ['wall-clock', -16, -76],
    ['fairy-lights', -31.5, -100.5275],
  ] as const)('gazes at the rendered wall art for %s', (id, x, y) => {
    const objects = [object(id)]
    const gaze = interactionTargets(objects, room(objects), {})[0].gaze
    const tx = gaze.tx - 2
    const ty = gaze.ty - 2
    expect((tx - ty) * 32).toBeCloseTo(x)
    expect((tx + ty) * 16).toBeCloseTo(y)
  })

  it('returns only free, in-bounds perimeter tiles for every catalog footprint and orientation', () => {
    for (const entry of ALL_ENTRIES) for (const rotation of [0, 1, 2, 3] as const) {
      for (const [tileX, tileY] of [[0, 0], [ROOM_SIZE - 1, ROOM_SIZE - 1], [2, 2]]) {
        const objects = [object(entry.id, { rotation, tileX, tileY })]
        // Bounds must hold even if the supplied free function accepts outside tiles.
        const free = (tile: Tile) => !tilesOf(footprintOf(objects[0], entry)).some((own) => key(own) === key(tile))
        const targets = interactionTargets(objects, free, {})
        for (const target of targets) {
          expect(inRoom(target.tile)).toBe(true)
          expect(free(target.tile)).toBe(true)
          expect(Number.isFinite(target.gaze.tx) && Number.isFinite(target.gaze.ty)).toBe(true)
        }
      }
    }
  })

  it('changes signatures when catalog, position, rotation, or stage changes', () => {
    const base = object('plant')
    const signature = (o: PlacedObject, stages: Record<string, MessStage> = {}) =>
      interactionTargets([o], room([o]), stages)[0].signature
    const original = signature(base)
    expect(signature({ ...base })).toBe(original)
    expect(signature(base, { object: 'clean', unrelated: 'messy2' })).toBe(original)
    for (const changed of [{ catalogId: 'teddy' }, { tileX: 3 }, { tileY: 3 }, { rotation: 1 as const }, { rotation: 2 as const }]) {
      expect(signature({ ...base, ...changed })).not.toBe(original)
    }
    expect(new Set(['clean', 'messy1', 'messy2'].map((stage) => signature(base, { object: stage as MessStage }))).size).toBe(3)
  })

  it('drops removed objects and their signatures from a fresh target list', () => {
    const objects = [object('plant'), object('teddy', { id: 'teddy', tileX: 4 })]
    const before = interactionTargets(objects, room(objects), {})
    const after = interactionTargets(objects.slice(1), room(objects.slice(1)), {})
    expect(after.length).toBeGreaterThan(0)
    expect(after.every((target) => target.objectId === 'teddy')).toBe(true)
    expect(after.some((target) => target.signature === before[0].signature)).toBe(false)
    expect(interactionTargets([], () => true, { object: 'messy2' })).toEqual([])
  })
})

describe('reachable interaction choice', () => {
  it('returns an empty route when already standing at the preferred target', () => {
    const objects = [object('plant')]
    const free = room(objects)
    const targets = interactionTargets(objects, free, {})
    expect(chooseInteraction({ tx: 3, ty: 2 }, targets, free, 0)).toEqual({ target: targets[0], path: [] })
  })

  it('routes around obstacles with each step free and cardinally adjacent', () => {
    const objects = [object('plant', { tileX: 4, tileY: 1 })]
    const free = room(objects, [{ tx: 1, ty: 0 }, { tx: 1, ty: 1 }])
    const from = { tx: 0, ty: 0 }
    const result = chooseInteraction(from, interactionTargets(objects, free, {}), free, 0)!
    expect(result).not.toBeNull()
    expect(result.path.at(-1)).toEqual(result.target.tile)
    let previous = from
    for (const tile of result.path) {
      expect(inRoom(tile) && free(tile)).toBe(true)
      expect(Math.abs(tile.tx - previous.tx) + Math.abs(tile.ty - previous.ty)).toBe(1)
      previous = tile
    }
  })

  it('returns null for empty targets, enclosed pets, and objects without free approaches', () => {
    const objects = [object('plant')]
    const free = room(objects, [{ tx: 1, ty: 0 }, { tx: 0, ty: 1 }])
    const targets = interactionTargets(objects, free, {})
    expect(targets.length).toBeGreaterThan(0)
    expect(chooseInteraction({ tx: 0, ty: 0 }, targets, free, 0)).toBeNull()
    expect(chooseInteraction({ tx: 0, ty: 0 }, [], free, 0)).toBeNull()
    expect(interactionTargets(objects, () => false, {})).toEqual([])
  })

  it('falls back from a free but enclosed front to a reachable side', () => {
    const objects = [object('plant')]
    const free = room(objects, [{ tx: 4, ty: 2 }, { tx: 3, ty: 1 }, { tx: 3, ty: 3 }])
    const targets = interactionTargets(objects, free, {})
    expect(targets[0].tile).toEqual({ tx: 3, ty: 2 })
    const result = chooseInteraction({ tx: 0, ty: 0 }, targets, free, 0)!
    expect(result).not.toBeNull()
    expect(result.target.tile).not.toEqual({ tx: 3, ty: 2 })
    expect(result.path.every(free)).toBe(true)
  })

  it('chooses deterministically among reachable objects without weighting their perimeter sizes', () => {
    const objects = [object('bed', { tileX: 0, tileY: 0 }), object('plant', { id: 'plant', tileX: 5, tileY: 5 })]
    const free = room(objects)
    const targets = interactionTargets(objects, free, {})
    const from = { tx: 4, ty: 4 }
    expect(chooseInteraction(from, targets, free, 0)?.target.objectId).toBe('object')
    expect(chooseInteraction(from, targets, free, 0.5)?.target.objectId).toBe('plant')
    expect(chooseInteraction(from, targets, free, 0.7)).toEqual(chooseInteraction(from, targets, free, 0.7))
    for (const choice of [-1, 1, 2, NaN, Infinity]) expect(chooseInteraction(from, targets, free, choice)).not.toBeNull()
  })

  it('rechecks access when an approach becomes occupied after target generation', () => {
    const objects = [object('plant')]
    const targets = interactionTargets(objects, room(objects), {})
    const free = room(objects, [targets[0].tile])
    const result = chooseInteraction({ tx: 0, ty: 0 }, targets, free, 0)!
    expect(result).not.toBeNull()
    expect(result.target.tile).not.toEqual(targets[0].tile)
    expect(result.path.every(free)).toBe(true)
    expect(chooseInteraction(targets[0].tile, targets, () => false, 0)).toBeNull()
  })
})
