import { useState } from 'react'
import { setSoundOn, soundOn } from '../audio/sfx'
import { ReminderSettings } from '../reminders/ReminderSettings'
import { ScreenHeader } from '../shell/ScreenHeader'
import { AccountSection } from './AccountSection'
import './SettingsScreen.css'

// Settings: sound, reminders, and saving progress to an account.

export interface SettingsScreenProps {
  petName: string
  onClose: () => void
  /** Replaces the account section (sign in to keep progress on every device). */
  account?: React.ReactNode
}

const PRIVACY_URL = 'https://github.com/Robertg761/chore-pet/blob/main/docs/PRIVACY.md'

export function SettingsScreen({ petName, onClose, account }: SettingsScreenProps) {
  const [sound, setSound] = useState(soundOn)
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
