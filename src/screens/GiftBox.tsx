import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'
import { CharacterArt } from '../character/Character'
import { ITEMS } from '../character/items'
import type { Pet } from '../domain/types'
import type { Unlock } from '../domain/unlocks'
import { Cheer } from '../effects'
import { prefersReducedMotion } from '../effects/shapes'
import './GiftBox.css'
import { RewardArt } from './RewardArt'
import { giftTitle } from './rewardsModel'

export interface GiftBoxProps {
  /** The reward being given. Shown one at a time; the app queues the rest. */
  unlock: Unlock
  pet: Pet
  /** Wear it now (items only) or put it away; either closes the gift. */
  onClose: (choice: { wear: boolean }) => void
}

const { ink, warmRed, blush, white, sky, petDefault } = PALETTE
const OPEN_MS = 650

/** The wrapped box in a 200x200 box. The lid is its own group so it can pop. */
function WrappedBox({ opening }: { opening: boolean }) {
  const stroke = { stroke: ink, strokeWidth: CHARACTER_STROKE, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  return (
    <svg className="gift-art" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <ellipse cx="100" cy="184" rx="68" ry="9" fill={ink} opacity="0.14" />
      <g className="gift-box">
        <rect x="38" y="92" width="124" height="86" rx="12" fill={warmRed} {...stroke} />
        <rect x="84" y="92" width="32" height="86" fill={blush} {...stroke} strokeLinejoin="miter" />
        <path d="M50 104 V160" fill="none" stroke={white} strokeWidth="5" strokeLinecap="round" opacity="0.45" />
        <g className={opening ? 'gift-lid gift-lid-pop' : 'gift-lid'}>
          <rect x="28" y="62" width="144" height="36" rx="12" fill={warmRed} {...stroke} />
          <rect x="84" y="62" width="32" height="36" fill={blush} {...stroke} strokeLinejoin="miter" />
          <path d="M42 72 H70" fill="none" stroke={white} strokeWidth="5" strokeLinecap="round" opacity="0.45" />
          <path d="M100 62 C84 30 56 36 66 52 C72 62 92 62 100 62 Z" fill={blush} {...stroke} />
          <path d="M100 62 C116 30 144 36 134 52 C128 62 108 62 100 62 Z" fill={blush} {...stroke} />
          <circle cx="100" cy="60" r="10" fill={blush} {...stroke} />
        </g>
      </g>
      {opening && (
        <g className="gift-puff" stroke={ink} strokeWidth="3" strokeLinejoin="round">
          <circle cx="62" cy="80" r="7" fill={white} />
          <circle cx="140" cy="76" r="9" fill={sky} />
          <circle cx="100" cy="56" r="6" fill={petDefault} />
        </g>
      )}
    </svg>
  )
}

export function GiftBox({ unlock, pet, onClose }: GiftBoxProps) {
  const uid = useId()
  const [phase, setPhase] = useState<'wrapped' | 'opening' | 'open'>('wrapped')
  const panel = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const openButton = useRef<HTMLButtonElement>(null)

  const item = unlock.kind === 'item' ? ITEMS.find((i) => i.id === unlock.ref) : undefined
  const canWear = Boolean(item)

  // Focus moves in, and goes back to where it was when the gift closes.
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
    openButton.current?.focus()
    return () => before?.focus?.()
  }, [])

  // When the reward appears, focus its first action.
  useEffect(() => {
    if (phase === 'open') primary.current?.focus()
  }, [phase])

  useEffect(() => {
    if (phase !== 'opening') return
    const t = setTimeout(() => setPhase('open'), prefersReducedMotion() ? 120 : OPEN_MS)
    return () => clearTimeout(t)
  }, [phase])

  function open() {
    panel.current?.focus() // the Open button is about to go away
    setPhase('opening')
  }

  function keys(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose({ wear: false })
      return
    }
    if (e.key !== 'Tab' || !panel.current) return
    const stops = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled)'))
    if (stops.length === 0) {
      e.preventDefault()
      return
    }
    const first = stops[0]
    const last = stops[stops.length - 1]
    const at = document.activeElement
    if (e.shiftKey && (at === first || at === panel.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && at === last) {
      e.preventDefault()
      first.focus()
    } else if (!panel.current.contains(at)) {
      e.preventDefault()
      first.focus()
    }
  }

  const revealed = phase === 'open'
  const titleId = `${uid}-title`
  const hintId = `${uid}-hint`
  const hint =
    unlock.kind === 'decor'
      ? 'Find it in Build.'
      : unlock.kind === 'wall' || unlock.kind === 'floor'
        ? 'Change it in Build.'
        : canWear
          ? ''
          : 'Find it in Rewards.'

  return (
    <div className="gift-backdrop">
      <div
        ref={panel}
        className="gift-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={revealed && hint ? hintId : undefined}
        tabIndex={-1}
        onKeyDown={keys}
      >
        <h2 id={titleId} className="gift-title" aria-live="polite">
          {revealed ? giftTitle(unlock) : 'A gift for you!'}
        </h2>

        <div className="gift-stage">
          {!revealed && <WrappedBox opening={phase === 'opening'} />}
          {revealed && (
            <div className="gift-reveal">
              {unlock.kind === 'item' && item ? (
                // Taller than the pet's 200 box so ears, hats and the cheer's hearts stay clear of the title.
                <svg className="gift-art" viewBox="0 -28 200 224" aria-hidden="true" focusable="false">
                  <Cheer>
                    <CharacterArt species={pet.species} mood="happy" pose="cheering" bodyColour={pet.bodyColour} equipped={{ ...pet.equipped, [item.slot]: item.id }} />
                  </Cheer>
                </svg>
              ) : (
                <div className="gift-thing">
                  <RewardArt unlock={unlock} pet={pet} className="gift-thing-art" />
                </div>
              )}
            </div>
          )}
        </div>

        {revealed && hint && (
          <p id={hintId} className="gift-hint">
            {hint}
          </p>
        )}

        <div className="gift-actions">
          {!revealed && (
            <button ref={openButton} type="button" className="gift-btn gift-btn-primary" onClick={open} disabled={phase === 'opening'}>
              Open it
            </button>
          )}
          {revealed && canWear && (
            <>
              <button ref={primary} type="button" className="gift-btn gift-btn-primary" onClick={() => onClose({ wear: true })}>
                Put it on
              </button>
              <button type="button" className="gift-btn" onClick={() => onClose({ wear: false })}>
                Maybe later
              </button>
            </>
          )}
          {revealed && !canWear && (
            <button ref={primary} type="button" className="gift-btn gift-btn-primary" onClick={() => onClose({ wear: false })}>
              Lovely!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
