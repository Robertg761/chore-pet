import { useEffect, useRef, useState } from 'react'
import {
  deleteAccount,
  saveWithEmail,
  saveWithGoogle,
  signInWithEmail,
  signInWithGoogle,
  signOutSafely,
  useAccount,
  type AccountResult,
} from '../lib/account'
import { useDataState } from '../data/appStore'
import '../shell/controls.css'
import './AccountSection.css'

// Keep progress on every device: a guest saves their home to an email or
// Google account, or signs in to one they already have. Signed in or a guest
// with a session, the home and account can also be deleted.

const NOT_SAVING = "This browser isn't saving your home, so it will be gone after a reload. Try a regular (not private) window."
const OFFLINE = "You look offline. Try again when you're back online."

type Mode = 'save' | 'sign-in'
type Sent = { email: string; mode: Mode } | null
type Confirm = 'sign-out' | 'delete' | null

/** Signing in must not say whether an email has a home, so "no such user" looks like success. */
function hideUnknownEmail(r: AccountResult): AccountResult {
  return !r.ok && /signups? not allowed|user not found/i.test(r.message) ? { ok: true } : r
}

export function AccountSection() {
  const account = useAccount()
  const { savedLocally, pendingCount, rejectedCount } = useDataState()
  const [mode, setMode] = useState<Mode>('save')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<Sent>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const stayRef = useRef<HTMLButtonElement>(null)
  const askRef = useRef<HTMLButtonElement>(null)

  // Asking "are you sure?" puts focus on the safe answer.
  useEffect(() => {
    if (confirm) stayRef.current?.focus()
  }, [confirm])

  async function run(action: () => Promise<AccountResult>, onOk?: () => void) {
    setBusy(true)
    setError(null)
    const r = await action()
    setBusy(false)
    if (r.ok) onOk?.()
    else setError(friendly(r.message))
  }

  function askSignOut() {
    if (pendingCount > 0) setConfirm('sign-out')
    else void signOutNow()
  }

  async function signOutNow() {
    setBusy(true)
    setError(null)
    const r = await signOutSafely()
    setBusy(false)
    setConfirm(null)
    if (!r.ok) setError(r.message ?? "Couldn't sign out. Try again in a moment.")
  }

  async function deleteNow() {
    setBusy(true)
    setError(null)
    const r = await deleteAccount()
    setBusy(false)
    if (r.ok) return
    setConfirm(null)
    setError(r.reason === 'offline' ? OFFLINE : "Couldn't delete right now. Try again later.")
    requestAnimationFrame(() => askRef.current?.focus())
  }

  const stay = () => {
    const was = confirm
    setConfirm(null)
    if (was === 'delete') requestAnimationFrame(() => askRef.current?.focus())
  }

  // Some changes the server turned down were set aside; say so once, gently.
  const rejected = (rejectedCount ?? 0) > 0 && <p className="account-note account-rejected">Some changes couldn't be saved to your account.</p>

  const failure = error && (
    <p className="account-error" role="alert">
      {error}
    </p>
  )

  /** Sign out and delete, for anyone with a session. */
  const manage = (
    <>
      {confirm === 'sign-out' && (
        <div className="account-confirm" role="group" aria-label="Sign out">
          <p>Some changes haven't reached your account yet. Sign out anyway?</p>
          <div className="account-pair">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void signOutNow()}>
              Sign out anyway
            </button>
            <button ref={stayRef} type="button" className="btn" onClick={stay}>
              Stay signed in
            </button>
          </div>
        </div>
      )}
      {confirm === 'delete' && (
        <div className="account-confirm" role="group" aria-label="Delete my home and account">
          <p>Delete your home and account? Your pet, chores and rewards are removed from every device. This can't be undone.</p>
          <div className="account-pair">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void deleteNow()}>
              Delete everything
            </button>
            <button ref={stayRef} type="button" className="btn" onClick={stay}>
              Keep my home
            </button>
          </div>
        </div>
      )}
      {!confirm && (
        <button ref={askRef} type="button" className="btn btn-quiet btn-danger account-delete" disabled={busy} onClick={() => setConfirm('delete')}>
          Delete my home and account
        </button>
      )}
    </>
  )

  if (account.kind === 'local') {
    return (
      <>
        <h2>Your progress</h2>
        <p className="account-note">{savedLocally ? 'Your home is saved on this device.' : NOT_SAVING}</p>
        {rejected}
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
        <p className="account-note">
          {savedLocally ? 'Your home is saved on this device. Connect to the internet to save it to an account too.' : NOT_SAVING}
        </p>
        {rejected}
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
        {rejected}
        {failure}
        {confirm !== 'sign-out' && (
          <button type="button" className="btn account-wide" disabled={busy} onClick={askSignOut}>
            Sign out
          </button>
        )}
        {manage}
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
      {rejected}

      {sent ? (
        <p className="account-sent" role="status">
          {sent.mode === 'sign-in' ? (
            'If that email has a saved home, a link is on its way.'
          ) : (
            <>
              Check <strong>{sent.email}</strong> for a link. Open it on this device to finish.
            </>
          )}
        </p>
      ) : (
        <form
          className="account-form"
          onSubmit={(e) => {
            e.preventDefault()
            const value = email.trim()
            if (!value) return
            void run(
              () => (saving ? saveWithEmail(value) : signInWithEmail(value).then(hideUnknownEmail)),
              () => setSent({ email: value, mode }),
            )
          }}
        >
          <label className="account-label" htmlFor="account-email">
            Email
          </label>
          <input
            id="account-email"
            className="field account-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary account-submit" disabled={busy || !email.trim()}>
            {saving ? 'Save with email' : 'Email me a link'}
          </button>
        </form>
      )}

      <button
        type="button"
        className="btn account-wide"
        disabled={busy}
        onClick={() => void run(saving ? saveWithGoogle : signInWithGoogle)}
      >
        Continue with Google
      </button>

      {failure}

      <button
        type="button"
        className="btn btn-quiet account-switch"
        onClick={() => {
          setMode(saving ? 'sign-in' : 'save')
          setSent(null)
          setError(null)
        }}
      >
        {saving ? 'Already saved a home? Sign in' : 'Back to saving this home'}
      </button>

      {account.kind === 'guest' && manage}
    </>
  )
}

/** Supabase errors, in the app's voice. */
function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('already') && (m.includes('registered') || m.includes('exists') || m.includes('linked')))
    return 'That account already has a home. Use "Sign in" instead.'
  if (m.includes('rate') || m.includes('too many')) return 'Too many tries. Wait a minute and try again.'
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return "Google sign-in isn't set up yet."
  if (m.includes('fetch') || m.includes('network')) return "You look offline. Try again when you're back online."
  return "That didn't work. Try again in a moment."
}
