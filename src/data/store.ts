import type { LocalStore } from './local'
import type { Remote, RemoteResult } from './remote'
import { acknowledge, change, claim, emptySnapshot, mergeQueuedProgress, planFlush, progressBaseOf, rebase, type NewOp, type Op, type Snapshot } from './state'

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
  /** False when the browser refuses to store the offline copy (storage blocked or full): changes then last only until reload. */
  savedLocally: boolean
  /**
   * False while this device has not yet heard from the server for the current
   * account (first launch, or just signed in somewhere new). An empty home is
   * only really empty once this is true, so onboarding waits for it.
   */
  hydrated: boolean
}

export interface Store {
  getState(): DataState
  subscribe(listener: () => void): () => void
  /** Load the local copy, then sync in the background. */
  start(): Promise<void>
  /** Apply changes locally (all at once), queue them, and kick off a sync. */
  apply(...ops: NewOp[]): void
  /** Push queued changes, then pull. Resolves when done; never throws. */
  sync(): Promise<void>
}

export interface StoreDeps {
  local: LocalStore
  remote: Remote | null
  isOnline?: () => boolean
}

export function createStore({ local, remote, isOnline = () => true }: StoreDeps): Store {
  let state: DataState = { ready: false, snapshot: emptySnapshot(), sync: remote ? 'offline' : 'local-only', lastError: null, savedLocally: true, hydrated: !remote }
  const listeners = new Set<() => void>()
  let saving: Promise<void> = Promise.resolve()

  function set(patch: Partial<DataState>) {
    state = { ...state, ...patch }
    listeners.forEach((l) => l())
  }

  function commit(snapshot: Snapshot) {
    set({ snapshot })
    saving = saving
      .then(() => local.save(snapshot))
      .then(
        () => {
          if (!state.savedLocally) set({ savedLocally: true })
        },
        (e) => {
          console.warn('Could not save the offline copy', e)
          set({ savedLocally: false })
        },
      )
  }

  function ack(ops: Op[]) {
    commit({ ...state.snapshot, outbox: acknowledge(state.snapshot.outbox, ops) })
  }

  async function send(r: Remote, step: ReturnType<typeof planFlush>[number], ops: Op[]): Promise<RemoteResult> {
    if (step.kind === 'delete') return r.remove(step.table, ops.map((o) => o.key))
    return r.upsert(step.table, ops.map((o) => (o as Extract<Op, { kind: 'upsert' }>).value) as never[])
  }

  async function run(r: Remote) {
    if (!isOnline()) return set({ sync: 'offline', hydrated: true })
    set({ sync: 'syncing' })
    try {
      const before = state.snapshot.userId
      commit(claim(state.snapshot, await r.session()))
      // Signed in to another account: its home is on the way, so don't offer an empty one meanwhile.
      if (before !== null && before !== state.snapshot.userId) set({ hydrated: false })

      // Another device may have moved progress on; merge before overwriting it.
      if (Object.values(state.snapshot.outbox).some((o) => o.table === 'progress' && o.kind === 'upsert')) {
        commit(mergeQueuedProgress(state.snapshot, (await r.pull()).progress))
      }

      for (const step of planFlush(state.snapshot.outbox)) {
        const res = await send(r, step, step.ops)
        if (res.ok) {
          ack(step.ops)
          continue
        }
        if (res.transient) throw new Error(res.message)
        // The server refused the batch. Send rows one at a time and drop only
        // the ones it refuses, so one bad row can't block everything else.
        for (const op of step.ops) {
          const one = await send(r, step, [op])
          if (!one.ok && one.transient) throw new Error(one.message)
          if (!one.ok) console.warn('Dropped a change the server refused', op, one.message)
          ack([op])
        }
      }

      const server = await r.pull()
      commit({ ...state.snapshot, tables: rebase(server, state.snapshot.outbox), progressBase: progressBaseOf(server.progress) })
      set({ sync: 'synced', lastError: null, hydrated: true })
    } catch (e) {
      // Offline or failing: let the player carry on with what this device has.
      set({ sync: isOnline() ? 'error' : 'offline', lastError: e instanceof Error ? e.message : String(e), hydrated: true })
    }
  }

  let inflight: Promise<void> | null = null
  let again = false

  function sync(): Promise<void> {
    if (!remote) return Promise.resolve()
    if (inflight) {
      again = true
      return inflight
    }
    inflight = (async () => {
      do {
        again = false
        await run(remote)
      } while (again)
    })().finally(() => {
      inflight = null
    })
    return inflight
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async start() {
      let savedLocally = true
      const loaded = await local.load().catch(() => ((savedLocally = false), null))
      set({ ready: true, snapshot: loaded ?? state.snapshot, savedLocally })
      void sync()
    },
    apply(...ops) {
      commit(ops.reduce(change, state.snapshot))
      void sync()
    },
    sync,
  }
}
