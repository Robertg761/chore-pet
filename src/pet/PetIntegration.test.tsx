// @vitest-environment jsdom
import { act, createRef, Profiler, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as petLines from '../content/petLines'
import { KIND_LINES, MOOD_LINES, OBJECT_LINES } from '../content/petLines'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore, Pet, PlacedObject } from '../domain/types'
import { homeLayout } from '../room/homeLayout'
import { render } from '../test/react'
import { LivingRoom, type LivingRoomControl, type LivingRoomProps } from './LivingRoom'
import { HomeTraveler } from './HomeTraveler'
import type { RoomWaypoint } from './homeTravel'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { initialPet, positionAt, step, type PetState } from './behaviour'
import { motionFor } from './activityMotion'
import { PET_SCALE, roomPoint } from '../room/shell/geometry'

const roomRenders = vi.hoisted(() => ({ count: 0 }))
vi.mock('../room/Room', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../room/Room')>()
  return { ...actual, Room: (props: Parameters<typeof actual.Room>[0]) => {
    roomRenders.count++
    return <actual.Room {...props} />
  } }
})

const pet: Pet = { id: 'pet', homeId: 'home', name: 'Bun', species: 'bun', bodyColour: '#eee', equipped: {} }
const plant: PlacedObject = { id: 'plant', roomId: 'a', catalogId: 'plant', tileX: 2, tileY: 2, rotation: 0 }
const props: LivingRoomProps = { room: { floorStyle: 'wood', wallStyle: 'cream' }, objects: [], stages: {}, pet, mood: 'meh', away: false, chores: [], statuses: [], initialTile: { tx: 3, ty: 2 } }
let now: number
let frames: Map<number, FrameRequestCallback>
let serial: number
let media: MediaQueryList
let hidden: boolean
const cleanups: (() => void)[] = []

beforeEach(() => {
  now = 0; serial = 0; frames = new Map(); hidden = false
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(Math, 'random').mockReturnValue(0.99)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  media = Object.assign(new EventTarget(), { matches: false, media: '(prefers-reduced-motion: reduce)' }) as MediaQueryList
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})
afterEach(() => { cleanups.splice(0).forEach((fn) => fn()); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals() })
function mount(content: Parameters<typeof render>[0]) { const ui = render(content); cleanups.push(ui.unmount); return ui }
function frame(at: number) { now = at; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach((fn) => fn(at))) }
function preference(value: boolean) { act(() => { Object.defineProperty(media, 'matches', { value, configurable: true }); media.dispatchEvent(new Event('change')) }) }
function visibility(value: boolean) { act(() => { hidden = value; document.dispatchEvent(new Event('visibilitychange')) }) }
function click(element: Element) { act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))) }
function art(container: Element) { return container.querySelector('.ch-animated')! }

function pointerAt(node: Element, x: number, y: number, pointerType = 'mouse') {
  const event = new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  act(() => node.dispatchEvent(event))
}

function gaze(container: Element) {
  return container.querySelector('[data-eye-gaze]')!.getAttribute('transform')
}

it('uses no reduced idle frames, responds to invitations, and clocks only a finite greeting', () => {
  Object.defineProperty(media, 'matches', { value: true, configurable: true })
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood="happy" objects={[plant]} control={control} />)
  expect(frames.size).toBe(0)
  act(() => { expect(control.current!.lookAt('plant')).toBe('still') })
  expect(ui.container.querySelector('[aria-live]')!.textContent).not.toBe('')
  expect(frames.size).toBe(0)
  click(ui.container.querySelector('.room-pet')!)
  expect(frames.size).toBe(1)
  frame(500)
  expect(ui.container.querySelector('[data-expression="cheering"]')).not.toBeNull()
  frame(1200)
  expect(ui.container.querySelector('[data-expression="happy"]')).not.toBeNull()
  expect(frames.size).toBe(0)
  visibility(true); visibility(false)
  expect(frames.size).toBe(0)
  preference(false)
  expect(frames.size).toBe(1)
  preference(true)
  expect(frames.size).toBe(0)
})

it.each(['sick', 'away'] as const)('rests without frames during %s but completes an explicit notice', resting => {
  const ui = mount(<LivingRoom {...props} mood={resting === 'sick' ? 'sick' : 'happy'} away={resting === 'away'} />)
  expect(frames.size).toBe(0)
  click(ui.container.querySelector('.room-pet')!)
  expect(frames.size).toBe(1)
  frame(300)
  expect(frames.size).toBe(1)
  frame(600)
  expect(frames.size).toBe(0)
  click(ui.container.querySelector('.room-pet')!)
  expect(frames.size).toBe(1)
  frame(1200)
  expect(frames.size).toBe(0)
})

it.each(['sick', 'away'] as const)('finishes the existing suppression blend before stopping the %s clock', resting => {
  const control = createRef<LivingRoomControl>()
  const teddy: PlacedObject = { ...plant, id: 'bear', catalogId: 'teddy', tileX: 5, tileY: 4 }
  const scene = (suppressed: boolean) => <LivingRoom {...props} objects={[teddy]} control={control}
    mood={suppressed && resting === 'sick' ? 'sick' : 'happy'} away={suppressed && resting === 'away'} />
  const ui = mount(scene(false))
  act(() => { expect(control.current!.lookAt('bear')).toBe('started') })
  frame(100)
  const resident = ui.container.querySelector('.room-pet')!, position = resident.getAttribute('transform')
  ui.rerender(scene(true))
  expect(resident.getAttribute('transform')).toBe(position)
  expect(frames.size).toBe(1)
  frame(219)
  expect(frames.size).toBe(1)
  frame(220)
  expect(frames.size).toBe(0)
  expect(resident.getAttribute('transform')).toBe(position)
  ui.rerender(scene(false))
  expect(frames.size).toBe(1)
})

it('announces an invited observation once at arrival using the existing single clock', () => {
  const control = createRef<LivingRoomControl>()
  const teddy: PlacedObject = { ...plant, id: 'bear', catalogId: 'teddy', tileX: 5, tileY: 4 }
  const ui = mount(<LivingRoom {...props} mood="happy" objects={[plant, teddy]} control={control} />)
  const original = art(ui.container)
  let result: string | undefined
  act(() => { result = control.current?.lookAt('bear') })
  expect(result).toBe('started')
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe('')
  frame(840)
  act(() => { result = control.current?.lookAt('bear') })
  expect(result).toBe('started')
  frame(2100)
  const heard = ui.container.querySelector('[aria-live]')!.textContent
  expect(petLines.CALM_OBJECT_LINES.teddy).toContain(heard)
  frame(2460); frame(2700)
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(heard)
  expect(art(ui.container)).toBe(original)
  expect(frames.size).toBe(1)
  visibility(true)
  expect(frames.size).toBe(0)
  visibility(false)
  expect(frames.size).toBe(1)
})

it('answers an invitation from its current position in reduced motion', () => {
  Object.defineProperty(media, 'matches', { value: true, configurable: true })
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood="happy" objects={[plant]} control={control} />)
  const resident = ui.container.querySelector('.room-pet')!
  const before = resident.getAttribute('transform')
  let result: string | undefined
  act(() => { result = control.current?.lookAt('plant') })
  expect(result).toBe('still')
  expect(petLines.CALM_OBJECT_LINES.plant).toContain(ui.container.querySelector('[aria-live]')!.textContent)
  frame(2000); frame(5000)
  expect(resident.getAttribute('transform')).toBe(before)
  expect(Number(ui.container.querySelector('[data-character-accents]')!.getAttribute('opacity'))).toBe(0)
  expect(frames.size).toBe(0)
})

it('validates changed room occupancy before paint while the reduced resident clock is paused', () => {
  Object.defineProperty(media, 'matches', { value: true, configurable: true })
  const onPosition = vi.fn()
  const ui = mount(<LivingRoom {...props} mood="happy" onPosition={onPosition} />)
  const resident = ui.container.querySelector('.room-pet')!, before = resident.getAttribute('transform')
  expect(frames.size).toBe(0)
  const moved = { ...plant, tileX: 3, tileY: 2 }
  ui.rerender(<LivingRoom {...props} mood="happy" objects={[moved]} onPosition={onPosition} />)
  expect(resident.getAttribute('transform')).not.toBe(before)
  expect(onPosition.mock.calls.at(-1)?.[0]).not.toEqual({ tx: 3, ty: 2 })
  expect(frames.size).toBe(0)
})

it('makes an already-running ambient interaction audible without restarting it', () => {
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood="happy" objects={[plant]} control={control} />)
  frame(1500)
  const observation = ui.container.querySelector('.pet-bubble')!.textContent
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe('')
  act(() => { expect(control.current!.lookAt('plant')).toBe('started') })
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(observation)
  frame(1860); frame(1980)
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(observation)
  expect(frames.size).toBe(1)
})

it('keeps player dialogue priority and declines resting or missing-object invitations', () => {
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood="happy" objects={[plant]} control={control} />)
  click(ui.container.querySelector('.room-pet')!)
  const heard = ui.container.querySelector('[aria-live]')!.textContent
  let result: string | undefined
  act(() => { result = control.current?.lookAt('plant') })
  expect(result).toBe('busy')
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(heard)
  frame(1300)
  act(() => { result = control.current?.lookAt('missing') })
  expect(result).toBe('unreachable')
  ui.rerender(<LivingRoom {...props} objects={[plant]} control={control} away />)
  act(() => { result = control.current?.lookAt('plant') })
  expect(result).toBe('resting')
  ui.rerender(<LivingRoom {...props} objects={[plant]} control={control} mood="sick" />)
  act(() => { result = control.current?.lookAt('plant') })
  expect(result).toBe('resting')
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(heard)
})

it.each(['tap', 'cheer'] as const)('discards a pending invitation when a player %s interrupts it', cause => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const control = createRef<LivingRoomControl>()
  const teddy: PlacedObject = { ...plant, id: 'bear', catalogId: 'teddy', tileX: 5, tileY: 4 }
  const scene = (celebrate?: LivingRoomProps['celebrate']) => <LivingRoom {...props} mood="happy" objects={[plant, teddy]} control={control} celebrate={celebrate} />
  const ui = mount(scene())
  act(() => { expect(control.current!.lookAt('bear')).toBe('started') })
  frame(420)
  if (cause === 'tap') click(ui.container.querySelector('.room-pet')!)
  else ui.rerender(scene({ key: 12, choreName: 'Water the plant' }))
  expect(ui.container.querySelector('[aria-live]')!.textContent).not.toBe('')
  act(() => vi.advanceTimersByTime(3600))
  frame(4000); frame(4420); frame(10000); frame(20000)
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe('')
  expect(frames.size).toBe(1)
})

it('discards removed targets and settles an invited route when reduced motion changes live', () => {
  const control = createRef<LivingRoomControl>()
  const teddy: PlacedObject = { ...plant, id: 'bear', catalogId: 'teddy', tileX: 5, tileY: 4 }
  const scene = (objects: PlacedObject[]) => <LivingRoom {...props} mood="happy" objects={objects} control={control} />
  const ui = mount(scene([plant, teddy]))
  act(() => { expect(control.current!.lookAt('bear')).toBe('started') })
  frame(420)
  ui.rerender(scene([plant]))
  frame(500); frame(3000)
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe('')
  ui.rerender(scene([plant, teddy]))
  act(() => { expect(control.current!.lookAt('bear')).toBe('started') })
  frame(3200)
  preference(true)
  const position = ui.container.querySelector('.room-pet')!.getAttribute('transform')
  frame(3400)
  expect(ui.container.querySelector('.room-pet')!.getAttribute('transform')).toBe(position)
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe('')
  act(() => { expect(control.current!.lookAt('bear')).toBe('still') })
  expect(petLines.CALM_OBJECT_LINES.teddy).toContain(ui.container.querySelector('[aria-live]')!.textContent)
})

it('eases idle eyes toward a pointer, releases them smoothly and keeps one clock without room redraws', () => {
  const ui = mount(<LivingRoom {...props} mood="happy" />)
  const resident = ui.container.querySelector('.room-pet')!
  Object.defineProperty(resident, 'getScreenCTM', { value: () => ({ a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 }) })
  const renderedRooms = roomRenders.count
  pointerAt(resident, 350, 132)
  frame(16)
  expect(gaze(ui.container)).toBe('translate(0 0)')
  frame(76)
  expect(gaze(ui.container)).toBe('translate(1.5 -1)')
  frame(136)
  expect(gaze(ui.container)).toBe('translate(3 -2)')
  act(() => resident.dispatchEvent(new MouseEvent('pointerout', { bubbles: true })))
  frame(152)
  expect(gaze(ui.container)).toBe('translate(3 -2)')
  frame(272)
  expect(gaze(ui.container)).toBe('translate(0 0)')
  expect(roomRenders.count).toBe(renderedRooms)
  expect(frames.size).toBe(1)
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe('')
})

it('gives keyboard focus a quiet gaze, yields smoothly to reactions and honors live reduction', () => {
  const ui = mount(<LivingRoom {...props} mood="happy" />)
  const resident = ui.container.querySelector('.room-pet')!
  act(() => resident.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
  frame(16); frame(136)
  expect(gaze(ui.container)).toBe('translate(0 -1.5)')
  click(resident)
  expect(gaze(ui.container)).toBe('translate(0 -1.5)')
  frame(256)
  // Greetings intentionally close the eyes. Attention must yield to that face.
  expect(ui.container.querySelector('[data-expression="cheering"]')).not.toBeNull()
  frame(1400); frame(1520)
  expect(gaze(ui.container)).toBe('translate(0 0)')
  frame(1640)
  expect(gaze(ui.container)).toBe('translate(0 -1.5)')
  preference(true)
  expect(gaze(ui.container)).toBe('translate(0 0)')
  frame(1760)
  expect(gaze(ui.container)).toBe('translate(0 0)')
  act(() => resident.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
  preference(false)
  frame(1880)
  expect(gaze(ui.container)).toBe('translate(0 0)')
})

it('ignores touch pointer movement and clears stale hover after hiding', () => {
  const ui = mount(<LivingRoom {...props} mood="happy" />)
  const resident = ui.container.querySelector('.room-pet')!
  Object.defineProperty(resident, 'getScreenCTM', { value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) })
  pointerAt(resident, 170, 56, 'touch')
  frame(16); frame(136)
  expect(gaze(ui.container)).toBe('translate(0 0)')
  pointerAt(resident, 170, 56, 'pen')
  frame(152); frame(272)
  expect(gaze(ui.container)).toBe('translate(3 -2)')
  visibility(true)
  expect(frames.size).toBe(0)
  visibility(false)
  frame(288)
  expect(gaze(ui.container)).toBe('translate(0 0)')
  expect(frames.size).toBe(1)
})

function expectEyeScale(container: Element, expected: number) {
  const eyes = container.querySelectorAll('[data-eye-open]')
  expect(eyes).toHaveLength(2)
  for (const eye of eyes) {
    expect(Number(eye.getAttribute('data-eye-open'))).toBeCloseTo(expected, 12)
    const scale = eye.getAttribute('transform')!.match(/scale\(1 ([^)]+)\)/)!
    expect(Number(scale[1])).toBeCloseTo(expected, 12)
  }
}

it('keeps rendered eyes and world geometry continuous at the closed-blink local arrival', () => {
  const walking: PetState = { ...initialPet({ tx: 2, ty: 2 }, 2650), activity: {
    kind: 'walk', path: [{ tx: 3, ty: 2 }], stepStart: 2650, then: 'idle',
  } }
  const world = { free: () => true, mood: 'happy' as const, away: false, mess: null, interactions: [] }
  const scene = (state: PetState, time: number) => {
    const position = positionAt(state, time), point = roomPoint(position.tx + 0.5, position.ty + 0.5)
    return <svg><g transform={`translate(${point.x - 100 * PET_SCALE} ${point.y - 182 * PET_SCALE}) scale(${PET_SCALE})`}>
      <AnimatedCharacterArt species="bun" mood="happy" bodyColour={pet.bodyColour}
        frame={motionFor(state, time, 'bun', 'happy', false).frame} />
    </g></svg>
  }
  const ui = mount(scene(walking, 3069.999))
  expectEyeScale(ui.container, 0.1)
  const original = art(ui.container)
  const body = worldPoint(ui.container.querySelector('[data-character-body]')!, 100, 140)
  const soles = ['left', 'right'].map((side) => foot(ui.container, side))
  const arrived = step(walking, world, 3070, () => 0.9)
  ui.rerender(scene(arrived, 3070))
  expectEyeScale(ui.container, 0.1)
  expect(art(ui.container)).toBe(original)
  const joinedBody = worldPoint(ui.container.querySelector('[data-character-body]')!, 100, 140)
  joinedBody.forEach((value, i) => expect(Math.abs(value - body[i])).toBeLessThan(0.001))
  for (const [i, side] of ['left', 'right'].entries()) {
    foot(ui.container, side).forEach((value, axis) => expect(Math.abs(value - soles[i][axis])).toBeLessThan(0.001))
  }
  ui.rerender(scene(arrived, 3086))
  expectEyeScale(ui.container, 0.1)
  ui.rerender(scene(arrived, 3190))
  expectEyeScale(ui.container, 1)
})

it('renders sampled greetings and affection, then restores mood without remounting art', () => {
  const { container } = mount(<LivingRoom {...props} />)
  const original = art(container)
  expect(original).not.toBeNull()
  expect(original.querySelector('[data-expression="meh"]')).not.toBeNull()
  click(container.querySelector('[role="button"]')!)
  frame(500)
  expect(art(container)).toBe(original)
  expect(original.querySelector('[data-expression="cheering"]')).not.toBeNull()
  frame(1300)
  expect(original.querySelector('[data-expression="meh"]')).not.toBeNull()
  click(container.querySelector('[role="button"]')!)
  frame(1900)
  expect(Number(original.querySelector('[data-character-accents]')!.getAttribute('opacity'))).toBeGreaterThan(0)
  frame(3000)
  expect(original.querySelector('[data-expression="meh"]')).not.toBeNull()
  expect(container.querySelector('.pet-hop')).toBeNull()
})

it('big completion replaces ambient interaction, is consumed once, and returns to mood', () => {
  const onCelebrated = vi.fn()
  const ui = mount(<LivingRoom {...props} objects={[plant]} onCelebrated={onCelebrated} />)
  frame(1600); frame(2000)
  expect(ui.container.querySelector('.pet-bubble')?.textContent).toBeTruthy()
  expect(ui.container.querySelector('[aria-live]')?.textContent).toBe('')
  const celebrate = { key: 1, choreName: 'Water plant', big: true }
  ui.rerender(<LivingRoom {...props} objects={[plant]} celebrate={celebrate} onCelebrated={onCelebrated} />)
  frame(2924)
  expect(Number(ui.container.querySelector('[data-character-ground]')!.getAttribute('opacity'))).toBeLessThan(0.8)
  expect(onCelebrated.mock.calls).toEqual([[1]])
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBeTruthy()
  frame(4300)
  expect(art(ui.container).querySelector('[data-expression="meh"]')).not.toBeNull()
  ui.rerender(<LivingRoom {...props} objects={[plant]} celebrate={{ ...celebrate }} onCelebrated={onCelebrated} />)
  frame(4500)
  expect(onCelebrated).toHaveBeenCalledTimes(1)
  expect(Number(ui.container.querySelector('[data-character-ground]')!.getAttribute('opacity'))).toBe(1)
})

it.each([
  { stage: 'clean', level: 0, actionEnd: 3260 },
  { stage: 'messy1', level: 1, actionEnd: 3660 },
] as const)('keeps one readable line through a $stage interaction, including orient and settle', ({ stage, level, actionEnd }) => {
  const { container } = mount(<LivingRoom {...props} objects={[plant]} stages={{ plant: stage }} neglect={{ plant: level }} />)
  const original = art(container)
  frame(1500) // Orient begins, followed by a 360ms turn.
  const opening = container.querySelector('.pet-bubble')!.textContent
  expect(opening).toBeTruthy()
  if (stage === 'clean') expect(['Hello, little leaves!', "I'm waving to the plant."]).toContain(opening)
  for (const time of [1859, 1860, 2400, actionEnd, actionEnd + 179]) {
    frame(time) // Actual behavior crosses action and the 180ms settle phase.
    expect(container.querySelector('.pet-bubble')!.textContent).toBe(opening)
    expect(container.querySelector('[aria-live]')!.textContent).toBe('')
    expect(art(container)).toBe(original)
  }
})

it('immediately replaces a held interaction line with player dialogue', () => {
  const { container } = mount(<LivingRoom {...props} objects={[plant]} />)
  frame(1500)
  const ambient = container.querySelector('.pet-bubble')!.textContent
  frame(1600)
  click(container.querySelector('[role="button"]')!)
  const greeting = container.querySelector('.pet-bubble')!.textContent
  expect(greeting).toBeTruthy()
  expect(greeting).not.toBe(ambient)
  expect(container.querySelector('[aria-live]')!.textContent).toBe(greeting)
  frame(1860)
  expect(container.querySelector('.pet-bubble')!.textContent).toBe(greeting)
})

const dialogueObjects = [
  { catalogId: 'plant', name: 'Water the plant', kind: 'wilt' },
  { catalogId: 'sink', name: 'Wash the dishes', kind: 'stink' },
  { catalogId: 'counter', name: 'Wipe the counters', kind: 'stink' },
] as const
it.each(['constructor', 'toString', '__proto__'])('uses clean dialogue for reserved object ID %s with empty ordinary records', (id) => {
  const { container } = mount(<LivingRoom {...props} objects={[{ ...plant, id }]} stages={{}} neglect={{}} />)
  frame(1500)
  const line = container.querySelector('.pet-bubble')!.textContent
  expect(['Hello, little leaves!', "I'm waving to the plant."]).toContain(line)
  expect(container.querySelector('[aria-live]')!.textContent).toBe('')
  frame(2400)
  expect(container.querySelector('.pet-bubble')!.textContent).toBe(line)
  frame(2600) // Complete the orient-to-action blend before checking its expression.
  // A healthy plant waves; a wilted one uses the alert concern expression.
  expect(art(container).querySelector('[data-expression="cheering"]')).not.toBeNull()
})

it.each(['constructor', 'toString', '__proto__'])(
  'keeps owned stage-based condition dialogue for reserved ID %s', (id) => {
    const { container } = mount(<LivingRoom {...props} objects={[{ ...plant, id }]} stages={{ [id]: 'messy1' }}
      neglect={{}} />)
    frame(1500)
    const line = container.querySelector('.pet-bubble')!.textContent
    expect(OBJECT_LINES.plant).toContain(line)
    expect(MOOD_LINES.content).not.toContain(line)
    frame(2400)
    expect(container.querySelector('.pet-bubble')!.textContent).toBe(line)
    frame(2600)
    expect(art(container).querySelector('[data-expression="cheering"]')).toBeNull()
  },
)
function choreFor(object: PlacedObject, name: string): Chore {
  return { id: `${object.id}-chore`, homeId: 'home', objectId: object.id, name,
    schedule: { kind: 'daily' }, createdOn: '2026-10-11', photoProof: false }
}
function statusFor(chore: Chore, level: ChoreStatus['neglect']): ChoreStatus {
  return { choreId: chore.id, dueDate: '2026-10-11', state: level ? 'overdue' : 'due', overdueDays: level, neglect: level }
}

it.each(dialogueObjects.flatMap((object) => [false, true].map((otherOverdue) => ({ ...object, otherOverdue }))))(
  'uses neutral dialogue for a clean $catalogId with another overdue object: $otherOverdue',
  ({ catalogId, name, otherOverdue }) => {
    const target = { ...plant, id: 'target', catalogId }
    const targetChore = choreFor(target, name)
    const other = { ...plant, id: 'other', tileX: 5, tileY: 5 }
    const otherChore = choreFor(other, 'Water the other plant')
    // The real selector chooses the last object at random=.99. Only it is beside the pet.
    const objects = otherOverdue ? [other, target] : [target]
    const chores = otherOverdue ? [otherChore, targetChore] : [targetChore]
    const statuses = otherOverdue ? [statusFor(otherChore, 3), statusFor(targetChore, 0)] : [statusFor(targetChore, 0)]
    const { container } = mount(<LivingRoom {...props} objects={objects} chores={chores} statuses={statuses}
      stages={{ target: 'clean', other: 'messy2' }} neglect={{ target: 0, other: otherOverdue ? 3 : 0 }} />)
    frame(1500)
    const line = container.querySelector('.pet-bubble')!.textContent
    expect(line).toBeTruthy()
    const observations = { plant: ['Hello, little leaves!', "I'm waving to the plant."],
      sink: ['A little basin for a little splash.', 'That tap has a lovely curve.'],
      counter: ['I spotted a tiny tomato!', 'A little tomato on a little board.'] }
    expect(observations[catalogId]).toContain(line)
    expect(container.querySelector('[aria-live]')!.textContent).toBe('')
    frame(1860)
    expect(container.querySelector('.pet-bubble')!.textContent).toBe(line)
  },
)

it.each(['teddy', 'dishwasher'])('uses observations for a clean %s without an assigned chore', (catalogId) => {
    const { container } = mount(<LivingRoom {...props} objects={[{ ...plant, catalogId }]} />)
    frame(1500)
    const line = container.querySelector('.pet-bubble')!.textContent
    const expected = catalogId === 'teddy' ? ['Hello, soft little friend.', 'That teddy has such a sweet face.']
      : ['Three little buttons in a row.', 'A blue button between red and green.']
    expect(expected).toContain(line)
    expect(container.querySelector('[aria-live]')!.textContent).toBe('')
    frame(1860); frame(2400)
    expect(container.querySelector('.pet-bubble')!.textContent).toBe(line)
})

it('keeps a calm mood fallback when the target has no observation content', () => {
  vi.spyOn(petLines, 'calmObjectLine').mockReturnValue('')
  const { container } = mount(<LivingRoom {...props} objects={[plant]} />)
  frame(1500)
  const line = container.querySelector('.pet-bubble')!.textContent
  expect(MOOD_LINES.content).toContain(line)
  frame(1860); frame(2400)
  expect(container.querySelector('.pet-bubble')!.textContent).toBe(line)
  expect(container.querySelector('[aria-live]')!.textContent).toBe('')
})

it.each(dialogueObjects.flatMap((object) => ([1, 2, 3] as const).map((level) => ({ ...object, level }))))(
  'keeps condition dialogue for an overdue $catalogId at neglect $level',
  ({ catalogId, name, kind, level }) => {
    const target = { ...plant, catalogId }
    const chore = choreFor(target, name)
    const { container } = mount(<LivingRoom {...props} objects={[target]} chores={[chore]} statuses={[statusFor(chore, level)]}
      stages={{ plant: level === 1 ? 'messy1' : 'messy2' }} neglect={{ plant: level }} />)
    frame(1500)
    const line = container.querySelector('.pet-bubble')!.textContent
    expect(line).toBeTruthy()
    const conditionLines = level === 1 ? OBJECT_LINES[catalogId] : KIND_LINES[kind][level]
    expect(conditionLines).toContain(line)
    expect(MOOD_LINES.content).not.toContain(line)
    expect(container.querySelector('[aria-live]')!.textContent).toBe('')
    frame(1860)
    expect(container.querySelector('.pet-bubble')!.textContent).toBe(line)
  },
)

it.each([0, 1] as const)('keeps the resident route and resting position clear of the open dishwasher at rotation %s', (rotation) => {
  const object = { ...plant, catalogId: 'dishwasher', rotation }
  const front = rotation === 0 ? { tx: 3, ty: 2 } : { tx: 2, ty: 3 }
  const from = rotation === 0 ? { tx: 4, ty: 2 } : { tx: 2, ty: 4 }
  const onPosition = vi.fn()
  const ui = mount(<LivingRoom {...props} objects={[object]} stages={{ plant: 'messy2' }} initialTile={from} onPosition={onPosition} />)
  let observed = false
  for (let time = 1500; time <= 5500; time += 50) {
    frame(time)
    observed ||= Boolean(ui.container.querySelector('.pet-bubble')?.textContent)
  }
  const entersFront = () => onPosition.mock.calls.some(([at]) => Math.abs(at.tx - front.tx) < 0.5 && Math.abs(at.ty - front.ty) < 0.5)
  expect(entersFront()).toBe(false)
  expect(observed).toBe(true)
  onPosition.mockClear()
  ui.rerender(<LivingRoom {...props} objects={[object]} stages={{ plant: 'clean' }} initialTile={from} onPosition={onPosition} />)
  for (let time = 5550; time <= 11000; time += 50) frame(time)
  expect(entersFront()).toBe(true)
})

it('uses current suppression props for input before a frame and retains sleeping/sick art', () => {
  const ui = mount(<LivingRoom {...props} />)
  ui.rerender(<LivingRoom {...props} away />)
  click(ui.container.querySelector('[role="button"]')!)
  expect(art(ui.container)?.getAttribute('data-character-pose')).toBe('sleeping')
  frame(300)
  expect(ui.container.querySelector('[data-character-ground]')!.getAttribute('opacity')).toBe('1')
  ui.rerender(<LivingRoom {...props} mood="sick" />)
  click(ui.container.querySelector('[role="button"]')!)
  frame(600)
  expect(art(ui.container).getAttribute('data-character-pose')).toBe('sick')
})

it('regenerates environment targets when the current object or stage changes', () => {
  const objects = [plant]
  const ui = mount(<LivingRoom {...props} objects={objects} />)
  frame(1600); frame(2000)
  expect(ui.container.querySelector('.pet-bubble')?.textContent).toBeTruthy()
  ui.rerender(<LivingRoom {...props} objects={objects} stages={{ plant: 'messy1' }} />)
  expect(ui.container.querySelector('.pet-bubble')).toBeNull()
  frame(8000); frame(8400)
  expect(ui.container.querySelector('.pet-bubble')?.textContent).toBeTruthy()
  ui.rerender(<LivingRoom {...props} objects={[]} />)
  expect(ui.container.querySelector('.pet-bubble')).toBeNull()
})

it('stops a fractional local walk immediately on preference change and resumes from that point', () => {
  const positions: { tx: number; ty: number }[] = []
  const ui = mount(<LivingRoom {...props} initialTile={{ tx: 0, ty: 0 }} objects={[plant]} onPosition={(p) => positions.push(p)} />)
  frame(1600); frame(1737)
  const before = positions.at(-1)!
  expect(Number.isInteger(before.tx) && Number.isInteger(before.ty)).toBe(false)
  preference(true)
  expect(positions.at(-1)).toEqual(before)
  const body = art(ui.container).querySelector('[data-character-body]')!.getAttribute('transform')
  frame(9000)
  expect(positions.at(-1)).toEqual(before)
  expect(art(ui.container).querySelector('[data-character-body]')!.getAttribute('transform')).toBe(body)
  preference(false)
  expect(positions.at(-1)).toEqual(before)
})

it('keeps repeated taps bounded, keyboard activation, and expired hidden reactions settle once', () => {
  const { container } = mount(<LivingRoom {...props} />)
  const button = container.querySelector('[role="button"]')!
  expect(button.getAttribute('tabindex')).toBe('0')
  act(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
  frame(500)
  expect(art(container)?.querySelector('[data-expression="cheering"]')).not.toBeNull()
  const count = container.querySelectorAll('*').length
  for (let i = 0; i < 50; i++) click(button)
  expect(container.querySelectorAll('*').length).toBeLessThanOrEqual(count + 2)
  visibility(true); visibility(false); frame(10000)
  expect(art(container).querySelector('[data-expression="meh"]')).not.toBeNull()
  frame(10016)
  expect(art(container).querySelector('[data-expression="meh"]')).not.toBeNull()
  expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
})

const layout = homeLayout(['a', 'b'])
const route: RoomWaypoint[] = [{ roomId: 'a', tx: 6, ty: 4 }, { roomId: 'a', tx: 7, ty: 4 }, { roomId: 'b', tx: 0, ty: 4 }, { roomId: 'b', tx: 1, ty: 4 }, { roomId: 'b', tx: 2, ty: 4 }]
it('keeps the shared travel endpoint blink while settling body and feet and arriving once', () => {
  now = 2980
  const path = [{ roomId: 'a', tx: 2, ty: 2 }, { roomId: 'a', tx: 3, ty: 2 }]
  const onDone = vi.fn()
  const ui = mount(<HomeTraveler path={path} layout={layout} pet={pet} mood="happy" onDone={onDone} />)
  const neutralBody = ui.container.querySelector('[data-character-body]')!.getAttribute('transform')
  const original = art(ui.container)
  frame(3069.999)
  expectEyeScale(ui.container, 0.1)
  const soles = ['left', 'right'].map((side) => foot(ui.container, side))
  expect(onDone).not.toHaveBeenCalled()
  frame(3070)
  expectEyeScale(ui.container, 0.1)
  expect(art(ui.container)).toBe(original)
  expect(ui.container.querySelector('[data-character-body]')!.getAttribute('transform')).toBe(neutralBody)
  for (const [i, side] of ['left', 'right'].entries()) {
    foot(ui.container, side).forEach((value, axis) => expect(value).toBeCloseTo(soles[i][axis], 4))
  }
  expect(onDone.mock.calls).toEqual([[path.at(-1)]])
  expect(frames.size).toBe(0)
  frame(3086)
  expect(onDone).toHaveBeenCalledTimes(1)
})
it('travels with sampled gait across intermediate waypoints and immediately arrives on live reduced motion', () => {
  const onDone = vi.fn(); const onPosition = vi.fn()
  const ui = mount(<HomeTraveler path={route} layout={layout} pet={pet} mood="happy" onDone={onDone} onPosition={onPosition} />)
  frame(0); frame(137)
  expect(art(ui.container)).not.toBeNull()
  expect(ui.container.querySelector('[data-character-body]')!.getAttribute('transform')).not.toContain('NaN')
  expect(onPosition.mock.calls.at(-1)![0].roomId).toBe('b')
  expect(onPosition.mock.calls.at(-1)![0].tx).toBeCloseTo(-1 + 47 / 90, 12)
  expect(onPosition.mock.calls.at(-1)![0].ty).toBe(4)
  preference(true)
  expect(onDone.mock.calls).toEqual([[route.at(-1)]])
  expect(onPosition.mock.calls.at(-1)).toEqual([route.at(-1)])
  expect(ui.container.querySelector('[data-travelling]')!.getAttribute('data-travelling')).toBe('false')
  frame(1000); preference(false)
  expect(onDone).toHaveBeenCalledTimes(1)
  expect(ui.container.querySelector('.home-traveler-run')).toBeNull()
})

it('retargets from the last fractional position and completes once with the latest callback', () => {
  const onDone = vi.fn(); const onPosition = vi.fn(); const latestDone = vi.fn()
  const ui = mount(<HomeTraveler path={route} layout={layout} pet={pet} mood="happy" onDone={onDone} onPosition={onPosition} />)
  frame(0); frame(137)
  const position = onPosition.mock.calls.at(-1)![0]
  const drawn = ui.container.querySelector('svg > g')!.getAttribute('transform')
  const redirected = [position, { roomId: 'a', tx: 7, ty: 4 }, { roomId: 'a', tx: 6, ty: 4 }]
  ui.rerender(<HomeTraveler path={redirected} layout={layout} pet={pet} mood="happy" onDone={latestDone} onPosition={onPosition} />)
  expect(ui.container.querySelector('svg > g')!.getAttribute('transform')).toBe(drawn)
  frame(137); visibility(true); visibility(false); frame(12000)
  expect(latestDone.mock.calls).toEqual([[redirected.at(-1)]])
  expect(onDone).not.toHaveBeenCalled()
  frame(13000)
  expect(latestDone).toHaveBeenCalledTimes(1)
})

it('redraws local character frames without rendering Room again', () => {
  const commits: string[] = []
  mount(<Profiler id="room" onRender={(_, phase) => commits.push(phase)}><LivingRoom {...props} /></Profiler>)
  const before = roomRenders.count
  frame(100); frame(116); frame(132)
  expect(roomRenders.count).toBe(before)
  expect(commits.length).toBeGreaterThan(1)
})

// Evaluate the rendered SVG transform chain, independently of the motion sampler.
function worldPoint(node: Element, x: number, y: number): [number, number] {
  for (let el: Element | null = node; el; el = el.parentElement) {
    for (const [, op, args] of [...(el.getAttribute('transform') ?? '').matchAll(/(matrix|translate|scale|rotate)\(([^)]+)\)/g)].reverse()) {
      const v = args.split(/[ ,]+/).map(Number)
      if (op === 'translate') { x += v[0]; y += v[1] ?? 0 }
      if (op === 'scale') { x *= v[0]; y *= v[1] ?? v[0] }
      if (op === 'matrix') [x, y] = [v[0] * x + v[2] * y + v[4], v[1] * x + v[3] * y + v[5]]
      if (op === 'rotate') {
        const a = v[0] * Math.PI / 180, cx = v[1] ?? 0, cy = v[2] ?? 0
        ;[x, y] = [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]
      }
    }
  }
  return [x, y]
}
function foot(container: Element, side: string): [number, number] {
  const node = container.querySelector(`[data-foot="${side}"] ellipse`)!
  return worldPoint(node, Number(node.getAttribute('cx')), Number(node.getAttribute('cy')) + 9)
}

it('keeps a real stance foot planted across a room boundary with whole-journey distance', () => {
  const ui = mount(<HomeTraveler path={route} layout={layout} pet={pet} mood="happy" onDone={() => {}} />)
  frame(179.9)
  const before = { left: foot(ui.container, 'left'), right: foot(ui.container, 'right') }
  frame(180)
  const boundary = { left: foot(ui.container, 'left'), right: foot(ui.container, 'right') }
  frame(190)
  const planted = (['left', 'right'] as const).filter((side) => {
    const after = foot(ui.container, side)
    return Math.hypot(after[0] - before[side][0], after[1] - before[side][1]) < 1e-6
      && Math.hypot(boundary[side][0] - before[side][0], boundary[side][1] - before[side][1]) < 1e-6
  })
  expect(planted.length).toBeGreaterThan(0)
  for (const side of planted) {
    const [x, y] = before[side]
    // Independent projection: route starts at (253.5,266.875), floor slope .5,
    // Bun soles at (78|122,187), pet origin (100,182), scene scale .33.
    const footX = (side === 'left' ? 78 - 100 : 122 - 100) * 0.33
    expect(y).toBeCloseTo(266.875 + (x - 253.5 - footX) * 0.5 + 5 * 0.33, 6)
  }
})

it('blends a retargeted traveler pose continuously at its reported position', () => {
  const onPosition = vi.fn()
  const ui = mount(<HomeTraveler path={route} layout={layout} pet={pet} mood="happy" onDone={() => {}} onPosition={onPosition} />)
  frame(137)
  const beforeBody = worldPoint(ui.container.querySelector('[data-character-body]')!, 100, 140)
  const beforeLeft = foot(ui.container, 'left')
  const beforeRight = foot(ui.container, 'right')
  const redirected = [onPosition.mock.calls.at(-1)![0], { roomId: 'a', tx: 7, ty: 4 }, { roomId: 'a', tx: 6, ty: 4 }]
  ui.rerender(<HomeTraveler path={redirected} layout={layout} pet={pet} mood="happy" onDone={() => {}} onPosition={onPosition} />)
  const afterBody = worldPoint(ui.container.querySelector('[data-character-body]')!, 100, 140)
  expect(afterBody[0]).toBeCloseTo(beforeBody[0], 6)
  expect(afterBody[1]).toBeCloseTo(beforeBody[1], 6)
  expect(foot(ui.container, 'right')[0]).toBeCloseTo(beforeLeft[0], 6)
  expect(foot(ui.container, 'left')[0]).toBeCloseTo(beforeRight[0], 6)
})

it.each((['bun', 'mochi', 'sprout'] as const).flatMap((species) =>
  (['happy', 'content', 'meh', 'scruffy'] as const).map((mood) => ({ species, mood }))))(
  'preserves the full $species $mood torso when an active journey reverses', ({ species, mood }) => {
    const onPosition = vi.fn()
    const ui = mount(<HomeTraveler path={route} layout={layout} pet={{ ...pet, species }} mood={mood} onDone={() => {}} onPosition={onPosition} />)
    frame(137)
    const body = ui.container.querySelector('[data-character-body]')!
    const corners = [[45, 40], [155, 40], [45, 182], [155, 182]]
    const before = corners.map(([x, y]) => worldPoint(body, x, y))
    const redirected = [onPosition.mock.calls.at(-1)![0], { roomId: 'a', tx: 7, ty: 4 }, { roomId: 'a', tx: 6, ty: 4 }]
    ui.rerender(<HomeTraveler path={redirected} layout={layout} pet={{ ...pet, species }} mood={mood} onDone={() => {}} onPosition={onPosition} />)
    const after = corners.map(([x, y]) => worldPoint(body, 200 - x, y))
    for (let i = 0; i < before.length; i++) {
      expect(after[i][0]).toBeCloseTo(before[i][0], 6)
      expect(after[i][1]).toBeCloseTo(before[i][1], 6)
    }
  },
)

it('settles a long traveler by ten seconds and keeps the deadline when appearance changes', () => {
  const path = Array.from({ length: 200 }, (_, i) => ({ roomId: 'a', tx: i % 2 ? 7 : 0, ty: 4 }))
  const onDone = vi.fn()
  const ui = mount(<HomeTraveler path={path} layout={layout} pet={pet} mood="happy" onDone={onDone} />)
  frame(9990)
  expect(onDone).not.toHaveBeenCalled()
  ui.rerender(<HomeTraveler path={path} layout={layout} pet={{ ...pet, bodyColour: '#fed' }} mood="content" onDone={onDone} />)
  frame(10000)
  expect(onDone.mock.calls).toEqual([[path.at(-1)]])
  expect(frames.size).toBe(0)
})

it('arrives once on initial reduced motion, including Strict Mode replay', () => {
  preference(true)
  const onDone = vi.fn()
  mount(<StrictMode><HomeTraveler path={route} layout={layout} pet={pet} mood="happy" onDone={onDone} /></StrictMode>)
  expect(onDone.mock.calls).toEqual([[route.at(-1)]])
  expect(frames.size).toBe(0)
})

it('keeps mirrored feet continuous at a traveler corner without restarting gait', () => {
  const corner = [
    { roomId: 'a', tx: 2, ty: 2 }, { roomId: 'a', tx: 3, ty: 2 },
    { roomId: 'a', tx: 4, ty: 2 }, { roomId: 'a', tx: 4, ty: 3 },
    { roomId: 'a', tx: 4, ty: 4 }, { roomId: 'a', tx: 4, ty: 5 },
    { roomId: 'a', tx: 4, ty: 6 }, { roomId: 'a', tx: 4, ty: 7 },
  ]
  const ui = mount(<HomeTraveler path={corner} layout={layout} pet={pet} mood="happy" onDone={() => {}} />)
  frame(179.9)
  const left = foot(ui.container, 'left'), right = foot(ui.container, 'right')
  frame(180)
  expect(foot(ui.container, 'right')[0]).toBeCloseTo(left[0], 6)
  expect(foot(ui.container, 'right')[1]).toBeCloseTo(left[1], 6)
  expect(foot(ui.container, 'left')[0]).toBeCloseTo(right[0], 6)
  expect(foot(ui.container, 'left')[1]).toBeCloseTo(right[1], 6)
  expect(ui.container.querySelector('svg > g > g')!.getAttribute('transform')).toBe('translate(200 0) scale(-1 1)')
  frame(240)
  expect(ui.container.innerHTML).not.toMatch(/NaN|Infinity/)
  frame(600)
  expect(ui.container.querySelector('[data-travelling]')!.getAttribute('data-travelling')).toBe('true')
})

it('settles a short redirected journey to the neutral endpoint', () => {
  const onPosition = vi.fn(); const onDone = vi.fn()
  const ui = mount(<HomeTraveler path={route} layout={layout} pet={pet} mood="happy" onDone={onDone} onPosition={onPosition} />)
  const neutralBody = ui.container.querySelector('[data-character-body]')!.getAttribute('transform')
  frame(137)
  const redirected = [onPosition.mock.calls.at(-1)![0], { roomId: 'a', tx: 7, ty: 4 }]
  ui.rerender(<HomeTraveler path={redirected} layout={layout} pet={pet} mood="happy" onDone={onDone} onPosition={onPosition} />)
  frame(184)
  expect(onDone.mock.calls).toEqual([[redirected.at(-1)]])
  expect(ui.container.querySelector('[data-character-body]')!.getAttribute('transform')).toBe(neutralBody)
  expect(ui.container.querySelector('[data-character-ground]')!.getAttribute('opacity')).toBe('1')
})

for (const suppressed of [{ mood: 'sick' as const, away: false, pose: 'sick' }, { mood: 'happy' as const, away: true, pose: 'sleeping' }]) {
  it(`arrives immediately when ${suppressed.pose} to avoid translating resting art`, () => {
    const onDone = vi.fn(); const onPosition = vi.fn()
    const ui = mount(<HomeTraveler path={route} layout={layout} pet={pet} mood="happy" onDone={onDone} onPosition={onPosition} />)
    frame(137)
    expect(onDone).not.toHaveBeenCalled()
    ui.rerender(<HomeTraveler path={route} layout={layout} pet={pet} mood={suppressed.mood} away={suppressed.away} onDone={onDone} onPosition={onPosition} />)
    expect(onDone.mock.calls).toEqual([[route.at(-1)]])
    expect(onPosition.mock.calls.at(-1)).toEqual([route.at(-1)])
    expect(art(ui.container).getAttribute('data-character-pose')).toBe(suppressed.pose)
    expect(ui.container.querySelector('[data-character-ground]')!.getAttribute('opacity')).toBe('1')
    expect(frames.size).toBe(0)
    frame(300)
    expect(onDone).toHaveBeenCalledTimes(1)
  })
}

it('updates Room depth only when a walking pet crosses a sorting tile', () => {
  const positions: { tx: number; ty: number }[] = []
  mount(<LivingRoom {...props} initialTile={{ tx: 0, ty: 0 }} objects={[plant]} onPosition={(p) => positions.push(p)} />)
  frame(1600)
  const before = roomRenders.count
  frame(1737)
  expect(positions.at(-1)).toEqual({ tx: 137 / 420, ty: 0 })
  expect(roomRenders.count).toBe(before)
  frame(1837)
  expect(roomRenders.count).toBe(before + 1)
})


it('accepts chosen player responses, coalesces busy requests and cancels an invited observation', () => {
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood="happy" objects={[plant]} control={control} initialTile={{ tx: 7, ty: 7 }} />)
  const node = art(ui.container)
  act(() => { expect(control.current!.lookAt('plant')).toBe('started') })
  frame(210)
  const position = ui.container.querySelector('.room-pet')!.getAttribute('transform')
  expect(typeof control.current!.respond).toBe('function')
  act(() => { expect(control.current!.respond('affection')).toBe('started') })
  expect(ui.container.querySelector('.room-pet')!.getAttribute('transform')).toBe(position)
  const heard = ui.container.querySelector('[aria-live]')!.textContent
  expect(petLines.AFFECTION_LINES).toContain(heard)
  frame(800)
  const moving = node.querySelector('[data-character-body]')!.getAttribute('transform')
  for (let i = 0; i < 20; i++) act(() => { expect(control.current!.respond('greet')).toBe('busy') })
  expect(node.querySelector('[data-character-body]')!.getAttribute('transform')).toBe(moving)
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(heard)
  expect(frames.size).toBe(1)
  frame(1810)
  frame(1930)
  expect(node.querySelector('[data-expression="happy"]')).not.toBeNull()
  expect(art(ui.container)).toBe(node)
})

it('keeps a reduced player choice still, then returns to zero pending frames', () => {
  Object.defineProperty(media, 'matches', { value: true, configurable: true })
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} mood="happy" control={control} />)
  expect(typeof control.current!.respond).toBe('function')
  const still = art(ui.container).querySelector('[data-character-body]')!.getAttribute('transform')
  act(() => { expect(control.current!.respond('greet')).toBe('started') })
  expect(petLines.GREETING_LINES).toContain(ui.container.querySelector('[aria-live]')!.textContent)
  expect(frames.size).toBe(1)
  frame(600)
  expect(art(ui.container).querySelector('[data-character-body]')!.getAttribute('transform')).toBe(still)
  frame(1200)
  expect(frames.size).toBe(0)
  expect(ui.container.querySelector('[data-expression="happy"]')).not.toBeNull()
})

it('declines player choices during a chore cheer or rest without replacing dialogue', () => {
  const control = createRef<LivingRoomControl>()
  const ui = mount(<LivingRoom {...props} control={control} celebrate={{ key: 91, choreName: 'Wash dishes' }} />)
  expect(typeof control.current!.respond).toBe('function')
  const cheer = ui.container.querySelector('[aria-live]')!.textContent
  act(() => { expect(control.current!.respond('affection')).toBe('busy') })
  expect(ui.container.querySelector('[aria-live]')!.textContent).toBe(cheer)
  ui.rerender(<LivingRoom {...props} control={control} mood="sick" />)
  act(() => { expect(control.current!.respond('greet')).toBe('resting') })
  ui.rerender(<LivingRoom {...props} control={control} away />)
  act(() => { expect(control.current!.respond('affection')).toBe('resting') })
})
