// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { click, render } from '../test/react'
import { HealthBar } from './HealthBar'
import { ChoreEditor } from './ChoreEditor'
import { CatalogTray } from './CatalogTray'
import { CATALOG } from '../catalog/objects'
import type { Chore } from '../domain/types'

// Component tests for commit a639840: the streak chip on the home health bar,
// "Skip this time" in the chore editor, and the build tray grouped by room.

const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((fn) => fn()))

function mount(content: ReactNode) {
  const ui = render(content)
  cleanups.push(ui.unmount)
  return ui
}

// ---------- HealthBar ----------

const streakChip = (root: HTMLElement) => root.querySelector<HTMLElement>('.hb-streak')
/** The visible chip text (the sr-only copy is a sibling, so this is just the aria-hidden span). */
const visibleStreak = (root: HTMLElement) => root.querySelector('.hb-streak > span[aria-hidden="true"]')?.textContent
const srStreak = (root: HTMLElement) => root.querySelector('.hb-streak > .sr-only')?.textContent

describe('HealthBar streak chip', () => {
  it('shows no chip when the streak is 0 or missing, home or on vacation', () => {
    const ui = mount(<HealthBar health={80} mood="content" away={false} />)
    expect(streakChip(ui.container)).toBeNull()
    ui.rerender(<HealthBar health={80} mood="content" away={false} streak={0} />)
    expect(streakChip(ui.container)).toBeNull()
    ui.rerender(<HealthBar health={80} mood="content" away={true} streak={0} />)
    expect(streakChip(ui.container)).toBeNull()
  })

  it('shows the day count visibly and "Streak: 3 days in a row" to screen readers', () => {
    const ui = mount(<HealthBar health={80} mood="happy" away={false} streak={3} />)
    expect(streakChip(ui.container)).not.toBeNull()
    expect(visibleStreak(ui.container)).toBe('3')
    expect(srStreak(ui.container)).toBe('Streak: 3 days in a row')
  })

  it('uses the singular screen-reader text for one day', () => {
    const ui = mount(<HealthBar health={80} mood="happy" away={false} streak={1} />)
    expect(visibleStreak(ui.container)).toBe('1')
    expect(srStreak(ui.container)).toBe('Streak: 1 day')
  })

  it('keeps the chip while on vacation', () => {
    const ui = mount(<HealthBar health={100} mood="happy" away={true} streak={2} />)
    expect(ui.container.querySelector('.hb-away .hb-streak')).not.toBeNull()
    expect(visibleStreak(ui.container)).toBe('2')
    expect(srStreak(ui.container)).toBe('Streak: 2 days in a row')
    expect(ui.container.textContent).toContain('On vacation')
  })

  it('leaves the health meter aria attributes unchanged and outside the chip', () => {
    const ui = mount(<HealthBar health={64} mood="meh" away={false} streak={3} />)
    const meter = ui.container.querySelector('[role="meter"]')!
    expect(meter).not.toBeNull()
    expect(meter.getAttribute('aria-label')).toBe('Health')
    expect(meter.getAttribute('aria-valuemin')).toBe('0')
    expect(meter.getAttribute('aria-valuemax')).toBe('100')
    expect(meter.getAttribute('aria-valuenow')).toBe('64')
    expect(meter.getAttribute('aria-valuetext')).toBe('64 out of 100, feeling meh')
    expect(meter.contains(streakChip(ui.container))).toBe(false)
  })

  it('reads a sick pet as poorly in the meter text', () => {
    const ui = mount(<HealthBar health={10} mood="sick" away={false} />)
    expect(ui.container.querySelector('[role="meter"]')!.getAttribute('aria-valuetext')).toBe('10 out of 100, feeling poorly')
  })
})

// ---------- ChoreEditor ----------

const chore: Chore = { id: 'c1', homeId: 'h1', objectId: null, name: 'Dishes', schedule: { kind: 'daily' }, createdOn: '2026-10-06', photoProof: false }

/** The button with this exact label, if there is one. */
const button = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === name)

describe('ChoreEditor "Skip this time"', () => {
  it('sits beside Save and calls onSkip once, never onSave', () => {
    const onSave = vi.fn()
    const onSkip = vi.fn()
    const onCancel = vi.fn()
    const ui = mount(<ChoreEditor chore={chore} onSave={onSave} onSkip={onSkip} onCancel={onCancel} />)
    const skip = button(ui.container, 'Skip this time')!
    const save = button(ui.container, 'Save')!
    expect(skip).toBeDefined()
    expect(save).toBeDefined()
    expect(skip.parentElement).toBe(save.parentElement)
    expect(skip.parentElement!.classList.contains('editor-actions')).toBe(true)
    expect(skip.type).toBe('button')
    click(skip)
    expect(onSkip).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('is not shown for an existing chore without onSkip', () => {
    const ui = mount(<ChoreEditor chore={chore} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(button(ui.container, 'Save')).toBeDefined()
    expect(button(ui.container, 'Skip this time')).toBeUndefined()
    expect(ui.container.textContent).not.toContain('Skip this time')
  })

  it('is not shown for a new chore without onSkip', () => {
    const ui = mount(<ChoreEditor onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(button(ui.container, 'Save')).toBeDefined()
    expect(button(ui.container, 'Skip this time')).toBeUndefined()
    expect(ui.container.textContent).not.toContain('Skip this time')
  })
})

// ---------- CatalogTray ----------

const tileFor = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('.tray-tile')].find((b) => b.querySelector('.tray-name')?.textContent === name)!
const tileNames = (root: HTMLElement) => [...root.querySelectorAll('.tray-name')].map((n) => n.textContent ?? '')
const labelledHeading = (root: HTMLElement, group: Element) => {
  const id = group.getAttribute('aria-labelledby')!
  return { id, target: root.ownerDocument.getElementById(id) }
}

describe('CatalogTray one-row groups', () => {
  it('labels each .tray-section with an h3 that its aria-labelledby points at', () => {
    const ui = mount(<CatalogTray roomType="kitchen" objects={[]} onPick={vi.fn()} oneRow />)
    const sections = [...ui.container.querySelectorAll('.tray-section')]
    expect(sections.length).toBeGreaterThan(0)
    for (const section of sections) {
      expect(section.getAttribute('role')).toBe('group')
      const heading = section.querySelector('h3')!
      expect(heading).not.toBeNull()
      expect(heading.classList.contains('tray-section-label')).toBe(true)
      expect(heading.textContent?.trim()).not.toBe('')
      const { target } = labelledHeading(ui.container, section)
      expect(target).toBe(heading)
    }
  })

  it('leads with a Kitchen group in a kitchen', () => {
    const ui = mount(<CatalogTray roomType="kitchen" objects={[]} onPick={vi.fn()} oneRow />)
    const labels = [...ui.container.querySelectorAll('.tray-section > h3')].map((h) => h.textContent)
    expect(labels[0]).toBe('Kitchen')
    expect(labels).toContain('Bathroom')
    expect(labels.indexOf('Bathroom')).toBeGreaterThan(0)
  })

  it('shows every catalog object once as a tile', () => {
    const ui = mount(<CatalogTray roomType="kitchen" objects={[]} onPick={vi.fn()} oneRow />)
    expect(ui.container.querySelectorAll('.tray-section .tray-tile')).toHaveLength(CATALOG.length)
    expect(tileNames(ui.container).sort()).toEqual(CATALOG.map((e) => e.name).sort())
  })

  it('calls onPick with the entry of the tile that was clicked', () => {
    const onPick = vi.fn()
    const sink = CATALOG.find((e) => e.id === 'sink')!
    const ui = mount(<CatalogTray roomType="kitchen" objects={[]} onPick={onPick} oneRow />)
    click(tileFor(ui.container, sink.name))
    expect(onPick).toHaveBeenCalledOnce()
    expect(onPick.mock.calls[0][0]).toBe(sink)
  })
})

describe('CatalogTray default groups', () => {
  it('still renders For this room and Everything else when not in one row', () => {
    const ui = mount(<CatalogTray roomType="kitchen" objects={[]} onPick={vi.fn()} />)
    expect(ui.container.querySelector('.tray-section')).toBeNull()
    const groups = [...ui.container.querySelectorAll('[role="group"]')]
    expect(groups.map((g) => g.querySelector('h3')?.textContent)).toEqual(['For this room', 'Everything else'])
    for (const group of groups) {
      expect(labelledHeading(ui.container, group).target).toBe(group.querySelector('h3'))
    }
    expect(ui.container.querySelectorAll('.tray-tile')).toHaveLength(CATALOG.length)
  })

  it('titles the only group All things when nothing suits the room', () => {
    const ui = mount(<CatalogTray roomType="other" objects={[]} onPick={vi.fn()} />)
    expect([...ui.container.querySelectorAll('[role="group"] > h3')].map((h) => h.textContent)).toEqual(['All things'])
  })
})
