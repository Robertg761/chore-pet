import { useId, useState } from 'react'
import { useInstallPrompt } from '../pwa/useInstallPrompt'
import { isValidTime, type ReminderPrefs } from './reminderLogic'
import { loadPrefs, savePrefs } from './reminderStore'
import '../shell/controls.css'
import './ReminderSettings.css'

export interface ReminderSettingsProps {
  petName: string
}

type Permission = 'unsupported' | 'default' | 'granted' | 'denied'

function readPermission(): Permission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/** Asks the browser; older Safari only takes a callback, newer ones return a promise. */
function askPermission(): Promise<NotificationPermission> {
  return new Promise((resolve) => {
    try {
      const result = Notification.requestPermission(resolve)
      if (result) result.then(resolve, () => resolve('default'))
    } catch {
      resolve('default')
    }
  })
}

/** "15:59" as the player's own clock would show it, e.g. "3:59 PM". */
function friendlyTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** A tiny share icon: a tray with an arrow leaving it. */
function ShareIcon() {
  return (
    <svg className="home-hint-icon" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" strokeWidth="2" />
      <path d="M11 14.5H9.5v10h13v-10H21" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 20V7M11.5 11.5L16 7l4.5 4.5" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * A friendly card for iPhone and iPad players using the website in Safari:
 * notifications only work once the app is on the home screen. Renders nothing
 * anywhere else, so it is safe to place wherever it helps.
 */
export function AddToHomeHint({ className }: { className?: string }) {
  const { isIOS, isStandalone } = useInstallPrompt()
  if (!isIOS || isStandalone) return null
  return (
    <div className={`home-hint${className ? ` ${className}` : ''}`} role="note">
      <ShareIcon />
      <p>On iPhone, add Chore Pet to your home screen to get reminders: tap Share, then Add to Home Screen.</p>
    </div>
  )
}

export function ReminderSettings({ petName }: ReminderSettingsProps) {
  const timeId = useId()
  const statusId = useId()
  const { isIOS, isStandalone } = useInstallPrompt()
  const [prefs, setPrefs] = useState<ReminderPrefs>(loadPrefs)
  const [permission, setPermission] = useState<Permission>(readPermission)
  const [asking, setAsking] = useState(false)

  const update = (next: ReminderPrefs) => {
    setPrefs(next)
    savePrefs(next)
  }

  const isOn = prefs.enabled && permission === 'granted'
  const needsHome = permission === 'unsupported' && isIOS && !isStandalone

  const onToggle = async (wantOn: boolean) => {
    if (!wantOn) return update({ ...prefs, enabled: false })
    if (permission === 'granted') return update({ ...prefs, enabled: true })
    // Only ever asked in response to this tap.
    setAsking(true)
    const result = await askPermission()
    setAsking(false)
    setPermission(readPermission())
    if (result === 'granted') update({ ...prefs, enabled: true })
  }

  let status: string
  if (permission === 'unsupported') {
    status = needsHome ? '' : "This browser can't show notifications."
  } else if (permission === 'denied') {
    status = 'Notifications are blocked in your browser settings.'
  } else if (isOn) {
    status = `Reminders are on. ${petName} will say hello after ${friendlyTime(prefs.time)} when something needs doing.`
  } else if (asking) {
    status = 'Waiting for your browser to ask…'
  } else {
    status = 'Reminders are off.'
  }

  const unavailable = permission === 'unsupported' || permission === 'denied'

  return (
    <div className="reminders">
      <AddToHomeHint />

      {!needsHome && (
        <>
          <label className="settings-toggle reminder-toggle">
            <input
              type="checkbox"
              className="check"
              checked={isOn}
              disabled={unavailable || asking}
              aria-describedby={statusId}
              onChange={(e) => void onToggle(e.target.checked)}
            />
            <span>Daily reminder from {petName}</span>
          </label>

          <div className="reminder-time">
            <label htmlFor={timeId}>Reminder time</label>
            <input
              id={timeId}
              className="field"
              type="time"
              value={prefs.time}
              disabled={!isOn}
              onChange={(e) => {
                if (isValidTime(e.target.value)) update({ ...prefs, time: e.target.value })
              }}
            />
          </div>

          <label className="settings-toggle reminder-toggle">
            <input
              type="checkbox"
              className="check"
              checked={prefs.private === true}
              disabled={!isOn}
              onChange={(e) => update({ ...prefs, private: e.target.checked })}
            />
            <span>Hide chore names in reminders</span>
          </label>
        </>
      )}

      {status && (
        <p id={statusId} className="reminder-status" role="status">
          {status}
        </p>
      )}
      <p className="reminder-note">Reminders arrive while Chore Pet is open or running in the background.</p>
    </div>
  )
}
