import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.tsx'
import { installClickSounds } from './audio/sfx'
import { UpdateBanner } from './pwa/UpdateBanner'

// A soft click for every button (opt out with data-sound="none").
installClickSounds()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
    <UpdateBanner />
  </StrictMode>,
)
