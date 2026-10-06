import { Suspense, lazy } from 'react'
import App from './App.tsx'

// Dev art gallery at /?art, loaded only when asked for.
const ArtGallery = lazy(() => import('./dev/ArtGallery.tsx'))

export default function Root() {
  if (!new URLSearchParams(location.search).has('art')) return <App />
  return (
    <Suspense>
      <ArtGallery />
    </Suspense>
  )
}
