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
import './CharacterCreator.css'

export type PetLookPatch = Partial<Pick<Pet, 'name' | 'species' | 'bodyColour' | 'eyes' | 'cheeks'>>

export interface CharacterCreatorProps {
  pet: Pet
  onSave: (patch: PetLookPatch) => void
  onClose: () => void
}

const MAX_NAME = 20
const CHEER_MS = 1000

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

  return (
    <form className="cc" onSubmit={submit} aria-labelledby="cc-title" noValidate>
      <div className="cc-stage">
        <h1 className="cc-title" id="cc-title">Change look</h1>
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
      </div>

      <div className="cc-field">
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
        {nameError && !draft.name.trim() && (
          <p className="cc-error" id="cc-name-error" role="alert">
            Every pet needs a name.
          </p>
        )}
      </div>

      <section className="cc-section" aria-labelledby="cc-species-h">
        <h2 id="cc-species-h">Who</h2>
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

      <p className="cc-hint cc-note">Changes show here first. They are saved when you tap Save.</p>

      <div className="cc-actions">
        <button type="button" className="cc-cancel" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="cc-save">
          Save
        </button>
      </div>
    </form>
  )
}

