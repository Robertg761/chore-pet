import { useEffect, useRef, useState } from 'react'
import { setSoundOn, soundOn } from '../audio/sfx'
import { ReminderSettings } from '../reminders/ReminderSettings'
import { ScreenHeader } from '../shell/ScreenHeader'
import { AccountSection } from './AccountSection'
import { SavedHomes } from './SavedHomes'
import './SettingsScreen.css'

// Settings: sound, reminders, and saving progress to an account.

export interface SettingsScreenProps {
  petName: string
  /** The home in use, so homes saved on this device can be offered as a swap. */
  homeId?: string
  onClose: () => void
  /** Replaces the account section (sign in to keep progress on every device). */
  account?: React.ReactNode
  /** Erases this home (room, chores, pet, rewards) so a new one can be built. Asks first. */
  onStartOver?: () => void
  /** Clears the room and chores, keeping the pet and rewards. Offered alongside onStartOver. */
  onClearRoom?: () => void
  /** Other homes in this account, which Erase everything leaves alone (it opens one of them next). */
  otherHomes?: number
}

const PRIVACY_URL = 'https://github.com/Robertg761/chore-pet/blob/main/docs/PRIVACY.md'

export function SettingsScreen({ petName, homeId, onClose, account, onStartOver, onClearRoom, otherHomes = 0 }: SettingsScreenProps) {
  const [sound, setSound] = useState(soundOn)
  // Start over asks twice: which kind of fresh start, then whether to go ahead.
  const [startOver, setStartOver] = useState<null | 'choose' | 'clear' | 'erase'>(null)
  const startOverRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const asked = useRef(false)
  // Focus follows the question in and back out, so keyboard users stay in place.
  // It lands on the safe choice, so a stray Enter never clears anything.
  useEffect(() => {
    if (startOver) cancelRef.current?.focus()
    else if (asked.current) startOverRef.current?.focus()
    asked.current = Boolean(startOver)
  }, [startOver])
  return (
    <section className="settings screen-fit" aria-labelledby="settings-title">
      <ScreenHeader id="settings-title" title="Settings" onBack={onClose} />

      <div className="settings-cols">
        <div className="settings-col">
          <div className="settings-card">
            <label className="settings-toggle">
              <input
                type="checkbox"
                className="check"
                checked={sound}
                onChange={(e) => {
                  setSound(e.target.checked)
                  setSoundOn(e.target.checked)
                }}
              />
              <span>Sounds</span>
            </label>
          </div>

          <div className="settings-card">
            <h2>Reminders</h2>
            <ReminderSettings petName={petName} />
          </div>
        </div>

        <div className="settings-col">
          <div className="settings-card">{account ?? <AccountSection />}</div>
          {homeId && <SavedHomes current={{ homeId, petName }} className="settings-card" />}
          {onStartOver && onClearRoom && (
            <div className="settings-card">
              <h2>Start over</h2>
              {startOver === 'choose' ? (
                <div className="confirm" role="group" aria-label="Start over">
                  <p>How fresh a start?</p>
                  <div className="settings-choice">
                    <button type="button" className="btn btn-danger" onClick={() => setStartOver('clear')}>
                      Clear room and chores
                    </button>
                    <span className="settings-choice-note">For a move or a new set of chores. {petName}, outfits and rewards stay.</span>
                  </div>
                  <div className="settings-choice">
                    <button type="button" className="btn btn-danger" onClick={() => setStartOver('erase')}>
                      Erase everything
                    </button>
                    <span className="settings-choice-note">{petName}, the room, chores and rewards all go.</span>
                  </div>
                  <button ref={cancelRef} type="button" className="btn" onClick={() => setStartOver(null)}>
                    Keep my home
                  </button>
                </div>
              ) : startOver ? (
                <div className="confirm" role="group" aria-label={startOver === 'clear' ? 'Clear room and chores' : 'Erase everything'}>
                  <p>
                    {startOver === 'clear'
                      ? 'Clear the room and every chore? Your past work stays, and removed chores can be added back from Chores.'
                      : `Erase ${petName}’s home for good? This can’t be undone.${otherHomes === 1 ? ' Your other home stays.' : otherHomes > 1 ? ` Your ${otherHomes} other homes stay.` : ''}`}
                  </p>
                  <div className="confirm-actions">
                    <button type="button" className="btn btn-danger" onClick={startOver === 'clear' ? onClearRoom : onStartOver}>
                      {startOver === 'clear' ? 'Clear' : 'Erase'}
                    </button>
                    <button ref={cancelRef} type="button" className="btn" onClick={() => setStartOver('choose')}>
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="settings-note">Moved, or want all new chores? Clear the room and chores, or erase everything.</p>
                  <button ref={startOverRef} type="button" className="btn btn-danger" onClick={() => setStartOver('choose')}>
                    Start over
                  </button>
                </>
              )}
            </div>
          )}
          <p className="settings-foot">
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
              How your data is kept<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
