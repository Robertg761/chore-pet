// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { click, render } from '../test/react'
import { PetPlay, type PetPlayProps } from './PetPlay'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.unstubAllGlobals() })
function mount(patch: Partial<PetPlayProps> = {}) {
  const props: PetPlayProps = { petName: 'Bun', onReact: vi.fn(() => 'started' as const), ...patch }
  const ui = render(<PetPlay {...props} />); cleanups.push(ui.unmount)
  return { ...ui, props }
}
function button(container: Element, label: string) { return [...container.querySelectorAll('button')].find(node => node.textContent === label)! }

it('starts collapsed and sends only explicit choices without creating scheduling work', () => {
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  const ui = mount()
  const toggle = button(ui.container, 'Spend time together')
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(ui.container.querySelector('[hidden]')).not.toBeNull()
  click(toggle)
  click(button(ui.container, 'Wave'))
  expect(ui.props.onReact).toHaveBeenLastCalledWith('greet')
  click(button(ui.container, 'Gentle pats'))
  expect(ui.props.onReact).toHaveBeenLastCalledWith('affection')
  expect(ui.container.querySelector('[role="status"]')!.textContent).toBe('')
  expect(requestAnimationFrame).not.toHaveBeenCalled()
  click(toggle)
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
})

it.each(['travel', 'away', 'sick'] as const)('explains and blocks play while %s', blocked => {
  const ui = mount({ blocked })
  click(button(ui.container, 'Spend time together'))
  for (const label of ['Wave', 'Gentle pats']) {
    expect((button(ui.container, label) as HTMLButtonElement).disabled).toBe(true)
    click(button(ui.container, label))
  }
  expect(ui.props.onReact).not.toHaveBeenCalled()
  expect(ui.container.querySelector('.pet-play-note')!.textContent).toMatch(blocked === 'travel' ? /on the way/ : /resting/)
})

it('announces busy/unavailable feedback once and clears it after an accepted choice', () => {
  const results = ['busy', 'unavailable', 'started'] as const
  let count = 0
  const ui = mount({ onReact: () => results[count++] })
  click(button(ui.container, 'Spend time together'))
  const wave = button(ui.container, 'Wave')
  click(wave)
  expect(ui.container.querySelector('[role="status"]')!.textContent).toContain('moment')
  click(wave)
  expect(ui.container.querySelector('[role="status"]')!.textContent).toContain('arrive')
  click(wave)
  expect(ui.container.querySelector('[role="status"]')!.textContent).toBe('')
})
