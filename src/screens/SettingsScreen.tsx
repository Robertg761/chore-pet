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
}

const PRIVACY_URL = 'https://github.com/Robertg761/chore-pet/blob/main/docs/PRIVACY.md'

export function SettingsScreen({ petName, homeId, onClose, account, onStartOver, onClearRoom }: SettingsScreenProps) {
  const [sound, setSound] = useState(soundOn)
  const [askingStartOver, setAskingStartOver] = useState(false)
  const startOverRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const asked = useRef(false)
  // Focus follows the question in and back out, so keyboard users stay in place.
  useEffect(() => {
    if (askingStartOver) cancelRef.current?.focus()
    else if (asked.current) startOverRef.current?.focus()
    asked.current = askingStartOver
  }, [askingStartOver])
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
              {askingStartOver ? (
                <div className="settings-confirm" role="group" aria-label="Start over">
                  <p>How fresh a start?</p>
                  <div className="settings-choice">
                    <button type="button" className="btn btn-danger" onClick={onClearRoom}>
                      Clear room and chores
                    </button>
                    <span className="settings-choice-note">For a move or a new set of chores. {petName}, outfits and rewards stay.</span>
                  </div>
                  <div className="settings-choice">
                    <button type="button" className="btn btn-danger" onClick={onStartOver}>
                      Erase everything
                    </button>
                    <span className="settings-choice-note">{petName}, the room, chores and rewards all go. Can’t be undone.</span>
                  </div>
                  <button ref={cancelRef} type="button" className="btn" onClick={() => setAskingStartOver(false)}>
                    Keep my home
                  </button>
                </div>
              ) : (
                <>
                  <p className="settings-note">Moved, or want all new chores? Clear the room and chores, or erase everything.</p>
                  <button ref={startOverRef} type="button" className="btn btn-danger" onClick={() => setAskingStartOver(true)}>
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
