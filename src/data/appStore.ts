import { useMemo, useSyncExternalStore } from 'react'
import { indexedDbStore, volatileStore } from './local'
import { getSupabase } from '../lib/supabase'
import { appRemote } from './remote'
import { selectHome, type HomeData } from './state'
import { createStore, type DataState, type StoreChannel, type StoreMessage } from './store'

// The one store the app uses: IndexedDB locally, Supabase remotely (or
// local-only without keys). Syncs on start, on every change, when the
// connection comes back, when the app returns to the foreground, and on a
// backoff timer (up to every 5 minutes) after a failed sync. Tabs share the
// offline copy and hear each other's saves over a BroadcastChannel.

export const STORE_CHANNEL = 'chore-pet-store'

function broadcastChannel(): StoreChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  const channel = new BroadcastChannel(STORE_CHANNEL)
  return {
    post(message) {
      try {
        channel.postMessage(message)
      } catch (e) {
        console.warn('Could not tell other tabs about a save', e)
      }
    },
    listen(onMessage) {
      const handler = (e: MessageEvent) => onMessage(e.data as StoreMessage)
      channel.addEventListener('message', handler)
      return () => channel.removeEventListener('message', handler)
    },
  }
}

export const appStore = createStore({
  // Without IndexedDB the home lives in memory, and the app says it isn't being saved.
  local: typeof indexedDB === 'undefined' ? volatileStore() : indexedDbStore(),
  remote: appRemote,
  isOnline: () => navigator.onLine,
  backoff: { baseMs: 2000, maxMs: 5 * 60_000 },
  channel: broadcastChannel(),
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
  const { tables, activeHomeId } = useDataState().snapshot
  return useMemo(() => selectHome(tables, activeHomeId), [tables, activeHomeId])
}
