// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { PALETTE } from '../art/palette'
import type { PlacedObject } from '../domain/types'
import { render } from '../test/react'
import { Room } from './Room'

const bed: PlacedObject = { id: 'bed-id', roomId: 'room', catalogId: 'bed', tileX: 1, tileY: 2, rotation: 0 }
const props = { room: { floorStyle: 'wood', wallStyle: 'cream' } as const, objects: [bed], selectedId: bed.id }
const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()))

function mount(content: Parameters<typeof render>[0]) {
  const ui = render(content)
  cleanups.push(ui.unmount)
  return ui
}

it('preserves the builder selection default and its floor wash', () => {
  const ui = mount(<Room {...props} />)
  expect(ui.container.querySelector('.room-selection .room-chevron')).not.toBeNull()
  expect(ui.container.querySelectorAll(`polygon[fill="${PALETTE.accent}"][fill-opacity="0.3"]`)).toHaveLength(1)
  expect(ui.container.querySelector('.room-selection polygon')!.getAttribute('points'))
    .toBe('173.75,161.88 237.5,193.75 195,215 131.25,183.13')
})

it.each([
  [0, '173.75,161.88 237.5,193.75 195,215 131.25,183.13'],
  [1, '173.75,161.88 216.25,183.13 152.5,215 110,193.75'],
] as const)('renders a stationary preview with the correct rotation%s footprint', (rotation, points) => {
  const ui = mount(<Room {...props} objects={[{ ...bed, rotation }]} selectionMode="preview" />)
  const marker = ui.container.querySelector('.room-selection')!
  expect(Boolean(marker.querySelector('.room-chevron'))).toBe(false)
  expect(marker.getAttribute('data-selection-object')).toBe(bed.id)
  expect(marker.getAttribute('aria-hidden')).toBe('true')
  expect((marker as SVGElement).style.pointerEvents).toBe('none')
  expect(marker.querySelector('polygon')!.getAttribute('points')).toBe(points)
  expect(ui.container.querySelectorAll(`polygon[fill="${PALETTE.accent}"][fill-opacity="0.3"]`)).toHaveLength(0)
})

it('does not mark unknown or hidden preview objects', () => {
  const ui = mount(<Room {...props} selectedId="missing" selectionMode="preview" />)
  expect(ui.container.querySelector('.room-selection')).toBeNull()
  ui.rerender(<Room {...props} hiddenId={bed.id} selectionMode="preview" />)
  expect(ui.container.querySelector('.room-selection')).toBeNull()
})
