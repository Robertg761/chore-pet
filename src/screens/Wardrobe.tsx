import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { CharacterArt } from '../character/Character'
import type { PoseName } from '../character/poses'
import { poseFor } from '../character/poses'
import type { Item } from '../character/slots'
import type { Mood, Pet, Progress, SavedOutfit } from '../domain/types'
import { GiftSilhouette } from './RewardArt'
import './Wardrobe.css'
import {
  MAX_OUTFIT_NAME,
  MAX_OUTFITS,
  WARDROBE_POSES,
  WARDROBE_SLOTS,
  activeOutfit,
  addOutfit,
  clearSlot,
  defaultOutfitName,
  describeOutfit,
  isEmptyOutfit,
  isFull,
  itemsForSlot,
  removeOutfit,
  sameOutfit,
  toggleItem,
  wearableOutfit,
  type WardrobeSlot,
} from './wardrobeModel'

export interface WardrobeProps {
  pet: Pet
  progress: Progress | null
  onChange: (patch: Partial<Pick<Pet, 'equipped' | 'outfits'>>) => void
  onClose: () => void
}

const MOOD_FOR_POSE: Partial<Record<PoseName, Mood>> = { sick: 'sick' }

/** The pet in a pose, drawn in the usual 200x200 box. */
function PetArt({ pet, equipped, pose, viewBox = '0 0 200 200', className, label }: { pet: Pet; equipped: Pet['equipped']; pose: PoseName; viewBox?: string; className?: string; label?: string }) {
  return (
    <svg className={className} viewBox={viewBox} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <CharacterArt species={pet.species} mood={MOOD_FOR_POSE[pose] ?? 'happy'} bodyColour={pet.bodyColour} pose={pose} equipped={equipped} look={{ eyes: pet.eyes, cheeks: pet.cheeks }} />
    </svg>
  )
}

/** One item on the pet, cropped to the part of the body it goes on. */
function ItemCrop({ pet, item }: { pet: Pet; item: Item }) {
  const anchor = poseFor(pet.species, 'idle').anchors[item.slot]
  // Clothes sit low on the body, so look a little higher and wider to see the whole thing.
  const half = item.slot === 'outfit' ? 62 : 58
  const centre = item.slot === 'outfit' ? anchor.y - 22 : anchor.y + 14
  return <PetArt className="wd-tile-art" pet={pet} equipped={{ [item.slot]: item.id }} pose="idle" viewBox={`${anchor.x - half} ${centre - half} ${half * 2} ${half * 2}`} />
}

/** A soft circle with a slash, for taking the slot's item off. */
function NoneArt() {
  return (
    <svg className="wd-tile-art" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <g fill="none" stroke="var(--ink-soft)" strokeWidth="3" strokeLinecap="round">
        <circle cx="24" cy="24" r="13" />
        <path d="M15 33 L33 15" />
      </g>
    </svg>
  )
}

export function Wardrobe({ pet, progress, onChange, onClose }: WardrobeProps) {
  const uid = useId()
  const [draft, setDraft] = useState<Pet['equipped']>(pet.equipped)
  const [slot, setSlot] = useState<WardrobeSlot>('head')
  const [pose, setPose] = useState<PoseName>('idle')
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const outfits = pet.outfits ?? []
  const dirty = !sameOutfit(draft, pet.equipped)
  const current = activeOutfit(outfits, draft)
  const full = isFull(outfits)
  const entries = itemsForSlot(slot, progress)
  const worn = draft[slot]

  useEffect(() => {
    if (naming) nameRef.current?.select()
  }, [naming])

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? WARDROBE_SLOTS.length - 1 : (index + step + WARDROBE_SLOTS.length) % WARDROBE_SLOTS.length
    setSlot(WARDROBE_SLOTS[next].slot)
    document.getElementById(`${uid}-tab-${WARDROBE_SLOTS[next].slot}`)?.focus()
  }

  function startNaming() {
    setName(defaultOutfitName(outfits))
    setNaming(true)
  }

  function saveOutfit() {
    onChange({ outfits: addOutfit(outfits, name, draft, crypto.randomUUID()) })
    setNaming(false)
  }

  function confirmRemove(outfit: SavedOutfit) {
    onChange({ outfits: removeOutfit(outfits, outfit.id) })
    setRemoving(null)
  }

  function save() {
    onChange({ equipped: draft })
    onClose()
  }

  const saveHint = full
    ? `You have ${MAX_OUTFITS} outfits. Remove one to save another.`
    : isEmptyOutfit(draft)
      ? 'Put something on to save an outfit.'
      : current
        ? `This is already saved as ${current.name}.`
        : null

  return (
    <section className="wd" aria-labelledby={`${uid}-title`}>
      <h1 id={`${uid}-title`} className="wd-title">
        Dress up {pet.name}
      </h1>

      <div className="wd-stage">
        <PetArt className="wd-preview" pet={pet} equipped={draft} pose={pose} label={`${pet.name} wearing ${describeOutfit(draft)}`} />
        <div className="wd-poses" role="group" aria-label="Pose">
          {WARDROBE_POSES.map((p) => (
            <button key={p.pose} type="button" className="wd-pose" aria-pressed={pose === p.pose} onClick={() => setPose(p.pose)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="wd-tabs" role="tablist" aria-label="Where it goes">
        {WARDROBE_SLOTS.map((s, i) => (
          <button
            key={s.slot}
            id={`${uid}-tab-${s.slot}`}
            type="button"
            role="tab"
            className="wd-tab"
            aria-selected={slot === s.slot}
            aria-controls={`${uid}-panel`}
            tabIndex={slot === s.slot ? 0 : -1}
            onClick={() => setSlot(s.slot)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {s.label}
            {draft[s.slot] && <span className="wd-tab-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${slot}`} className="wd-panel">
        <ul className="wd-grid">
          <li>
            <button type="button" className="wd-tile" aria-pressed={!worn} onClick={() => setDraft(clearSlot(draft, slot))}>
              <NoneArt />
              <span className="wd-tile-name">None</span>
            </button>
          </li>
          {entries.map(({ item, unlocked, requirement }) => (
            <li key={item.id}>
              {unlocked ? (
                <button type="button" className="wd-tile" aria-pressed={worn === item.id} onClick={() => setDraft(toggleItem(draft, slot, item.id))}>
                  <ItemCrop pet={pet} item={item} />
                  <span className="wd-tile-name">{item.name}</span>
                </button>
              ) : (
                <div className="wd-tile wd-tile-locked">
                  <GiftSilhouette className="wd-tile-art" />
                  <span className="wd-tile-name">
                    <span className="wd-sr">Locked gift. </span>
                    {requirement ?? 'A surprise'}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
        {entries.length === 0 && <p className="wd-note">Nothing for this spot yet. More are on the way.</p>}
      </div>

      <section className="wd-saved" aria-labelledby={`${uid}-saved`}>
        <h2 id={`${uid}-saved`} className="wd-sub">
          Saved outfits
        </h2>
        {outfits.length > 0 ? (
          <ul className="wd-outfits">
            {outfits.map((o) => (
              <li key={o.id} className={sameOutfit(o.equipped, draft) ? 'wd-outfit wd-outfit-on' : 'wd-outfit'}>
                <button type="button" className="wd-outfit-try" aria-pressed={sameOutfit(o.equipped, draft)} aria-label={`Try on ${o.name}`} onClick={() => setDraft(wearableOutfit(o.equipped, progress))}>
                  <PetArt className="wd-outfit-art" pet={pet} equipped={wearableOutfit(o.equipped, progress)} pose="idle" />
                  <span className="wd-outfit-name">{o.name}</span>
                </button>
                {removing === o.id ? (
                  <div className="wd-confirm" role="group" aria-label={`Remove ${o.name}?`}>
                    <button type="button" className="wd-small wd-small-danger" onClick={() => confirmRemove(o)}>
                      Remove
                    </button>
                    <button type="button" className="wd-small" onClick={() => setRemoving(null)}>
                      Keep
                    </button>
                  </div>
                ) : (
                  <button type="button" className="wd-small" aria-label={`Remove ${o.name}`} onClick={() => setRemoving(o.id)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="wd-note">Save a look to switch back to it any time.</p>
        )}

        {naming ? (
          <form
            className="wd-name-form"
            onSubmit={(e) => {
              e.preventDefault()
              saveOutfit()
            }}
          >
            <label className="wd-label" htmlFor={`${uid}-name`}>
              Outfit name
            </label>
            <div className="wd-name-row">
              <input ref={nameRef} id={`${uid}-name`} className="wd-input" type="text" value={name} maxLength={MAX_OUTFIT_NAME} autoComplete="off" onChange={(e) => setName(e.target.value)} />
              <button type="submit" className="wd-btn wd-btn-solid">
                Save outfit
              </button>
              <button type="button" className="wd-btn" onClick={() => setNaming(false)}>
                Not now
              </button>
            </div>
          </form>
        ) : (
          <>
            <button type="button" className="wd-btn wd-save-outfit" disabled={full || isEmptyOutfit(draft) || Boolean(current)} onClick={startNaming}>
              Save this outfit
            </button>
            {saveHint && <p className="wd-note">{saveHint}</p>}
          </>
        )}
      </section>

      <div className="wd-actions">
        <button type="button" className="wd-btn" onClick={onClose}>
          {dirty ? 'Cancel' : 'Back'}
        </button>
        <button type="button" className="wd-btn wd-btn-solid" disabled={!dirty} onClick={save}>
          Save
        </button>
      </div>
    </section>
  )
}
