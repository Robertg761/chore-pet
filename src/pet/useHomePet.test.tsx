// @vitest-environment jsdom
import { act, useLayoutEffect } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { MessStage, PlacedObject } from '../domain/types'
import { homeLayout } from '../room/homeLayout'
import { render } from '../test/react'
import { useHomePet } from './useHomePet'

const layout = homeLayout(['a', 'b'])
const connections = [{ id: 'a-b', aRoomId: 'a', bRoomId: 'b', aSide: 'east' as const, bSide: 'west' as const, start: 4, end: 6, blocked: false, blockerIds: [] }]
const fixtures: PlacedObject[] = [{ id: 'door', roomId: 'a', catalogId: 'dishwasher', tileX: 6, tileY: 4, rotation: 0 }]
let travel: ReturnType<typeof useHomePet>
const cleanups: (() => void)[] = []
function Harness({ stages, objects = fixtures, targetId = 'b' }: { stages: Record<string, MessStage>; objects?: PlacedObject[]; targetId?: string }) {
  const current = useHomePet('home', targetId, layout, connections, objects, { a: 'Kitchen', b: 'Bedroom' }, 'Bun', 'home', stages)
  useLayoutEffect(() => { travel = current }, [current])
  return <output>{current.notice}</output>
}
function mount(props: Parameters<typeof Harness>[0]) {
  const ui = render(<Harness {...props} />)
  cleanups.push(ui.unmount)
  return ui
}
afterEach(() => { cleanups.splice(0).forEach((cleanup) => cleanup()); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const entersFront = () => Boolean(travel.journey?.path.some((point) => point.roomId === 'a' && point.tx === 7 && point.ty === 4))

it('replans actual clearance changes, retains live source, and ignores unchanged closed geometry', () => {
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  const ui = mount({ stages: { door: 'clean' } })
  act(() => { travel.onPosition({ roomId: 'a', tx: 7, ty: 2 }); travel.go('b') })
  expect(entersFront()).toBe(true)
  const first = travel.journey!.id
  ui.rerender(<Harness stages={{ door: 'messy1' }} />)
  expect(travel.journey!.id).toBe(first)
  act(() => travel.onPosition({ roomId: 'a', tx: 7, ty: 2.2 }))
  ui.rerender(<Harness stages={{ door: 'messy2' }} />)
  expect(travel.journey!.id).toBeGreaterThan(first)
  expect(travel.journey!.path[0]).toEqual({ roomId: 'a', tx: 7, ty: 2.2 })
  expect(entersFront()).toBe(false)
  const second = travel.journey!.id
  ui.rerender(<Harness stages={{ door: 'messy2' }} />)
  expect(travel.journey!.id).toBe(second)
  ui.rerender(<Harness stages={{ door: 'clean' }} />)
  expect(travel.journey!.id).toBeGreaterThan(second)
  expect(entersFront()).toBe(true)
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})

it('spawns on clear floor when the folded door covers the old fallback tile', () => {
  const objects: PlacedObject[] = [{ ...fixtures[0], tileY: 7 }]
  mount({ stages: { door: 'messy2' }, objects, targetId: 'a' })
  expect(travel.position).toEqual({ roomId: 'a', tx: 7, ty: 6 })
  expect(travel.journey).toBeNull()
})
