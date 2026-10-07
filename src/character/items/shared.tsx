import type { ReactNode } from 'react'
import type { Species } from '../../domain/types'

// Shared helpers for wearable items. Items are drawn centred on (0,0) at
// roughly 100% scale of a 200x200 character and must look right on every pose
// of every species (check /?art, "Fit check").
// Anchors (see ../slots.ts): neck sits on the upper belly, face between the
// eyes (eyes at x = +/-20), head on top of the body, back behind the body.

export type Fit = { species: Species }

// Every item is drawn inside an <Ink> group (../ink.tsx), the shared outline: it follows the
// character's `strokeScale`. Use <Tube> (also ../ink.tsx) for outlined straps and twigs.

/** Draws `children` and a mirrored copy, so the item is symmetrical. */
export function pair(children: ReactNode) {
  return (
    <>
      {children}
      <g transform="scale(-1 1)">{children}</g>
    </>
  )
}
