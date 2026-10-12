// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { click, render } from '../test/react'
import { SettingsScreen } from './SettingsScreen'
import { PET_MOTION_PREFERENCE_KEY, petMotionReduced, setPetMotionReduced } from '../pet/motionPreference'

const cleanups: (() => void)[] = []
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn())
  setPetMotionReduced(false)
  localStorage.removeItem(PET_MOTION_PREFERENCE_KEY)
})

const motionControl = (root: HTMLElement) => [...root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
  .find(input => [...input.labels ?? []].some(label => label.textContent?.trim() === 'Reduce pet motion'))

it('offers a described device motion choice and preserves it without closing Settings', () => {
  setPetMotionReduced(true)
  const close = vi.fn(), ui = render(<SettingsScreen petName="Mochi" onClose={close} account={<p>Account</p>} />)
  cleanups.push(ui.unmount)
  const control = motionControl(ui.container)
  expect(control).toBeDefined()
  expect(control!.checked).toBe(true)
  const note = document.getElementById(control!.getAttribute('aria-describedby')!)!
  expect(note.textContent).toContain('on this device')
  expect(note.textContent).toContain("Your system's reduced-motion setting is always respected.")
  click(control!)
  expect(control!.checked).toBe(false)
  expect(petMotionReduced()).toBe(false)
  expect(localStorage.getItem(PET_MOTION_PREFERENCE_KEY)).toBe('off')
  expect(close).not.toHaveBeenCalled()
})

it('keeps the checked control synchronized with a live preference change', () => {
  const ui = render(<SettingsScreen petName="Mochi" onClose={() => {}} account={<p>Account</p>} />)
  cleanups.push(ui.unmount)
  const control = motionControl(ui.container)
  expect(control).toBeDefined()
  expect(control!.checked).toBe(false)
  act(() => setPetMotionReduced(true))
  expect(control!.checked).toBe(true)
  act(() => setPetMotionReduced(false))
  expect(control!.checked).toBe(false)
})

/** The last button with this label (the confirm step's Back, not the header's). */
const button = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll('button')].filter((b) => b.textContent?.trim() === name).at(-1)!

function startOver(otherHomes?: number) {
  const erase = vi.fn()
  const clear = vi.fn()
  const ui = render(<SettingsScreen petName="Mochi" onClose={() => {}} account={<p>Account</p>} onStartOver={erase} onClearRoom={clear} otherHomes={otherHomes} />)
  cleanups.push(ui.unmount)
  click(button(ui.container, 'Start over'))
  return { ui, erase, clear }
}

it('asks twice before clearing or erasing, and Back returns to the choices', () => {
  const { ui, erase, clear } = startOver()
  click(button(ui.container, 'Clear room and chores'))
  expect(clear).not.toHaveBeenCalled()
  click(button(ui.container, 'Back'))
  click(button(ui.container, 'Erase everything'))
  expect(ui.container.textContent).toContain("Erase Mochi's home for good? This can't be undone.")
  expect(ui.container.textContent).not.toContain('other home')
  click(button(ui.container, 'Erase'))
  expect(erase).toHaveBeenCalledOnce()
  expect(clear).not.toHaveBeenCalled()
})

it('says other homes in the account stay when erasing', () => {
  const one = startOver(1)
  click(button(one.ui.container, 'Erase everything'))
  expect(one.ui.container.textContent).toContain('Your other home stays.')
  const two = startOver(2)
  click(button(two.ui.container, 'Erase everything'))
  expect(two.ui.container.textContent).toContain('Your 2 other homes stay.')
})
