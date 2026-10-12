// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { click, input, render } from './test/react'
import { emptySnapshot, selectHome, change } from './data/state'
import { sampleHome } from './content/sampleHome'
import type { DataState } from './data/store'

const fixture = vi.hoisted(() => ({ state: null as unknown as DataState, sync: vi.fn(), apply: vi.fn() }))
vi.mock('./data/appStore', () => ({
  startAppStore: () => {},
  useDataState: () => fixture.state,
  useHome: () => selectHome(fixture.state.snapshot.tables, fixture.state.snapshot.activeHomeId),
  appStore: { getState: () => fixture.state, sync: fixture.sync, apply: fixture.apply, savedHomes: async () => [] },
}))
vi.mock('./lib/account', () => ({ useAccount: () => ({ kind: 'local' }), useAccountOperationError: () => null }))
import * as homePet from './pet/useHomePet'
import App from './App'
const cleanups: (() => void)[] = []
beforeEach(() => {
  history.replaceState(null, '', '/')
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  // jsdom does not implement element scrolling used by the connected home view.
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  fixture.state = { ready: true, hydrated: true, savedLocally: true, snapshot: emptySnapshot(), sync: 'local-only', lastError: null, pendingCount: 0, rejectedCount: 0 }
  vi.clearAllMocks()
})
afterEach(() => { cleanups.splice(0).forEach((fn) => fn()); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals() })
function recovered() {
  fixture.state = { ...fixture.state, hydrated: true, lastError: null, snapshot: sampleHome({ species: 'mochi', userId: 'returning', today: '2026-10-07' }).reduce((state, op) => change(state, op), emptySnapshot('returning')) }
}

it.each(['away', 'sick'] as const)('keeps unavailable viewing explained when a %s resident has a blocked route', resting => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-07T12:00:00'))
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  recovered()
  const tables = fixture.state.snapshot.tables, first = Object.values(tables.rooms)[0]
  tables.rooms['second-room'] = { ...first, id: 'second-room', type: 'bedroom' }
  const fridge = Object.values(tables.placed_objects).find(object => object.catalogId === 'fridge')!
  tables.placed_objects['blocked-door'] = { ...fridge, id: 'blocked-door', tileX: 7, tileY: 4, rotation: 0 }
  if (resting === 'away') Object.values(tables.homes)[0].vacations = [{ start: '2026-10-07', end: '2026-10-08' }]
  else {
    tables.completions = {}
    for (const chore of Object.values(tables.chores)) { chore.createdOn = '2026-09-01'; chore.schedule = { kind: 'daily' } }
  }
  const saved = JSON.stringify(fixture.state.snapshot)
  const ui = render(<App />); cleanups.push(ui.unmount)
  const select = ui.container.querySelector<HTMLSelectElement>('.room-controls-focus select')!
  act(() => { select.value = 'second-room'; select.dispatchEvent(new Event('change', { bubbles: true })) })
  expect(ui.container.textContent).toContain("Mochi's path to Bedroom is blocked")
  expect(ui.container.querySelector('.room-pet')).not.toBeNull()
  expect(ui.container.querySelector('.home-scene-room[data-focused="true"] .room-pet')).toBeNull()
  click(ui.container.querySelector('.pet-play-toggle')!)
  const show = ui.container.querySelector<HTMLButtonElement>('.pet-play-show')!
  expect(show.disabled).toBe(true)
  expect(ui.container.textContent).toContain("Choose Mochi's room to see them.")
  expect(ui.container.textContent).toContain('resting')
  act(() => { select.value = first.id; select.dispatchEvent(new Event('change', { bubbles: true })) })
  click(ui.container.querySelector('.pet-play-toggle')!)
  const available = ui.container.querySelector<HTMLButtonElement>('.pet-play-show')!
  expect(available.disabled).toBe(false)
  click(available)
  expect(document.activeElement).toBe(ui.container.querySelector('.room-pet'))
  expect(JSON.stringify(fixture.state.snapshot)).toBe(saved)
  expect(fixture.apply).not.toHaveBeenCalled()
})

it('shows the current room and focuses its resident without changing the home or starting a reaction', () => {
  localStorage.clear()
  recovered()
  const request = vi.fn(() => 1)
  vi.stubGlobal('requestAnimationFrame', request)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const ui = render(<App />); cleanups.push(ui.unmount)
  const node = ui.container.querySelector('.room-pet')!, dialogue = ui.container.querySelector('.living-room [aria-live]')!.textContent
  const position = node.getAttribute('transform'), saved = JSON.stringify(fixture.state.snapshot), operations = fixture.apply.mock.calls.length
  click([...ui.container.querySelectorAll('button')].find(node => node.textContent === 'Spend time together')!)
  const show = [...ui.container.querySelectorAll('button')].find(node => node.textContent === 'Show room')
  expect(show).toBeDefined()
  const requests = request.mock.calls.length
  click(show!)
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest', behavior: 'instant' })
  expect(vi.mocked(HTMLElement.prototype.scrollIntoView).mock.contexts[0]).toBe(ui.container.querySelector('.home-stage .home-scene'))
  expect(document.activeElement).toBe(node)
  expect(node.getAttribute('transform')).toBe(position)
  expect(ui.container.querySelector('.living-room [aria-live]')!.textContent).toBe(dialogue)
  expect(request.mock.calls.length).toBe(requests)
  expect(fixture.apply.mock.calls.length).toBe(operations)
  expect(JSON.stringify(fixture.state.snapshot)).toBe(saved)
})
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

it('passes current fixture stages into routing and updates them after a schedule edit', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-12T12:00:00'))
  recovered()
  const watched = vi.spyOn(homePet, 'useHomePet')
  const tables = fixture.state.snapshot.tables
  const dishwasher = Object.values(tables.placed_objects).find((object) => object.catalogId === 'dishwasher')!
  const chore = Object.values(tables.chores).find((item) => item.objectId === dishwasher.id)!
  const active = { ...chore, createdOn: '2026-10-01', schedule: { kind: 'daily' as const } }
  fixture.state = { ...fixture.state, snapshot: { ...fixture.state.snapshot, tables: { ...tables,
    chores: { ...tables.chores, [chore.id]: active },
    completions: Object.fromEntries(Object.entries(tables.completions).filter(([, item]) => item.choreId !== chore.id)),
  } } }
  const ui = render(<App />); cleanups.push(ui.unmount)
  expect(watched.mock.calls.at(-1)?.[8]?.[dishwasher.id]).toBe('messy2')
  fixture.state = { ...fixture.state, snapshot: { ...fixture.state.snapshot, tables: { ...fixture.state.snapshot.tables,
    chores: { ...fixture.state.snapshot.tables.chores, [chore.id]: { ...active, createdOn: '2026-10-12' } },
  } } }
  ui.rerender(<App />)
  expect(watched.mock.calls.at(-1)?.[8]).toBeDefined()
  expect(watched.mock.calls.at(-1)?.[8]?.[dishwasher.id] ?? 'clean').toBe('clean')
})

it('invites the resident to explore without changing chores or saved pet data', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-07T12:00:00'))
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  recovered()
  const ui = render(<App />); cleanups.push(ui.unmount)
  const resident = ui.container.querySelector('.room-pet')
  const toggle = [...ui.container.querySelectorAll('button')].find(button => button.textContent === 'Explore together')
  expect(toggle).toBeDefined()
  click(toggle!)
  const select = ui.container.querySelector<HTMLSelectElement>('.pet-explore select')!
  expect(select.options.length).toBe(Object.keys(fixture.state.snapshot.tables.placed_objects).length)
  click([...ui.container.querySelectorAll('button')].find(button => button.textContent === 'Look together')!)
  expect(ui.container.querySelector('.pet-explore [role="status"]')!.textContent).toContain('You invited Mochi')
  expect(ui.container.querySelector('.room-pet')).toBe(resident)
  expect(fixture.apply).not.toHaveBeenCalled()
})


it('offers player time in an empty room without saving changes', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-07T12:00:00'))
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  recovered()
  fixture.state.snapshot.tables.placed_objects = {}
  fixture.state.snapshot.tables.chores = {}
  const ui = render(<App />); cleanups.push(ui.unmount)
  const toggle = [...ui.container.querySelectorAll('button')].find(node => node.textContent === 'Spend time together')
  expect(toggle).toBeDefined()
  click(toggle!)
  click([...ui.container.querySelectorAll('button')].find(node => node.textContent === 'Gentle pats')!)
  expect(ui.container.querySelector('.living-room [aria-live]')!.textContent).not.toBe('')
  expect(fixture.apply).not.toHaveBeenCalled()
})

it.each(['another furnished room', 'an empty room'] as const)('replaces optional controls when focusing %s', destination => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-07T12:00:00'))
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  recovered()
  const tables = fixture.state.snapshot.tables
  const first = Object.values(tables.rooms)[0]
  const second = { ...first, id: 'second-room', type: 'bedroom' as const }
  tables.rooms[second.id] = second
  if (destination === 'another furnished room') {
    const object = Object.values(tables.placed_objects)[0]
    tables.placed_objects['second-object'] = { ...object, id: 'second-object', roomId: second.id }
  }
  const ui = render(<App />); cleanups.push(ui.unmount)
  click(ui.container.querySelector('.pet-explore-toggle')!)
  click(ui.container.querySelector('.pet-play-toggle')!)
  const select = ui.container.querySelector<HTMLSelectElement>('.room-controls-focus select')!
  act(() => { select.value = second.id; select.dispatchEvent(new Event('change', { bubbles: true })) })
  expect(ui.container.querySelectorAll('.pet-explore-toggle')).toHaveLength(destination === 'an empty room' ? 0 : 1)
  expect(ui.container.querySelectorAll('.pet-play-toggle')).toHaveLength(1)
  expect(ui.container.querySelector('.pet-play-toggle')!.getAttribute('aria-expanded')).toBe('false')
  if (destination === 'another furnished room') {
    const choices = ui.container.querySelector<HTMLSelectElement>('.pet-explore select')!
    expect([...choices.options].map(option => option.value)).toEqual(['second-object'])
    expect(ui.container.querySelector('.pet-explore-toggle')!.getAttribute('aria-expanded')).toBe('false')
  }
})

it('removes Explore when the last furnishing disappears while Home stays mounted', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-07T12:00:00'))
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  recovered()
  const ui = render(<App />); cleanups.push(ui.unmount)
  click(ui.container.querySelector('.pet-explore-toggle')!)
  fixture.state = { ...fixture.state, snapshot: { ...fixture.state.snapshot,
    tables: { ...fixture.state.snapshot.tables, placed_objects: {} } } }
  ui.rerender(<App />)
  expect(ui.container.querySelectorAll('.pet-explore-toggle')).toHaveLength(0)
  expect(ui.container.querySelectorAll('.pet-play-toggle')).toHaveLength(1)
})
