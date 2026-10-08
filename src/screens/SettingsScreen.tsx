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
  /** Clears this home (room, chores, pet, rewards) so a new one can be built. Asks first. */
  onStartOver?: () => void
}

const PRIVACY_URL = 'https://github.com/Robertg761/chore-pet/blob/main/docs/PRIVACY.md'

export function SettingsScreen({ petName, homeId, onClose, account, onStartOver }: SettingsScreenProps) {
  const [sound, setSound] = useState(soundOn)
  const [askingStartOver, setAskingStartOver] = useState(false)
  const startOverRef = useRef<HTMLButtonElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)
  const asked = useRef(false)
  // Focus follows the question in and back out, so keyboard users stay in place.
  useEffect(() => {
    if (askingStartOver) keepRef.current?.focus()
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
          {onStartOver && (
            <div className="settings-card">
              <h2>Start over</h2>
              {askingStartOver ? (
                <div className="settings-confirm" role="group" aria-label="Start over">
                  <p>Clear {petName}’s home and build a new one? The room, chores and rewards go too. This can’t be undone.</p>
                  <div className="settings-confirm-actions">
                    <button type="button" className="btn btn-danger" onClick={onStartOver}>
                      Start over
                    </button>
                    <button ref={keepRef} type="button" className="btn" onClick={() => setAskingStartOver(false)}>
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="settings-note">Clear this home and build a new one from scratch.</p>
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
