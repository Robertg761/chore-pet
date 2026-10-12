// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { PlacedObject } from '../domain/types'
import { click, render } from '../test/react'
import { PetExplore, type PetExploreProps } from './PetExplore'

const objects: PlacedObject[] = [
  { id: 'plant-id', roomId: 'a', catalogId: 'plant', tileX: 2, tileY: 2, rotation: 0 },
  { id: 'bear-id', roomId: 'a', catalogId: 'teddy', tileX: 4, tileY: 4, rotation: 0 },
]
const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals() })
function mount(patch: Partial<PetExploreProps> = {}) {
  const props: PetExploreProps = { objects, petName: 'Bun', onLook: vi.fn(() => 'started' as const), ...patch }
  const ui = render(<PetExplore {...props} />); cleanups.push(ui.unmount)
  return { ...ui, props }
}
function button(container: Element, text: string) { return [...container.querySelectorAll('button')].find(node => node.textContent === text)! }

it('starts collapsed, exposes named choices, and invites only the selected furnishing without scheduling work', () => {
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  const ui = mount()
  const trigger = button(ui.container, 'Explore together')
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(ui.container.querySelector('[hidden]')).not.toBeNull()
  click(trigger)
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  const select = ui.container.querySelector('select')!
  expect(ui.container.querySelector(`label[for="${select.id}"]`)!.textContent).toBe('Show Bun')
  expect([...select.options].map(option => option.text)).toEqual(['Potted plant', 'Teddy bear'])
  act(() => { select.value = 'bear-id'; select.dispatchEvent(new Event('change', { bubbles: true })) })
  click(button(ui.container, 'Look together'))
  expect(ui.props.onLook).toHaveBeenCalledExactlyOnceWith('bear-id')
  expect(ui.container.querySelector('[role="status"]')!.textContent).toContain('teddy bear')
  expect(requestAnimationFrame).not.toHaveBeenCalled()
  click(trigger)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
})

it.each(['travel', 'away', 'sick'] as const)('explains why invitations are unavailable during %s', blocked => {
  const ui = mount({ blocked })
  click(button(ui.container, 'Explore together'))
  expect(ui.container.querySelector('select')!.disabled).toBe(true)
  expect((button(ui.container, 'Look together') as HTMLButtonElement).disabled).toBe(true)
  expect(ui.container.querySelector('.pet-explore-note')!.textContent).toMatch(blocked === 'travel' ? /on the way/ : /resting/)
  click(button(ui.container, 'Look together'))
  expect(ui.props.onLook).not.toHaveBeenCalled()
})

it.each([
  ['still', /from here/], ['busy', /busy/], ['resting', /resting/], ['unreachable', /clear way/], ['unavailable', /on the way/],
] as const)('gives understandable feedback for %s', (result, message) => {
  const ui = mount({ onLook: () => result })
  click(button(ui.container, 'Explore together'))
  click(button(ui.container, 'Look together'))
  expect(ui.container.querySelector('[role="status"]')!.textContent).toMatch(message)
})

it('drops stale feedback and selects a remaining furnishing when the selected object disappears', () => {
  const ui = mount()
  click(button(ui.container, 'Explore together'))
  click(button(ui.container, 'Look together'))
  ui.rerender(<PetExplore {...ui.props} objects={[objects[1]]} />)
  expect(ui.container.querySelector('select')!.value).toBe('bear-id')
  expect(ui.container.querySelector('[role="status"]')!.textContent).toBe('')
  click(button(ui.container, 'Look together'))
  expect(ui.props.onLook).toHaveBeenLastCalledWith('bear-id')
  ui.rerender(<PetExplore {...ui.props} objects={[]} />)
  expect((button(ui.container, 'Look together') as HTMLButtonElement).disabled).toBe(true)
  expect(ui.container.querySelector('.pet-explore-note')!.textContent).toContain('furnishing')
})

it('distinguishes repeated furnishings with the same numbered names as the builder', () => {
  const repeated = [objects[0], { ...objects[0], id: 'second-plant', tileX: 6 }, objects[1]]
  const ui = mount({ objects: repeated })
  click(button(ui.container, 'Explore together'))
  const select = ui.container.querySelector('select')!
  expect([...select.options].map(option => option.text)).toEqual(['Potted plant 1', 'Potted plant 2', 'Teddy bear'])
  act(() => { select.value = 'second-plant'; select.dispatchEvent(new Event('change', { bubbles: true })) })
  click(button(ui.container, 'Look together'))
  expect(ui.props.onLook).toHaveBeenCalledExactlyOnceWith('second-plant')
  expect(ui.container.querySelector('[role="status"]')!.textContent).toContain('potted plant 2')
  ui.rerender(<PetExplore {...ui.props} objects={[repeated[1], objects[1]]} />)
  expect(select.value).toBe('second-plant')
  expect(select.selectedOptions[0].text).toBe('Potted plant')
  expect(ui.container.querySelector('[role="status"]')!.textContent).toContain('the potted plant.')
})

it.each(['__proto__', 'constructor', 'toString'])('keeps repeated choice IDs and feedback safe for %s', id => {
  const repeated = [{ ...objects[0], id }, { ...objects[0], id: 'ordinary-id' }]
  const ui = mount({ objects: repeated, onLook: vi.fn(() => 'still' as const) })
  click(button(ui.container, 'Explore together'))
  const select = ui.container.querySelector('select')!
  expect(select.selectedOptions[0].text).toBe('Potted plant 1')
  click(button(ui.container, 'Look together'))
  expect(ui.props.onLook).toHaveBeenCalledExactlyOnceWith(id)
  expect(ui.container.querySelector('[role="status"]')!.textContent).toContain('potted plant 1')
})
