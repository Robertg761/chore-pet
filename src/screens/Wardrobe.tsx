import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CharacterArt } from '../character/Character'
import type { PoseName } from '../character/poses'
import type { Item } from '../character/slots'
import type { Mood, Pet, Progress, SavedOutfit } from '../domain/types'
import { itemCropViewBox } from './itemCrop'
import { GiftSilhouette } from './RewardArt'
import { ScreenHeader } from '../shell/ScreenHeader'
import { SegThumb } from '../shell/SegThumb'
import { useWide } from '../shell/useViewport'
import { WardrobePreview } from './WardrobePreview'
import './Wardrobe.css'
import {
  MAX_OUTFIT_NAME,
  MAX_OUTFITS,
  WARDROBE_SLOTS,
  activeOutfit,
  addOutfit,
  clearSlot,
  cleanOutfitName,
  defaultOutfitName,
  isEmptyOutfit,
  isFull,
  itemsForSlot,
  removeOutfit,
  replaceOutfit,
  sameOutfit,
  toggleItem,
  wearableOutfit,
  type WardrobeSlot,
} from './wardrobeModel'

export interface WardrobeProps {
  pet: Pet
  progress: Progress | null
  /** Every change lands straight away: wearing an item, taking it off, saving or removing an outfit. */
  onChange: (patch: Partial<Pick<Pet, 'equipped' | 'outfits'>>) => void
  /** Not used: this is a tab, so the tab bar is the way out. */
  onClose?: () => void
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

/** One item on the pet, framed so the whole head shows with it (see itemCrop). */
function ItemCrop({ pet, item }: { pet: Pet; item: Item }) {
  return <PetArt className="wd-tile-art" pet={pet} equipped={{ [item.slot]: item.id }} pose="idle" viewBox={itemCropViewBox(pet.species, item.slot)} />
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

/** A tab: one of the slots, or (on phones) the saved outfits. */
type Section = WardrobeSlot | 'saved'
type NameEditor = { kind: 'save' } | { kind: 'rename'; id: string }

export function Wardrobe({ pet, progress, onChange }: WardrobeProps) {
  const uid = useId()
  const equipped = pet.equipped
  const wide = useWide()
  const [picked, setPicked] = useState<Section>('head')
  const [layoutWide, setLayoutWide] = useState(wide)
  const [editor, setEditor] = useState<NameEditor | null>(null)
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const savedRef = useRef<HTMLElement>(null)
  const returnFocus = useRef<string | null>(null)

  const outfits = pet.outfits ?? []
  const editingOutfit = editor?.kind === 'rename' ? outfits.find(o => o.id === editor.id) : undefined
  const current = activeOutfit(outfits, equipped)
  const full = isFull(outfits)
  // On wide screens the saved outfits sit under the items; on phones they are one more tab.
  const slot: WardrobeSlot = picked === 'saved' ? 'head' : picked
  const showing: Section = wide && picked === 'saved' ? 'head' : picked
  const sections: { key: Section; label: string }[] = wide ? WARDROBE_SLOTS.map((s) => ({ key: s.slot, label: s.label })) : [...WARDROBE_SLOTS.map((s) => ({ key: s.slot as Section, label: s.label })), { key: 'saved', label: 'Saved' }]
  const entries = itemsForSlot(slot, progress)
  const worn = equipped[slot]
  const wear = (next: Pet['equipped']) => onChange({ equipped: next })

  useEffect(() => {
    if (editor) {
      nameRef.current?.focus()
      nameRef.current?.select()
    } else if (returnFocus.current) {
      const controls = [document.getElementById(returnFocus.current),
        savedRef.current?.querySelector<HTMLButtonElement>('.wd-outfit-actions > button'),
        document.getElementById(`${uid}-save-outfit`),
        savedRef.current?.closest('.wd')?.querySelector<HTMLButtonElement>('.wd-tab[aria-selected="true"]')]
      const control = controls.find(node => node && !node.matches(':disabled'))
      const actions = control?.closest('.wd-outfit')?.querySelector('.wd-outfit-actions')
      const target = actions ?? control
      target?.scrollIntoView?.({ block: 'end', inline: 'nearest', behavior: 'instant' })
      control?.focus({ preventScroll: true })
      returnFocus.current = null
    }
  }, [editor, uid])

  // Keep an open editor available when the separate wide saved area becomes a tab.
  if (wide !== layoutWide) {
    setLayoutWide(wide)
    if (!wide && editor) setPicked('saved')
  }

  // An externally removed target ends its draft before the next committed render.
  if (editor?.kind === 'rename' && !editingOutfit) setEditor(null)

  // Resize can change scroll ownership or move the field within the same layout.
  useLayoutEffect(() => {
    function revealFocusedEditor() {
      const focused = document.activeElement
      if (focused instanceof HTMLElement && savedRef.current?.contains(focused) && focused.closest('.wd-name-form')) {
        focused.scrollIntoView?.({ block: 'end', inline: 'nearest', behavior: 'instant' })
      }
    }
    revealFocusedEditor()
    window.addEventListener('resize', revealFocusedEditor)
    return () => window.removeEventListener('resize', revealFocusedEditor)
  }, [wide])

  // Keep the chosen tab in view when the row scrolls sideways.
  useEffect(() => {
    document.getElementById(`${uid}-tab-${showing}`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [uid, showing])

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? sections.length - 1 : (index + step + sections.length) % sections.length
    setPicked(sections[next].key)
    document.getElementById(`${uid}-tab-${sections[next].key}`)?.focus()
  }

  function startNaming() {
    returnFocus.current = `${uid}-save-outfit`
    setRemoving(null)
    setName(defaultOutfitName(outfits))
    setEditor({ kind: 'save' })
  }

  function startRename(outfit: SavedOutfit) {
    returnFocus.current = `${uid}-rename-${outfit.id}`
    setRemoving(null)
    setName(outfit.name)
    setEditor({ kind: 'rename', id: outfit.id })
  }

  function saveOutfit() {
    if (editor?.kind === 'rename') {
      const clean = cleanOutfitName(name)
      if (editingOutfit && clean && clean !== editingOutfit.name) {
        onChange({ outfits: replaceOutfit(outfits, editingOutfit.id, editingOutfit.equipped, clean) })
      }
    } else if (editor?.kind === 'save' && !full) {
      const id = crypto.randomUUID()
      returnFocus.current = `${uid}-rename-${id}`
      onChange({ outfits: addOutfit(outfits, name, equipped, id) })
    }
    setEditor(null)
  }

  function confirmRemove(outfit: SavedOutfit) {
    onChange({ outfits: removeOutfit(outfits, outfit.id) })
    setRemoving(null)
  }

  const saveHint = full
    ? `You have ${MAX_OUTFITS} outfits. Remove one to save another.`
    : isEmptyOutfit(equipped)
      ? 'Put something on to save an outfit.'
      : current
        ? `This is already saved as ${current.name}.`
        : null

  const itemsGrid = (
    <>
      <ul className="wd-grid">
        <li>
          <button type="button" className="wd-tile choice" aria-pressed={!worn} onClick={() => wear(clearSlot(equipped, slot))}>
            <NoneArt />
            <span className="wd-tile-name">None</span>
          </button>
        </li>
        {entries.map(({ item, unlocked, requirement }) => (
          <li key={item.id}>
            {unlocked ? (
              <button type="button" className="wd-tile choice" aria-pressed={worn === item.id} onClick={() => wear(toggleItem(equipped, slot, item.id))}>
                <ItemCrop pet={pet} item={item} />
                <span className="wd-tile-name">{item.name}</span>
              </button>
            ) : (
              <div className="wd-tile wd-tile-locked">
                <GiftSilhouette className="wd-tile-art" lock />
                <span className="wd-tile-name">
                  <span className="sr-only">Locked gift. </span>
                  {requirement ?? 'A surprise'}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {entries.length === 0 && <p className="wd-note">Nothing for this spot yet. More are on the way.</p>}
    </>
  )

  const saved = (
    <section ref={savedRef} className="wd-saved" aria-labelledby={`${uid}-saved`}>
      <h2 id={`${uid}-saved`} className={wide ? 'wd-sub' : 'sr-only'}>
        Saved outfits
      </h2>
      {outfits.length > 0 ? (
        <ul className="wd-outfits">
          {outfits.map((o) => (
            <li key={o.id} className="wd-outfit">
              <button type="button" className="wd-outfit-try choice" aria-pressed={sameOutfit(o.equipped, equipped)} aria-label={`Wear ${o.name}`} onClick={() => wear(wearableOutfit(o.equipped, progress))}>
                <PetArt className="wd-outfit-art" pet={pet} equipped={wearableOutfit(o.equipped, progress)} pose="idle" />
                <span className="wd-outfit-name">{o.name}</span>
              </button>
              <div className="wd-outfit-actions">
              <button id={`${uid}-rename-${o.id}`} type="button" className="btn btn-sm" aria-label={`Rename ${o.name}`} onClick={() => startRename(o)}>
                Rename
              </button>
              {removing === o.id ? (
                <div className="wd-confirm" role="group" aria-label={`Remove ${o.name}?`}>
                  <button type="button" className="btn btn-sm" onClick={() => setRemoving(null)}>
                    Keep
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => confirmRemove(o)}>
                    Remove
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-sm" aria-label={`Remove ${o.name}`} onClick={() => { returnFocus.current = null; setEditor(null); setRemoving(o.id) }}>
                  Remove
                </button>
              )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="wd-note">Save a look to switch back to it any time.</p>
      )}

      {editor && (editor.kind === 'save' || editingOutfit) ? (
        <form
          className="wd-name-form"
          aria-label={editor.kind === 'rename' ? `Rename ${editingOutfit?.name}` : 'Save an outfit'}
          onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setEditor(null) } }}
          onSubmit={(e) => {
            e.preventDefault()
            saveOutfit()
          }}
        >
          <label className="wd-label" htmlFor={`${uid}-name`}>
            Outfit name
          </label>
          <div className="wd-name-row">
            <input ref={nameRef} id={`${uid}-name`} className="field wd-input" type="text" value={name} maxLength={MAX_OUTFIT_NAME} autoComplete="off" onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="btn btn-primary">
              {editor.kind === 'rename' ? 'Save name' : 'Save outfit'}
            </button>
            <button type="button" className="btn" onClick={() => setEditor(null)}>
              Not now
            </button>
          </div>
        </form>
      ) : (
        <div className="wd-save-row">
          <button id={`${uid}-save-outfit`} type="button" className="btn wd-save-outfit" disabled={full || isEmptyOutfit(equipped) || Boolean(current)} onClick={startNaming}>
            Save this outfit
          </button>
          {saveHint && <p className="wd-note">{saveHint}</p>}
        </div>
      )}
    </section>
  )

  return (
    <section className="wd screen-fit" aria-labelledby={`${uid}-title`}>
      <ScreenHeader id={`${uid}-title`} title={`Dress up ${pet.name}`} />

      <div className="wd-body">
        <WardrobePreview pet={pet} />

        <div className="wd-side">
          <div className="wd-tabs seg" role="tablist" aria-label="Where it goes">
            <SegThumb />
            {sections.map((s, i) => (
              <button
                key={s.key}
                id={`${uid}-tab-${s.key}`}
                type="button"
                role="tab"
                className="wd-tab seg-btn"
                aria-selected={showing === s.key}
                aria-controls={`${uid}-panel`}
                tabIndex={showing === s.key ? 0 : -1}
                onClick={() => setPicked(s.key)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {s.label}
                {s.key !== 'saved' && equipped[s.key] && <span className="wd-tab-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${showing}`} className="wd-panel">
            {showing !== 'saved' && itemsGrid}
            {(wide || showing === 'saved') && saved}
          </div>

        </div>
      </div>
    </section>
  )
}
