import { useState } from 'react'
import './SampleBanner.css'

/** How long the thank-you stays (the fade in SampleBanner.css matches). */
export const ADOPTED_NOTE_MS = 2500

/** Shown briefly where the banner was, after "Make it mine". Same strip height, so the room stays put. */
export function AdoptedNote() {
  return (
    <p className="sample-banner sample-adopted" role="status">
      It's all yours now.
    </p>
  )
}

export interface SampleBannerProps {
  onKeep: () => void
  onStartFresh: () => void
}

export function SampleBanner({ onKeep, onStartFresh }: SampleBannerProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <section className="sample-banner" aria-label="Sample home">
      {confirming ? (
        <>
          <p className="sample-banner-text" role="alert">
            Start fresh? The sample goes away.
          </p>
          <div className="sample-banner-actions">
            <button type="button" className="sample-btn" onClick={onStartFresh}>Start fresh</button>
            <button type="button" className="sample-btn sample-btn-main" autoFocus onClick={() => setConfirming(false)}>Keep playing</button>
          </div>
        </>
      ) : (
        <>
          <p className="sample-banner-text">
            Sample home<span className="sample-banner-more">. Try doing the dishes!</span>
          </p>
          <div className="sample-banner-actions">
            <button type="button" className="sample-btn sample-btn-main" onClick={onKeep}>Make it mine</button>
            <button type="button" className="sample-btn" onClick={() => setConfirming(true)}>Start fresh</button>
          </div>
        </>
      )}
    </section>
  )
}
