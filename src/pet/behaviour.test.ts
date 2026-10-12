import { describe, expect, it } from 'vitest'
import { besideTiles, findPath, initialPet, needsRender, positionAt, poseFor, sortTile, step, tap, react, TIMING, type PetState, type Tile, type World } from './behaviour'
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
    expect(pet.facing).toBe(-1) // face the first route segment immediately

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

describe('re-rendering', () => {
  const start = initialPet({ tx: 2, ty: 2 }, 0)

  it('skips the frames of a walk that only slide the pet along', () => {
    const walking: PetState = { ...start, activity: { kind: 'walk', path: [{ tx: 3, ty: 2 }, { tx: 4, ty: 2 }], stepStart: 0, then: 'idle' } }
    const later = step(walking, world(), 100, always(0.5))
    expect(later).not.toBe(walking)
    expect(needsRender(walking, later)).toBe(false)
    // One tile on, still walking the same way: the depth sort follows the drawn tile instead.
    const nextTile = step(walking, world(), TIMING.stepMs + 10, always(0.5))
    expect(nextTile.tile).toEqual({ tx: 3, ty: 2 })
    expect(needsRender(walking, nextTile)).toBe(false)
  })

  it('re-renders when the activity, facing or beat changes', () => {
    expect(needsRender(start, start)).toBe(false)
    expect(needsRender(start, tap(start, 10))).toBe(true)
    expect(needsRender(start, { ...start, facing: -1 })).toBe(true)
    const look = (objectId: string): PetState => ({ ...start, activity: { kind: 'look', objectId, until: 10 } })
    expect(needsRender(look('sink'), look('bed'))).toBe(true)
    expect(needsRender(look('sink'), { ...look('sink') })).toBe(false)
  })

  it('sorts the pet as the tile it is mostly on', () => {
    expect(sortTile({ tx: 2.4, ty: 3 })).toEqual({ tx: 2, ty: 3 })
    expect(sortTile({ tx: 2.6, ty: 3 })).toEqual({ tx: 3, ty: 3 })
  })
})


const walking = (): PetState => ({
  ...initialPet({ tx: 2, ty: 2 }, 0),
  activity: { kind: 'walk', path: [{ tx: 3, ty: 2 }, { tx: 4, ty: 2 }], stepStart: 0, then: 'idle' },
})
const target = { objectId: 'plant', signature: 'plant:0', tile: { tx: 3, ty: 2 }, gaze: { tx: 1.125, ty: 1.125 }, action: 'wave' as const, contact: false }

describe('interruptible sequencing', () => {
  it('preserves the exact halfway position on input and reconnects without snapping', () => {
    let pet = tap(walking(), 210)
    expect(positionAt(pet, 210)).toEqual({ tx: 2.5, ty: 2 })
    pet = step(pet, world(), 5000, always(0.9))
    expect(pet.activity.kind).toBe('walk')
    expect(positionAt(pet, 5000)).toEqual({ tx: 2.5, ty: 2 })
    expect(positionAt(pet, 5105)).toEqual({ tx: 2.75, ty: 2 })
    pet = step(pet, world(), 5210, always(0.9))
    expect(pet.tile).toEqual({ tx: 3, ty: 2 })
  })

  it('uses the safe segment endpoint if the forward tile becomes blocked during a reaction', () => {
    const pet = tap(walking(), 210)
    const resumed = step(pet, world({ free: blocked([{ tx: 3, ty: 2 }]) }), 5000, always(0.9))
    expect(positionAt(resumed, 5000)).toEqual({ tx: 2.5, ty: 2 })
    expect(positionAt(resumed, 5105)).toEqual({ tx: 2.25, ty: 2 })
    expect(step(resumed, world({ free: blocked([{ tx: 3, ty: 2 }]) }), 5210, always(0.9)).tile).toEqual({ tx: 2, ty: 2 })
  })

  it('coalesces twenty rapid taps into one pending response without restarting the first', () => {
    let pet = tap(initialPet({ tx: 2, ty: 2 }, 0), 0)
    const first = pet.activity
    for (let i = 1; i <= 20; i++) pet = tap(pet, i * 10)
    expect(pet.activity).toEqual(first)
    expect(pet.beat).toBe(1)
    expect(pet.pendingTap).toBe(true)
    pet = step(pet, world(), 1200, always(0.9))
    expect(pet.activity).toMatchObject({ kind: 'react', action: 'affection', start: 1200 })
    expect(pet.pendingTap).toBe(false)
    expect(step(pet, world(), 2800, always(0.9)).activity.kind).toBe('idle')
  })

  it('alternates deliberate greeting and affection and returns to the current mood', () => {
    let pet = tap(initialPet({ tx: 2, ty: 2 }, 0), 0)
    expect(pet.activity).toMatchObject({ action: 'greet', until: 1200 })
    pet = step(pet, world({ mood: 'meh' }), 1200, always(0.9))
    expect(pet.activity.kind).toBe('idle')
    expect(poseFor(pet)).toBeUndefined()
    expect(tap(pet, 1300).activity).toMatchObject({ action: 'affection', until: 2900 })
  })

  it('gives chore celebration priority over taps and does not downgrade or restart it', () => {
    let pet = react(tap(walking(), 210), 310, 'celebrate')
    expect(pet.activity).toMatchObject({ action: 'celebrate', start: 310, until: 2110 })
    pet = tap(pet, 320)
    expect(pet.pendingTap).toBe(true)
    pet = react(pet, 330, 'celebrate-big')
    expect(pet.activity).toMatchObject({ action: 'celebrate-big', start: 330, until: 2530 })
    expect(react(pet, 340, 'celebrate').activity).toEqual(pet.activity)
    expect(step(pet, world(), 2530, always(0.9)).activity).toMatchObject({ action: 'affection' })
  })

  it.each(['sick', 'sleep'] as const)('only notices input while %s and retains the base posture', (kind) => {
    const w = world(kind === 'sick' ? { mood: 'sick' } : { away: true })
    let pet = step(initialPet({ tx: 2, ty: 2 }, 0), w, 0, always(0))
    pet = react(pet, 10, 'celebrate-big')
    expect(pet.activity.kind).toBe(kind)
    expect(pet.noticeStart).toBe(10)
    expect(step(pet, w, 1000, always(0)).activity.kind).toBe(kind)
  })

  it.each([{ away: true }, { mood: 'sick' as const }])('interrupts motion continuously and clears pending input for %j', (over) => {
    const pet = step(walking(), world(over), 210, always(0))
    expect(positionAt(pet, 210)).toEqual({ tx: 2.5, ty: 2 })
    const queued = tap(tap(initialPet({ tx: 2, ty: 2 }, 0), 0), 10)
    expect(step(queued, world(over), 100, always(0)).pendingTap).toBe(false)
  })

  it('uses approach, orient, action, settle and a quiet interval with visible beats', () => {
    const w = world({ interactions: [target] })
    let pet = step(initialPet({ tx: 2, ty: 2 }, 0), w, 2000, always(0))
    expect(pet.activity).toMatchObject({ kind: 'walk', target })
    pet = step(pet, w, 2420, always(0))
    expect(pet.activity).toMatchObject({ kind: 'interact', phase: 'orient', start: 2420 })
    expect(pet.facing).toBe(-1)
    const beat = pet.beat
    pet = step(pet, w, 2780, always(0))
    expect(pet.activity).toMatchObject({ phase: 'action', start: 2780 })
    expect(pet.beat).toBe(beat + 1)
    pet = step(pet, w, 4180, always(0))
    expect(pet.activity).toMatchObject({ phase: 'settle' })
    pet = step(pet, w, 4360, always(0))
    expect(pet.activity.kind).toBe('idle')
    expect(step(pet, w, 5000, always(0))).toBe(pet)
  })

  it.each(['approach', 'orient', 'action', 'settle'])('cancels removed/moved/rotated targets during %s', (phase) => {
    const w = world({ interactions: [target] })
    let pet = step(initialPet({ tx: 2, ty: 2 }, 0), w, 2000, always(0))
    const time = { approach: 2100, orient: 2500, action: 3000, settle: 4200 }[phase]!
    for (const tick of [2420, 2780, 4180]) if (tick <= time) pet = step(pet, w, tick, always(0))
    for (const interactions of [[], [{ ...target, signature: 'moved' }], [{ ...target, signature: 'rotated' }]]) {
      const cancelled = step(pet, world({ interactions }), time, always(0))
      expect(cancelled.activity.kind).toBe('idle')
      expect(positionAt(cancelled, time)).toEqual(positionAt(pet, time))
    }
  })

  it('cancels a blocked next step before reaching its end', () => {
    const pet = step(walking(), world({ free: blocked([{ tx: 3, ty: 2 }]) }), 100, always(0.9))
    expect(pet.activity.kind).toBe('idle')
    expect(pet.tile).toEqual({ tx: 2, ty: 2 })
    expect(positionAt(pet, 100)).toEqual({ tx: 2 + 100 / 420, ty: 2 })
  })

  it('does not play queued taps after a long background gap', () => {
    const pet = tap(tap(initialPet({ tx: 2, ty: 2 }, 0), 0), 10)
    expect(step(pet, world(), 10000, always(0.9)).activity.kind).toBe('idle')
  })

  it.each(['celebrate', 'celebrate-big'] as const)('expires old queued input when %s arrives before the resumed tick', (kind) => {
    const queued = tap(tap(initialPet({ tx: 2, ty: 2 }, 0), 0), 10)
    const celebrated = react(queued, 10000, kind)
    expect(celebrated.activity).toMatchObject({ kind: 'react', action: kind, start: 10000 })
    expect(celebrated.pendingTap).toBe(false)
    const end = kind === 'celebrate' ? 11800 : 12200
    expect(step(celebrated, world(), end, always(0.9)).activity.kind).toBe('idle')

    const fresh = react(queued, 1000, kind)
    expect(fresh.pendingTap).toBe(true)
    const freshEnd = kind === 'celebrate' ? 2800 : 3200
    expect(step(fresh, world(), freshEnd, always(0.9)).activity).toMatchObject({ action: 'affection' })
  })
})


describe('route and recovery boundaries', () => {
  it.each([{ away: true }, { mood: 'sick' as const }])('validates elapsed route segments before suppression for %j', (over) => {
    const changed = world({ ...over, free: blocked([{ tx: 3, ty: 2 }]) })
    const suppressed = step(walking(), changed, 630, always(0.9))
    expect(suppressed.activity.kind).toBe(over.away ? 'sleep' : 'sick')
    expect(suppressed.tile).toEqual({ tx: 2, ty: 2 })
    expect(positionAt(suppressed, 630)).toEqual({ tx: 2, ty: 2 })
    expect(suppressed.resume).toEqual({ from: { tx: 2, ty: 2 }, to: { tx: 3, ty: 2 } })

    const laterBlocked = step(walking(), world({ ...over, free: blocked([{ tx: 4, ty: 2 }]) }), 1000, always(0.9))
    expect(laterBlocked.tile).toEqual({ tx: 3, ty: 2 })
    expect(positionAt(laterBlocked, 1000)).toEqual({ tx: 3, ty: 2 })

    const fractional = step(walking(), changed, 137, always(0.9))
    expect(positionAt(fractional, 137)).toEqual(positionAt(walking(), 137))
    const recovered = step(fractional, world({ free: changed.free }), 200, always(0.9))
    const retreating = step(recovered, world({ free: changed.free }), 6000, always(0.9))
    expect(positionAt(retreating, 6000)).toEqual(positionAt(fractional, 137))
    expect(step(retreating, world({ free: changed.free }), 7000, always(0.9)).tile).toEqual({ tx: 2, ty: 2 })
  })

  it('keeps both original segment endpoints through a second interruption while retreating', () => {
    const frozen = tap(walking(), 137)
    expect(positionAt(frozen, 137)).toEqual(positionAt(walking(), 137))
    const retreating = step(frozen, world({ free: blocked([{ tx: 3, ty: 2 }]) }), 5000, always(0.9))
    const interrupted = tap(retreating, 5050)
    const position = positionAt(retreating, 5050)
    expect(positionAt(interrupted, 5050)).toEqual(position)
    // The old forward endpoint reopens while the retreat endpoint becomes occupied.
    const changed = world({ free: blocked([{ tx: 2, ty: 2 }]) })
    const resumed = step(interrupted, changed, 10000, always(0.9))
    expect(resumed.activity.kind).toBe('walk')
    expect(positionAt(resumed, 10000)).toEqual(position)
    expect(step(resumed, changed, 11000, always(0.9)).tile).toEqual({ tx: 3, ty: 2 })
  })

  it('faces the safe reconnection endpoint as soon as the return walk starts', () => {
    const frozen = tap(walking(), 210)
    const resumed = step(frozen, world({ free: blocked([{ tx: 3, ty: 2 }]) }), 5000, always(0.9))
    expect(resumed.facing).toBe(-1)
  })

  it('retains the final segment facing when a slow tick completes a corner', () => {
    const pet: PetState = { ...initialPet({ tx: 2, ty: 2 }, 0), activity: {
      kind: 'walk', path: [{ tx: 3, ty: 2 }, { tx: 3, ty: 3 }], stepStart: 0, then: 'idle',
    } }
    const arrived = step(pet, world(), 840, always(0.9))
    expect(arrived.tile).toEqual({ tx: 3, ty: 3 })
    expect(arrived.facing).toBe(-1)
  })

  it('never commits a newly blocked later segment on a slow tick', () => {
    const pet = step(walking(), world({ free: blocked([{ tx: 4, ty: 2 }]) }), 1000, always(0.9))
    expect(pet.tile).toEqual({ tx: 3, ty: 2 })
    expect(positionAt(pet, 1000)).toEqual({ tx: 3, ty: 2 })
  })

  it('waits without rounding if both interrupted endpoints are occupied', () => {
    const frozen = tap(walking(), 210)
    const w = world({ free: blocked([{ tx: 2, ty: 2 }, { tx: 3, ty: 2 }]) })
    const waiting = step(frozen, w, 5000, always(0))
    expect(waiting.activity.kind).toBe('idle')
    expect(positionAt(waiting, 5000)).toEqual({ tx: 2.5, ty: 2 })
    const later = step(waiting, w, 8000, always(0))
    expect(positionAt(later, 8000)).toEqual({ tx: 2.5, ty: 2 })
    expect(later.activity.kind).toBe('idle')
  })

  it('reconnects to the correct segment after input arrives several tiles into a stale route', () => {
    const frozen = tap(walking(), 630)
    expect(positionAt(frozen, 630)).toEqual({ tx: 3.5, ty: 2 })
    const pet = step(frozen, world(), 5000, always(0.9))
    expect(positionAt(pet, 5000)).toEqual({ tx: 3.5, ty: 2 })
    expect(step(pet, world(), 5210, always(0.9)).tile).toEqual({ tx: 4, ty: 2 })
  })
})


describe('lost approach access', () => {
  it('cancels an occupied standing target without hopping and later walks out safely', () => {
    const localTarget = { ...target, tile: { tx: 2, ty: 2 } }
    const w = world({ interactions: [localTarget] })
    const oriented = step(initialPet({ tx: 2, ty: 2 }, 0), w, 2000, always(0))
    const changed = { ...w, free: blocked([{ tx: 2, ty: 2 }]) }
    const cancelled = step(oriented, changed, 2100, always(0.9))
    expect(cancelled.activity.kind).toBe('idle')
    expect(positionAt(cancelled, 2100)).toEqual({ tx: 2, ty: 2 })
    const leaving = step(cancelled, changed, 8000, always(0.9))
    expect(leaving.activity.kind).toBe('walk')
    expect(positionAt(leaving, 8000)).toEqual({ tx: 2, ty: 2 })
    const arrived = step(leaving, changed, 8420, always(0.9))
    expect(changed.free(arrived.tile)).toBe(true)
  })

  it('consumes a pending tap when a new deliberate tap arrives after the first deadline', () => {
    const first = tap(tap(initialPet({ tx: 2, ty: 2 }, 0), 0), 10)
    const second = tap(first, 1300)
    expect(second.activity).toMatchObject({ action: 'affection' })
    expect(second.pendingTap).toBe(false)
    expect(step(second, world(), 2900, always(0.9)).activity.kind).toBe('idle')
  })
})
