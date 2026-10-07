import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react'
import App from './App.tsx'
import { devClockAllowed } from './lib/devClock'
import './Root.css'

// Dev art gallery at /?art, loaded only when asked for.
const ArtGallery = lazy(() => import('./dev/ArtGallery.tsx'))
// Demo time panel: dev builds, or a tab opened with ?dev or ?demo.
const TimePanel = lazy(() => import('./dev/TimePanel.tsx'))

/** Shown when something throws while rendering. Touches no data: the home is still saved on this device. */
function Wobbly() {
  return (
    <main className="shell wobbly" role="alert">
      <h1 className="wobbly-title">Something went wobbly.</h1>
      <p className="wobbly-text">Your home is safe. Reload?</p>
      <button type="button" className="wobbly-reload" onClick={() => window.location.reload()}>
        Reload
      </button>
    </main>
  )
}

class RootErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Chore Pet hit an error', error, info.componentStack)
  }

  render() {
    return this.state.failed ? <Wobbly /> : this.props.children
  }
}

export default function Root() {
  if (!new URLSearchParams(location.search).has('art')) {
    return (
      <RootErrorBoundary>
        <App />
        {devClockAllowed() && (
          <Suspense>
            <TimePanel />
          </Suspense>
        )}
      </RootErrorBoundary>
    )
  }
  return (
    <RootErrorBoundary>
      <Suspense>
        <ArtGallery />
      </Suspense>
    </RootErrorBoundary>
  )
}
