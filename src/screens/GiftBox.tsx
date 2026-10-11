import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CHARACTER_STROKE, PALETTE } from '../art/palette'
import { CharacterArt } from '../character/Character'
import { ITEMS } from '../character/items'
import type { Pet } from '../domain/types'
import type { Unlock } from '../domain/unlocks'
import { Cheer } from '../effects'
import { prefersReducedMotion } from '../effects/shapes'
import '../shell/controls.css'
import './GiftBox.css'
import { RewardArt } from './RewardArt'
import { giftTitle } from './rewardsModel'

export interface GiftBoxProps {
  /** The reward being given. Shown one at a time; the app queues the rest. */
  unlock: Unlock
  /** Where this gift sits in a run of gifts ("Gift 1 of 3"): 1-based, with the run's total. A single gift shows no counter. */
  position?: { index: number; total: number }
  pet: Pet
  /** Reachable correction for the chore that earned this gift. */
  children?: ReactNode
  /** Wear it now (items only) or put it away; either closes the gift. */
  onClose: (choice: { wear: boolean }) => void
  /** Decor: "Place it". Called, then the gift closes itself, so this only needs to take the player to Build. */
  onPlace?: () => void
  /** Walls and floors: "Try it". Called, then the gift closes itself. */
  onTry?: () => void
}

const { ink, warmRed, blush, white, sky, petDefault } = PALETTE
const OPEN_MS = 650
/** Later gifts in a run open a little quicker, so the run feels like one celebration. */
const OPEN_QUICK_MS = 420

/** The wrapped box, drawn in the same 200x224 frame as the pet reveal so the card is the same size before and after. The lid is its own group so it can pop. */
function WrappedBox({ opening }: { opening: boolean }) {
  const stroke = { stroke: ink, strokeWidth: CHARACTER_STROKE, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  return (
    <svg className="gift-art" viewBox="0 -28 200 224" aria-hidden="true" focusable="false">
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

export function GiftBox({ unlock, position, pet, onClose, onPlace, onTry, children }: GiftBoxProps) {
  const uid = useId()
  const [phase, setPhase] = useState<'wrapped' | 'opening' | 'open'>('wrapped')
  // The dialog stays up from one gift to the next in a run; only the gift inside it changes.
  const [shownId, setShownId] = useState(unlock.id)
  if (shownId !== unlock.id) {
    setShownId(unlock.id)
    setPhase('wrapped')
  }
  const later = Boolean(position && position.index > 1)
  const panel = useRef<HTMLDialogElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const openButton = useRef<HTMLButtonElement>(null)

  const item = unlock.kind === 'item' ? ITEMS.find((i) => i.id === unlock.ref) : undefined
  const canWear = Boolean(item)

  // Native modality puts gifts above sheets and keeps background controls inert.
  useEffect(() => {
    const dialog = panel.current
    if (!dialog) return
    const before = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    dialog.showModal()
    openButton.current?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      // Wait for removal, queued gifts, and screen changes before restoring focus.
      queueMicrotask(() => {
        const modal = document.querySelector<HTMLDialogElement>('dialog:modal')
        if (modal?.contains(document.activeElement) && document.activeElement !== document.body) return
        const target = before?.isConnected && (!modal || modal.contains(before))
          ? before
          : modal?.querySelector<HTMLElement>('button:not(:disabled), [tabindex]')
            ?? document.querySelector<HTMLElement>('.app-view h1, #cl-h-next')
        if (target) {
          if (target.matches('h1, h2')) target.setAttribute('tabindex', '-1')
          target.focus({ preventScroll: true })
        }
      })
    }
  }, [])

  // A new gift arrives wrapped: focus its Open button (the last gift's buttons just went away).
  const firstGift = useRef(true)
  useEffect(() => {
    if (firstGift.current) {
      firstGift.current = false
      return
    }
    openButton.current?.focus({ preventScroll: true })
  }, [unlock.id])

  // When the reward appears, focus its first action.
  useEffect(() => {
    if (phase === 'open') primary.current?.focus()
  }, [phase])

  useEffect(() => {
    if (phase !== 'opening') return
    const t = setTimeout(() => setPhase('open'), prefersReducedMotion() ? 120 : later ? OPEN_QUICK_MS : OPEN_MS)
    return () => clearTimeout(t)
  }, [phase, later])

  function open() {
    panel.current?.focus() // the Open button is about to go away
    navigator.vibrate?.([8, 60, 18]) // a little rattle and pop, where the phone can
    setPhase('opening')
  }

  const revealed = phase === 'open'
  // A shortcut for gifts that live in Build: decor can be placed, walls and floors tried.
  const shortcut = unlock.kind === 'decor' && onPlace ? { label: 'Place it', run: onPlace } : (unlock.kind === 'wall' || unlock.kind === 'floor') && onTry ? { label: 'Try it', run: onTry } : null
  const titleId = `${uid}-title`
  const hintId = `${uid}-hint`
  const hint =
    unlock.kind === 'decor'
      ? 'Find it in Build any time.'
      : unlock.kind === 'wall' || unlock.kind === 'floor'
        ? 'Change it in Build any time.'
        : canWear
          ? ''
          : 'Find it in Rewards.'

  return (
    <dialog
      ref={panel}
      className="gift-panel"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={revealed && hint ? hintId : undefined}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose({ wear: false })
      }}
    >
      {position && position.total > 1 && (
        <p className="gift-count" key={position.index}>
          <span>{`Gift ${position.index} of ${position.total}`}</span>
          <span className="gift-dots" aria-hidden="true">
            {Array.from({ length: position.total }, (_, i) => (
              <span key={i} className={i + 1 === position.index ? 'gift-dot gift-dot-on' : i + 1 < position.index ? 'gift-dot gift-dot-past' : 'gift-dot'} />
            ))}
          </span>
        </p>
      )}
      <h2 id={titleId} className="gift-title" aria-live="polite">
        {revealed ? giftTitle(unlock) : 'A gift for you!'}
      </h2>

      <div className={later ? 'gift-stage gift-stage-next' : 'gift-stage'} key={unlock.id}>
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

      {/* Held in place (unseen) until the reveal, so the card never changes size when the gift appears. */}
      {hint && (
        <p id={hintId} className={revealed ? 'gift-hint' : 'gift-hint gift-hint-wait'} aria-hidden={revealed ? undefined : true}>
          {hint}
        </p>
      )}

      <div className={canWear || shortcut ? 'gift-actions gift-actions-two' : 'gift-actions'}>
        {!revealed && (
          <button ref={openButton} type="button" className="btn btn-primary gift-btn" onClick={open} disabled={phase === 'opening'}>
            Open it
          </button>
        )}
        {revealed && canWear && (
          <>
            <button ref={primary} type="button" className="btn btn-primary gift-btn" onClick={() => onClose({ wear: true })}>
              Put it on
            </button>
            <button type="button" className="btn gift-btn" onClick={() => onClose({ wear: false })}>
              Maybe later
            </button>
          </>
        )}
        {revealed && !canWear && shortcut && (
          <>
            <button
              ref={primary}
              type="button"
              className="btn btn-primary gift-btn"
              onClick={() => {
                shortcut.run()
                onClose({ wear: false })
              }}
            >
              {shortcut.label}
            </button>
            <button type="button" className="btn gift-btn" onClick={() => onClose({ wear: false })}>
              Maybe later
            </button>
          </>
        )}
        {revealed && !canWear && !shortcut && (
          <button ref={primary} type="button" className="btn btn-primary gift-btn" onClick={() => onClose({ wear: false })}>
            Lovely!
          </button>
        )}
      </div>
      {children}
    </dialog>
  )
}
