import type { Session, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

let client: Promise<SupabaseClient | null> | null = null

/**
 * The Supabase client, loaded on first use. The library is most of the app's
 * JavaScript and the home paints from IndexedDB without it, so it is fetched
 * after first paint instead of blocking it. Null when no keys are set.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null)
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url!, anonKey!))
  return client
}

/**
 * Every visitor gets a real account with no sign-up: if there is no session,
 * sign in anonymously. The anonymous user can later be upgraded to email or
 * Google (src/lib/account.ts) without losing data.
 * Requires "Allow anonymous sign-ins" in Supabase Auth settings.
 */
export async function ensureSession(): Promise<Session | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return anon.session
}
