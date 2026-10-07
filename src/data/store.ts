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
  emptyTables,
  heldFor,
  HELD_FOR_NEXT,
  mergeSnapshots,
  opIdOf,
  planFlush,
  rebase,
  reject,
  selectHome,
  repairOps,
  requeueRejected,
  savedHomeOf,
  tableChanges,
  unapplied,
  withChanges,
  worthBackingUp,
  type FlushStep,
  type SavedHome,
  type NewOp,
  type Op,
  type Snapshot,
  type TableChanges,
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
   * backup goes too). With `forNext` (a guest signing out, who can't sign back
   * in), that copy is held for whoever uses this device next. Other tabs are
   * told to follow.
   */
  reset(options?: { backup?: boolean; forNext?: boolean }): Promise<void>
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
/** A restore's claim on a backup lapses after this, in case its tab closed mid-way. */
export const CLAIM_STALE_MS = 60_000

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

/** Whether `account` may be offered (and restore) this backup. */
function mayRestore(backup: Snapshot, account: string | null): boolean {
  const holder = heldFor(backup)
  return holder === account || holder === HELD_FOR_NEXT
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
  /** The reset this tab's data comes after (see Snapshot.generation). */
  let generation: string | undefined
  /** A reset is waiting to replace the stored copy. */
  let resetting = false
  /** Bumped by every reset, here or in another tab. */
  let resets = 0
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

  /** What goes into storage: the snapshot, marked with the reset it comes after. */
  const stamped = (snapshot: Snapshot): Snapshot => (generation === undefined ? snapshot : { ...snapshot, generation })

  /**
   * Inside a storage transaction: fold in another tab's save, then let `next`
   * choose what to write (null writes nothing). If another tab reset this
   * device meanwhile, follow it instead and write nothing: this tab's data
   * belongs to the account that was just cleared.
   */
  async function writeWith(next: (merged: Snapshot, stored: Snapshot | null) => Snapshot | null, lease?: { lock: string; token: string }): Promise<void> {
    let written: Snapshot | null = null
    if (local.update) {
      await local.update((stored) => {
        if (stored && stored.generation !== generation) {
          followReset(stored)
          return null
        }
        const merged = stored ? mergeSnapshots(state.snapshot, base, stored, 'mine') : state.snapshot
        if (merged !== state.snapshot) set({ snapshot: merged })
        written = next(merged, stored)
        return written && stamped(written)
      }, lease)
    } else {
      written = next(state.snapshot, null)
      if (written) await local.save(stamped(written))
    }
    if (!written) return
    // Only once it is really stored: a failed write must not count as the base.
    base = written
    channel?.post({ type: 'saved', from: tabId })
  }

  async function write() {
    writeQueued = false
    if (memoryOnly || resetting) return
    await writeWith((merged) => merged)
  }

  /** Queue a save, keeping savedLocally up to date. */
  function queueSave(step: () => Promise<void>): Promise<void> {
    saving = saving.then(step).then(
      () => {
        if (!state.savedLocally && durable) set({ savedLocally: true })
      },
      (e: unknown) => {
        console.warn('Could not save the offline copy', e)
        set({ savedLocally: false })
      },
    )
    return saving
  }

  /** Save the latest snapshot. Saves already queued pick up later changes too. */
  function persist() {
    if (memoryOnly || writeQueued) return
    writeQueued = true
    void queueSave(write)
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
        if (resetting) return
        const stored = await local.load()
        if (!stored) return
        if (message.type === 'reset' || stored.generation !== generation) {
          followReset(stored)
          return
        }
        const merged = mergeSnapshots(state.snapshot, base, stored, 'stored')
        base = stored
        if (merged !== state.snapshot) set({ snapshot: merged })
      })
      .catch(warn('Could not read the other tab’s changes'))
  }
  channel?.listen(absorb)

  /**
   * Another tab reset this device (signed out, deleted the account): take its
   * fresh copy whole. A restore under way here is cancelled (see `resets`).
   */
  function followReset(stored: Snapshot) {
    resets++
    switching = false
    generation = stored.generation
    base = stored
    // Don't sync from here: the other tab is still signing out, and a sync now
    // would pull the old account's home straight back. The sign-out reaches
    // this tab as an auth event, which syncs.
    set({ snapshot: stored, hydrated: !remote, lastError: null })
  }

  function backUp(snapshot: Snapshot) {
    if (memoryOnly || !local.backup || !worthBackingUp(snapshot)) return
    const backup = local.backup.bind(local)
    saving = saving.then(() => backup(snapshot.userId ?? 'unclaimed', snapshot)).catch(warn('Could not back up the offline copy'))
  }

  /** Hold the homes kept for whoever uses this device next for `account`, now that it is here. */
  function adoptBackups(account: string) {
    if (memoryOnly || !local.listBackups || !local.backup) return
    const list = local.listBackups.bind(local)
    const backup = local.backup.bind(local)
    saving = saving
      .then(async () => {
        for (const b of await list()) if (heldFor(b.snapshot) === HELD_FOR_NEXT) await backup(b.ownerId, { ...b.snapshot, heldFor: account })
      })
      .catch(warn('Could not hand the saved homes to this account'))
  }

  /** Forget every backup held for an account (its own copies and the homes it swapped out). */
  async function dropBackupsFor(account: string) {
    if (!local.dropBackup) return
    const all = local.listBackups ? await local.listBackups() : [{ ownerId: account, snapshot: emptySnapshot(account) }]
    for (const b of all) if (b.ownerId === account || heldFor(b.snapshot) === account) await local.dropBackup(b.ownerId)
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
      generation = loaded?.generation
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
      // The home being dropped is held for the account taking over this device.
      if (claimDrops(state.snapshot, userId)) backUp({ ...state.snapshot, heldFor: userId })
      // The first account on this device since a guest signed out takes over that guest's home.
      if (state.snapshot.userId === null) adoptBackups(userId)
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
    async reset({ backup = true, forNext = false } = {}) {
      const resume = pause()
      try {
        // A sync under way gets a moment to finish; one stuck on a hung request is left behind.
        if (inflight) await Promise.race([inflight, new Promise((r) => setTimeout(r, resetWaitMs))])
        epoch++
        resets++
        inflight = null
        await load()
        clearRetry()
        attempts.clear()
        failures = 0
        switching = false
        const owner = state.snapshot.userId
        if (backup) backUp(forNext ? { ...state.snapshot, heldFor: HELD_FOR_NEXT } : state.snapshot)
        set({ snapshot: emptySnapshot(), sync: remote ? 'offline' : 'local-only', lastError: null, hydrated: !remote })
        if (!memoryOnly) {
          // Saves and reads queued before this one belong to the old account: skip them.
          resetting = true
          // Replace, don't merge: the old account's rows must not come back.
          saving = saving
            .then(async () => {
              generation = crypto.randomUUID()
              const fresh = state.snapshot // empty, plus anything done since
              await local.save(stamped(fresh))
              base = fresh
              channel?.post({ type: 'reset', from: tabId })
            })
            .catch(warn('Could not clear the offline copy'))
            // The account's backups go only now: from here on, a restore in another tab can no
            // longer commit (its write sees this reset), and one that already did has written
            // its swapped-out copy, so this catches it.
            .then(() => (!backup && owner ? dropBackupsFor(owner) : undefined))
            .catch(warn('Could not remove the backups'))
            .finally(() => (resetting = false))
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
      await load()
      const backups = await local.listBackups().catch(() => [])
      const me = state.snapshot.userId
      // Only homes held for this account: never someone else's on a shared browser. A guest's
      // home kept at sign-out is offered to whoever comes next (until an account takes it over).
      return backups.flatMap(({ ownerId, snapshot }) => (mayRestore(snapshot, me) ? (savedHomeOf(ownerId, snapshot) ?? []) : []))
    },
    async restoreSaved(ownerId) {
      if (memoryOnly || !local.claimBackup || !local.backup) return false
      const backup = local.backup.bind(local)
      await load()
      // The account this restore is for: a sign-out, deletion or account switch meanwhile cancels it.
      const account = state.snapshot.userId
      const started = resets
      const stillHere = () => resets === started && state.snapshot.userId === account
      // One restore at a time for the account, across tabs: two at once would leave two homes.
      const lock = `restore-lock-${account ?? 'unclaimed'}`
      const token = crypto.randomUUID()
      const saved = await local.claimBackup(ownerId, lock, token, now().getTime(), CLAIM_STALE_MS)
      if (!saved) return false
      // No new syncs while the home is swapped, so the copy kept below is the one replaced.
      const resume = pause()
      let restored = false
      /** The swapped-out copy written by this restore, removed again if the restore doesn't happen. */
      let keptKey: string | null = null
      try {
        // A sync under way gets a moment to finish, so the home doesn't change under the swap.
        if (inflight) await Promise.race([inflight, new Promise((r) => setTimeout(r, resetWaitMs))])
        if (!stillHere() || !mayRestore(saved, account)) return false
        if (!selectHome(saved.tables).home) return false
        // Keep the home being replaced on this device, so it can be swapped back. Its own key
        // (account and home), so it never overwrites the copy being brought back. Each round
        // also checks the lock is still ours (a tab paused past its lifetime may have lost it).
        // If anything lands meanwhile (a sync under way, another tab's save), go again with
        // the newer copy, so the one replaced below is exactly the one kept.
        let done = false
        // Rows another tab changed, sent and saved, which reach this tab only with its next
        // pull: the swapped-out copy takes those changes too (added, edited or removed rows),
        // so the swap can't delete them unsaved, nor bring back what it removed.
        const theirs: TableChanges[] = []
        /** The stored copy those changes were last taken from. */
        let seen: string | null = null
        for (let tries = 0; tries < 3 && !done; tries++) {
          const before = state.snapshot
          const kept = theirs.reduce(withChanges, before.tables)
          const replaced = selectHome(kept).home
          if (replaced) {
            keptKey = `${account ?? 'unclaimed'}:${replaced.id}`
            await backup(keptKey, { ...before, tables: kept, heldFor: account, restoreToken: token })
          }
          if (local.holdLock && !(await local.holdLock(lock, token, now().getTime()))) return false
          if (!stillHere()) return false
          if (state.snapshot !== before) continue
          // The swap itself, in the storage transaction that reads the stored copy: it goes
          // ahead only if nothing new is there (another tab's save, or its reset, which this
          // tab then follows). Otherwise that is taken in, and the next round keeps it too.
          let failed = false
          let swapped: Snapshot | null = null
          /** The transaction found the lock still ours (and no reset elsewhere). */
          let checked = false
          await queueSave(() =>
            writeWith((merged, stored) => {
              checked = true
              // Changes in the stored copy, since this tab last saw it, that this tab doesn't have
              // (another tab sent them and hasn't pulled yet, so no merge brings them in): keep
              // them, then go round again.
              const storedTables = stored && JSON.stringify(stored.tables)
              if (stored && storedTables !== seen) {
                const missed = unapplied(tableChanges(base?.tables ?? emptyTables(), stored.tables), merged.tables)
                seen = storedTables
                if (missed.put.length || missed.removed.length) {
                  theirs.push(missed)
                  return merged !== before ? merged : null
                }
              }
              if (merged !== before || !stillHere()) return merged
              swapped = restoreHome(saved, before).reduce(change, before)
              set({ snapshot: swapped })
              return swapped
            }, { lock, token }).catch((e: unknown) => {
              failed = true
              throw e
            }),
          )
          if (failed) {
            // The swap was never stored (the write failed as the transaction ended): put the
            // home on screen back to the one storage still holds.
            if (swapped && state.snapshot === swapped) set({ snapshot: before })
            return false
          }
          if (swapped) done = true
          // Lost the lock while waiting to be saved (another restore took over), or reset elsewhere.
          else if (!checked || !stillHere()) return false
        }
        if (!done) return false
        // The restored home is stored: the swap has happened, whatever comes next.
        restored = true
        // Forget the brought-back copy (only if it is still the one claimed: another tab may have
        // written a newer backup there since). If that fails it is only offered again.
        await local.dropBackup?.(ownerId, token)?.catch(warn('Could not forget the brought-back copy'))
        return true
      } finally {
        // Not restored (cancelled by a sign-out or account deletion, say): the home being
        // replaced is still here, so its swapped-out copy goes, and nothing outlives a deletion.
        // Only the copy this restore wrote: another restore, after this one's lock lapsed, may
        // have written its own under the same key.
        if (!restored && keptKey) await local.dropBackup?.(keptKey, token)?.catch(warn('Could not remove the swapped-out copy'))
        await local.releaseLock?.(lock, token).catch(warn('Could not release the restore lock'))
        resume()
        if (restored) void sync()
      }
    },
  }
}
