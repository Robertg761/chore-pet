import type { AccountCleanup } from '../data/state'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []
const store = {
  cleanup: undefined as AccountCleanup | undefined,
  setCleanup: vi.fn(async (cleanup: AccountCleanup | undefined) => { store.cleanup = cleanup }),
  pendingCount: 0,
  rejectedCount: 0,
  sync: vi.fn(async () => void calls.push('sync')),
  getState: () => ({ pendingCount: store.pendingCount, rejectedCount: store.rejectedCount, snapshot: { userId: 'owner', cleanup: store.cleanup } }),
  pause: vi.fn(() => {
    calls.push('pause')
    return () => void calls.push('resume')
  }),
  reset: vi.fn(async (options?: { backup?: boolean; forNext?: boolean }) => { calls.push(`reset${options?.backup === false ? ' no-backup' : ''}${options?.forNext ? ' for-next' : ''}`); if (store.cleanup) store.cleanup = { ...store.cleanup, stage: 'local-cleared' } }),
}
let anonymous = false
const auth = {
  signOut: vi.fn(async (options: { scope: string }) => (calls.push(`signOut ${options.scope}`), { error: null })),
  getSession: async () => ({ data: { session: { user: { id: 'owner', is_anonymous: anonymous } } } }),
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
  store.cleanup = undefined
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


describe('partial account cleanup', () => {
  it('does not sign out after failed preservation; keeps a retry journal', async () => {
    store.pendingCount = 2
    store.reset.mockRejectedValueOnce(new Error('backup failed'))
    expect(await signOutSafely()).toMatchObject({ ok: false, unsynced: 2 })
    expect(calls).not.toContain('signOut local')
    expect(store.cleanup?.kind).toBe('sign-out')
    expect(await signOutSafely()).toMatchObject({ ok: true })
    expect(store.cleanup).toBeUndefined()
  })
  it('reports server deletion with incomplete device cleanup and retries without deleting again', async () => {
    rpc.mockResolvedValueOnce({ error: null, status: 204 })
    store.reset.mockRejectedValueOnce(new Error('clear failed'))
    const before = rpc.mock.calls.length
    expect(await deleteAccount()).toMatchObject({ ok: false, reason: 'cleanup', serverDeleted: true })
    expect(store.cleanup?.stage).toBe('server-deleted')
    expect(await deleteAccount()).toEqual({ ok: true })
    expect(rpc.mock.calls.length - before).toBe(1)
    expect(store.cleanup).toBeUndefined()
  })
  it('does not report success when local auth sign-out fails after deletion', async () => {
    rpc.mockResolvedValueOnce({ error: null, status: 204 })
    auth.signOut.mockResolvedValueOnce({ error: { message: 'blocked' } } as never)
    expect(await deleteAccount()).toMatchObject({ ok: false, reason: 'cleanup', serverDeleted: true })
    expect(store.cleanup?.stage).toBe('local-cleared')
    expect(await deleteAccount()).toEqual({ ok: true })
  })
  it('refuses to delete on the server unless retry instructions can be saved', async () => {
    store.setCleanup.mockRejectedValueOnce(new Error('unavailable'))
    const before = rpc.mock.calls.length
    expect(await deleteAccount()).toMatchObject({ ok: false })
    expect(rpc.mock.calls.length).toBe(before)
  })
})

it('keeps a cleanup journal when the delete response is uncertain', async () => {
  rpc.mockRejectedValueOnce(new Error('connection lost'))
  expect(await deleteAccount()).toMatchObject({ ok: false, reason: 'cleanup', serverDeleted: false })
  expect(store.cleanup?.kind).toBe('delete')
})

it('does not clear the journal on a network error returned by the delete RPC', async () => {
  rpc.mockResolvedValueOnce({ error: { code: '', message: 'Failed to fetch' }, status: 0 })
  expect(await deleteAccount()).toMatchObject({ ok: false })
  expect(store.cleanup?.kind).toBe('delete')
})

it('refuses a second tab account operation while the browser lock is held', async () => {
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: (lock: null) => unknown) => callback(null) } })
  try {
    const before = rpc.mock.calls.length
    expect(await deleteAccount()).toMatchObject({ ok: false, reason: 'cleanup', message: expect.stringContaining('another tab') })
    expect(rpc.mock.calls.length).toBe(before)
    expect(store.cleanup).toBeUndefined()
  } finally { vi.unstubAllGlobals() }
})

it('does not let a different tab cancel an account operation that still holds the lock', async () => {
  const { cancelSignOut } = await import('./account')
  store.cleanup = { kind: 'sign-out', ownerId: 'owner', stage: 'prepared' }
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: (lock: null) => unknown) => callback(null) } })
  try {
    expect(await cancelSignOut()).toMatchObject({ ok: false })
    expect(store.cleanup?.stage).toBe('prepared')
  } finally { vi.unstubAllGlobals() }
})

it('allows cancelling a failed sign-out only before the local copy was cleared', async () => {
  const { cancelSignOut } = await import('./account')
  store.cleanup = { kind: 'sign-out', ownerId: 'owner', stage: 'local-cleared' }
  expect(await cancelSignOut()).toMatchObject({ ok: false })
  expect(store.cleanup).toBeDefined()
  store.cleanup = { ...store.cleanup!, stage: 'prepared' }
  expect(await cancelSignOut()).toEqual({ ok: true })
  expect(store.cleanup).toBeUndefined()
})

it('keeps deletion pending after a gateway timeout rather than reviving the cache', async () => {
  rpc.mockResolvedValueOnce({ error: { code: '', message: 'Gateway Timeout' }, status: 504 })
  expect(await deleteAccount()).toMatchObject({ ok: false })
  expect(store.cleanup?.stage).toBe('prepared')
})
