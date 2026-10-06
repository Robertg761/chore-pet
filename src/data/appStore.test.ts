import { beforeAll, describe, expect, it, vi } from 'vitest'

// The Supabase download fails at start-up, then works on the next retry.
const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } }))
const getSupabase = vi.fn()
vi.mock('../lib/supabase', () => ({ supabaseConfigured: false, getSupabase, ensureSession: async () => null }))

describe('startAppStore', () => {
  beforeAll(() => {
    // Just enough of a browser for the store's listeners (tests run in Node).
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
  })

  it('registers the sign-in listener on a retry when the first Supabase download failed', async () => {
    getSupabase.mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
    getSupabase.mockResolvedValue({ auth: { onAuthStateChange } })
    const { startAppStore } = await import('./appStore')
    startAppStore()
    await vi.waitFor(() => expect(getSupabase).toHaveBeenCalledTimes(1))
    expect(onAuthStateChange).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(onAuthStateChange).toHaveBeenCalledTimes(1))

    // Later retries don't add a second listener.
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('online'))
    await new Promise((r) => setTimeout(r, 10))
    expect(onAuthStateChange).toHaveBeenCalledTimes(1)
  })
})
