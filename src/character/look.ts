import { createContext } from 'react'
import type { CheekStyle, EyeStyle } from '../domain/types'

/** The pet's face options. Read by the shared Face and Cheeks, so every pose follows them. */
export interface Look {
  eyes: EyeStyle
  cheeks: CheekStyle
}

export const DEFAULT_LOOK: Look = { eyes: 'classic', cheeks: 'round' }

export const LookContext = createContext<Look>(DEFAULT_LOOK)
