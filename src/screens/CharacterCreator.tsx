import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Character, CharacterArt } from '../character/Character'
import { SPECIES, type CheekStyle, type EyeStyle, type Pet, type Species } from '../domain/types'
import {
  CHEEK_OPTIONS,
  EYE_OPTIONS,
  changesFrom,
  colourAfterSpeciesChange,
  colourName,
  draftFromPet,
  sameColour,
  swatchesFor,
} from './creatorModel'
import { useViewport, WIDE_MIN } from '../shell/useViewport'
import './CharacterCreator.css'

export type PetLookPatch = Partial<Pick<Pet, 'name' | 'species' | 'bodyColour' | 'eyes' | 'cheeks'>>

export interface CharacterCreatorProps {
  pet: Pet
  onSave: (patch: PetLookPatch) => void
  onClose: () => void
}

const MAX_NAME = 20
const CHEER_MS = 1000

type Part = 'who' | 'colour' | 'face'
const PARTS: { part: Part; label: string }[] = [
  { part: 'who', label: 'Who' },
  { part: 'colour', label: 'Colour' },
  { part: 'face', label: 'Face' },
]

const SPECIES_LABEL: Record<Species, string> = { mochi: 'Mochi', bun: 'Bun', sprout: 'Sprout' }

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface ChoiceGroupProps<T extends string> {
  label: string
  value: T | undefined
  options: readonly { value: T; label: string; content: ReactNode }[]
  onChange: (value: T) => void
  className: string
}

/** A radio group of buttons with arrow-key movement (one tab stop, like native radios). */
function ChoiceGroup<T extends string>({ label, value, options, onChange, className }: ChoiceGroupProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const checkedIndex = options.findIndex((o) => o.value === value)
  const tabIndexFor = (i: number) => (i === (checkedIndex < 0 ? 0 : checkedIndex) ? 0 : -1)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = Math.max(checkedIndex, 0)
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (from + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (from - 1 + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    if (next === null) return
    e.preventDefault()
    onChange(options[next].value)
    ref.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div ref={ref} className={className} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.label}
          tabIndex={tabIndexFor(i)}
          className="cc-choice"
          onClick={() => onChange(o.value)}
        >
          {o.content}
        </button>
      ))}
    </div>
  )
}

/** Just the face area of the pet (no outfit), so each option shows what it changes. */
function FaceCrop({ species, bodyColour, eyes, cheeks }: { species: Species; bodyColour: string; eyes: EyeStyle; cheeks: CheekStyle }) {
  return (
    <svg className="cc-face" viewBox="46 102 108 56" aria-hidden="true" focusable="false">
      <CharacterArt species={species} mood="happy" bodyColour={bodyColour} look={{ eyes, cheeks }} />
    </svg>
  )
}

export function CharacterCreator({ pet, onSave, onClose }: CharacterCreatorProps) {
  const [draft, setDraft] = useState(() => draftFromPet(pet))
  const [cheering, setCheering] = useState(false)
  const [nameError, setNameError] = useState(false)
  const wide = useViewport().width >= WIDE_MIN
  const [part, setPart] = useState<Part>('who')
  const tabsRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const cheer = () => {
    if (prefersReducedMotion()) return
    window.clearTimeout(timer.current)
    setCheering(true)
    timer.current = window.setTimeout(() => setCheering(false), CHEER_MS)
  }

  const change = (patch: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    // The cheer squeezes the eyes shut, so face choices show the face instead.
    if (!('eyes' in patch) && !('cheeks' in patch)) cheer()
  }

  const chooseSpecies = (species: Species) => {
    if (species === draft.species) return
    change({ species, bodyColour: colourAfterSpeciesChange(draft.bodyColour, draft.species, species) })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    const patch = changesFrom(pet, draft)
    if (Object.keys(patch).length) onSave(patch)
    onClose()
  }

  const { species, bodyColour, eyes, cheeks } = draft
  const look = { eyes, cheeks }
  const swatches = swatchesFor(bodyColour)
  const selectedColour = swatches.find((c) => sameColour(c.hex, bodyColour))?.hex

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? PARTS.length - 1 : (index + step + PARTS.length) % PARTS.length
    setPart(PARTS[next].part)
    tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
  }

  // Phones show one part at a time under tabs; wide screens show them all.
  const shows = (p: Part) => wide || part === p
  const hide = wide ? undefined : 'cc-sr'

  const who = (
    <section className="cc-section" aria-labelledby="cc-species-h">
      <h2 id="cc-species-h" className={hide}>Who</h2>
      <ChoiceGroup
        className="cc-species"
        label="Species"
        value={species}
        onChange={chooseSpecies}
        options={SPECIES.map((s) => ({
          value: s,
          label: SPECIES_LABEL[s],
          content: (
            <>
              <span className="cc-species-art" aria-hidden="true">
                <Character species={s} mood="happy" bodyColour={bodyColour} size={88} title={SPECIES_LABEL[s]} />
              </span>
              <span className="cc-species-name">{SPECIES_LABEL[s]}</span>
            </>
          ),
        }))}
      />
      <p className="cc-hint">Your pet keeps what it is wearing.</p>
    </section>
  )

  const colour = (
    <section className="cc-section" aria-labelledby="cc-colour-h">
      <h2 id="cc-colour-h">
        Body colour <span className="cc-current">{colourName(bodyColour)}</span>
      </h2>
      <ChoiceGroup
        className="cc-swatches"
        label="Body colour"
        value={selectedColour}
        onChange={(hex) => change({ bodyColour: hex })}
        options={swatches.map((c) => ({
          value: c.hex,
          label: c.name,
          content: <span className="cc-swatch" style={{ backgroundColor: c.hex }} aria-hidden="true" />,
        }))}
      />
    </section>
  )

  const face = (
    <>
      <section className="cc-section" aria-labelledby="cc-eyes-h">
        <h2 id="cc-eyes-h">Eyes</h2>
        <ChoiceGroup
          className="cc-faces"
          label="Eyes"
          value={eyes}
          onChange={(v) => change({ eyes: v })}
          options={EYE_OPTIONS.map((o) => ({
            ...o,
            content: (
              <>
                <FaceCrop species={species} bodyColour={bodyColour} eyes={o.value} cheeks={cheeks} />
                <span className="cc-face-label">{o.label}</span>
              </>
            ),
          }))}
        />
      </section>

      <section className="cc-section" aria-labelledby="cc-cheeks-h">
        <h2 id="cc-cheeks-h">Cheeks</h2>
        <ChoiceGroup
          className="cc-faces"
          label="Cheeks"
          value={cheeks}
          onChange={(v) => change({ cheeks: v })}
          options={CHEEK_OPTIONS.map((o) => ({
            ...o,
            content: (
              <>
                <FaceCrop species={species} bodyColour={bodyColour} eyes={eyes} cheeks={o.value} />
                <span className="cc-face-label">{o.label}</span>
              </>
            ),
          }))}
        />
      </section>
    </>
  )

  const options = (
    <>
      {shows('who') && who}
      {shows('colour') && colour}
      {shows('face') && face}
    </>
  )

  return (
    <form className="cc" onSubmit={submit} aria-labelledby="cc-title" noValidate>
      <header className="cc-head">
        <h1 className="cc-title" id="cc-title">Change look</h1>
        <div className="cc-head-actions">
          <button type="button" className="link-button cc-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="cc-save">
            Save
          </button>
        </div>
      </header>

      <div className="cc-body">
        <div className="cc-stage">
          <div className={`cc-preview${cheering ? ' cc-cheer' : ''}`}>
            <Character
              species={species}
              mood="happy"
              pose={cheering ? 'cheering' : undefined}
              bodyColour={bodyColour}
              equipped={pet.equipped}
              look={look}
              size={170}
              title={`${draft.name.trim() || 'Your pet'}, ${SPECIES_LABEL[species]}`}
            />
          </div>

          <div className="cc-field">
            <div className="cc-field-row">
              <label htmlFor="cc-name">Name</label>
              <input
                id="cc-name"
                ref={nameRef}
                type="text"
                value={draft.name}
                maxLength={MAX_NAME}
                autoComplete="off"
                aria-invalid={nameError && !draft.name.trim()}
                aria-describedby={nameError && !draft.name.trim() ? 'cc-name-error' : undefined}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, name: e.target.value }))
                  setNameError(false)
                }}
              />
            </div>
            {nameError && !draft.name.trim() && (
              <p className="cc-error" id="cc-name-error" role="alert">
                Every pet needs a name.
              </p>
            )}
          </div>
        </div>

        <div className="cc-side">
          {!wide && (
            <div ref={tabsRef} className="cc-tabs" role="tablist" aria-label="What to change">
              {PARTS.map((p, i) => (
                <button
                  key={p.part}
                  id={`cc-tab-${p.part}`}
                  type="button"
                  role="tab"
                  className="cc-tab"
                  aria-selected={part === p.part}
                  aria-controls="cc-panel"
                  tabIndex={part === p.part ? 0 : -1}
                  onClick={() => setPart(p.part)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {wide ? (
            <div className="cc-panel">{options}</div>
          ) : (
            <div id="cc-panel" role="tabpanel" aria-labelledby={`cc-tab-${part}`} className="cc-panel">
              {options}
            </div>
          )}
          {wide && <p className="cc-hint cc-note">Changes show here first. They are saved when you tap Save.</p>}
        </div>
      </div>
    </form>
  )
}
