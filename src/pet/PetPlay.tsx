import { useId, useState } from 'react'
import type { PlayerGesture } from './behaviour'
import type { PlayerResponseResult } from './LivingRoom'
import './PetPlay.css'

export interface PetPlayProps {
  petName: string
  blocked?: 'travel' | 'away' | 'sick'
  onReact: (action: PlayerGesture) => PlayerResponseResult
}

/** Optional player time, after the chores. The resident owns all motion/speech. */
export function PetPlay({ petName, blocked, onReact }: PetPlayProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<PlayerResponseResult | null>(null)
  const note = blocked === 'travel' ? `${petName} is on the way.`
    : blocked === 'away' ? `${petName} is resting while you're away.`
    : blocked === 'sick' ? `${petName} is resting today.` : ''
  const feedback = result === 'busy' ? `${petName} is busy for a moment. Try again shortly.`
    : result === 'resting' ? `${petName} is resting. Try again later.`
    : result === 'unavailable' ? `Try again when ${petName} arrives.` : ''
  const choose = (action: PlayerGesture) => {
    if (!blocked) setResult(onReact(action))
  }
  return <div className="pet-play">
    <button type="button" className="btn btn-quiet pet-play-toggle" aria-expanded={open} aria-controls={`${id}-panel`}
      onClick={() => setOpen(value => !value)}>Spend time together</button>
    <div id={`${id}-panel`} className="pet-play-panel" hidden={!open}>
      <div className="pet-play-actions" role="group" aria-label={`Time with ${petName}`}>
        <button type="button" className="btn" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('greet')}>Wave</button>
        <button type="button" className="btn" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('affection')}>Gentle pats</button>
        <button type="button" className="btn" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('hop')}>Happy hop</button>
        <button type="button" className="btn" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('stretch')}>Stretch together</button>
      </div>
      {note && <p id={`${id}-note`} className="pet-play-note">{note}</p>}
      {/* The resident announces successful choices; only unavailable/busy needs another status. */}
      <p className="pet-play-feedback" role="status">{blocked ? '' : feedback}</p>
    </div>
  </div>
}
