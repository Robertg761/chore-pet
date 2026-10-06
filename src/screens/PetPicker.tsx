import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Character } from '../character/Character'
import { SPECIES_COLOUR } from '../art/palette'
import { SPECIES, type Species } from '../domain/types'
import './PetPicker.css'

export interface PetPickerProps {
  onChoose: (choice: { species: Species; name: string }) => void
}

const INFO: Record<Species, { label: string; blurb: string }> = {
  mochi: { label: 'Mochi', blurb: 'A soft little dumpling' },
  bun: { label: 'Bun', blurb: 'Ears that tell you how it feels' },
  sprout: { label: 'Sprout', blurb: 'A seedling that perks up when you do' },
}

const MAX_NAME = 20

export function PetPicker({ onChoose }: PetPickerProps) {
  const [species, setSpecies] = useState<Species>('mochi')
  const [name, setName] = useState('')
  const cardRefs = useRef<Partial<Record<Species, HTMLButtonElement | null>>>({})

  const select = (s: Species, focus = false) => {
    setSpecies(s)
    if (focus) cardRefs.current[s]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SPECIES.indexOf(species)
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % SPECIES.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + SPECIES.length) % SPECIES.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = SPECIES.length - 1
    if (next === null) return
    e.preventDefault()
    select(SPECIES[next], true)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onChoose({ species, name: name.trim() || INFO[species].label })
  }

  return (
    <form className="picker" onSubmit={submit}>
      <h1 className="picker-title" id="picker-title">Who's moving in?</h1>
      <p className="picker-sub">Pick a friend for your new home.</p>

      <div className="picker-cards" role="radiogroup" aria-labelledby="picker-title" onKeyDown={onKeyDown}>
        {SPECIES.map((s) => {
          const selected = s === species
          return (
            <button
              key={s}
              ref={(el) => {
                cardRefs.current[s] = el
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              className="picker-card"
              onClick={() => select(s)}
            >
              <span className="picker-art" aria-hidden="true">
                <Character
                  species={s}
                  mood="happy"
                  pose={selected ? 'cheering' : undefined}
                  bodyColour={SPECIES_COLOUR[s]}
                  size={104}
                  title={INFO[s].label}
                />
              </span>
              <span className="picker-name">{INFO[s].label}</span>
              <span className="picker-blurb">{INFO[s].blurb}</span>
            </button>
          )
        })}
      </div>

      <div className="picker-field">
        <label htmlFor="pet-name">Name your pet</label>
        <input
          id="pet-name"
          type="text"
          value={name}
          maxLength={MAX_NAME}
          placeholder={INFO[species].label}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <button type="submit" className="picker-go">Move in</button>
    </form>
  )
}
