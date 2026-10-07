import { createContext, useContext, useEffect, useState } from 'react'
import type { Chore, PlacedObject } from '../domain/types'
import { formFromChore, type ChoreFormState } from './choreForm'

/** Archived rows remain in history after the retained-history migration. */
export function editableChore(chore: Chore): boolean {
  return !(chore as Chore & { archivedOn?: string | null }).archivedOn
}

type Drafts = Record<string, ChoreFormState>
interface DraftStore {
  forms: Drafts
  put: (key: string, form: ChoreFormState) => void
  clear: (key: string) => void
}
export const ChoreDraftContext = createContext<DraftStore | null>(null)

/** Drafts never reach shared storage. Switching account or home forgets this UI session. */
export function useChoreDrafts(scope: string, chores: Chore[], objects: PlacedObject[]): DraftStore {
  const [state, setState] = useState<{ scope: string; forms: Drafts }>({ scope, forms: {} })
  const valid = (key: string) => key.startsWith('chore:')
    ? chores.some((c) => c.id === key.slice(6) && editableChore(c))
    : key.startsWith('object:') ? objects.some((o) => o.id === key.slice(7)) : true
  const forms = state.scope === scope ? state.forms : {}
  if (state.scope !== scope || Object.keys(forms).some((key) => !valid(key))) {
    setState({ scope, forms: Object.fromEntries(Object.entries(forms).filter(([key]) => valid(key))) })
  }
  const dirty = Object.keys(forms).length > 0
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  return {
    forms,
    put: (key, form) => setState((current) => ({ scope, forms: { ...(current.scope === scope ? current.forms : {}), [key]: form } })),
    clear: (key) => setState((current) => {
      const { [key]: _removed, ...remaining } = current.scope === scope ? current.forms : {}
      return { scope, forms: remaining }
    }),
  }
}

/** Standalone editors still work without an app draft provider. */
export function useChoreDraft(chore?: Chore, newKey = 'new') {
  const store = useContext(ChoreDraftContext)
  const [local, setLocal] = useState(() => formFromChore(chore))
  const key = chore ? `chore:${chore.id}` : newKey
  const form = store ? store.forms[key] ?? formFromChore(chore) : local
  return {
    form,
    patch(patch: Partial<ChoreFormState>) {
      const next = { ...form, ...patch }
      if (store) store.put(key, next)
      else setLocal(next)
    },
    clear() { store?.clear(key) },
  }
}
