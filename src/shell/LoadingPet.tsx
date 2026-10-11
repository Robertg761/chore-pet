import type { ReactNode } from 'react'
import { SPECIES_COLOUR } from '../art/palette'
import { Character } from '../character/Character'
import './LoadingPet.css'

export interface LoadingPetProps {
  /** Short, kind line under the pet. Leave out to show just the pet. */
  message?: string
  /** True while we're still waiting; false once we've stopped and are offering a way forward. */
  busy?: boolean
  /** The pet looks a little calmer when something went wrong. */
  trouble?: boolean
  /** Extra controls under the message, like a "Try again" button. */
  children?: ReactNode
}

/** The default pet, bobbing gently while the app wakes up or fetches a saved home. */
export function LoadingPet({ message, busy = true, trouble = false, children }: LoadingPetProps) {
  return (
    <main className="shell loading-pet" aria-busy={busy}>
      <div className="loading-pet-stage" aria-hidden="true">
        <div className="loading-pet-bob">
          <Character species="mochi" mood={trouble ? 'content' : 'happy'} bodyColour={SPECIES_COLOUR.mochi} size={120} />
        </div>
        <span className="loading-pet-shadow" />
      </div>
      {message && (
        <p className="loading-pet-text" role="status">
          {message}
        </p>
      )}
      {children}
    </main>
  )
}
