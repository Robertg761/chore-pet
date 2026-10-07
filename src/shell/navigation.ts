import { authReturnMessage } from '../lib/authReturn'

/** Query routes work on static hosts without rewriting paths or consuming auth hashes. */
export type View = { name: 'home' | 'build' | 'vacation' | 'rewards' | 'week' | 'creator' | 'wardrobe' | 'share' | 'settings' | 'sign-in' | 'pick-pet' } | { name: 'edit'; choreId?: string }
export type Route = View & { sheet?: 'more' | 'all' }
const names = new Set(['home', 'build', 'edit', 'vacation', 'rewards', 'week', 'creator', 'wardrobe', 'share', 'settings', 'sign-in', 'pick-pet'])

export function readRoute(search: string, hash = ''): Route {
  const params = new URLSearchParams(search)
  const name = params.get('screen') ?? (authReturnMessage(search, hash) ? 'sign-in' : 'home')
  if (!names.has(name)) return { name: 'home' }
  const route: Route = name === 'edit'
    ? { name, ...(params.get('chore') ? { choreId: params.get('chore')! } : {}) }
    : { name: name as Exclude<View['name'], 'edit'> }
  const sheet = params.get('sheet')
  if (sheet === 'more' || (sheet === 'all' && name === 'home')) route.sheet = sheet
  return route
}

export function routeUrl(url: URL, route: Route): string {
  const next = new URL(url)
  for (const key of ['screen', 'chore', 'sheet']) next.searchParams.delete(key)
  if (route.name !== 'home') next.searchParams.set('screen', route.name)
  if (route.name === 'edit' && route.choreId) next.searchParams.set('chore', route.choreId)
  if (route.sheet) next.searchParams.set('sheet', route.sheet)
  return next.pathname + next.search + next.hash
}

type Entry = { scope: string | null; dismissTo?: string }
const entry = (): Entry | undefined => history.state?.chorePetNavigation

/** A controller per mounted app. History contains identifiers only, never form contents. */
export function createNavigation(initialScope: string | null) {
  let scope = initialScope
  let route = readRoute(location.search, location.hash)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())
  const write = (next: Route, replace = false, dismissTo?: string) => {
    const url = routeUrl(new URL(location.href), next)
    history[replace ? 'replaceState' : 'pushState'](
      { ...history.state, chorePetNavigation: { scope: scope ?? entry()?.scope ?? null, dismissTo } satisfies Entry }, '', url,
    )
    route = next
    emit()
  }
  // Mark this entry so old-account history can never open an editor in a new account.
  const previous = entry()
  if (scope && previous?.scope && previous.scope !== scope) route = { name: 'home' }
  write(route, true)
  const onPop = () => {
    if (scope && entry()?.scope && entry()!.scope !== scope) write({ name: 'home' }, true)
    else { route = readRoute(location.search, location.hash); emit() }
  }
  return {
    getSnapshot: () => route,
    subscribe: (listener: () => void) => {
      if (listeners.size === 0) window.addEventListener('popstate', onPop)
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) window.removeEventListener('popstate', onPop)
      }
    },
    go(next: Route, replace = false) {
      if (routeUrl(new URL(location.href), next) === location.pathname + location.search + location.hash) return
      const dismissTo = next.sheet && !route.sheet ? location.href : undefined
      write(next, replace || Boolean(route.sheet), dismissTo)
    },
    dismiss() {
      if (!route.sheet) return
      if (entry()?.dismissTo) history.back()
      else { const { sheet: _sheet, ...view } = route; write(view, true) }
    },
    setScope(next: string | null) {
      if (!next || next === scope) return
      const changed = scope !== null
      scope = next
      if (changed || (entry()?.scope && entry()!.scope !== next)) write({ name: 'home' }, true)
      else write(route, true)
    },
  }
}
