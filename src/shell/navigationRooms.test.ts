import { describe, expect, it } from 'vitest'
import { readRoute, routeUrl } from './navigation'

const BASE = 'https://example.org/chore-pet/'

describe('the rooms sheet in the URL', () => {
  it('is kept on the home and build screens', () => {
    expect(readRoute('?sheet=rooms')).toEqual({ name: 'home', sheet: 'rooms' })
    expect(readRoute('?screen=home&sheet=rooms')).toEqual({ name: 'home', sheet: 'rooms' })
    expect(readRoute('?screen=build&sheet=rooms')).toEqual({ name: 'build', sheet: 'rooms' })
  })

  it('is dropped on every other screen', () => {
    const others = ['week', 'chores', 'edit', 'vacation', 'rewards', 'creator', 'wardrobe', 'share', 'settings', 'sign-in', 'pick-pet']
    for (const screen of others) {
      expect(readRoute(`?screen=${screen}&sheet=rooms`), screen).toEqual(readRoute(`?screen=${screen}`))
      expect(readRoute(`?screen=${screen}&sheet=rooms`), screen).not.toHaveProperty('sheet')
    }
  })

  it('does not change the other sheets: more and all keep their own screens', () => {
    expect(readRoute('?screen=week&sheet=rooms')).toEqual({ name: 'week' })
    expect(readRoute('?screen=build&sheet=more')).toEqual({ name: 'build', sheet: 'more' })
    expect(readRoute('?screen=build&sheet=all')).toEqual({ name: 'build' })
  })

  it('is dropped when the screen is unknown, which falls back to home', () => {
    expect(readRoute('?screen=nope&sheet=rooms')).toEqual({ name: 'home' })
  })

  it('is dropped on a canceled sign-in, which opens the sign-in screen', () => {
    expect(readRoute('?sheet=rooms&error=access_denied')).toEqual({ name: 'sign-in' })
    expect(readRoute('', '#error=access_denied&sheet=rooms')).toEqual({ name: 'sign-in' })
  })

  it('does not make rooms a screen of its own', () => {
    expect(readRoute('?screen=rooms')).toEqual({ name: 'home' })
  })
})

describe('routeUrl with the rooms sheet', () => {
  it('writes ?sheet=rooms on the home and build screens', () => {
    expect(routeUrl(new URL(BASE), { name: 'home', sheet: 'rooms' })).toBe('/chore-pet/?sheet=rooms')
    expect(routeUrl(new URL(BASE), { name: 'build', sheet: 'rooms' })).toBe('/chore-pet/?screen=build&sheet=rooms')
  })

  it('replaces an earlier sheet rather than adding a second one', () => {
    expect(routeUrl(new URL('https://example.org/?screen=build&sheet=rooms'), { name: 'build' })).toBe('/?screen=build')
    expect(routeUrl(new URL('https://example.org/?screen=week&sheet=all'), { name: 'build', sheet: 'rooms' })).toBe('/?screen=build&sheet=rooms')
  })

  it('closing the sheet on home removes the parameter', () => {
    expect(routeUrl(new URL('https://example.org/?sheet=rooms'), { name: 'home' })).toBe('/')
  })

  it('keeps the static hosting path, unrelated query and hash', () => {
    expect(routeUrl(new URL('https://example.org/chore-pet/?code=abc#auth'), { name: 'build', sheet: 'rooms' }))
      .toBe('/chore-pet/?code=abc&screen=build&sheet=rooms#auth')
  })

  it.each([
    { name: 'home', sheet: 'rooms' },
    { name: 'build', sheet: 'rooms' },
  ] as const)('round-trips %o through the URL', (route) => {
    const url = new URL(routeUrl(new URL('https://example.org/chore-pet/?code=abc#auth'), route), 'https://example.org')
    expect(readRoute(url.search, url.hash)).toEqual(route)
  })

  it('writes the sheet for another screen, but reading it back drops it', () => {
    const url = new URL(routeUrl(new URL(BASE), { name: 'week', sheet: 'rooms' }), 'https://example.org')
    expect(url.searchParams.get('sheet')).toBe('rooms')
    expect(readRoute(url.search, url.hash)).toEqual({ name: 'week' })
  })
})
