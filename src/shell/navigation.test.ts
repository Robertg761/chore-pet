// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createNavigation, readRoute, routeUrl } from './navigation'

const disposers: (() => void)[] = []
afterEach(() => { disposers.splice(0).forEach((dispose) => dispose()) })
const travel = (direction: 'back' | 'forward') => new Promise<void>((resolve) => {
  window.addEventListener('popstate', () => resolve(), { once: true })
  history[direction]()
})

describe('app navigation', () => {
  it('keeps the static hosting path, unrelated query and auth callback intact', () => {
    expect(routeUrl(new URL('https://example.org/chore-pet/?code=abc&dev#auth'), { name: 'edit', choreId: 'a/b' }))
      .toBe('/chore-pet/?code=abc&dev=&screen=edit&chore=a%2Fb#auth')
    expect(readRoute('?screen=edit&chore=a%2Fb')).toEqual({ name: 'edit', choreId: 'a/b' })
    expect(readRoute('?screen=unknown&sheet=all')).toEqual({ name: 'home' })
    // The chores screen, and an editor opened from it, which goes back there.
    expect(routeUrl(new URL('https://example.org/'), { name: 'edit', choreId: 'c', from: 'chores' })).toBe('/?screen=edit&chore=c&from=chores')
    expect(readRoute('?screen=edit&from=chores')).toEqual({ name: 'edit', from: 'chores' })
    expect(readRoute('?screen=edit&from=elsewhere')).toEqual({ name: 'edit' })
    expect(readRoute('?screen=chores&from=chores')).toEqual({ name: 'chores' })
    expect(routeUrl(new URL('https://example.org/?screen=edit&from=chores'), { name: 'home' })).toBe('/')
    expect(readRoute('?error=access_denied')).toEqual({ name: 'sign-in' })
    expect(readRoute('', '#error=access_denied')).toEqual({ name: 'sign-in' })
    expect(readRoute('?screen=week&sheet=all')).toEqual({ name: 'week' })
  })

  it('restores a deep link and traverses screens and sheets in both directions', async () => {
    history.replaceState(null, '', '/chore-pet/?screen=week')
    const nav = createNavigation('owner:home')
    disposers.push(nav.subscribe(() => {}))
    expect(nav.getSnapshot()).toEqual({ name: 'week' })
    nav.go({ name: 'home' })
    nav.go({ name: 'home', sheet: 'all' })
    await travel('back')
    expect(nav.getSnapshot()).toEqual({ name: 'home' })
    await travel('forward')
    expect(nav.getSnapshot()).toEqual({ name: 'home', sheet: 'all' })
    nav.go({ name: 'edit' }) // selecting inside a sheet replaces its entry
    await travel('back')
    expect(nav.getSnapshot()).toEqual({ name: 'home' })
  })

  it('closes a directly linked sheet without leaving the app', () => {
    history.replaceState(null, '', '/chore-pet/?sheet=more')
    const nav = createNavigation('owner:home')
    disposers.push(nav.subscribe(() => {}))
    nav.dismiss()
    expect(nav.getSnapshot()).toEqual({ name: 'home' })
    expect(location.pathname).toBe('/chore-pet/')
  })

  it('does not replay an earlier account/home route after an identity change', async () => {
    history.replaceState(null, '', '/')
    const nav = createNavigation('one:home')
    disposers.push(nav.subscribe(() => {}))
    nav.go({ name: 'edit', choreId: 'private-chore' })
    nav.go({ name: 'week' })
    nav.setScope('two:home')
    await travel('back')
    expect(nav.getSnapshot()).toEqual({ name: 'home' })
    expect(location.search).not.toContain('private-chore')
  })
})

it('checks the persisted history owner after startup hydration', () => {
  history.replaceState({ chorePetNavigation: { scope: 'old:home' } }, '', '/?screen=edit&chore=old-chore')
  const nav = createNavigation(null)
  disposers.push(nav.subscribe(() => {}))
  nav.setScope('new:home')
  expect(nav.getSnapshot()).toEqual({ name: 'home' })
})

it.each(['?error=access_denied', '#error=access_denied'])('keeps canceled sign-in dismissed on reload for %s', (callback) => {
  history.replaceState(null, '', `/${callback}`)
  const nav = createNavigation('guest:no-home')
  disposers.push(nav.subscribe(() => {}))
  expect(nav.getSnapshot()).toEqual({ name: 'sign-in' })
  nav.go({ name: 'home' })
  expect(readRoute(location.search, location.hash)).toEqual({ name: 'home' })
})
