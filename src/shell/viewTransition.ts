import { flushSync } from 'react-dom'

/** Which way a screen change moves: deeper into the app, back out of it, or neither; or a chore leaving the list. */
export type TransitionKind = 'forward' | 'back' | 'fade' | 'chores'

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

/**
 * Apply a state change as a short slide and fade between the old screen and
 * the new one (the View Transitions API), where the browser has it and the
 * player hasn't asked for less motion. Elsewhere the change is simply applied.
 * The kind is set on <html> as data-vt for the CSS in index.css.
 */
export function withViewTransition(update: () => void, kind: TransitionKind = 'fade') {
  const doc = document as ViewTransitionDocument
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduced || doc.visibilityState !== 'visible') {
    update()
    return
  }
  const root = doc.documentElement
  root.dataset.vt = kind
  const transition = doc.startViewTransition(() => flushSync(update))
  transition.finished
    .catch(() => {})
    .finally(() => {
      if (root.dataset.vt === kind) delete root.dataset.vt
    })
}
