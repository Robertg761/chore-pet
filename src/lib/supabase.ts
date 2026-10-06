import { createClient, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = supabaseConfigured ? createClient(url!, anonKey!) : null

/**
 * Every visitor gets a real account with no sign-up: if there is no session,
 * sign in anonymously. The anonymous user can later be upgraded to email or
 * Google (supabase.auth.updateUser / linkIdentity) without losing data.
 * Requires "Allow anonymous sign-ins" in Supabase Auth settings.
 */
export async function ensureSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return anon.session
}
