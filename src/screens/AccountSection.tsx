import { useState } from 'react'
import {
  saveWithEmail,
  saveWithGoogle,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  useAccount,
  type AccountResult,
} from '../lib/account'
import './AccountSection.css'

// Keep progress on every device: a guest saves their home to an email or
// Google account, or signs in to one they already have.

type Mode = 'save' | 'sign-in'
type Sent = { kind: 'email'; email: string } | null

export function AccountSection() {
  const account = useAccount()
  const [mode, setMode] = useState<Mode>('save')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<Sent>(null)

  async function run(action: () => Promise<AccountResult>, onOk?: () => void) {
    setBusy(true)
    setError(null)
    const r = await action()
    setBusy(false)
    if (r.ok) onOk?.()
    else setError(friendly(r.message))
  }

  if (account.kind === 'local') {
    return (
      <>
        <h2>Your progress</h2>
        <p className="account-note">Your home is saved on this device.</p>
      </>
    )
  }

  if (account.kind === 'loading') {
    return (
      <>
        <h2>Your progress</h2>
        <p className="account-note">Checking your account…</p>
      </>
    )
  }

  if (account.kind === 'offline') {
    return (
      <>
        <h2>Your progress</h2>
        <p className="account-note">Your home is saved on this device. Connect to the internet to save it to an account too.</p>
      </>
    )
  }

  if (account.kind === 'saved') {
    return (
      <>
        <h2>Your progress</h2>
        <p className="account-note">
          Saved{account.email ? <> to <strong>{account.email}</strong></> : null}. Sign in with the same{' '}
          {account.via === 'google' ? 'Google account' : 'email'} on any device to find your home.
        </p>
        {error && <p className="account-error" role="alert">{error}</p>}
        <button type="button" className="account-secondary" disabled={busy} onClick={() => void run(signOut)}>
          Sign out
        </button>
      </>
    )
  }

  const saving = mode === 'save'
  return (
    <>
      <h2>{saving ? 'Keep your progress safe' : 'Sign in'}</h2>
      <p className="account-note">
        {saving
          ? 'Your home lives on this device for now. Save it to an account to open it on any phone.'
          : 'Open a home you saved before. It replaces the home on this device.'}
      </p>

      {sent ? (
        <p className="account-sent" role="status">
          Check <strong>{sent.email}</strong> for a link. Open it on this device to finish.
        </p>
      ) : (
        <form
          className="account-form"
          onSubmit={(e) => {
            e.preventDefault()
            const value = email.trim()
            if (!value) return
            void run(
              () => (saving ? saveWithEmail(value) : signInWithEmail(value)),
              () => setSent({ kind: 'email', email: value }),
            )
          }}
        >
          <label className="account-label" htmlFor="account-email">
            Email
          </label>
          <input
            id="account-email"
            className="account-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="account-primary" disabled={busy || !email.trim()}>
            {saving ? 'Save with email' : 'Email me a link'}
          </button>
        </form>
      )}

      <button
        type="button"
        className="account-secondary"
        disabled={busy}
        onClick={() => void run(saving ? saveWithGoogle : signInWithGoogle)}
      >
        Continue with Google
      </button>

      {error && <p className="account-error" role="alert">{error}</p>}

      <button
        type="button"
        className="link-button account-switch"
        onClick={() => {
          setMode(saving ? 'sign-in' : 'save')
          setSent(null)
          setError(null)
        }}
      >
        {saving ? 'Already saved a home? Sign in' : 'Back to saving this home'}
      </button>
    </>
  )
}

/** Supabase errors, in the app's voice. */
function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('already') && (m.includes('registered') || m.includes('exists') || m.includes('linked')))
    return 'That account already has a home. Use "Sign in" instead.'
  if (m.includes('signups not allowed') || m.includes('user not found')) return 'No saved home for that email yet.'
  if (m.includes('rate') || m.includes('too many')) return 'Too many tries. Wait a minute and try again.'
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'Google sign-in is not set up yet.'
  if (m.includes('fetch') || m.includes('network')) return 'You look offline. Try again when you are back online.'
  return 'That did not work. Try again in a moment.'
}
