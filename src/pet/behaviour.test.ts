import { describe, expect, it } from 'vitest'
import { besideTiles, findPath, initialPet, positionAt, poseFor, step, tap, TIMING, type PetState, type Tile, type World } from './behaviour'
import { ROOM_SIZE } from '../room/grid'

const blocked = (tiles: Tile[]) => {
  const set = new Set(tiles.map((t) => `${t.tx},${t.ty}`))
  return (t: Tile) => !set.has(`${t.tx},${t.ty}`)
}
const world = (over: Partial<World> = {}): World => ({ free: () => true, mood: 'happy', away: false, mess: null, ...over })
/** A random source that always returns the same value. */
const always = (v: number) => () => v

describe('paths', () => {
  it('walks around things', () => {
    const free = blocked([{ tx: 1, ty: 0 }, { tx: 1, ty: 1 }])
    const path = findPath({ tx: 0, ty: 0 }, [{ tx: 2, ty: 0 }], free)!
    expect(path[path.length - 1]).toEqual({ tx: 2, ty: 0 })
    expect(path.every(free)).toBe(true)
    expect(path).toHaveLength(6) // down and around the 1x2 block
  })

  it('gives up when the goal is walled off', () => {
    const free = blocked([{ tx: 1, ty: 0 }, { tx: 0, ty: 1 }])
    expect(findPath({ tx: 0, ty: 0 }, [{ tx: ROOM_SIZE - 1, ty: ROOM_SIZE - 1 }], free)).toBeNull()
  })

  it('finds free tiles beside an object', () => {
    const sink = [{ tx: 0, ty: 2 }]
    const beside = besideTiles(sink, blocked(sink))
    expect(beside).toEqual(expect.arrayContaining([{ tx: 1, ty: 2 }, { tx: 0, ty: 1 }, { tx: 0, ty: 3 }]))
    expect(beside).toHaveLength(3)
  })
})

describe('moods and moments', () => {
  it('sleeps on vacation and stays in bed when sick', () => {
    const pet = initialPet({ tx: 3, ty: 3 }, 0)
    expect(step(pet, world({ away: true }), 10, always(0)).activity.kind).toBe('sleep')
    expect(step(pet, world({ mood: 'sick' }), 10, always(0)).activity.kind).toBe('sick')
    expect(poseFor(step(pet, world({ away: true }), 10, always(0)))).toBe('sleeping')
  })

  it('gets up again once better', () => {
    const sick = step(initialPet({ tx: 3, ty: 3 }, 0), world({ mood: 'sick' }), 10, always(0))
    expect(step(sick, world(), 20, always(0.9)).activity.kind).toBe('idle')
  })

  it('cheers when tapped, then carries on', () => {
    const pet = tap(initialPet({ tx: 3, ty: 3 }, 0), 100)
    expect(pet.activity).toMatchObject({ kind: 'react' })
    expect(poseFor(pet)).toBe('cheering')
    expect(step(pet, world(), 100 + TIMING.reactMs - 1, always(0.9)).activity.kind).toBe('react')
    expect(step(pet, world(), 100 + TIMING.reactMs, always(0.9)).activity.kind).toBe('idle')
  })

  it('only notices a tap when asleep or sick', () => {
    const asleep = step(initialPet({ tx: 3, ty: 3 }, 0), world({ away: true }), 10, always(0))
    expect(tap(asleep, 20).activity.kind).toBe('sleep')
  })
})

describe('wandering and looking at mess', () => {
  it('waits out its idle time', () => {
    const pet = initialPet({ tx: 3, ty: 3 }, 0)
    expect(step(pet, world(), 100, always(0))).toBe(pet)
  })

  it('walks over to the mess, tile by tile, then looks at it', () => {
    const sink = [{ tx: 0, ty: 2 }]
    const w = world({ free: blocked(sink), mess: { objectId: 'sink', tiles: sink } })
    let pet: PetState = step(initialPet({ tx: 4, ty: 2 }, 0), w, 2000, always(0))
    expect(pet.activity).toMatchObject({ kind: 'walk', then: 'look' })
    expect(pet.facing).toBe(1) // set on the first step below

    pet = step(pet, w, 2000 + TIMING.stepMs, always(0))
    expect(pet.tile).toEqual({ tx: 3, ty: 2 })
    expect(pet.facing).toBe(-1) // walking toward the left wall is leftward on screen

    pet = step(pet, w, 2000 + TIMING.stepMs * 3, always(0))
    expect(pet.tile).toEqual({ tx: 1, ty: 2 })
    expect(pet.activity).toMatchObject({ kind: 'look', objectId: 'sink' })
  })

  it('slides smoothly between tiles while walking', () => {
    const pet: PetState = { tile: { tx: 2, ty: 2 }, facing: 1, beat: 0, activity: { kind: 'walk', path: [{ tx: 3, ty: 2 }], stepStart: 0, then: 'idle' } }
    expect(positionAt(pet, TIMING.stepMs / 2)).toEqual({ tx: 2.5, ty: 2 })
    expect(positionAt(pet, TIMING.stepMs * 2)).toEqual({ tx: 3, ty: 2 })
  })

  it('stops if something is placed in its way', () => {
    const pet: PetState = { tile: { tx: 2, ty: 2 }, facing: 1, beat: 0, activity: { kind: 'walk', path: [{ tx: 3, ty: 2 }, { tx: 4, ty: 2 }], stepStart: 0, then: 'idle' } }
    const next = step(pet, world({ free: blocked([{ tx: 3, ty: 2 }]) }), TIMING.stepMs, always(0.9))
    expect(next.tile).toEqual({ tx: 2, ty: 2 })
    expect(next.activity.kind).toBe('idle')
  })

  it('hops off a tile that something was just placed on', () => {
    const pet = initialPet({ tx: 2, ty: 2 }, 0)
    const next = step(pet, world({ free: blocked([{ tx: 2, ty: 2 }]) }), 10, always(0.9))
    expect(next.tile).not.toEqual({ tx: 2, ty: 2 })
    expect(Math.abs(next.tile.tx - 2) + Math.abs(next.tile.ty - 2)).toBe(1)
  })

  it('wanders a short way when nothing is messy', () => {
    const pet = step(initialPet({ tx: 3, ty: 3 }, 0), world(), 2000, always(0.3))
    expect(pet.activity.kind).toBe('walk')
    if (pet.activity.kind === 'walk') expect(pet.activity.path.length).toBeLessThanOrEqual(TIMING.wanderRange)
  })
})
