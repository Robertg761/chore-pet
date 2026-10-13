// @vitest-environment jsdom
import { act, createRef, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Pet, PlacedObject } from '../domain/types'
import { render } from '../test/react'
import { LivingRoom, type LivingRoomControl, type LivingRoomProps } from './LivingRoom'
import { setPetMotionReduced } from './motionPreference'

const roomRenders = vi.hoisted(() => ({ count: 0 }))
vi.mock('../room/Room', async importOriginal => {
  const actual = await importOriginal<typeof import('../room/Room')>()
  return { ...actual, Room: (props: Parameters<typeof actual.Room>[0]) => {
    roomRenders.count++; return <actual.Room {...props} />
  } }
})
const pet: Pet = { id: 'pet', homeId: 'home', name: 'Mochi', species: 'mochi', bodyColour: '#FFCFDA', equipped: {} }
const plant: PlacedObject = { id: 'plant', roomId: 'room', catalogId: 'plant', tileX: 2, tileY: 2, rotation: 0 }
const base: LivingRoomProps = { room: { floorStyle: 'wood', wallStyle: 'cream' }, objects: [plant], stages: {}, pet, mood: 'happy', away: false, chores: [], statuses: [], initialTile: { tx: 3, ty: 2 } }
let now: number, serial: number, hidden: boolean
let frames: Map<number, FrameRequestCallback>, media: MediaQueryList
let ui: ReturnType<typeof render>
const control = createRef<LivingRoomControl>()
const content = (extra: Partial<LivingRoomProps> = {}) => <StrictMode><LivingRoom {...base} {...extra} control={control} /></StrictMode>
beforeEach(() => {
  now = 0; serial = 0; hidden = false; frames = new Map(); roomRenders.count = 0
  setPetMotionReduced(false)
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(Math, 'random').mockReturnValue(.99)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  media = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  ui = render(content())
})
afterEach(() => { ui.unmount(); setPetMotionReduced(false); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function frame(at: number) { now = at; const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(fn => fn(at))) }
const response = () => ui.container.querySelector('.room-plant-greeting')
function visit() { act(() => { expect(control.current!.lookAt('plant')).toBe('started') }) }
function wave() { visit(); frame(360); expect(response()).not.toBeNull() }
function visibility(value: boolean) { act(() => { hidden = value; document.dispatchEvent(new Event('visibilitychange')) }) }

it('responds only during the existing action phase, coalesces invitations and adds no frame owner or room redraw', () => {
  const input = JSON.stringify(base)
  visit(); expect(response()).toBeNull()
  frame(359); expect(response()).toBeNull()
  frame(360); const node = response(); expect(node).not.toBeNull()
  const renders = roomRenders.count
  frame(500); expect(response()).toBe(node); expect(roomRenders.count).toBe(renders)
  expect(frames.size).toBe(1)
  act(() => { expect(control.current!.lookAt('plant')).toBe('started') })
  expect(response()).toBe(node)
  frame(1759); expect(response()).toBe(node)
  frame(1760); expect(response()).toBeNull()
  frame(1940); expect(response()).toBeNull(); expect(frames.size).toBe(1)
  expect(JSON.stringify(base)).toBe(input)
})

it('stops the plant response when a player gesture interrupts the wave', () => {
  wave(); frame(500)
  act(() => { expect(control.current!.respond('greet')).toBe('started') })
  expect(response()).toBeNull(); expect(frames.size).toBe(1)
  frame(1800); expect(response()).toBeNull()
})

it('starts a late first action frame at the elapsed greeting phase and retains its offset on repeated invitations', () => {
  visit(); frame(1000)
  const node = response() as SVGGElement
  expect(node).not.toBeNull()
  expect(node.style.getPropertyValue('--plant-greeting-delay')).toBe('-640ms')
  frame(1100); visit()
  expect(response()).toBe(node)
  expect(node.style.getPropertyValue('--plant-greeting-delay')).toBe('-640ms')
  frame(1760); expect(response()).toBeNull()
})

it.each(['system', 'device'] as const)('stops immediately under live %s reduction and never replays on restoration', source => {
  wave(); frame(500)
  const reduce = (value: boolean) => act(() => {
    if (source === 'device') setPetMotionReduced(value)
    else { Object.defineProperty(media, 'matches', { value, configurable: true }); media.dispatchEvent(new Event('change')) }
  })
  reduce(true); expect(response()).toBeNull(); expect(frames.size).toBe(0)
  reduce(false); frame(1000); expect(response()).toBeNull()
})

it.each(['sick', 'away'] as const)('clears the response when the resident becomes %s', mode => {
  wave()
  ui.rerender(content(mode === 'sick' ? { mood: 'sick' } : { away: true }))
  expect(response()).toBeNull()
  frame(480); expect(frames.size).toBe(0)
  ui.rerender(content()); frame(1000); expect(response()).toBeNull()
})

it.each(['messy1', 'messy2', 'removed'] as const)('clears the response when the plant becomes %s', stage => {
  wave()
  ui.rerender(content(stage === 'removed' ? { objects: [] } : { stages: { plant: stage } }))
  expect(response()).toBeNull()
  frame(1000); expect(response()).toBeNull()
})

it('discards a hidden elapsed wave on the first visible frame without replay', () => {
  wave(); frame(500)
  visibility(true); expect(frames.size).toBe(0)
  now = 2400; visibility(false); frame(now)
  expect(response()).toBeNull(); expect(frames.size).toBe(1)
})
