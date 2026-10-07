import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { appStore } from '../data/appStore'
import { getSupabase, supabaseConfigured } from './supabase'

// Guests start with an anonymous account (src/lib/supabase.ts). Saving
// progress links that same account to an email or Google, so nothing moves:
// the user id, and so every row, stays the same. Signing in on another device
// switches this device to that account; the store then drops the device's
// guest data (keeping a backup copy on the device) and pulls the account's
// home (see claim() in src/data/state.ts).
//
// Sign-in links and Google come back to the app with a one-time ?code (PKCE,
// see src/lib/supabase.ts); the client swaps it for a session on load and the
// store follows the SIGNED_IN event (src/data/appStore.ts).

export type AccountState =
  | { kind: 'local' } // no Supabase keys: data lives on this device only
  | { kind: 'loading' }
  | { kind: 'offline' } // keys are set but there is no session yet (never been online)
  | { kind: 'guest' }
  | { kind: 'saved'; email: string | null; via: 'email' | 'google' }

export type AccountResult = { ok: true } | { ok: false; message: string }

function stateFrom(session: Session | null): AccountState {
  const user = session?.user
  if (!user) return { kind: 'offline' }
  if (user.is_anonymous) return { kind: 'guest' }
  const google = user.identities?.some((i) => i.provider === 'google')
  return { kind: 'saved', email: user.email ?? null, via: google ? 'google' : 'email' }
}

export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>(supabaseConfigured ? { kind: 'loading' } : { kind: 'local' })
  useEffect(() => {
    if (!supabaseConfigured) return
    let live = true
    let connected = false
    let unsubscribe = () => {}
    // Load the client and follow the session. If the download fails (offline),
    // say so and try again when the connection or the tab comes back.
    const attempt = () => {
      if (connected) return
      getSupabase().then(
        async (supabase) => {
          if (!supabase || !live || connected) return
          connected = true
          const { data } = supabase.auth.onAuthStateChange((_event, session) => live && setState(stateFrom(session)))
          unsubscribe = () => data.subscription.unsubscribe()
          const { data: current } = await supabase.auth.getSession()
          if (live) setState(stateFrom(current.session))
        },
        () => live && setState({ kind: 'offline' }),
      )
    }
    const onVisible = () => document.visibilityState === 'visible' && attempt()
    attempt()
    window.addEventListener('online', attempt)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live = false
      unsubscribe()
      window.removeEventListener('online', attempt)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return state
}

const back = () => window.location.origin + window.location.pathname

function result(error: { message: string } | null): AccountResult {
  return error ? { ok: false, message: error.message } : { ok: true }
}

/** Keep this guest's progress under an email address (a confirmation email is sent). */
export async function saveWithEmail(email: string): Promise<AccountResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, message: 'Accounts are not set up here.' }
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: back() })
  return result(error)
}

/** Keep this guest's progress under a Google account (redirects to Google and back). */
export async function saveWithGoogle(): Promise<AccountResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, message: 'Accounts are not set up here.' }
  const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: back() } })
  return result(error)
}

/** Sign in to an existing account with a magic link (this device's guest home is replaced). */
export async function signInWithEmail(email: string): Promise<AccountResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, message: 'Accounts are not set up here.' }
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: back() } })
  return result(error)
}

/** Sign in to an existing account with Google. */
export async function signInWithGoogle(): Promise<AccountResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, message: 'Accounts are not set up here.' }
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back() } })
  return result(error)
}

/** localStorage keys that outlive a sign-out: device preferences, not account data. */
const KEEP_ON_SIGN_OUT = ['chore-pet:sound']

type KeyedStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>

function localStorageOrNull(): KeyedStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Forget this device's per-account settings (every `chore-pet:` key but the sound setting). */
export function clearLocalSettings(storage: KeyedStorage | null = localStorageOrNull()): void {
  if (!storage) return
  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith('chore-pet:') && !KEEP_ON_SIGN_OUT.includes(key)) keys.push(key)
    }
    keys.forEach((k) => storage.removeItem(k))
  } catch {
    // Storage is blocked; there is nothing in it to clear.
  }
}

/** How long sign-out waits for a last sync before going ahead. */
const LAST_SYNC_MS = 8000

export interface SignOutResult {
  /** True once this device is signed out (other devices stay signed in). */
  ok: boolean
  /**
   * Changes that hadn't reached the server. They are not lost: a copy stays on
   * this device (IndexedDB `snapshot-backup-<account id>`), but they won't show
   * on other devices. Worth a gentle note when above 0.
   */
  unsynced: number
  message?: string
}

/**
 * Sign out on this device only: one last sync, then forget this device's copy
 * of the home (backed up first if anything is unsynced, or it was a guest's)
 * and its per-account settings, then drop the session here. Other devices stay
 * signed in. The app then starts fresh as a new guest.
 */
export async function signOutSafely(): Promise<SignOutResult> {
  if (!supabaseConfigured) return { ok: true, unsynced: 0 }
  const supabase = await getSupabase().catch(() => null)
  if (!supabase) return { ok: false, unsynced: appStore.getState().pendingCount, message: "Couldn't reach the server. Try again when you're online." }
  await Promise.race([appStore.sync(), new Promise((r) => setTimeout(r, LAST_SYNC_MS))])
  const { pendingCount: unsynced, rejectedCount } = appStore.getState()
  // A copy stays on this device only when the server can't give it back: unsynced or
  // set-aside changes, or a guest's home (no way to sign back in to it). A fully saved
  // account leaves nothing behind, so sign-out is a clean break on a shared browser.
  const { data: current } = await supabase.auth.getSession()
  const keep = unsynced > 0 || rejectedCount > 0 || current.session?.user.is_anonymous === true
  // No syncing in between: the old session must not pull its home back in, nor the new one claim it.
  const resume = appStore.pause()
  try {
    await appStore.reset({ backup: keep })
    clearLocalSettings()
    // Removes the session from this device even if the server can't be told.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    return error ? { ok: false, unsynced, message: error.message } : { ok: true, unsynced }
  } finally {
    resume()
  }
}

/** Sign out on this device (see signOutSafely, which also says what hadn't synced). */
export async function signOut(): Promise<AccountResult> {
  const r = await signOutSafely()
  return r.ok ? { ok: true } : { ok: false, message: r.message ?? "Couldn't sign out." }
}

export type DeleteAccountResult =
  | { ok: true }
  | {
      ok: false
      /**
       * - not-set-up: no Supabase keys (there is no account to delete);
       * - unavailable: the server can't delete accounts yet (migration 0006 not applied);
       * - offline: the server couldn't be reached;
       * - failed: the server refused.
       */
      reason: 'not-set-up' | 'unavailable' | 'offline' | 'failed'
      message: string
    }

/** PostgREST's "function not found" (or Postgres's): the delete_my_account migration hasn't run. */
function missingFunction(error: { code?: string; message: string }, status?: number): boolean {
  return error.code === 'PGRST202' || error.code === '42883' || status === 404
}

/**
 * Delete the account and everything in it on the server (the
 * delete_my_account function, migration 0006), then wipe this device's copy,
 * its backup and its settings, and sign out here. Nothing is wiped unless the
 * server confirmed the delete.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'not-set-up', message: 'Accounts are not set up here.' }
  const supabase = await getSupabase().catch(() => null)
  if (!supabase) return { ok: false, reason: 'offline', message: "Couldn't reach the server. Try again when you're online." }
  // Hold syncing so nothing is re-sent for an account that is going away.
  const resume = appStore.pause()
  try {
    const { error, status } = await supabase.rpc('delete_my_account')
    if (error) {
      if (missingFunction(error, status)) return { ok: false, reason: 'unavailable', message: "Deleting an account isn't available yet." }
      if (!error.code && !status) return { ok: false, reason: 'offline', message: "Couldn't reach the server. Try again when you're online." }
      return { ok: false, reason: 'failed', message: error.message }
    }
    await appStore.reset({ backup: false })
    clearLocalSettings()
    await supabase.auth.signOut({ scope: 'local' })
    return { ok: true }
  } finally {
    resume()
  }
}
