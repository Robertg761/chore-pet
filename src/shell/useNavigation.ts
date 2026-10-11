import { useEffect, useState, useSyncExternalStore } from 'react'
import { createNavigation } from './navigation'

export function useNavigation(scope: string | null) {
  const [navigation] = useState(() => createNavigation(scope))
  useEffect(() => navigation.setScope(scope), [navigation, scope])
  const route = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot)
  return { route, navigation }
}
