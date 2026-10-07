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
  /** Forget that backup (the account was deleted). */
  dropBackup?(ownerId: string): Promise<void>
  /** False when nothing survives a reload (the in-memory fallback). Missing means true. */
  durable?: boolean
}

const DB_NAME = 'chore-pet'
const STORE = 'kv'
const KEY = 'snapshot'

export const backupKey = (ownerId: string) => `snapshot-backup-${ownerId}`

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
    async dropBackup(ownerId) {
      const d = await getDb()
      return new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(backupKey(ownerId))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
  }
}

/** For tests (it stands in for IndexedDB, so it counts as durable). */
export function memoryStore(initial: Snapshot | null = null): LocalStore & { current: Snapshot | null; backups: Record<string, Snapshot> } {
  const store = {
    current: initial,
    backups: {} as Record<string, Snapshot>,
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
    async dropBackup(ownerId: string) {
      delete store.backups[backupKey(ownerId)]
    },
  }
  return store
}

/** For browsers where IndexedDB is unavailable (some private modes): works, but says it isn't saving. */
export function volatileStore(): LocalStore {
  return { ...memoryStore(), durable: false }
}
