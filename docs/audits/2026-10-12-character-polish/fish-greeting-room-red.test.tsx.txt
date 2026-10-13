// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { catalogEntry } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import { Room } from './Room'

const tank: PlacedObject = { id: 'tank', roomId: 'room', catalogId: 'fish-tank', tileX: 2, tileY: 2, rotation: 0 }
const second: PlacedObject = { ...tank, id: 'second', tileX: 4 }
const plant: PlacedObject = { ...tank, id: 'plant', catalogId: 'plant', tileX: 6 }
const base = { room: { floorStyle: 'wood', wallStyle: 'cream' } as const, objects: [tank, second, plant] }
function draw(extra: object = {}) {
  const markup = renderToStaticMarkup(<Room {...base} {...extra} />)
  return new DOMParser().parseFromString(markup, 'image/svg+xml')
}

it('responds only on the chosen clean tank without replacing placed art or moving the tank', () => {
  const before = draw(), after = draw({ responseObjectId: 'tank' })
  const response = after.querySelectorAll('.room-fish-greeting')
  expect(response).toHaveLength(1)
  expect(response[0].getAttribute('data-object-id')).toBe('tank')
  expect(response[0].querySelectorAll('.fish-tail')).toHaveLength(2)
  expect(response[0].querySelectorAll('.fish-tail-yellow')).toHaveLength(1)
  for (const id of ['tank', 'second', 'plant']) {
    const selector = `[data-object-id="${id}"] > g`
    expect(after.querySelector(selector)!.outerHTML).toBe(before.querySelector(selector)!.outerHTML)
  }
})

it('never responds on dirty, absent, other-furniture, hidden or ghost targets', () => {
  for (const extra of [
    {}, { responseObjectId: 'missing' }, { responseObjectId: 'plant' },
    { responseObjectId: 'tank', stages: { tank: 'messy1' } },
    { responseObjectId: 'tank', stages: { tank: 'messy2' } },
    { responseObjectId: 'tank', hiddenId: 'tank' },
    { responseObjectId: 'tank', objects: [] },
    { responseObjectId: 'ghost', objects: [], ghost: { entry: catalogEntry('fish-tank')!, placement: tank, ok: true } },
  ]) expect(draw(extra).querySelectorAll('.room-fish-greeting')).toHaveLength(0)
})

it.each([0, 1, 2, 3] as const)('keeps rotation %s on the existing placed-art wrapper', rotation => {
  const document = draw({ objects: [{ ...tank, rotation }], responseObjectId: 'tank' })
  const response = document.querySelector('.room-fish-greeting')!
  expect(response).not.toBeNull()
  expect(response.getAttribute('transform')).toBeNull()
  expect(response.querySelector('g')!.getAttribute('transform')).toBe(`translate(195 172.5) scale(${rotation % 2 ? -0.6640625 : 0.6640625} 0.6640625)`)
})
