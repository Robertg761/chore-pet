// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { catalogEntry } from '../catalog/objects'
import type { PlacedObject } from '../domain/types'
import { Room } from './Room'

const plant: PlacedObject = { id: 'plant', roomId: 'room', catalogId: 'plant', tileX: 2, tileY: 2, rotation: 0 }
const second: PlacedObject = { ...plant, id: 'second', tileX: 4 }
const fish: PlacedObject = { ...plant, id: 'fish', catalogId: 'fish-tank', tileX: 6 }
const base = { room: { floorStyle: 'wood', wallStyle: 'cream' } as const, objects: [plant, second, fish] }
function draw(extra: object = {}) {
  return new DOMParser().parseFromString(renderToStaticMarkup(<Room {...base} {...extra} />), 'image/svg+xml')
}
it('responds only on the chosen clean plant with eight individually rooted leaves and unchanged placed art', () => {
  const before = draw(), after = draw({ responseObjectId: 'plant', responseElapsedMs: 640 })
  const response = after.querySelectorAll('.room-plant-greeting')
  expect(response).toHaveLength(1)
  expect(response[0].getAttribute('data-object-id')).toBe('plant')
  expect(response[0].getAttribute('style')).toContain('--plant-greeting-delay:-640ms')
  expect(response[0].querySelectorAll('.plant-leaf-response')).toHaveLength(8)
  expect(response[0].querySelectorAll('.plant-leaf-secondary')).toHaveLength(4)
  expect(after.querySelectorAll('.room-fish-greeting')).toHaveLength(0)
  for (const id of ['plant', 'second', 'fish']) {
    const selector = `[data-object-id="${id}"] > g`
    expect(after.querySelector(selector)!.outerHTML).toBe(before.querySelector(selector)!.outerHTML)
  }
})
it('leaves dirty, unknown, hidden, removed and ghost plants still while fish keep their own response', () => {
  for (const extra of [{}, { responseObjectId: 'missing' }, { responseObjectId: 'fish' },
    { responseObjectId: 'plant', stages: { plant: 'messy1' } }, { responseObjectId: 'plant', stages: { plant: 'messy2' } },
    { responseObjectId: 'plant', hiddenId: 'plant' }, { responseObjectId: 'plant', objects: [] },
    { responseObjectId: 'ghost', objects: [], ghost: { entry: catalogEntry('plant')!, placement: plant, ok: true } },
  ]) expect(draw(extra).querySelectorAll('.room-plant-greeting')).toHaveLength(0)
  expect(draw({ responseObjectId: 'fish' }).querySelectorAll('.room-fish-greeting')).toHaveLength(1)
  for (const stage of ['messy1', 'messy2']) expect(draw({ stages: { plant: stage, second: stage } }).querySelectorAll('.plant-leaf-response')).toHaveLength(0)
})
it.each([0, 1, 2, 3] as const)('preserves the placed wrapper at rotation%s', rotation => {
  const document = draw({ objects: [{ ...plant, rotation }], responseObjectId: 'plant' })
  const response = document.querySelector('.room-plant-greeting')!
  expect(response).not.toBeNull(); expect(response.getAttribute('transform')).toBeNull()
  expect(response.querySelector('g')!.getAttribute('transform')).toBe(`translate(195 172.5) scale(${rotation % 2 ? -0.6640625 : 0.6640625} 0.6640625)`)
})
