import { useEffect, useState, type RefObject } from 'react'

/** Pause only completely clipped residents. Unsupported observation stays live. */
export function usePetVisibility(nodeRef: RefObject<Element | null>): boolean {
  const [observation, setObservation] = useState(() => ({ source: nodeRef, visible: true }))
  useEffect(() => {
    const node = nodeRef.current
    if (!node || typeof IntersectionObserver !== 'function') return
    let alive = true
    const observer = new IntersectionObserver(entries => {
      if (!alive) return
      for (const entry of entries) {
        if (entry.target !== node) continue
        // Default threshold [0] may deliver edge contact at ratio 0 without
        // another entry when positive area appears. Keep that edge active.
        const visible = entry.isIntersecting
        setObservation(previous => previous.source === nodeRef && previous.visible === visible
          ? previous : { source: nodeRef, visible })
      }
    })
    observer.observe(node)
    return () => { alive = false; observer.disconnect() }
  }, [nodeRef])
  return observation.source === nodeRef ? observation.visible : true
}
