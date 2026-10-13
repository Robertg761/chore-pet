// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { click, render } from '../test/react'
import { PetPlay, type PetPlayProps } from './PetPlay'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.unstubAllGlobals() })
function mount(patch: Partial<PetPlayProps> = {}) {
  const props: PetPlayProps = { petName: 'Bun', onReact: vi.fn(() => 'started' as const), onCheckIn: vi.fn(() => 'started' as const), ...patch }
  const ui = render(<PetPlay {...props} />); cleanups.push(ui.unmount)
  const button = (name: string) => [...ui.container.querySelectorAll('button')].find(node => node.textContent === name)!
  click(button('Spend time together'))
  return { ...ui, props, button, status: () => ui.container.querySelector('[role="status"]')!.textContent }
}

it.each(['away', 'sick'] as const)('offers one quiet Check in while %s, delegates once and leaves success speech to the resident', blocked => {
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  const ui = mount({ blocked })
  const check = ui.button('Check in')
  expect(check).toBeDefined()
  expect([...ui.container.querySelectorAll('.pet-play-actions button')].map(node => node.textContent)).toEqual(['Check in'])
  expect(check.disabled).toBe(false)
  expect(document.getElementById(check.getAttribute('aria-describedby')!)!.textContent).toMatch(/resting.*quiet hello/i)
  click(check)
  expect(ui.props.onCheckIn).toHaveBeenCalledOnce()
  expect(ui.props.onReact).not.toHaveBeenCalled()
  expect(ui.status()).toBe('')
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})

it.each(['away', 'sick'] as const)('explains a %s Check in that requires the resident room', blocked => {
  const ui = mount({ blocked, showRoomUnavailable: "Choose Bun's room to see them." })
  const check = ui.button('Check in')
  expect(check).toBeDefined(); expect(check.disabled).toBe(true)
  const described = check.getAttribute('aria-describedby')!.split(/\s+/).map(id => document.getElementById(id)!.textContent).join(' ')
  expect(described).toContain("Choose Bun's room to see them.")
  expect(described).toContain('resting')
  click(check)
  expect(ui.props.onCheckIn).not.toHaveBeenCalled()
})

it.each([undefined, 'travel'] as const)('retains the regular six choices when mode is %s', blocked => {
  const ui = mount({ blocked })
  expect(ui.button('Check in')).toBeUndefined()
  const buttons = [...ui.container.querySelectorAll('.pet-play-actions button')] as HTMLButtonElement[]
  expect(buttons.map(node => node.textContent)).toEqual(['Wave', 'Gentle pats', 'Happy hop', 'Stretch together', 'Rest together', 'Dance together'])
  expect(buttons.every(node => node.disabled === Boolean(blocked))).toBe(true)
  click(ui.button('Wave'))
  expect(ui.props.onReact).toHaveBeenCalledTimes(blocked ? 0 : 1)
  expect(ui.props.onCheckIn).not.toHaveBeenCalled()
})

it('announces a busy Check in once, clears accepted feedback, and keeps it relevant across modes', () => {
  const onCheckIn = vi.fn().mockReturnValueOnce('busy').mockReturnValueOnce('started').mockReturnValue('busy')
  const ui = mount({ blocked: 'sick', onCheckIn })
  click(ui.button('Check in')); expect(ui.status()).toContain('moment')
  click(ui.button('Check in')); expect(ui.status()).toBe('')
  click(ui.button('Check in')); expect(ui.status()).toContain('moment')
  ui.rerender(<PetPlay {...ui.props} blocked={undefined} />)
  expect(ui.status()).toBe('')
  expect(ui.button('Check in')).toBeUndefined()
  click(ui.button('Wave')); expect(ui.status()).toBe('')
  ui.rerender(<PetPlay {...ui.props} blocked="away" />)
  expect(ui.status()).toBe('')
})

it('hides old play feedback when resting and clears Check in feedback after Show room succeeds', () => {
  const ui = mount({ onReact: () => 'busy', onCheckIn: () => 'busy', onShowRoom: () => true })
  click(ui.button('Wave')); expect(ui.status()).toContain('moment')
  ui.rerender(<PetPlay {...ui.props} blocked="sick" />)
  expect(ui.status()).toBe('')
  click(ui.button('Check in')); expect(ui.status()).toContain('moment')
  click(ui.button('Show room')); expect(ui.status()).toBe('')
})

it.each(['play', 'check-in'] as const)('does not revive an old %s busy message after leaving and returning to its mode', source => {
  const blocked = source === 'check-in' ? 'sick' as const : undefined
  const ui = mount({ blocked, onReact: () => 'busy', onCheckIn: () => 'busy' })
  click(ui.button(source === 'check-in' ? 'Check in' : 'Wave'))
  expect(ui.status()).toContain('moment')
  ui.rerender(<PetPlay {...ui.props} blocked={source === 'check-in' ? undefined : 'sick'} />)
  expect(ui.status()).toBe('')
  ui.rerender(<PetPlay {...ui.props} blocked={blocked} />)
  expect(ui.status()).toBe('')
  expect(ui.button('Spend time together').getAttribute('aria-expanded')).toBe('true')
})
