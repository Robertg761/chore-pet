// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATALOG } from '../catalog/objects'
import type { FurnitureAppearance } from '../catalog/customization'
import type { PlacedObject } from '../domain/types'
import { click, render } from '../test/react'
import { ObjectSheet } from './ObjectSheet'

const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()))

const entry = CATALOG.find((item) => item.id === 'couch')!
const object: PlacedObject = { id: 'couch-1', roomId: 'room-1', catalogId: 'couch', tileX: 0, tileY: 0, rotation: 0 }

function mount(initial?: FurnitureAppearance, selectedEntry = entry) {
  let savedAppearance = initial
  function Harness() {
    const [appearance, setAppearance] = useState(initial)
    return <ObjectSheet
      object={{ ...object, catalogId: selectedEntry.id, appearance }} entry={selectedEntry} chores={[]} completions={[]} vacations={[]} today="2026-10-11"
      canTurn onSaveChore={vi.fn()} onRemoveChore={vi.fn()} onTurn={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()}
      onAppearanceChange={(next) => { savedAppearance = next; setAppearance(next) }}
    />
  }
  const ui = render(<Harness />)
  cleanups.push(ui.unmount)
  const summary = ui.container.querySelector('.furniture-summary')
  if (summary) click(summary)
  return { ...ui, saved: () => savedAppearance }
}

function choice(root: HTMLElement, label: string) {
  const found = root.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  expect(found, `Missing furniture control: ${label}`).not.toBeNull()
  return found!
}

describe('ObjectSheet furniture customization', () => {
  it('applies Honey oak on the first click when a fridge still has its original appearance', () => {
    const ui = mount(undefined, CATALOG.find((item) => item.id === 'fridge')!)
    const originalDrawing = ui.container.querySelector('.sheet-art')!.innerHTML
    expect(ui.container.querySelectorAll('input[type="radio"]:checked')).toHaveLength(0)
    click(choice(ui.container, 'Honey oak finish'))
    expect(ui.saved()).toEqual({ style: 'classic', finish: 'natural', fabric: 'blue', pattern: 'plain', details: true })
    expect(choice(ui.container, 'Honey oak finish').checked).toBe(true)
    expect(ui.container.querySelector('.sheet-art')!.innerHTML).not.toBe(originalDrawing)
  })

  it('changes style while preserving the selected materials and pattern', () => {
    const ui = mount({ style: 'cottage', finish: 'walnut', fabric: 'rose', pattern: 'checks', details: false })
    click(choice(ui.container, 'Modern style'))
    expect(ui.saved()).toEqual({ style: 'modern', finish: 'walnut', fabric: 'rose', pattern: 'checks', details: false })
    expect(choice(ui.container, 'Modern style').checked).toBe(true)
    expect(choice(ui.container, 'Cottage style').checked).toBe(false)
    expect(choice(ui.container, 'Walnut finish').checked).toBe(true)
    expect(choice(ui.container, 'Rose fabric').checked).toBe(true)
    expect(choice(ui.container, 'Checks pattern').checked).toBe(true)
  })

  it('saves each color, pattern, and detail choice immediately', () => {
    const ui = mount()
    click(choice(ui.container, 'Birch finish'))
    click(choice(ui.container, 'Mint fabric'))
    click(choice(ui.container, 'Dots pattern'))
    click(choice(ui.container, 'Decorative details'))
    expect(ui.saved()).toEqual({ style: 'classic', finish: 'birch', fabric: 'mint', pattern: 'dots', details: false })
    expect(choice(ui.container, 'Mint fabric').checked).toBe(true)
    expect(choice(ui.container, 'Decorative details').checked).toBe(false)
  })

  it('resets the original appearance without changing chores or removing the object', () => {
    const ui = mount({ style: 'industrial', finish: 'charcoal', fabric: 'sky', pattern: 'stripes', details: false })
    const reset = ui.container.querySelector<HTMLButtonElement>('button[aria-label="Reset furniture appearance"]')
    expect(reset).not.toBeNull()
    click(reset!)
    expect(ui.saved()).toBeUndefined()
    expect(ui.container.querySelectorAll('input[type="radio"]:checked')).toHaveLength(0)
    expect(ui.container.querySelector('.furniture-summary-style')?.textContent).toBe('Original')
    expect(choice(ui.container, 'Decorative details').checked).toBe(true)
    expect(ui.container.querySelector('.sheet-title')?.textContent).toBe('Couch')
    expect(ui.container.textContent).toContain('Add a chore')
  })
})
