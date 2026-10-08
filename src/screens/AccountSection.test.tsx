// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { click, input, render } from '../test/react'
import type { AccountState } from '../lib/account'

const auth = vi.hoisted(() => ({ state: { kind: 'guest' } as AccountState, email: vi.fn(), google: vi.fn() }))
vi.mock('../lib/account', () => ({ useAccount: () => auth.state, useAccountOperationError: () => null, signInWithEmail: auth.email, signInWithGoogle: auth.google,
  saveWithEmail: vi.fn(), saveWithGoogle: vi.fn(), deleteAccount: vi.fn(), signOutSafely: vi.fn() }))
vi.mock('../data/appStore', () => ({ useDataState: () => ({ savedLocally: true, pendingCount: 0, rejectedCount: 0 }), appStore: {} }))
import { AccountSection } from './AccountSection'
const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach((fn) => fn()); auth.state = { kind: 'guest' }; vi.resetAllMocks(); history.replaceState(null, '', '/') })
it('opens existing-account sign-in without a home and retries rejected auth promises', async () => {
  auth.email.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce({ ok: true })
  const ui = render(<AccountSection entry />); cleanups.push(ui.unmount)
  expect(ui.container.textContent).toContain('Sign in')
  expect(ui.container.textContent).not.toContain('Back to saving this home')
  input(ui.container.querySelector('input')!, 'returning@example.com')
  await act(async () => click(ui.container.querySelector('button[type=submit]')!))
  expect(ui.container.querySelector('[role=alert]')?.textContent).toContain('offline')
  expect(ui.container.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false)
  await act(async () => click(ui.container.querySelector('button[type=submit]')!))
  expect(auth.email).toHaveBeenLastCalledWith('returning@example.com')
  expect(ui.container.querySelector('[role=status]')?.textContent).toContain('link is on its way')
})
it('shows account loading and allows a connection retry without an anonymous session', () => {
  auth.state = { kind: 'loading' }
  const ui = render(<AccountSection entry />); cleanups.push(ui.unmount)
  expect(ui.container.textContent).toContain('Checking your account')
  auth.state = { kind: 'offline' }; ui.rerender(<AccountSection entry />)
  expect(ui.container.querySelector('input[type=email]')).not.toBeNull()
})
it('explains when accounts are unavailable instead of claiming an absent home is saved', () => {
  auth.state = { kind: 'local' }
  const ui = render(<AccountSection entry />); cleanups.push(ui.unmount)
  expect(ui.container.textContent).toContain("Sign-in isn't available yet")
  expect(ui.container.textContent).not.toContain('Your home is saved on this device')
})
it('keeps Settings defaulting to saving guest progress', () => {
  const ui = render(<AccountSection />); cleanups.push(ui.unmount)
  expect(ui.container.textContent).toContain('Keep your progress safe')
})

it('offers retry after a canceled provider redirect', () => {
  history.replaceState(null, '', '/?error=access_denied')
  const ui = render(<AccountSection entry />); cleanups.push(ui.unmount)
  expect(ui.container.querySelector('[role=alert]')?.textContent).toContain('canceled')
  expect(ui.container.querySelector('input[type=email]')).not.toBeNull()
})
