import { useId, useState } from 'react'
import type { PlayerGesture } from './behaviour'
import type { PlayerResponseResult } from './LivingRoom'
import './PetPlay.css'

export interface PetPlayProps {
  petName: string
  blocked?: 'travel' | 'away' | 'sick'
  onReact: (action: PlayerGesture) => PlayerResponseResult
  onCheckIn?: () => PlayerResponseResult
  onShowRoom?: () => boolean
  showRoomUnavailable?: string
}

/** Optional player time, after the chores. The resident owns all motion/speech. */
export function PetPlay({ petName, blocked, onReact, onCheckIn, onShowRoom, showRoomUnavailable }: PetPlayProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [response, setResponse] = useState<{ source: 'play' | 'check-in' | 'view'; result: PlayerResponseResult } | null>(null)
  const [previousMode, setPreviousMode] = useState(blocked)
  if (previousMode !== blocked) {
    setPreviousMode(blocked)
    setResponse(null)
  }
  const canCheckIn = (blocked === 'away' || blocked === 'sick') && Boolean(onCheckIn)
  const note = blocked === 'travel' ? `${petName} is on the way.`
    : blocked === 'away' ? `${petName} is resting while you're away.`
    : blocked === 'sick' ? `${petName} is resting today.` : ''
  const restingNote = canCheckIn ? `${note} Say a quiet hello.` : note
  const viewNote = showRoomUnavailable || (blocked === 'travel' ? note : '')
  const viewNoteId = `${id}-${viewNote === note ? 'note' : 'view-note'}`
  const result = response && (response.source === 'view'
    || (response.source === 'check-in' && canCheckIn)
    || (response.source === 'play' && !blocked)) ? response.result : null
  const feedback = result === 'busy' ? `${petName} is busy for a moment. Try again shortly.`
    : result === 'resting' ? `${petName} is resting. Try again later.`
    : result === 'unavailable' ? `Try again when ${petName} arrives.` : ''
  const choose = (action: PlayerGesture) => {
    if (!blocked) setResponse({ source: 'play', result: onReact(action) })
  }
  const checkIn = () => {
    if (canCheckIn && !viewNote && onCheckIn) setResponse({ source: 'check-in', result: onCheckIn() })
  }
  const showRoom = () => {
    if (!viewNote && onShowRoom) setResponse(onShowRoom() ? null : { source: 'view', result: 'unavailable' })
  }
  return <div className="pet-play">
    <div className="pet-play-heading">
      <button type="button" className="btn btn-quiet pet-play-toggle" aria-expanded={open} aria-controls={`${id}-panel`}
        onClick={() => setOpen(value => !value)}>Spend time together</button>
      {open && onShowRoom && <button type="button" className="btn btn-quiet pet-play-show" aria-label={`Show room with ${petName}`}
        disabled={Boolean(viewNote)} aria-describedby={viewNote ? viewNoteId : undefined}
        onClick={showRoom}>Show room</button>}
    </div>
    <div id={`${id}-panel`} className="pet-play-panel" hidden={!open}>
      <div className="pet-play-actions" role="group" aria-label={`Time with ${petName}`}>
        {canCheckIn ? <button type="button" className="btn pet-play-checkin" disabled={Boolean(viewNote)}
          aria-describedby={[`${id}-note`, viewNote && viewNote !== note ? viewNoteId : ''].filter(Boolean).join(' ')}
          onClick={checkIn}>Check in</button> : <>
        <button type="button" className="btn" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('greet')}>Wave</button>
        <button type="button" className="btn" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('affection')}>Gentle pats</button>
        <button type="button" className="btn" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('hop')}>Happy hop</button>
        <button type="button" className="btn" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('stretch')}>Stretch together</button>
        <button type="button" className="btn pet-play-rest" disabled={Boolean(blocked)} aria-describedby={note ? `${id}-note` : undefined}
          onClick={() => choose('rest')}>Rest together</button>
        </>}
      </div>
      {note && <p id={`${id}-note`} className="pet-play-note">{restingNote}</p>}
      {viewNote && viewNote !== note && <p id={viewNoteId} className="pet-play-note">{viewNote}</p>}
      {/* The resident announces successful choices; only unavailable/busy needs another status. */}
      <p className="pet-play-feedback" role="status">{feedback}</p>
    </div>
  </div>
}
