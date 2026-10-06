import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, supabaseConfigured } from './supabase'

// Guests start with an anonymous account (src/lib/supabase.ts). Saving
// progress links that same account to an email or Google, so nothing moves:
// the user id, and so every row, stays the same. Signing in on another device
// switches this device to that account; the store then drops the device's
// guest data and pulls the account's home (see claim() in src/data/state.ts).

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
    let live = true
    let unsubscribe = () => {}
    void getSupabase().then(async (supabase) => {
      if (!supabase || !live) return
      const { data } = supabase.auth.onAuthStateChange((_event, session) => live && setState(stateFrom(session)))
      unsubscribe = () => data.subscription.unsubscribe()
      const { data: current } = await supabase.auth.getSession()
      if (live) setState(stateFrom(current.session))
    })
    return () => {
      live = false
      unsubscribe()
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

export async function signOut(): Promise<AccountResult> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: true }
  const { error } = await supabase.auth.signOut()
  return result(error)
}
