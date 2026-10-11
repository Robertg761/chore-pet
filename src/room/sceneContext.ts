import { createContext } from 'react'
import type { RoomDoor } from './connections'

export interface SceneContextValue {
  scale: number
  bubbleContainer: HTMLElement | null
  doors?: RoomDoor[]
  focused?: boolean
  onDoor?: (roomId: string) => void
  doorLabel?: (roomId: string) => string
}

/** The home scene keeps speech and tap targets readable outside its scaled art. */
export const SceneContext = createContext<SceneContextValue | null>(null)
