import { useState } from 'react'
import { SavedHomes } from './SavedHomes'
import { Character } from '../character/Character'
import { SPECIES_COLOUR } from '../art/palette'
import { SPECIES, type Species } from '../domain/types'
import { SAMPLE_PET_NAMES } from '../content/sampleHome'
import './Landing.css'

export interface LandingProps {
  onSample: (species: Species) => void
  onBuild: () => void
}

export function Landing({ onSample, onBuild }: LandingProps) {
  const [species, setSpecies] = useState<Species>('mochi')

  return (
    <section className="landing" aria-labelledby="landing-title">
      <h1 className="landing-title" id="landing-title">Chore Pet</h1>

      <div className="landing-pets" role="group" aria-label="Pick a sample pet">
        {SPECIES.map((s) => (
          <button
            key={s}
            type="button"
            className="landing-pet"
            aria-pressed={s === species}
            onClick={() => setSpecies(s)}
          >
            <span className="landing-pet-art" aria-hidden="true">
              <Character species={s} mood="happy" bodyColour={SPECIES_COLOUR[s]} size={104} title={SAMPLE_PET_NAMES[s]} />
            </span>
            <span className="landing-pet-name">{SAMPLE_PET_NAMES[s]}</span>
          </button>
        ))}
      </div>

      <SavedHomes />

      <p className="landing-pitch">A tiny pet that lives in a home you build. Do real chores, keep it happy.</p>

      <div className="landing-actions">
        <button type="button" className="landing-primary" onClick={() => onSample(species)}>
          Try a sample home
        </button>
        <button type="button" className="landing-secondary" onClick={onBuild}>
          Build my home
        </button>
      </div>
    </section>
  )
}
