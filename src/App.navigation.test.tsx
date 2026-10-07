// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { click, input, render } from './test/react'
import { emptySnapshot, selectHome, change } from './data/state'
import { sampleHome } from './content/sampleHome'
import type { DataState } from './data/store'

const fixture = vi.hoisted(() => ({ state: null as unknown as DataState, sync: vi.fn(), apply: vi.fn() }))
vi.mock('./data/appStore', () => ({
  startAppStore: () => {},
  useDataState: () => fixture.state,
  useHome: () => selectHome(fixture.state.snapshot.tables),
  appStore: { sync: fixture.sync, apply: fixture.apply, savedHomes: async () => [] },
}))
vi.mock('./lib/account', () => ({ useAccount: () => ({ kind: 'local' }) }))
import App from './App'
const cleanups: (() => void)[] = []
beforeEach(() => {
  history.replaceState(null, '', '/')
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  fixture.state = { ready: true, hydrated: true, savedLocally: true, snapshot: emptySnapshot(), sync: 'local-only', lastError: null, pendingCount: 0, rejectedCount: 0 }
  vi.clearAllMocks()
})
afterEach(() => { cleanups.splice(0).forEach((fn) => fn()); vi.unstubAllGlobals() })
function recovered() {
  fixture.state = { ...fixture.state, hydrated: true, lastError: null, snapshot: sampleHome({ species: 'mochi', userId: 'returning', today: '2026-10-07' }).reduce((state, op) => change(state, op), emptySnapshot('returning')) }
}
it('keeps recovery loading/retry reachable and opens the recovered home without creating one', () => {
  const ui = render(<App />); cleanups.push(ui.unmount)
  click([...ui.container.querySelectorAll('button')].find((b) => b.textContent?.includes('I already have'))!)
  expect(ui.container.textContent).toContain('Welcome back')
  fixture.state = { ...fixture.state, hydrated: false, snapshot: emptySnapshot('returning') }
  ui.rerender(<App />)
  expect(ui.container.textContent).toContain('Finding your home')
  fixture.state = { ...fixture.state, lastError: 'network' }; ui.rerender(<App />)
  click([...ui.container.querySelectorAll('button')].find((b) => b.textContent === 'Try again')!)
  expect(fixture.sync).toHaveBeenCalledOnce()
  recovered(); ui.rerender(<App />)
  expect(ui.container.querySelector('h1')?.textContent).toBe('Mochi')
  expect(fixture.apply).not.toHaveBeenCalled()
})
it('never shows a new-chore form for an existing-chore link while hydration is pending', () => {
  recovered()
  fixture.state.hydrated = false
  history.replaceState(null, '', '/?screen=edit&chore=not-loaded-yet')
  const ui = render(<App />); cleanups.push(ui.unmount)
  expect(ui.container.querySelector('form.editor')).toBeNull()
  expect(ui.container.querySelector('[role=status]')?.textContent).toContain('Finding')
})
it('closes an edit deleted or archived elsewhere without recreating it', () => {
  recovered()
  const chore = Object.values(fixture.state.snapshot.tables.chores)[0]
  history.replaceState(null, '', `/?screen=edit&chore=${chore.id}`)
  const ui = render(<App />); cleanups.push(ui.unmount)
  input(ui.container.querySelector('input[type=text]')!, 'Stale changes')
  fixture.state = { ...fixture.state, snapshot: { ...fixture.state.snapshot, tables: { ...fixture.state.snapshot.tables, chores: { ...fixture.state.snapshot.tables.chores, [chore.id]: { ...chore, archivedOn: '2026-10-07' } } } } } as DataState
  ui.rerender(<App />)
  expect(ui.container.querySelector('form.editor')).toBeNull()
  expect(fixture.apply).not.toHaveBeenCalled()
})
