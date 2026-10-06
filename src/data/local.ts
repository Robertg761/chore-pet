import type { Snapshot } from './state'

/** Where the offline copy lives between visits. */
export interface LocalStore {
  load(): Promise<Snapshot | null>
  save(snapshot: Snapshot): Promise<void>
}

const DB_NAME = 'chore-pet'
const STORE = 'kv'
const KEY = 'snapshot'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** The whole snapshot as one IndexedDB value. A home is small, so this stays fast. */
export function indexedDbStore(): LocalStore {
  let db: Promise<IDBDatabase> | null = null
  const getDb = () => (db ??= open())
  return {
    async load() {
      const d = await getDb()
      return new Promise((resolve, reject) => {
        const req = d.transaction(STORE).objectStore(STORE).get(KEY)
        req.onsuccess = () => resolve((req.result as Snapshot | undefined) ?? null)
        req.onerror = () => reject(req.error)
      })
    },
    async save(snapshot) {
      const d = await getDb()
      return new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(snapshot, KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
  }
}

/** For tests, and browsers where IndexedDB is unavailable (some private modes). */
export function memoryStore(initial: Snapshot | null = null): LocalStore & { current: Snapshot | null } {
  return {
    current: initial,
    async load() {
      return this.current
    },
    async save(snapshot) {
      this.current = structuredClone(snapshot)
    },
  }
}
