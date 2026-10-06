import { useEffect, useRef } from 'react'
import { CharacterArt } from '../character/Character'
import { WELCOME_LINES, pickLine } from '../content/petLines'
import type { Pet } from '../domain/types'
import { Cheer } from '../effects'
import { coachCopy, type CoachStep } from './onboardingModel'
import './Onboarding.css'

// The first minutes: a welcome beat, a coach card in build mode, and a hint on the home screen.

export interface WelcomeProps {
  pet: Pet
  onContinue: () => void
}

/** The chosen pet cheers and says hello. A tap anywhere, or the button, moves on (no timer, so nobody is rushed). */
export function Welcome({ pet, onContinue }: WelcomeProps) {
  const button = useRef<HTMLButtonElement>(null)
  // A steady pick per pet: the id's characters decide which line.
  const line = pickLine(WELCOME_LINES, [...pet.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0))

  useEffect(() => {
    button.current?.focus()
  }, [])

  return (
    <section className="welcome" aria-labelledby="welcome-title" onClick={onContinue}>
      <h1 className="welcome-title" id="welcome-title">
        Meet {pet.name}!
      </h1>
      <div className="welcome-stage">
        <p className="welcome-bubble" role="status">
          {line}
        </p>
        <svg className="welcome-pet" viewBox="0 0 200 200" role="img" aria-label={`${pet.name} is cheering`}>
          <Cheer>
            <CharacterArt
              species={pet.species}
              mood="happy"
              pose="cheering"
              bodyColour={pet.bodyColour}
              equipped={pet.equipped}
              look={{ eyes: pet.eyes, cheeks: pet.cheeks }}
            />
          </Cheer>
        </svg>
      </div>
      <button
        ref={button}
        type="button"
        className="welcome-go"
        onClick={(e) => {
          e.stopPropagation()
          onContinue()
        }}
      >
        Build our home
      </button>
      <p className="welcome-tap" aria-hidden="true">
        Tap anywhere to skip
      </p>
    </section>
  )
}

export interface CoachCardProps {
  step: CoachStep
  choreCount: number
  /** The object sheet is covering the tray. */
  sheetOpen: boolean
  onSkip: () => void
}

/** A friendly card above the tray. It never covers the room or the tray. */
export function CoachCard({ step, choreCount, sheetOpen, onSkip }: CoachCardProps) {
  const { text, count } = coachCopy(step, choreCount, sheetOpen)
  const ref = useRef<HTMLElement>(null)
  // Arriving in build mode: land on the card so the first step is read out.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return (
    <section ref={ref} className="coach" tabIndex={-1} aria-label="Getting started">
      <div className="coach-body">
        <p className="coach-step" aria-hidden="true">
          Step {step} of 3
        </p>
        <p className="coach-text" role="status">
          {text}
        </p>
        {count && <p className="coach-count">{count}</p>}
      </div>
      <button type="button" className="link-button coach-skip" onClick={onSkip}>
        Skip
      </button>
    </section>
  )
}

export interface FirstDoneHintProps {
  onClose: () => void
}

/** One line above the chore list the first time the home screen shows. */
export function FirstDoneHint({ onClose }: FirstDoneHintProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return (
    <aside ref={ref} className="first-hint" tabIndex={-1} aria-label="Tip">
      <p className="first-hint-text">Tap Done when you've really done it. Your pet will notice!</p>
      <button type="button" className="first-hint-close" onClick={onClose} aria-label="Close tip">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  )
}
