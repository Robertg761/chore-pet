import { useState } from 'react'
import './SampleBanner.css'

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
          <p className="sample-banner-text" role="alert">Start fresh? The sample goes away.</p>
          <div className="sample-banner-actions">
            <button type="button" className="sample-btn sample-btn-main" onClick={onStartFresh}>Start fresh</button>
            <button type="button" className="sample-btn" autoFocus onClick={() => setConfirming(false)}>Keep playing</button>
          </div>
        </>
      ) : (
        <>
          <p className="sample-banner-text">A sample home. Try doing the dishes!</p>
          <div className="sample-banner-actions">
            <button type="button" className="sample-btn sample-btn-main" onClick={onKeep}>Make it mine</button>
            <button type="button" className="sample-btn" onClick={() => setConfirming(true)}>Start fresh</button>
          </div>
        </>
      )}
    </section>
  )
}
