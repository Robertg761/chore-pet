import { useState } from 'react'
import { appStore } from '../data/appStore'
import type { AccountCleanup as Cleanup } from '../data/state'
import { cancelSignOut, clearDeviceAfterUnconfirmedDelete, deleteAccount, signOutSafely, useAccountOperationBusy, useAccountOperationError } from '../lib/account'
import './AccountSection.css'

/** Reachable even after the home or auth session has already been removed. */
export function AccountCleanup({ cleanup }: { cleanup: Cleanup }) {
  const operationError = useAccountOperationError()
  const operationBusy = useAccountOperationBusy()
  const [working, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deleting = cleanup.kind === 'delete'
  const busy = working || operationBusy
  const retry = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await (cleanup.deviceOnly ? clearDeviceAfterUnconfirmedDelete() : deleting ? deleteAccount() : signOutSafely())
      if (!result.ok) setError(result.message ?? "Couldn't finish. Try again.")
      else void appStore.sync()
    } finally { setBusy(false) }
  }
  return (
    <main className="shell">
      <section className="settings-card" aria-labelledby="cleanup-title">
        <h1 id="cleanup-title">{deleting ? 'Finish account cleanup' : 'Finish signing out'}</h1>
        <p>{deleting && cleanup.serverDeleted
          ? 'Your account was deleted. This device still needs cleanup before you start again.'
          : 'This device is keeping your place while we finish. If a step failed, you can try again.'}</p>
        {(error || operationError) && <p className="account-error" role="alert">{error || operationError}</p>}
        <button className="btn btn-primary" disabled={busy} onClick={() => void retry()}>{busy ? 'Working…' : 'Try again'}</button>
        {deleting && !cleanup.serverDeleted && <>
          <p>If the server's reply was lost, deletion may already have happened. You can clear this device without confirming the server account was deleted. If it still exists, sign in again to delete it.</p>
          <button className="btn" disabled={busy} onClick={() => {
            void clearDeviceAfterUnconfirmedDelete().then((result) => {
              if (!result.ok) setError(result.message)
              else void appStore.sync()
            })
          }}>Clear only this device</button>
        </>}
        {!deleting && cleanup.stage === 'prepared' && <button className="btn" disabled={busy} onClick={() => {
          void cancelSignOut().then((result) => {
            if (!result.ok) setError(result.message)
            else void appStore.sync()
          })
        }}>Keep my home open</button>}
      </section>
    </main>
  )
}
