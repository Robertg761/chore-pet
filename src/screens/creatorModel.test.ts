import { describe, expect, it } from 'vitest'
import { PALETTE, SPECIES_COLOUR } from '../art/palette'
import type { Pet } from '../domain/types'
import { BODY_COLOURS, changesFrom, colourAfterSpeciesChange, colourName, draftFromPet, swatchesFor } from './creatorModel'

const pet: Pet = { id: 'p', homeId: 'h', name: 'Mochi', species: 'mochi', bodyColour: SPECIES_COLOUR.mochi, equipped: { head: 'party-hat' } }

describe('body colours', () => {
  it('offers ten distinct colours including each species default', () => {
    expect(BODY_COLOURS).toHaveLength(10)
    expect(new Set(BODY_COLOURS.map((c) => c.hex.toLowerCase())).size).toBe(10)
    for (const hex of Object.values(SPECIES_COLOUR)) expect(BODY_COLOURS.some((c) => c.hex === hex)).toBe(true)
  })

  it('adds the current colour when it is not one of ours', () => {
    expect(swatchesFor(PALETTE.sky)).toHaveLength(10)
    expect(swatchesFor('#123456')).toHaveLength(11)
    expect(colourName('#123456')).toBe('Current')
    expect(colourName(PALETTE.sky.toLowerCase())).toBe('Sky')
  })
})

describe('colourAfterSpeciesChange', () => {
  it('follows the new species default when the colour is still the old default', () => {
    expect(colourAfterSpeciesChange(SPECIES_COLOUR.mochi, 'mochi', 'bun')).toBe(SPECIES_COLOUR.bun)
  })
  it('keeps a custom colour', () => {
    expect(colourAfterSpeciesChange(PALETTE.sky, 'mochi', 'sprout')).toBe(PALETTE.sky)
  })
  it('keeps another species default that was picked on purpose', () => {
    expect(colourAfterSpeciesChange(SPECIES_COLOUR.sprout, 'mochi', 'bun')).toBe(SPECIES_COLOUR.sprout)
  })
})

describe('changesFrom', () => {
  it('is empty when nothing changed, treating missing face options as the defaults', () => {
    expect(changesFrom(pet, draftFromPet(pet))).toEqual({})
    expect(changesFrom(pet, { ...draftFromPet(pet), eyes: 'classic', cheeks: 'round' })).toEqual({})
  })
  it('lists only changed fields and trims the name', () => {
    expect(changesFrom(pet, { ...draftFromPet(pet), name: '  Pip ', eyes: 'lashes' })).toEqual({ name: 'Pip', eyes: 'lashes' })
  })
  it('never touches what the pet wears', () => {
    expect(changesFrom(pet, { ...draftFromPet(pet), species: 'bun' })).toEqual({ species: 'bun' })
  })
})
