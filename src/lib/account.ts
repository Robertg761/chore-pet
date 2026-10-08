import { useEffect, useState, useSyncExternalStore } from 'react'
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
  if (!supabase) return { ok: false, message: "Accounts aren't available on this device yet." }
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: back() })
  return result(error)
}

/** Keep this guest's progress under a Google account (redirects to Google and back). */
export async function saveWithGoogle(): Promise<AccountResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, message: "Accounts aren't available on this device yet." }
  const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: back() } })
  return result(error)
}

/** Sign in to an existing account with a magic link (this device's guest home is replaced). */
export async function signInWithEmail(email: string): Promise<AccountResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, message: "Accounts aren't available on this device yet." }
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: back() } })
  return result(error)
}

/** Sign in to an existing account with Google. */
export async function signInWithGoogle(): Promise<AccountResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, message: "Accounts aren't available on this device yet." }
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
  if (!storage) throw new Error("Couldn't clear this device's settings. Try again with storage available.")
  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith('chore-pet:') && !KEEP_ON_SIGN_OUT.includes(key)) keys.push(key)
    }
    keys.forEach((k) => storage.removeItem(k))
  } catch {
    throw new Error("Couldn't clear this device's settings. Try again.")
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
async function performSignOut(): Promise<SignOutResult> {
  if (!supabaseConfigured) return { ok: true, unsynced: 0 }
  const supabase = await getSupabase().catch(() => null)
  if (!supabase) return { ok: false, unsynced: appStore.getState().pendingCount, message: "Couldn't reach the server. Try again when you're online." }
  const pending = appStore.getState().snapshot.cleanup
  if (pending?.kind === 'delete') return { ok: false, unsynced: 0, message: 'Finish the account deletion first.' }
  if (!pending) await Promise.race([appStore.sync(), new Promise((r) => setTimeout(r, LAST_SYNC_MS))])
  const { pendingCount: unsynced, rejectedCount, snapshot } = appStore.getState()
  const resume = appStore.pause()
  try {
    if (!pending) {
      const { data: current, error } = await supabase.auth.getSession()
      if (error) throw error
      const guest = current.session?.user.is_anonymous === true && current.session.user.id === snapshot.userId
      await appStore.setCleanup({ kind: 'sign-out', ownerId: snapshot.userId, stage: 'prepared',
        backup: unsynced > 0 || rejectedCount > 0 || guest, forNext: guest })
    }
    const cleanup = appStore.getState().snapshot.cleanup!
    if (cleanup.stage !== 'local-cleared') await appStore.reset({ backup: cleanup.backup, forNext: cleanup.forNext })
    clearLocalSettings()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    await appStore.setCleanup(undefined)
    return { ok: true, unsynced }
  } catch (e) {
    return { ok: false, unsynced, message: e instanceof Error ? e.message : "Couldn't finish signing out. Try again." }
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
      reason: 'not-set-up' | 'unavailable' | 'offline' | 'failed' | 'cleanup'
      serverDeleted?: boolean
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
async function performDelete(): Promise<DeleteAccountResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'not-set-up', message: "Accounts aren't available on this device yet." }
  const supabase = await getSupabase().catch(() => null)
  if (!supabase) return { ok: false, reason: 'offline', message: "Couldn't reach the server. Try again when you're online." }
  const resume = appStore.pause()
  let serverDeleted = false
  try {
    let cleanup = appStore.getState().snapshot.cleanup
    if (cleanup && cleanup.kind !== 'delete') return { ok: false, reason: 'cleanup', message: 'Finish signing out first.' }
    if (!cleanup) {
      cleanup = { kind: 'delete', ownerId: appStore.getState().snapshot.userId, stage: 'prepared' }
      await appStore.setCleanup(cleanup)
    }
    serverDeleted = cleanup.serverDeleted === true
    if (!serverDeleted) {
      // Never repeat this RPC with a replacement account's token.
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (data.session?.user.id !== cleanup.ownerId) return { ok: false, reason: 'cleanup', message: 'Sign in to the original account to confirm its deletion. The device copy is still kept.' }
      const { error, status } = await supabase.rpc('delete_my_account')
      if (error) {
        if (!error.code || status >= 500 || status === 401) return { ok: false, reason: 'offline', message: "Couldn't confirm the deletion. Retry, or clear only this device below." }
        await appStore.setCleanup(undefined)
        if (missingFunction(error, status)) return { ok: false, reason: 'unavailable', message: "Deleting an account isn't available yet." }
        return { ok: false, reason: 'failed', message: error.message }
      }
      serverDeleted = true
      await appStore.setCleanup({ ...cleanup, stage: 'server-deleted', serverDeleted: true })
    }
    if (appStore.getState().snapshot.cleanup?.stage !== 'local-cleared') await appStore.reset({ backup: false })
    clearLocalSettings()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    await appStore.setCleanup(undefined)
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: 'cleanup', serverDeleted, message: serverDeleted
      ? "Your account was deleted, but this device still needs cleanup. Try again."
      : e instanceof Error ? e.message : "Couldn't finish deleting. Try again." }
  } finally {
    resume()
  }
}


let operationBusy = false
let operationError: string | null = null
const operationListeners = new Set<() => void>()
export function useAccountOperationBusy(): boolean {
  return useSyncExternalStore((listener) => {
    operationListeners.add(listener)
    return () => { operationListeners.delete(listener) }
  }, () => operationBusy)
}

export function useAccountOperationError(): string | null {
  return useSyncExternalStore((listener) => {
    operationListeners.add(listener)
    return () => { operationListeners.delete(listener) }
  }, () => operationError)
}

async function exclusive<T extends { ok: boolean; message?: string }>(action: () => Promise<T>, unavailable: T): Promise<T> {
  operationBusy = true
  operationError = null
  operationListeners.forEach((listener) => listener())
  try {
    // Web Locks serialize the whole account operation across same-origin tabs.
    // The snapshot checkpoint also compares the stored journal before writing.
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
    if (typeof navigator !== 'undefined' && !locks) {
      operationError = "This browser can't safely finish account changes. Try a current browser."
      return { ...unavailable, message: operationError }
    }
    const result = locks
      ? await locks.request('chore-pet-account-cleanup', { ifAvailable: true }, (lock) => lock ? action() : unavailable)
      : await action()
    if (!result.ok) operationError = result.message ?? "Couldn't finish. Try again."
    return result
  } catch (e) {
    operationError = e instanceof Error ? e.message : "Couldn't finish. Try again."
    return { ...unavailable, message: operationError }
  } finally {
    operationBusy = false
    operationListeners.forEach((listener) => listener())
  }
}

export function signOutSafely(): Promise<SignOutResult> {
  if (operationBusy) return Promise.resolve({ ok: false, unsynced: appStore.getState().pendingCount, message: 'An account change is still running. Try again in a moment.' })
  return exclusive(performSignOut, { ok: false, unsynced: appStore.getState().pendingCount, message: 'An account change is running in another tab. Try again in a moment.' })
}

export function deleteAccount(): Promise<DeleteAccountResult> {
  if (operationBusy) return Promise.resolve({ ok: false, reason: 'cleanup', message: 'An account change is still running. Try again in a moment.' })
  return exclusive(performDelete, { ok: false, reason: 'cleanup', message: 'An account change is running in another tab. Try again in a moment.' })
}

/** Explicit fallback when the server's reply was lost or the old session expired.
 * Never claims the server account was deleted and never repeats its RPC. */
export function clearDeviceAfterUnconfirmedDelete(): Promise<AccountResult> {
  if (operationBusy) return Promise.resolve({ ok: false, message: 'An account change is still running.' })
  return exclusive(async () => {
    const cleanup = appStore.getState().snapshot.cleanup
    if (cleanup?.kind !== 'delete') return { ok: false, message: 'There is no deletion to finish.' }
    const resume = appStore.pause()
    try {
      await appStore.setCleanup({ ...cleanup, deviceOnly: true })
      await appStore.reset({ backup: false })
      clearLocalSettings()
      const supabase = await getSupabase()
      if (!supabase) throw new Error("Accounts aren't available on this device yet.")
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      await appStore.setCleanup(undefined)
      return { ok: true }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Couldn't clear this device. Try again." }
    } finally { resume() }
  }, { ok: false, message: 'An account change is running in another tab. Try again in a moment.' })
}


/** Stop a failed sign-out before any device data was cleared. */
export function cancelSignOut(): Promise<AccountResult> {
  if (operationBusy) return Promise.resolve({ ok: false, message: 'An account change is still running.' })
  return exclusive(async () => {
    const cleanup = appStore.getState().snapshot.cleanup
    if (cleanup?.kind !== 'sign-out' || cleanup.stage !== 'prepared') return { ok: false, message: 'The device copy was already cleared. Finish signing out instead.' }
    await appStore.setCleanup(undefined)
    return { ok: true }
  }, { ok: false, message: 'An account change is running in another tab. Try again in a moment.' })
}
