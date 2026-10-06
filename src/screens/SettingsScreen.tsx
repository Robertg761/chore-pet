import { useState } from 'react'
import { setSoundOn, soundOn } from '../audio/sfx'
import { ReminderSettings } from '../reminders/ReminderSettings'
import { AccountSection } from './AccountSection'
import './SettingsScreen.css'

// Settings: sound, reminders, and saving progress to an account.

export interface SettingsScreenProps {
  petName: string
  onClose: () => void
  /** Replaces the account section (sign in to keep progress on every device). */
  account?: React.ReactNode
}

export function SettingsScreen({ petName, onClose, account }: SettingsScreenProps) {
  const [sound, setSound] = useState(soundOn)
  return (
    <section className="settings" aria-labelledby="settings-title">
      <button type="button" className="link-button settings-back" onClick={onClose}>
        Back
      </button>
      <h1 id="settings-title">Settings</h1>

      <div className="settings-card">
        <label className="settings-toggle">
          <input
            type="checkbox"
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

      <div className="settings-card">{account ?? <AccountSection />}</div>
    </section>
  )
}
