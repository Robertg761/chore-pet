import { createContext, useContext } from 'react'

// The character's outline multiplier, provided by `CharacterArt` (its `strokeScale` prop).
// Read it through `useStrokeScale`, or let `Ink` and `Tube` (ink.tsx) apply it.

export const StrokeScaleContext = createContext(1)

/** The current outline multiplier (1 unless `CharacterArt` was given `strokeScale`). */
export const useStrokeScale = () => useContext(StrokeScaleContext)
