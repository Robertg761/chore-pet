import { expect, it } from 'vitest'
import { ACTION_MS } from '../character/motion'
import type { MessStage, PlacedObject } from '../domain/types'
import { overlaps } from '../room/grid'
import { motionFor } from './activityMotion'
import { initialPet, positionAt, react, step, TIMING, visitObject, type PetState, type World } from './behaviour'
import { interactionTargets } from './interactions'
import { petObstacles } from './obstacles'

const plant: PlacedObject = { id: 'leaves', roomId: 'a', catalogId: 'plant', tileX: 2, tileY: 2, rotation: 0 }
const teddy: PlacedObject = { id: 'bear', roomId: 'a', catalogId: 'teddy', tileX: 5, tileY: 4, rotation: 0 }
function world(objects = [plant, teddy], stages: Record<string, MessStage> = {}): World {
  const solids = petObstacles(objects, stages)
  const free = (tile: { tx: number; ty: number }) => !solids.some(solid => overlaps(solid, { ...tile, w: 1, d: 1 }))
  return { free, mood: 'happy', away: false, mess: null, interactions: interactionTargets(objects, free, stages) }
}
const state = () => initialPet({ tx: 6, ty: 6 }, 0)

it('starts the named object interaction in place when already beside it', () => {
  const before = initialPet({ tx: 3, ty: 2 }, 0)
  const next = visitObject(before, world(), 'leaves', 100)!
  expect(next.activity).toMatchObject({ kind: 'interact', phase: 'orient', target: { objectId: 'leaves', action: 'wave', contact: false } })
  expect(positionAt(next, 100)).toEqual(before.tile)
  expect(step(next, world(), 100 + ACTION_MS.turn, () => 0.99).activity).toMatchObject({ kind: 'interact', phase: 'action' })
  expect(before.activity.kind).toBe('idle')
})

it('routes only to the requested furnishing using its existing preferred clear approach', () => {
  const w = world(), next = visitObject(state(), w, 'bear', 100)!
  expect(next.activity).toMatchObject({ kind: 'walk', target: { objectId: 'bear', tile: { tx: 6, ty: 4 }, contact: false } })
  if (next.activity.kind !== 'walk') throw new Error('Expected a route')
  expect(next.activity.path).toEqual([{ tx: 6, ty: 5 }, { tx: 6, ty: 4 }])
  expect(next.activity.path.every(w.free)).toBe(true)
  const arrived = step(next, w, 100 + 2 * TIMING.stepMs, () => 0.99)
  expect(arrived.activity).toMatchObject({ kind: 'interact', phase: 'orient', target: { objectId: 'bear' } })
})

it.each(['missing', 'constructor', '__proto__'])('rejects an unknown object id %s', id => {
  expect(visitObject(state(), world(), id, 100)).toBeNull()
})

it('does not cross a sealed lane to reach a selected object', () => {
  const w = world()
  w.free = tile => tile.tx !== 1
  expect(visitObject(initialPet({ tx: 0, ty: 0 }, 0), w, 'bear', 100)).toBeNull()
})

it('leaves sleep, illness and unfinished player reactions in charge', () => {
  const before = state(), w = world()
  expect(visitObject(before, { ...w, away: true }, 'bear', 100)).toBeNull()
  expect(visitObject(before, { ...w, mood: 'sick' }, 'bear', 100)).toBeNull()
  for (const kind of ['tap', 'celebrate', 'celebrate-big'] as const) {
    const reacting = react(before, 0, kind)
    expect(visitObject(reacting, w, 'bear', 100)).toBeNull()
  }
})

it('coalesces the same valid route and interaction without restarting their clocks', () => {
  const w = world(), next = visitObject(state(), w, 'bear', 100)!
  expect(visitObject(next, w, 'bear', 200)).toBe(next)
  const arrived = step(next, w, 940, () => 0.99)
  expect(visitObject(arrived, w, 'bear', 1000)).toBe(arrived)
})

it.each([false, true])('retains a fractional origin and reconnects through a clear segment endpoint (blocked=%s)', blocked => {
  const before: PetState = { ...initialPet({ tx: 2, ty: 4 }, 0), activity: {
    kind: 'walk', origin: { tx: 2, ty: 4 }, path: [{ tx: 3, ty: 4 }, { tx: 3, ty: 3 }],
    stepStart: 0, journeyStart: 0, durationMs: 840, then: 'idle',
  } }
  const w = world([plant])
  const ordinaryFree = w.free
  w.free = tile => ordinaryFree(tile) && !(blocked && tile.tx === 3 && tile.ty === 4)
  const next = visitObject(before, w, 'leaves', 100)!
  expect(positionAt(next, 100)).toEqual(positionAt(before, 100))
  expect(next.activity.kind).toBe('walk')
  if (next.activity.kind !== 'walk') throw new Error('Expected a route')
  expect(next.activity.path[0]).toEqual({ tx: blocked ? 2 : 3, ty: 4 })
  expect(next.activity.path.every(w.free)).toBe(true)
  let from = positionAt(next, 100)
  for (const tile of next.activity.path) {
    expect(tile.tx === from.tx || tile.ty === from.ty).toBe(true)
    from = tile
  }
  if (!blocked) for (const species of ['bun', 'mochi', 'sprout'] as const) {
    expect(motionFor(next, 100, species, 'happy', false).frame).toEqual(motionFor(before, 100, species, 'happy', false).frame)
  }
})

it('uses current condition geometry and cancels a visit when its target changes or disappears', () => {
  const w = world(), next = visitObject(state(), w, 'leaves', 100)!
  const dirty = world([plant, teddy], { leaves: 'messy2' })
  expect(step(next, dirty, 200, () => 0.99).activity.kind).toBe('idle')
  expect(step(next, world([teddy]), 200, () => 0.99).activity.kind).toBe('idle')
  const selected = visitObject(state(), dirty, 'leaves', 100)!
  expect(selected.activity).toMatchObject({ target: { action: 'concern' } })
})
