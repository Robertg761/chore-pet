import { useCallback, useEffect, useRef, useState } from 'react'
import { Character } from '../character/Character'
import { appStore } from '../data/appStore'
import type { SavedHome } from '../data/state'
import '../shell/controls.css'
import './SavedHomes.css'

/** Homes kept on this device (from a guest session or an earlier account), minus the one in use. */
function useSavedHomes(currentHomeId: string | null): [SavedHome[], () => void] {
  const [homes, setHomes] = useState<SavedHome[]>([])
  const refresh = useCallback(() => {
    void appStore.savedHomes().then(setHomes)
  }, [])
  // Read again whenever the home in use changes (say, after a swap).
  useEffect(refresh, [refresh, currentHomeId])
  // Filtered as drawn, so a read that lands late still hides the home in use.
  return [homes.filter((h) => h.homeId !== currentHomeId), refresh]
}

const possessive = (name: string) => `${name}’s`

/**
 * A way back to a home saved on this device. On the landing screen (no home
 * yet) it brings one straight back; in Settings it swaps, after asking, and
 * the home it replaces stays saved here so it can be swapped back.
 */
export function SavedHomes({ current, className = '' }: { current?: { homeId: string; petName: string }; className?: string }) {
  const [homes, refresh] = useSavedHomes(current?.homeId ?? null)
  const [asking, setAsking] = useState<SavedHome | null>(null)
  const [busy, setBusy] = useState(false)
  const swapRef = useRef<HTMLButtonElement>(null)
  // The question appears where the list was; bring its buttons into view and focus.
  useEffect(() => {
    if (!asking) return
    swapRef.current?.scrollIntoView({ block: 'nearest' })
    swapRef.current?.focus({ preventScroll: true })
  }, [asking])

  const bringBack = async (home: SavedHome) => {
    setBusy(true)
    await appStore.restoreSaved(home.ownerId)
    setBusy(false)
    setAsking(null)
    refresh()
  }

  if (homes.length === 0) return null

  if (!current) {
    return (
      <section className="saved-homes saved-homes-landing" aria-labelledby="saved-homes-title">
        <h2 id="saved-homes-title">Welcome back!</h2>
        <p className="saved-homes-note">A home is saved on this device.</p>
        <ul className="saved-homes-list">
          {homes.map((h) => (
            <li key={h.ownerId}>
              <span className="saved-homes-pet" aria-hidden="true">
                <Character species={h.species} mood="happy" bodyColour={h.bodyColour} size={44} />
              </span>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void bringBack(h)}>
                Bring back {possessive(h.petName)} home
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div className={`saved-homes ${className}`} role="group" aria-labelledby="saved-homes-title">
      <h2 id="saved-homes-title">Saved on this device</h2>
      {asking ? (
        <div className="saved-homes-confirm">
          <p>Swap to {possessive(asking.petName)} saved home? It replaces this home everywhere you’re signed in. This home stays saved here, so you can swap back.</p>
          <div className="saved-homes-pair">
            <button ref={swapRef} type="button" className="btn btn-primary" disabled={busy} onClick={() => void bringBack(asking)}>
              Swap homes
            </button>
            <button type="button" className="btn" onClick={() => setAsking(null)}>
              Keep this one
            </button>
          </div>
        </div>
      ) : (
        <ul className="saved-homes-list">
          {homes.map((h) => (
            <li key={h.ownerId}>
              <span className="saved-homes-pet" aria-hidden="true">
                <Character species={h.species} mood="happy" bodyColour={h.bodyColour} size={40} />
              </span>
              <span className="saved-homes-name">
                {possessive(h.petName)} home
                <span className="saved-homes-meta">{h.choreCount === 1 ? '1 chore' : `${h.choreCount} chores`}</span>
              </span>
              <button type="button" className="btn" onClick={() => setAsking(h)}>
                Bring back<span className="sr-only"> {possessive(h.petName)} home</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
