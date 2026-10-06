import { useCallback, useEffect, useRef, useState } from 'react'

// Not in lib.dom yet: the Chromium install prompt event.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface StandaloneNavigator extends Navigator {
  standalone?: boolean
}

export type InstallResult = 'accepted' | 'dismissed' | 'unavailable'

export interface InstallPrompt {
  /** True when the browser has offered an install prompt we can trigger. */
  canInstall: boolean
  /** Shows the install prompt. Resolves 'unavailable' if there isn't one. */
  install: () => Promise<InstallResult>
  /** True when the app is already running as an installed app. */
  isStandalone: boolean
  /** iPhone or iPad: no prompt exists, so show "Share, then Add to Home Screen". */
  isIOS: boolean
}

const STANDALONE_QUERY = '(display-mode: standalone)'

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav: StandaloneNavigator = window.navigator
  return Boolean(window.matchMedia?.(STANDALONE_QUERY).matches) || nav.standalone === true
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  // iPadOS 13+ reports itself as a Mac, but has a touch screen.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
}

function isBeforeInstallPrompt(event: Event): event is BeforeInstallPromptEvent {
  return 'prompt' in event && 'userChoice' in event
}

export function useInstallPrompt(): InstallPrompt {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isStandalone, setIsStandalone] = useState(detectStandalone)
  const [isIOS] = useState(detectIOS)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      if (!isBeforeInstallPrompt(event)) return
      event.preventDefault()
      deferred.current = event
      setCanInstall(true)
    }
    const onInstalled = () => {
      deferred.current = null
      setCanInstall(false)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    const media = window.matchMedia?.(STANDALONE_QUERY)
    const onDisplayModeChange = () => setIsStandalone(detectStandalone())
    media?.addEventListener('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      media?.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  const install = useCallback(async (): Promise<InstallResult> => {
    const event = deferred.current
    if (!event) return 'unavailable'
    // A prompt event can only be used once, whatever the player chooses.
    deferred.current = null
    setCanInstall(false)
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      return outcome
    } catch {
      return 'unavailable'
    }
  }, [])

  return { canInstall, install, isStandalone, isIOS }
}
