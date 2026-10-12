/** Device-local opt-in; the system preference remains authoritative. */
export const PET_MOTION_PREFERENCE_KEY = 'chore-pet-reduce-motion'

let loaded = false
let reduced = false
let unsavedChoice = false
const listeners = new Set<() => void>()
let eventTarget: Window | null = null

export function petMotionReduced(): boolean {
  if (typeof window === 'undefined') return false
  // No listener runs between consumers. Refresh then, while retaining a visit
  // choice that could not be saved over an older readable storage value.
  if (!loaded || (listeners.size === 0 && !unsavedChoice)) {
    loaded = true
    try { reduced = window.localStorage.getItem(PET_MOTION_PREFERENCE_KEY) === 'on' }
    catch { /* Storage may be unavailable; keep the visit's in-memory choice. */ }
  }
  return reduced
}

function update(value: boolean, persist: boolean): void {
  loaded = true
  if (!persist) unsavedChoice = false
  if (value === reduced) return
  reduced = value
  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PET_MOTION_PREFERENCE_KEY, value ? 'on' : 'off')
      unsavedChoice = false
    } catch { unsavedChoice = true }
  }
  // A subscriber can unmount while reacting to the preference change.
  for (const listener of [...listeners]) if (listeners.has(listener)) listener()
}

export function setPetMotionReduced(value: boolean): void {
  petMotionReduced()
  update(value, true)
}

function onStorage(event: StorageEvent): void {
  if (!eventTarget || (event.key !== PET_MOTION_PREFERENCE_KEY && event.key !== null)) return
  try {
    if (event.storageArea && event.storageArea !== eventTarget.localStorage) return
  } catch { return }
  update(event.key !== null && event.newValue === 'on', false)
}

export function subscribePetMotionPreference(listener: () => void): () => void {
  petMotionReduced()
  if (listeners.size === 0 && typeof window !== 'undefined') {
    eventTarget = window
    eventTarget.addEventListener('storage', onStorage)
  }
  // Each subscription owns its cleanup, even if callbacks happen to match.
  const notify = () => listener()
  listeners.add(notify)
  let active = true
  return () => {
    if (!active) return
    active = false
    listeners.delete(notify)
    if (listeners.size === 0 && eventTarget) {
      eventTarget.removeEventListener('storage', onStorage)
      eventTarget = null
    }
  }
}
