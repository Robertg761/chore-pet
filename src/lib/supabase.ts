import type { Session, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

let client: Promise<SupabaseClient | null> | null = null
/** The library's URL, taken from the error when its download failed (see load). */
let failedUrl: string | null = null

type SupabaseModule = typeof import('@supabase/supabase-js')

/**
 * The failed module URL, only when it is one of this app's own files: same
 * origin and under the app's base path. Anything else (an error message can
 * say anything) is never imported.
 */
export function ownModuleUrl(candidate: string | null, origin: string, basePath: string): string | null {
  if (!candidate) return null
  try {
    const u = new URL(candidate)
    const base = new URL(basePath, origin)
    if (u.origin !== base.origin || !u.pathname.startsWith(base.pathname)) return null
    return u.href
  } catch {
    return null
  }
}

/** The module URL once more, with a query that makes it new to the browser. */
export function retryUrl(failed: string, now: number): string {
  const u = new URL(failed)
  u.searchParams.set('retry', String(now))
  return u.href
}

/**
 * Browsers remember a failed module download and fail every later import of
 * the same URL without trying again. So after a failure, retry the URL from the
 * error message (Chrome and Firefox include it) with a query that makes it new.
 */
function load(): Promise<SupabaseModule> {
  if (failedUrl) return import(/* @vite-ignore */ retryUrl(failedUrl, Date.now())) as Promise<SupabaseModule>
  return import('@supabase/supabase-js')
}

/**
 * The Supabase client, loaded on first use. The library is most of the app's
 * JavaScript and the home paints from IndexedDB without it, so it is fetched
 * after first paint instead of blocking it. Null when no keys are set.
 *
 * Auth uses the PKCE flow: a magic link or OAuth redirect comes back with a
 * one-time ?code that only this browser (which holds the verifier) can
 * exchange, so nobody can sign this device in to their account with a link
 * of their own. The client exchanges the code and cleans the URL on load
 * (detectSessionInUrl), then reports SIGNED_IN.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null)
  client ??= load().then(
    ({ createClient }) => createClient(url!, anonKey!, { auth: { flowType: 'pkce' } }),
    (e: unknown) => {
      client = null // a failed download (e.g. offline) is retried on the next call
      const found = /https?:\/\/\S+?\.m?js(\?[^\s'"]*)?/.exec(String(e instanceof Error ? e.message : e))?.[0] ?? null
      failedUrl ??= ownModuleUrl(found, location.origin, import.meta.env.BASE_URL)
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
