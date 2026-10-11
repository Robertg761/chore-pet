import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PALETTE } from '../../art/palette'
import type { Room as RoomRow } from '../../domain/types'
import { roomConnections, type RoomDoor } from '../connections'
import { HomeScene } from '../HomeScene'
import { homeLayout } from '../homeLayout'
import { Room } from '../Room'
import { RoomDoorControls, RoomShell } from './RoomShell'
import { roomPoint } from './geometry'

const door: RoomDoor = { side: 'west', toRoomId: 'kitchen', start: 3, end: 5, blocked: false }

function polygonsWithFill(markup: string, fill: string): number[][][] {
  return [...markup.matchAll(/<polygon\b[^>]*>/g)]
    .filter(([tag]) => tag.includes(`fill="${fill}"`))
    .map(([tag]) => /points="([^"]+)"/.exec(tag)![1].split(' ').map((point) => point.split(',').map(Number)))
}

function contains(polygon: number[][], point: { x: number; y: number }): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > point.y) !== (yj > point.y) && point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

describe('connected room shell', () => {
  it.each(['west', 'north'] as const)('cuts a real opening out of the %s wall', (side) => {
    const markup = renderToStaticMarkup(createElement(RoomShell, { doors: [{ ...door, side }] }))
    const faces = polygonsWithFill(markup, side === 'west' ? PALETTE.wallLeft : PALETTE.wallRight)
    const point = side === 'west' ? roomPoint(0, 4, 32) : roomPoint(4, 0, 32)
    expect(faces.length).toBeGreaterThan(0)
    expect(faces.some((polygon) => contains(polygon, point))).toBe(false)
    const solidPoint = side === 'west' ? roomPoint(0, 1, 32) : roomPoint(1, 0, 32)
    expect(faces.some((polygon) => contains(polygon, solidPoint))).toBe(true)
  })

  it('keeps windows on exterior walls only', () => {
    const exterior = renderToStaticMarkup(createElement(RoomShell))
    const interior = renderToStaticMarkup(createElement(RoomShell, { doors: [door] }))
    expect(exterior).toContain(`fill="${PALETTE.sky}"`)
    expect(interior).not.toContain(`fill="${PALETTE.sky}"`)
  })

  it('keeps wallpaper and skirting out of the opening', () => {
    const markup = renderToStaticMarkup(createElement(RoomShell, { wallStyle: 'mint', doors: [door] }))
    const stripe = roomPoint(0, 4.7, 32)
    const baseboard = roomPoint(0, 4, 5)
    expect(polygonsWithFill(markup, PALETTE.white).some((polygon) => contains(polygon, stripe))).toBe(false)
    expect(polygonsWithFill(markup, PALETTE.cream).some((polygon) => contains(polygon, baseboard))).toBe(false)
  })

  it('omits slab faces between connected rooms', () => {
    const markup = renderToStaticMarkup(createElement(RoomShell, { doors: [{ ...door, side: 'east' }, { ...door, side: 'south' }] }))
    expect(polygonsWithFill(markup, PALETTE.floorWoodSide)).toHaveLength(0)
    expect(polygonsWithFill(markup, PALETTE.woodDark)).toHaveLength(0)
  })

  it('gives focused doorways named keyboard controls', () => {
    const markup = renderToStaticMarkup(createElement(RoomShell, { doors: [door], onDoor: () => {}, doorLabel: () => 'Kitchen' }))
    expect(markup).toContain('role="button"')
    expect(markup).toContain('aria-label="Door to Kitchen"')
    expect(markup).toContain('tabindex="0"')
  })

  it.each([0.25, 0.5, 1, 2])('keeps a 44px doorway target at scene scale %s', (scale) => {
    const markup = renderToStaticMarkup(createElement(RoomShell, { doors: [door], onDoor: () => {}, interactionScale: scale }))
    const target = /<rect\b[^>]*class="room-door-hit"[^>]*>/.exec(markup)?.[0]
    expect(target).toBeDefined()
    const width = Number(/width="([^"]+)"/.exec(target!)?.[1])
    const height = Number(/height="([^"]+)"/.exec(target!)?.[1])
    expect(width * scale).toBeGreaterThanOrEqual(44)
    expect(height * scale).toBeGreaterThanOrEqual(44)
    const badgeScale = Number(/class="room-door-badge"[^>]*scale\(([^)]+)\)/.exec(markup)?.[1])
    expect(18 * badgeScale * scale).toBeGreaterThanOrEqual(18)
  })

  it('removes inactive rooms from the doorway tab order', () => {
    const markup = renderToStaticMarkup(createElement(RoomShell, { doors: [door], onDoor: () => {}, focused: false }))
    expect(markup).not.toContain('role="button"')
    expect(markup).not.toContain('tabindex="0"')
  })

  it('announces blocked doors without hiding the opening', () => {
    const markup = renderToStaticMarkup(createElement(RoomShell, { doors: [{ ...door, blocked: true }], onDoor: () => {}, doorLabel: () => 'Kitchen' }))
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain('Door to Kitchen, blocked by furniture')
    expect(polygonsWithFill(markup, PALETTE.wallLeft).some((polygon) => contains(polygon, roomPoint(0, 4, 32)))).toBe(false)
  })

  it('renders reusable overlay controls without duplicating the room art', () => {
    const markup = renderToStaticMarkup(createElement('svg', {}, createElement(RoomDoorControls, { doors: [door], onDoor: () => {}, doorLabel: () => 'Kitchen' })))
    expect(markup).toContain('aria-label="Door to Kitchen"')
    expect(markup).toContain('pointer-events="visiblePainted"')
    expect(markup).toContain('.room-door:focus-visible .room-door-focus')
    expect(markup).not.toContain(`fill="${PALETTE.wallLeft}"`)
  })

  it('offers compact home doorway buttons outside the art without duplicate controls', () => {
    const rooms: RoomRow[] = [
      { id: 'kitchen', homeId: 'home', type: 'kitchen', floorStyle: 'wood', wallStyle: 'peach' },
      { id: 'bedroom', homeId: 'home', type: 'bedroom', floorStyle: 'wood', wallStyle: 'mint' },
    ]
    const connections = roomConnections(homeLayout(rooms.map((room) => room.id)), [])
    const markup = renderToStaticMarkup(createElement(HomeScene, {
      rooms, objects: [], focusedRoomId: 'kitchen', onFocus: () => {},
      focusedRoom: createElement(Room, { room: rooms[0], objects: [], stages: {} }),
      connections, stages: {}, neglect: {}, overdue: {},
    }))
    expect(markup).toContain('class="home-scene-door-links" role="group" aria-label="Room doors"')
    expect(markup).toContain('aria-label="Door to Bedroom"')
    expect(markup.match(/aria-label="Door to /g)).toHaveLength(1)
    expect(markup).not.toContain('class="home-scene-doors"')
    expect(markup.indexOf('class="home-scene-door-links"')).toBeLessThan(markup.indexOf('class="home-scene-art"'))
  })
})
