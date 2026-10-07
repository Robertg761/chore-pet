import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []
const store = {
  pendingCount: 0,
  rejectedCount: 0,
  sync: vi.fn(async () => void calls.push('sync')),
  getState: () => ({ pendingCount: store.pendingCount, rejectedCount: store.rejectedCount }),
  pause: vi.fn(() => {
    calls.push('pause')
    return () => void calls.push('resume')
  }),
  reset: vi.fn(async (options?: { backup?: boolean; forNext?: boolean }) => void calls.push(`reset${options?.backup === false ? ' no-backup' : ''}${options?.forNext ? ' for-next' : ''}`)),
}
let anonymous = false
const auth = {
  signOut: vi.fn(async (options: { scope: string }) => (calls.push(`signOut ${options.scope}`), { error: null })),
  getSession: async () => ({ data: { session: { user: { is_anonymous: anonymous } } } }),
}
const rpc = vi.fn()
let configured = true
vi.mock('../data/appStore', () => ({ appStore: store }))
vi.mock('./supabase', () => ({
  get supabaseConfigured() {
    return configured
  },
  getSupabase: async () => (configured ? { auth, rpc } : null),
}))

const { clearLocalSettings, deleteAccount, signOutSafely } = await import('./account')

function fakeStorage(keys: string[]) {
  const data = new Map(keys.map((k) => [k, 'x']))
  return { data, get length() { return data.size }, key: (i: number) => [...data.keys()][i] ?? null, removeItem: (k: string) => void data.delete(k) }
}

beforeEach(() => {
  calls.length = 0
  store.pendingCount = 0
  store.rejectedCount = 0
  anonymous = false
  configured = true
  vi.stubGlobal('localStorage', fakeStorage([]))
})

describe('clearLocalSettings', () => {
  it('forgets every chore-pet key except the sound setting, and nothing else', () => {
    const storage = fakeStorage(['chore-pet:sound', 'chore-pet:reminders', 'chore-pet:onboarded:h1', 'chore-pet:dayOffset', 'sb-x-auth-token', 'other'])
    clearLocalSettings(storage)
    expect([...storage.data.keys()]).toEqual(['chore-pet:sound', 'sb-x-auth-token', 'other'])
  })
})

describe('signOutSafely', () => {
  it('syncs first, then resets with syncing held, then signs out on this device only', async () => {
    const result = await signOutSafely()
    expect(result).toEqual({ ok: true, unsynced: 0 })
    expect(calls).toEqual(['sync', 'pause', 'reset no-backup', 'signOut local', 'resume'])
  })

  it('keeps a backup only when the server could not give the home back', async () => {
    store.pendingCount = 2
    await signOutSafely()
    store.pendingCount = 0
    store.rejectedCount = 1
    await signOutSafely()
    store.rejectedCount = 0
    anonymous = true
    await signOutSafely()
    // A guest's home is held for whoever uses this device next: that guest can't sign back in.
    expect(calls.filter((c) => c.startsWith('reset'))).toEqual(['reset', 'reset', 'reset for-next'])
  })

  it('says how many changes had not synced (they are backed up by the reset)', async () => {
    store.pendingCount = 3
    expect(await signOutSafely()).toMatchObject({ ok: true, unsynced: 3 })
  })

  it('clears per-account settings', async () => {
    const storage = fakeStorage(['chore-pet:sound', 'chore-pet:reminders'])
    vi.stubGlobal('localStorage', storage)
    await signOutSafely()
    expect([...storage.data.keys()]).toEqual(['chore-pet:sound'])
  })
})

describe('deleteAccount', () => {
  it('says so, and wipes nothing, while the server cannot delete accounts yet', async () => {
    rpc.mockResolvedValueOnce({ error: { code: 'PGRST202', message: 'Could not find the function public.delete_my_account' }, status: 404 })
    expect(await deleteAccount()).toMatchObject({ ok: false, reason: 'unavailable' })
    expect(calls).toEqual(['pause', 'resume'])
  })

  it('reports being offline', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '', message: 'TypeError: Failed to fetch' }, status: 0 })
    expect(await deleteAccount()).toMatchObject({ ok: false, reason: 'offline' })
  })

  it('wipes this device without a backup and signs out locally once the server deleted it', async () => {
    rpc.mockResolvedValueOnce({ error: null, status: 204 })
    expect(await deleteAccount()).toEqual({ ok: true })
    expect(rpc).toHaveBeenLastCalledWith('delete_my_account')
    expect(calls).toEqual(['pause', 'reset no-backup', 'signOut local', 'resume'])
  })

  it('has nothing to delete without accounts', async () => {
    configured = false
    expect(await deleteAccount()).toMatchObject({ ok: false, reason: 'not-set-up' })
  })
})
