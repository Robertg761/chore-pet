// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render } from '../test/react'
import { LoadingPet } from './LoadingPet'

const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((fn) => fn()))

function mount(content: Parameters<typeof render>[0]) {
  const ui = render(content)
  cleanups.push(ui.unmount)
  return ui
}

describe('LoadingPet', () => {
  it('shows just the pet, busy, when there is no message', () => {
    const { container } = mount(<LoadingPet />)
    expect(container.querySelector('main')?.getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('[role="status"]')).toBeNull()
  })

  it('announces the message and keeps the pet out of the accessibility tree', () => {
    const { container } = mount(<LoadingPet message="Finding your home…" />)
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Finding your home…')
    expect(container.querySelector('.loading-pet-stage')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('stops being busy and keeps its buttons when asked', () => {
    const { container } = mount(
      <LoadingPet message="Couldn't reach your saved home yet." busy={false} trouble>
        <button type="button">Try again</button>
      </LoadingPet>,
    )
    expect(container.querySelector('main')?.getAttribute('aria-busy')).toBe('false')
    expect(container.querySelector('button')?.textContent).toBe('Try again')
  })
})
