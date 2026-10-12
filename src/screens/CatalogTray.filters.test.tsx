// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { click, input, render } from '../test/react'
import { CatalogTray } from './CatalogTray'

const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()))

function mount(content: ReactNode) {
  const ui = render(content)
  cleanups.push(ui.unmount)
  return ui
}

const names = (root: HTMLElement) => [...root.querySelectorAll('.tray-name')].map((name) => name.textContent)
const search = (root: HTMLElement) => root.querySelector<HTMLInputElement>('input[type="search"]')!

function chooseCategory(root: HTMLElement, value: string) {
  const select = root.querySelector<HTMLSelectElement>('select[aria-label="Furniture category"]')!
  act(() => {
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('CatalogTray filters', () => {
  it('finds a furniture name regardless of case and extra spaces, then restores room groups', () => {
    const ui = mount(<CatalogTray roomType="kitchen" objects={[]} onPick={vi.fn()} oneRow />)
    expect(search(ui.container)).not.toBeNull()
    input(search(ui.container), '  WASHING   MACHINE  ')
    expect(names(ui.container)).toEqual(['Washing machine'])
    input(search(ui.container), '')
    expect(names(ui.container)).toContain('Couch')
    expect(ui.container.querySelector('.tray-section-label')?.textContent).toBe('Kitchen')
  })

  it('combines category and search filters without changing direct placement', () => {
    const onPick = vi.fn()
    const ui = mount(<CatalogTray roomType="living" objects={[]} onPick={onPick} />)
    expect(ui.container.querySelector('select[aria-label="Furniture category"]')).not.toBeNull()
    chooseCategory(ui.container, 'tables')
    expect(names(ui.container)).toContain('Dining table')
    expect(names(ui.container)).not.toContain('Couch')
    input(search(ui.container), 'dining')
    expect(names(ui.container)).toEqual(['Dining table'])
    click(ui.container.querySelector('.tray-tile')!)
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'dining-table' }))
  })

  it('does not offer unearned decor when searching or filtering', () => {
    const ui = mount(<CatalogTray roomType="living" objects={[]} onPick={vi.fn()} />)
    expect(search(ui.container)).not.toBeNull()
    chooseCategory(ui.container, 'seating')
    input(search(ui.container), 'bean')
    expect(names(ui.container)).not.toContain('Bean bag')
    ui.rerender(<CatalogTray roomType="living" objects={[]} onPick={vi.fn()} unlocked={['decor:bean-bag']} />)
    expect(names(ui.container)).toEqual(['Bean bag'])
  })

  it('hides furniture without space only when requested and offers a way to clear filters', () => {
    const ui = mount(<CatalogTray roomType="living" objects={[]} reserved={[{ tx: 0, ty: 0, w: 20, d: 20 }]} onPick={vi.fn()} />)
    expect(search(ui.container)).not.toBeNull()
    input(search(ui.container), 'couch')
    expect(ui.container.querySelector<HTMLButtonElement>('.tray-tile')?.disabled).toBe(true)
    click(ui.container.querySelector('input[aria-label="Only show what fits"]')!)
    expect(names(ui.container)).toEqual([])
    expect(ui.container.textContent).toContain('No furniture matches')
    click(ui.container.querySelector('button[aria-label="Clear furniture filters"]')!)
    expect(names(ui.container)).toContain('Couch')
    expect(search(ui.container).value).toBe('')
  })
})
