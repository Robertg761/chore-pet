import type { Snapshot } from './state'

/** Where the offline copy lives between visits. */
export interface LocalStore {
  load(): Promise<Snapshot | null>
  /** Replace the stored copy. */
  save(snapshot: Snapshot): Promise<void>
  /**
   * Read the stored copy and write what `fn` returns in one step, so another
   * tab's save can't land in between (null writes nothing). Stores without it
   * fall back to save().
   */
  update?(fn: (stored: Snapshot | null) => Snapshot | null): Promise<void>
  /** Keep a copy of a snapshot that is about to be dropped, under `snapshot-backup-<ownerId>`. */
  backup?(ownerId: string, snapshot: Snapshot): Promise<void>
  /**
   * Forget that backup (the account was deleted, or it was brought back). With
   * `keptBy`, only if the backup there is still the one that restore wrote.
   */
  dropBackup?(ownerId: string, keptBy?: string): Promise<void>
  /** Every backup kept on this device, by the account it came from. */
  listBackups?(): Promise<{ ownerId: string; snapshot: Snapshot }[]>
  /**
   * Start a restore, in one step: take the account's restore lock (`lock`) for
   * `token` and read the backup. Null when the backup is gone or another
   * restore (any tab) holds the lock, refreshed within `staleMs`.
   */
  claimBackup?(ownerId: string, lock: string, token: string, now: number, staleMs: number): Promise<Snapshot | null>
  /** Refresh the lock if `token` still holds it; false when another restore took it over. */
  holdLock?(lock: string, token: string, now: number): Promise<boolean>
  /** End a restore: let go of the lock, only if `token` still holds it. */
  releaseLock?(lock: string, token: string): Promise<void>
  /** False when nothing survives a reload (the in-memory fallback). Missing means true. */
  durable?: boolean
}

const DB_NAME = 'chore-pet'
const STORE = 'kv'
const KEY = 'snapshot'

const BACKUP_PREFIX = 'snapshot-backup-'

/** A restore's hold on its account's lock: who holds it, and when it last refreshed it. */
interface Lease {
  token: string
  at: number
}
export const backupKey = (ownerId: string) => `${BACKUP_PREFIX}${ownerId}`

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => {
      const db = req.result
      // A newer version of the app in another tab wants to upgrade: step aside.
      db.onversionchange = () => db.close()
      resolve(db)
    }
    req.onerror = () => reject(req.error)
    // Another tab holds an older version open and won't let go.
    req.onblocked = () => reject(new Error('The offline copy is blocked by another tab'))
  })
}

/** The whole snapshot as one IndexedDB value. A home is small, so this stays fast. */
export function indexedDbStore(): LocalStore {
  let db: Promise<IDBDatabase> | null = null
  const getDb = () => {
    db ??= open().catch((e: unknown) => {
      db = null // try again next time
      throw e
    })
    return db
  }
  /** Read the lease under `lock` and act on it, in one transaction. */
  async function onLease(lock: string, act: (current: Lease | undefined, store: IDBObjectStore) => boolean): Promise<boolean> {
    const d = await getDb()
    return new Promise((resolve, reject) => {
      let result = false
      const tx = d.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const req = store.get(lock)
      req.onsuccess = () => (result = act(req.result as Lease | undefined, store))
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error)
    })
  }
  async function put(key: string, value: Snapshot): Promise<void> {
    const d = await getDb()
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('Saving the offline copy was cancelled'))
    })
  }
  return {
    async load() {
      const d = await getDb()
      return new Promise((resolve, reject) => {
        const req = d.transaction(STORE).objectStore(STORE).get(KEY)
        req.onsuccess = () => resolve((req.result as Snapshot | undefined) ?? null)
        req.onerror = () => reject(req.error)
      })
    },
    save: (snapshot) => put(KEY, snapshot),
    async update(fn) {
      const d = await getDb()
      return new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        const req = store.get(KEY)
        req.onsuccess = () => {
          try {
            const next = fn((req.result as Snapshot | undefined) ?? null)
            if (next) store.put(next, KEY)
          } catch (e) {
            tx.abort()
            reject(e)
          }
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error ?? new Error('Saving the offline copy was cancelled'))
      })
    },
    backup: (ownerId, snapshot) => put(backupKey(ownerId), snapshot),
    async claimBackup(ownerId, lock, token, now, staleMs) {
      const d = await getDb()
      return new Promise((resolve, reject) => {
        let claimed: Snapshot | null = null
        const tx = d.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        const held = store.get(lock)
        held.onsuccess = () => {
          const current = held.result as Lease | undefined
          if (current && now - current.at < staleMs) return
          const req = store.get(backupKey(ownerId))
          req.onsuccess = () => {
            claimed = (req.result as Snapshot | undefined) ?? null
            if (claimed) store.put({ token, at: now } satisfies Lease, lock)
          }
        }
        tx.oncomplete = () => resolve(claimed)
        tx.onerror = () => reject(tx.error)
      })
    },
    holdLock: (lock, token, now) =>
      onLease(lock, (current, store) => {
        if (current?.token !== token) return false
        store.put({ token, at: now } satisfies Lease, lock)
        return true
      }),
    async releaseLock(lock, token) {
      await onLease(lock, (current, store) => {
        if (current?.token === token) store.delete(lock)
        return true
      })
    },
    async listBackups() {
      const d = await getDb()
      return new Promise((resolve, reject) => {
        const found: { ownerId: string; snapshot: Snapshot }[] = []
        const req = d.transaction(STORE).objectStore(STORE).openCursor()
        req.onsuccess = () => {
          const cursor = req.result
          if (!cursor) return resolve(found)
          const key = String(cursor.key)
          if (key.startsWith(BACKUP_PREFIX)) found.push({ ownerId: key.slice(BACKUP_PREFIX.length), snapshot: cursor.value as Snapshot })
          cursor.continue()
        }
        req.onerror = () => reject(req.error)
      })
    },
    async dropBackup(ownerId, keptBy) {
      const d = await getDb()
      return new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        if (keptBy === undefined) store.delete(backupKey(ownerId))
        else {
          const req = store.get(backupKey(ownerId))
          req.onsuccess = () => {
            if ((req.result as Snapshot | undefined)?.keptBy === keptBy) store.delete(backupKey(ownerId))
          }
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
  }
}

/** For tests (it stands in for IndexedDB, so it counts as durable). */
export function memoryStore(initial: Snapshot | null = null): LocalStore & { current: Snapshot | null; backups: Record<string, Snapshot>; locks: Record<string, Lease> } {
  const store = {
    current: initial,
    backups: {} as Record<string, Snapshot>,
    locks: {} as Record<string, Lease>,
    async load() {
      return store.current && structuredClone(store.current)
    },
    async save(snapshot: Snapshot) {
      store.current = structuredClone(snapshot)
    },
    async update(fn: (stored: Snapshot | null) => Snapshot | null) {
      const next = fn(store.current && structuredClone(store.current))
      if (next) store.current = structuredClone(next)
    },
    async backup(ownerId: string, snapshot: Snapshot) {
      store.backups[backupKey(ownerId)] = structuredClone(snapshot)
    },
    async dropBackup(ownerId: string, keptBy?: string) {
      if (keptBy === undefined || store.backups[backupKey(ownerId)]?.keptBy === keptBy) delete store.backups[backupKey(ownerId)]
    },
    async claimBackup(ownerId: string, lock: string, token: string, now: number, staleMs: number) {
      const current = store.locks[lock]
      if (current && now - current.at < staleMs) return null
      const found = store.backups[backupKey(ownerId)]
      if (!found) return null
      store.locks[lock] = { token, at: now }
      return structuredClone(found)
    },
    async holdLock(lock: string, token: string, now: number) {
      if (store.locks[lock]?.token !== token) return false
      store.locks[lock] = { token, at: now }
      return true
    },
    async releaseLock(lock: string, token: string) {
      if (store.locks[lock]?.token === token) delete store.locks[lock]
    },
    async listBackups() {
      return Object.entries(store.backups).map(([key, snapshot]) => ({ ownerId: key.slice(BACKUP_PREFIX.length), snapshot: structuredClone(snapshot) }))
    },
  }
  return store
}

/** For browsers where IndexedDB is unavailable (some private modes): works, but says it isn't saving. */
export function volatileStore(): LocalStore {
  return { ...memoryStore(), durable: false }
}
