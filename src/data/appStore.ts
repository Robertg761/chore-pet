import { useMemo, useSyncExternalStore } from 'react'
import { indexedDbStore, memoryStore } from './local'
import { getSupabase } from '../lib/supabase'
import { appRemote } from './remote'
import { selectHome, type HomeData } from './state'
import { createStore, type DataState } from './store'

// The one store the app uses: IndexedDB locally, Supabase remotely (or
// local-only without keys). Syncs on start, on every change, when the
// connection comes back and when the app returns to the foreground.

export const appStore = createStore({
  local: typeof indexedDB === 'undefined' ? memoryStore() : indexedDbStore(),
  remote: appRemote,
  isOnline: () => navigator.onLine,
})

let started = false
let listening = false

/**
 * Signing in, out or saving the account changes whose data this is: sync to
 * follow it. Called again on every retry, so a Supabase download that failed
 * at start-up still gets its listener once it loads.
 */
function listenForAuthChanges() {
  if (listening) return
  getSupabase().then(
    (supabase) => {
      if (!supabase || listening) return
      listening = true
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void appStore.sync()
      })
    },
    () => {
      // Offline or the download failed; the next retry tries again.
    },
  )
}

function retry() {
  listenForAuthChanges()
  void appStore.sync()
}

export function startAppStore() {
  if (started) return
  started = true
  void appStore.start()
  listenForAuthChanges()
  window.addEventListener('online', retry)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retry()
  })
}

export function useDataState(): DataState {
  return useSyncExternalStore(appStore.subscribe, appStore.getState)
}

export function useHome(): HomeData {
  const tables = useDataState().snapshot.tables
  return useMemo(() => selectHome(tables), [tables])
}
