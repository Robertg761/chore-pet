import { restoreHome } from './actions'
import type { LocalStore } from './local'
import type { Remote, RemoteResult } from './remote'
import type { ErrorKind } from './remoteErrors'
import {
  acknowledge,
  change,
  claim,
  claimDrops,
  emptySnapshot,
  mergeSnapshots,
  opIdOf,
  planFlush,
  rebase,
  reject,
  selectHome,
  repairOps,
  requeueRejected,
  savedHomeOf,
  worthBackingUp,
  type FlushStep,
  type SavedHome,
  type NewOp,
  type Op,
  type Snapshot,
} from './state'

/**
 * - local-only: no Supabase keys, data stays on this device.
 * - offline / error: changes are kept and queued; they sync on the next try.
 */
export type SyncStatus = 'local-only' | 'offline' | 'syncing' | 'synced' | 'error'

export interface DataState {
  /** False until the local copy has loaded. */
  ready: boolean
  snapshot: Snapshot
  sync: SyncStatus
  lastError: string | null
  /**
   * False when this browser isn't keeping the offline copy (storage blocked,
   * full, unavailable or too slow to open): changes then last only until reload.
   */
  savedLocally: boolean
  /**
   * False while this device has not yet heard from the server for the current
   * account (first launch, or just signed in somewhere new). An empty home is
   * only really empty once this is true, so onboarding waits for it.
   */
  hydrated: boolean
  /** Changes still waiting to reach the server. */
  pendingCount: number
  /** Changes the server refused and that were set aside (snapshot.rejected), for a gentle note in the UI. */
  rejectedCount: number
}

export interface Store {
  getState(): DataState
  subscribe(listener: () => void): () => void
  /** Load the local copy, then sync in the background. */
  start(): Promise<void>
  /** Apply changes locally (all at once), queue them, and kick off a sync. */
  apply(...ops: NewOp[]): void
  /** Push queued changes, then pull. Waits for the local copy first. Resolves when done; never throws. */
  sync(): Promise<void>
  /**
   * Forget this device's data and start over with no account (signing out,
   * deleting the account). Anything unsynced, and any home, is first copied to
   * a backup key, unless `backup` is false (the account was deleted: its
   * backup goes too). Other tabs are told to follow.
   */
  reset(options?: { backup?: boolean }): Promise<void>
  /** Hold syncs (they run once resumed) until the returned function is called. */
  pause(): () => void
  /** Queue the set-aside changes again, e.g. after the server was fixed. */
  retryRejected(): void
  /** Forget the set-aside changes once the player has seen the note. */
  dismissRejected(): void
  /** Homes kept on this device (backups) that could be brought back. */
  savedHomes(): Promise<SavedHome[]>
  /**
   * Bring a saved home back into this account. The current home, if any, is
   * kept on this device first (so it can be swapped back), then replaced.
   */
  restoreSaved(ownerId: string): Promise<boolean>
}

export type StoreMessage = { type: 'saved' | 'reset'; from: string }

/** Lets tabs sharing one offline copy hear each other's saves (a BroadcastChannel in the app). */
export interface StoreChannel {
  post(message: StoreMessage): void
  listen(onMessage: (message: StoreMessage) => void): () => void
}

export interface StoreDeps {
  local: LocalStore
  remote: Remote | null
  isOnline?: () => boolean
  /** Retry a failed sync on a timer, doubling from baseMs up to maxMs. No timer when omitted. */
  backoff?: { baseMs: number; maxMs: number }
  channel?: StoreChannel | null
  /** Stop waiting for the local copy after this long and run from memory (not saving). */
  loadTimeoutMs?: number
  /** How long reset waits for a sync already under way before leaving it behind. */
  resetWaitMs?: number
  now?: () => Date
}

/** A change the server keeps refusing (without saying it's the data) is set aside after this many tries. */
export const MAX_ATTEMPTS = 5
export const LOAD_TIMEOUT_MS = 5000
export const RESET_WAIT_MS = 2000

/** The signed-in account changed in the middle of a sync. */
class AccountChanged extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e: unknown) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

function kindOf(res: Extract<RemoteResult, { ok: false }>): ErrorKind {
  return res.kind ?? (res.transient ? 'outage' : 'permanent')
}

export function createStore({
  local,
  remote,
  isOnline = () => true,
  backoff,
  channel = null,
  loadTimeoutMs = LOAD_TIMEOUT_MS,
  resetWaitMs = RESET_WAIT_MS,
  now = () => new Date(),
}: StoreDeps): Store {
  const durable = local.durable !== false
  let state: DataState = {
    ready: false,
    snapshot: emptySnapshot(),
    sync: remote ? 'offline' : 'local-only',
    lastError: null,
    savedLocally: durable,
    hydrated: !remote,
    pendingCount: 0,
    rejectedCount: 0,
  }
  const listeners = new Set<() => void>()
  const tabId = Math.random().toString(36).slice(2)
  /** Signed in to a different account and its home hasn't been pulled yet. */
  let switching = false
  /** The local copy couldn't be read: run from memory and never write over it. */
  let memoryOnly = false
  /** What storage holds, as far as this tab knows: the base for merging another tab's saves. */
  let base: Snapshot | null = null
  let saving: Promise<void> = Promise.resolve()
  let writeQueued = false
  /** Ops applied before the local copy loaded, applied on top of it. */
  let early: NewOp[] = []
  /** Tries per op that the server keeps refusing without blaming the data. */
  const attempts = new Map<string, number>()
  /** Homes whose missing progress row was already recreated, so a refusal can't loop. */
  const repaired = new Set<string>()
  let failures = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let paused = 0
  let wanted = false

  function set(patch: Partial<DataState>) {
    const next = { ...state, ...patch }
    if (patch.snapshot) {
      next.pendingCount = Object.keys(patch.snapshot.outbox).length
      next.rejectedCount = patch.snapshot.rejected?.length ?? 0
    }
    state = next
    listeners.forEach((l) => l())
  }

  function warn(what: string) {
    return (e: unknown) => console.warn(what, e)
  }

  // --- the offline copy ---

  async function write() {
    writeQueued = false
    if (memoryOnly) return
    if (local.update) {
      let written: Snapshot | null = null
      await local.update((stored) => {
        // Runs inside the storage transaction: fold in another tab's save, then write.
        const merged = stored ? mergeSnapshots(state.snapshot, base, stored, 'mine') : state.snapshot
        if (merged !== state.snapshot) set({ snapshot: merged })
        written = merged
        return merged
      })
      // Only once it is really stored: a failed write must not count as the base.
      base = written
    } else {
      const snapshot = state.snapshot
      await local.save(snapshot)
      base = snapshot
    }
    channel?.post({ type: 'saved', from: tabId })
  }

  /** Save the latest snapshot. Saves already queued pick up later changes too. */
  function persist() {
    if (memoryOnly || writeQueued) return
    writeQueued = true
    saving = saving.then(write).then(
      () => {
        if (!state.savedLocally && durable) set({ savedLocally: true })
      },
      (e: unknown) => {
        console.warn('Could not save the offline copy', e)
        set({ savedLocally: false })
      },
    )
  }

  function commit(snapshot: Snapshot) {
    set({ snapshot })
    persist()
  }

  /** Another tab saved: read its copy and fold it in (or, after it reset, take it whole). */
  function absorb(message: StoreMessage) {
    if (message.from === tabId || memoryOnly || !state.ready) return
    saving = saving
      .then(async () => {
        const stored = await local.load()
        if (!stored) return
        if (message.type === 'reset') {
          // Don't sync from here: the other tab is still signing out, and a
          // sync now would pull the old account's home straight back. The
          // sign-out reaches this tab as an auth event, which syncs.
          base = stored
          switching = false
          set({ snapshot: stored, hydrated: !remote, lastError: null })
          return
        }
        const merged = mergeSnapshots(state.snapshot, base, stored, 'stored')
        base = stored
        if (merged !== state.snapshot) set({ snapshot: merged })
      })
      .catch(warn('Could not read the other tab’s changes'))
  }
  channel?.listen(absorb)

  function backUp(snapshot: Snapshot) {
    if (memoryOnly || !local.backup || !worthBackingUp(snapshot)) return
    const backup = local.backup.bind(local)
    saving = saving.then(() => backup(snapshot.userId ?? 'unclaimed', snapshot)).catch(warn('Could not back up the offline copy'))
  }

  let loading: Promise<void> | null = null

  /** Load the local copy once; every sync waits for it. */
  function load(): Promise<void> {
    loading ??= (async () => {
      let loaded: Snapshot | null = null
      let savedLocally = durable
      try {
        loaded = await withTimeout(local.load(), loadTimeoutMs)
      } catch (e) {
        console.warn('Could not read the offline copy; running from memory', e)
        memoryOnly = true
        savedLocally = false
      }
      base = loaded
      const pending = early
      early = []
      set({ ready: true, snapshot: pending.reduce(change, loaded ?? state.snapshot), savedLocally })
      if (pending.length) persist()
      if (!remote) repair()
    })()
    return loading
  }

  /** Recreate a missing progress row (once per home), the way the app recreates a missing room. */
  function repair(): boolean {
    const ops = repairOps(state.snapshot.tables)
    const fresh = ops.filter((op) => !repaired.has(op.key))
    if (!fresh.length) return false
    fresh.forEach((op) => repaired.add(op.key))
    commit(fresh.reduce(change, state.snapshot))
    return true
  }

  // --- sync ---

  function ack(ops: Op[]) {
    for (const op of ops) attempts.delete(opIdOf(op))
    commit({ ...state.snapshot, outbox: acknowledge(state.snapshot.outbox, ops) })
  }

  function setAside(ops: Op[], message: string) {
    console.warn('The server refused a change; it is kept aside', ops, message)
    for (const op of ops) attempts.delete(opIdOf(op))
    commit(reject(state.snapshot, ops, message, now().toISOString()))
  }

  async function send(r: Remote, step: FlushStep, ops: Op[]): Promise<RemoteResult> {
    if (step.kind === 'delete') return r.remove(step.table, ops.map((o) => o.key))
    return r.upsert(step.table, ops.map((o) => (o as Extract<Op, { kind: 'upsert' }>).value) as never[])
  }

  async function run(r: Remote): Promise<'done' | 'account-changed'> {
    if (!isOnline()) {
      set({ sync: 'offline', hydrated: !switching })
      return 'done'
    }
    set({ sync: 'syncing' })
    const mine = epoch
    /** Stop if a reset happened while waiting on the server. */
    const current = () => {
      if (epoch !== mine) throw new AccountChanged()
    }
    try {
      const before = state.snapshot.userId
      // Read the snapshot after the await: changes made while signing in must not be lost.
      const userId = await r.session()
      current()
      if (claimDrops(state.snapshot, userId)) backUp(state.snapshot)
      commit(claim(state.snapshot, userId))
      // Signed in to another account: its home is on the way, so don't offer an empty one meanwhile.
      if (before !== null && before !== state.snapshot.userId) {
        switching = true
        set({ hydrated: false })
      }

      /** Stop if the account changed since the claim, so its rows never go out under another account's token. */
      const stillMe = async () => {
        const signedIn = r.currentUser ? await r.currentUser() : await r.session()
        current()
        if (signedIn !== userId || state.snapshot.userId !== userId) throw new AccountChanged()
      }

      for (const step of planFlush(state.snapshot.outbox)) {
        await stillMe()
        const res = await send(r, step, step.ops)
        current()
        if (res.ok) {
          ack(step.ops)
          continue
        }
        if (kindOf(res) === 'outage') throw new Error(res.message)
        // The server refused the batch. Send rows one at a time so one bad row
        // can't block the rest: refused rows are set aside, never dropped.
        let blocked: string | null = null
        for (const op of step.ops) {
          let one: RemoteResult = res
          if (step.ops.length > 1) {
            await stillMe()
            one = await send(r, step, [op])
            current()
          }
          if (one.ok) {
            ack([op])
            continue
          }
          const kind = kindOf(one)
          if (kind === 'outage') throw new Error(one.message)
          if (kind === 'permanent') {
            setAside([op], one.message)
            continue
          }
          if (kind === 'stuck') {
            const tries = (attempts.get(opIdOf(op)) ?? 0) + 1
            attempts.set(opIdOf(op), tries)
            if (tries >= MAX_ATTEMPTS) {
              setAside([op], one.message)
              continue
            }
          }
          // 'schema' (the database is behind this app) or a 'stuck' row with tries left: keep it queued.
          blocked = one.message
        }
        // Later steps may need these rows (foreign keys), so stop here and retry later.
        if (blocked !== null) throw new Error(blocked)
      }

      await stillMe()
      const server = await r.pull()
      await stillMe() // the pull went out under this account too
      commit({ ...state.snapshot, tables: rebase(server, state.snapshot.outbox), pulledAt: now().toISOString() })
      switching = false
      failures = 0
      set({ sync: 'synced', lastError: null, hydrated: true })
      // Now that the server's copy is in, recreate a missing progress row and send it.
      if (repair()) again = true
      return 'done'
    } catch (e) {
      if (e instanceof AccountChanged || epoch !== mine) return 'account-changed'
      failures++
      // Offline or failing: carry on with what this device has, unless it just
      // signed in to an account whose home hasn't arrived yet (keep waiting for that).
      const offline = !isOnline()
      set({ sync: offline ? 'offline' : 'error', lastError: e instanceof Error ? e.message : String(e), hydrated: !switching })
      if (!offline) scheduleRetry()
      return 'done'
    }
  }

  function clearRetry() {
    if (retryTimer !== null) clearTimeout(retryTimer)
    retryTimer = null
  }

  function scheduleRetry() {
    if (!backoff) return
    clearRetry()
    const delay = Math.min(backoff.baseMs * 2 ** Math.max(0, failures - 1), backoff.maxMs)
    retryTimer = setTimeout(() => {
      retryTimer = null
      void sync()
    }, delay)
  }

  let inflight: Promise<void> | null = null
  let again = false
  // Bumped by reset. A sync that started before it (say, one stuck on a hung
  // request) is left behind and must never touch the fresh home.
  let epoch = 0

  function sync(): Promise<void> {
    if (!remote) return load()
    if (paused > 0) {
      wanted = true
      return Promise.resolve()
    }
    if (inflight) {
      again = true
      return inflight
    }
    clearRetry()
    const started = epoch
    const job: Promise<void> = (async () => {
      await load()
      let switches = 0
      do {
        // Left behind by a reset: the fresh home syncs on its own.
        if (epoch !== started) break
        again = false
        if (paused > 0) {
          wanted = true
          break
        }
        // A changed account restarts the sync so the new one is claimed; a few times at most.
        if ((await run(remote)) === 'account-changed') {
          if (++switches < 3) again = true
          else set({ sync: 'error', lastError: 'The account changed while syncing' })
        }
      } while (again)
    })().finally(() => {
      if (inflight === job) inflight = null
    })
    inflight = job
    return job
  }

  function pause(): () => void {
    paused++
    let resumed = false
    return () => {
      if (resumed) return
      resumed = true
      paused--
      if (paused === 0 && wanted) {
        wanted = false
        void sync()
      }
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async start() {
      await load()
      void sync()
    },
    apply(...ops) {
      if (!state.ready) {
        early.push(...ops)
        void load()
        return
      }
      commit(ops.reduce(change, state.snapshot))
      void sync()
    },
    sync,
    async reset({ backup = true } = {}) {
      const resume = pause()
      try {
        // A sync under way gets a moment to finish; one stuck on a hung request is left behind.
        if (inflight) await Promise.race([inflight, new Promise((r) => setTimeout(r, resetWaitMs))])
        epoch++
        inflight = null
        await load()
        clearRetry()
        attempts.clear()
        failures = 0
        switching = false
        const owner = state.snapshot.userId
        if (backup) backUp(state.snapshot)
        else if (owner && local.dropBackup && !memoryOnly) {
          const drop = local.dropBackup.bind(local)
          saving = saving.then(() => drop(owner)).catch(warn('Could not remove the backup'))
        }
        const fresh = emptySnapshot()
        set({ snapshot: fresh, sync: remote ? 'offline' : 'local-only', lastError: null, hydrated: !remote })
        if (!memoryOnly) {
          // Replace, don't merge: the old account's rows must not come back.
          saving = saving
            .then(async () => {
              await local.save(fresh)
              base = fresh
              channel?.post({ type: 'reset', from: tabId })
            })
            .catch(warn('Could not clear the offline copy'))
          await saving
        }
      } finally {
        resume()
      }
    },
    pause,
    retryRejected() {
      if (!state.snapshot.rejected?.length) return
      commit(requeueRejected(state.snapshot))
      void sync()
    },
    dismissRejected() {
      if (!state.snapshot.rejected?.length) return
      commit({ ...state.snapshot, rejected: [] })
    },
    async savedHomes() {
      if (memoryOnly || !local.listBackups) return []
      const backups = await local.listBackups().catch(() => [])
      return backups.flatMap(({ ownerId, snapshot }) => savedHomeOf(ownerId, snapshot) ?? [])
    },
    async restoreSaved(ownerId) {
      if (memoryOnly || !local.listBackups || !local.backup) return false
      await load()
      const saved = (await local.listBackups()).find((b) => b.ownerId === ownerId)?.snapshot
      if (!saved) return false
      const ops = restoreHome(saved, state.snapshot)
      if (ops.length === 0) return false
      // Keep the home being replaced on this device, so it can be swapped back. Its own
      // key (account and home), so it can never overwrite the copy being brought back.
      const replaced = selectHome(state.snapshot.tables).home
      if (replaced) await local.backup(`${state.snapshot.userId ?? 'unclaimed'}:${replaced.id}`, state.snapshot)
      commit(ops.reduce(change, state.snapshot))
      // Forget the brought-back copy only once the restored home is really stored.
      await saving
      if (state.savedLocally) await local.dropBackup?.(ownerId)
      void sync()
      return true
    },
  }
}
