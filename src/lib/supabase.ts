import type { Session, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

let client: Promise<SupabaseClient | null> | null = null
/** The library's URL, taken from the error when its download failed (see load). */
let failedUrl: string | null = null

type SupabaseModule = typeof import('@supabase/supabase-js')

/**
 * Browsers remember a failed module download and fail every later import of
 * the same URL without trying again. So after a failure, retry the URL from the
 * error message (Chrome and Firefox include it) with a query that makes it new.
 */
function load(): Promise<SupabaseModule> {
  if (failedUrl) return import(/* @vite-ignore */ `${failedUrl}${failedUrl.includes('?') ? '&' : '?'}retry=${Date.now()}`) as Promise<SupabaseModule>
  return import('@supabase/supabase-js')
}

/**
 * The Supabase client, loaded on first use. The library is most of the app's
 * JavaScript and the home paints from IndexedDB without it, so it is fetched
 * after first paint instead of blocking it. Null when no keys are set.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null)
  client ??= load().then(
    ({ createClient }) => createClient(url!, anonKey!),
    (e: unknown) => {
      client = null // a failed download (e.g. offline) is retried on the next call
      failedUrl ??= /https?:\/\/\S+?\.m?js(\?[^\s'"]*)?/.exec(String(e instanceof Error ? e.message : e))?.[0] ?? null
      throw e
    },
  )
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
