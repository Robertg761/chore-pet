import { useImperativeHandle, useState, type RefObject } from 'react'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { ACTION_MS, sampleMotion } from '../character/motion'
import type { Pet } from '../domain/types'
import { usePetMotion } from '../pet/usePetMotion'
import type { CreatorDraft } from './creatorModel'

export interface CreatorPreviewControl { cheer: () => void; settle: () => void }

/** Keep finite character frames out of the creator's choice grids and form. */
export function CreatorPreview({ draft, equipped, label, control }: {
  draft: CreatorDraft; equipped: Pet['equipped']; label: string
  control: RefObject<CreatorPreviewControl | null>
}) {
  const [start, setStart] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const { reducedMotion } = usePetMotion((now, reduced) => {
    if (start === null) return
    const time = Math.max(0, now - start)
    if (reduced || time >= ACTION_MS.celebrate) setStart(null)
    else setElapsed(time)
  }, start !== null, reduced => { if (reduced) setStart(null) })
  useImperativeHandle(control, () => ({
    cheer: () => {
      if (reducedMotion || start !== null) return
      setElapsed(0)
      setStart(performance.now())
    },
    settle: () => setStart(null),
  }), [reducedMotion, start])
  const active = start !== null && !reducedMotion
  const frame = sampleMotion({ species: draft.species, mood: 'happy', action: active ? 'celebrate' : 'idle',
    elapsedMs: active ? elapsed : 0, durationMs: active ? ACTION_MS.celebrate : ACTION_MS.idle,
    distance: 0, reducedMotion: reducedMotion || !active })
  return <div className="cc-preview">
    <svg width={170} height={170} viewBox="0 0 200 200" role="img" aria-label={label}>
      <AnimatedCharacterArt species={draft.species} mood="happy" bodyColour={draft.bodyColour} equipped={equipped}
        look={{ eyes: draft.eyes, cheeks: draft.cheeks }} frame={frame} />
    </svg>
  </div>
}
