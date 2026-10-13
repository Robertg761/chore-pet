// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { click, render } from '../test/react'
import { PetExplore, type PetExploreProps } from './PetExplore'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals() })
function mount(patch: Partial<PetExploreProps> = {}) {
  const props: PetExploreProps = {
    objects: [{ id: 'plant-id', roomId: 'a', catalogId: 'plant', tileX: 2, tileY: 2, rotation: 0 }],
    petName: 'Bun', onLook: vi.fn(() => 'started' as const), onPreview: vi.fn(),
    onShowRoom: vi.fn(() => true), ...patch,
  }
  const ui = render(<PetExplore {...props} />); cleanups.push(ui.unmount)
  return { ...ui, props }
}
function button(container: Element, text: string) { return [...container.querySelectorAll('button')].find(node => node.textContent === text) as HTMLButtonElement | undefined }
function open(ui: ReturnType<typeof mount>) { click(button(ui.container, 'Explore together')!) }

it('offers the explicit view control only when expanded and supported', () => {
  const ui = mount()
  expect(button(ui.container, 'Show room')).toBeUndefined()
  open(ui)
  expect(button(ui.container, 'Show room')!.getAttribute('aria-label')).toBe('Show room to explore with Bun')
  open(ui)
  expect(button(ui.container, 'Show room')).toBeUndefined()
  ui.rerender(<PetExplore {...ui.props} onShowRoom={undefined} />)
  open(ui)
  expect(button(ui.container, 'Show room')).toBeUndefined()
})

it('views without another invitation, marker update, frame, or successful announcement', () => {
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  const ui = mount(); open(ui)
  click(button(ui.container, 'Look together')!)
  const heard = ui.container.querySelector('[role="status"]')!.textContent
  const previewCount = vi.mocked(ui.props.onPreview!).mock.calls.length
  click(button(ui.container, 'Show room')!)
  expect(ui.props.onShowRoom).toHaveBeenCalledExactlyOnceWith()
  expect(ui.props.onLook).toHaveBeenCalledExactlyOnceWith('plant-id')
  expect(vi.mocked(ui.props.onPreview!).mock.calls).toHaveLength(previewCount)
  expect(ui.container.querySelector('select')!.value).toBe('plant-id')
  expect(ui.container.querySelector('[role="status"]')!.textContent).toBe(heard)
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})

it('explains a failed view and clears that feedback on a successful retry without inviting', () => {
  const show = vi.fn().mockReturnValueOnce(false).mockReturnValue(true)
  const ui = mount({ onShowRoom: show }); open(ui)
  click(button(ui.container, 'Show room')!)
  expect(ui.container.querySelector('[role="status"]')!.textContent).toBe('The room is unavailable right now. Try again shortly.')
  click(button(ui.container, 'Show room')!)
  expect(ui.container.querySelector('[role="status"]')!.textContent).toBe('')
  expect(ui.props.onLook).not.toHaveBeenCalled()
})

it.each(['away', 'sick'] as const)('can view a resting resident while %s keeps invitations disabled', blocked => {
  const ui = mount({ blocked }); open(ui)
  expect(button(ui.container, 'Look together')!.disabled).toBe(true)
  const show = button(ui.container, 'Show room')!
  expect(show.disabled).toBe(false)
  click(show)
  expect(ui.props.onShowRoom).toHaveBeenCalledOnce()
  expect(ui.props.onLook).not.toHaveBeenCalled()
})

it('links travel explanation and refuses to view until the route is available', () => {
  const ui = mount({ blocked: 'travel' }); open(ui)
  const show = button(ui.container, 'Show room')!
  expect(show.disabled).toBe(true)
  const id = show.getAttribute('aria-describedby')!
  expect(ui.container.querySelector(`[id="${id}"]`)!.textContent).toBe('Bun is on the way.')
  click(show)
  expect(ui.props.onShowRoom).not.toHaveBeenCalled()
  act(() => ui.rerender(<PetExplore {...ui.props} blocked={undefined} />))
  expect(show.disabled).toBe(false)
  click(show)
  expect(ui.props.onShowRoom).toHaveBeenCalledOnce()
})

it('explains a resident in another room independently of the resting note', () => {
  const ui = mount({ blocked: 'away', showRoomUnavailable: "Choose Bun's room to see them." }); open(ui)
  const show = button(ui.container, 'Show room')!
  expect(show.disabled).toBe(true)
  const id = show.getAttribute('aria-describedby')!
  expect(ui.container.querySelector(`[id="${id}"]`)!.textContent).toBe("Choose Bun's room to see them.")
  expect(ui.container.querySelector('.pet-explore-note')!.textContent).toMatch(/resting while you're away/)
  click(show)
  expect(ui.props.onShowRoom).not.toHaveBeenCalled()
})

it('clears failed-view feedback when starting a fresh invitation', () => {
  const ui = mount({ onShowRoom: () => false }); open(ui)
  click(button(ui.container, 'Show room')!)
  click(button(ui.container, 'Look together')!)
  expect(ui.container.querySelector('[role="status"]')!.textContent).toBe('You invited Bun to look at the potted plant.')
})
