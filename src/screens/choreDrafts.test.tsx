// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { ChoreEditor } from './ChoreEditor'
import { ChoreDraftContext, useChoreDrafts } from './choreDrafts'
import type { Chore } from '../domain/types'
import { click, input, render } from '../test/react'

const chore: Chore = { id: 'c1', homeId: 'h1', objectId: null, name: 'Dishes', schedule: { kind: 'daily' }, createdOn: '2026-10-07', photoProof: false }
const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((fn) => fn()))
function Harness({ scope = 'account:home', visible = true, existing = false, chores = [chore], onSave = vi.fn() }: { scope?: string; visible?: boolean; existing?: boolean; chores?: Chore[]; onSave?: () => void }) {
  const drafts = useChoreDrafts(scope, chores, [])
  return <ChoreDraftContext value={drafts}>{visible && <ChoreEditor chore={existing ? chore : undefined} onSave={onSave} onCancel={() => {}} />}</ChoreDraftContext>
}
it.each([false, true])('retains %s existing/new draft across unmounts and clears it on Cancel', (existing) => {
  const ui = render(<Harness existing={existing} />); cleanups.push(ui.unmount)
  input(ui.container.querySelector('input[type=text]')!, 'Clean air filter')
  ui.rerender(<Harness visible={false} existing={existing} />)
  ui.rerender(<Harness existing={existing} />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('Clean air filter')
  click(ui.container.querySelector('button.sh-back')!)
  ui.rerender(<Harness visible={false} existing={existing} />)
  ui.rerender(<Harness existing={existing} />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe(existing ? 'Dishes' : '')
})
it('clears saved drafts and warns before leaving while unsaved drafts exist', () => {
  const onSave = vi.fn()
  const ui = render(<Harness onSave={onSave} />); cleanups.push(ui.unmount)
  input(ui.container.querySelector('input[type=text]')!, 'Clean air filter')
  const leaving = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(leaving)
  expect(leaving.defaultPrevented).toBe(true)
  click(ui.container.querySelector('button[type=submit]')!)
  expect(onSave).toHaveBeenCalledOnce()
  const saved = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(saved)
  expect(saved.defaultPrevented).toBe(false)
  ui.rerender(<Harness visible={false} />); ui.rerender(<Harness />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('')
})
it('forgets drafts on account/home changes and after deletion or archival', () => {
  const ui = render(<Harness existing />); cleanups.push(ui.unmount)
  input(ui.container.querySelector('input[type=text]')!, 'Private draft')
  ui.rerender(<Harness existing scope="other:home" />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('Dishes')
  input(ui.container.querySelector('input[type=text]')!, 'Deleted draft')
  ui.rerender(<Harness existing visible={false} chores={[]} scope="other:home" />)
  ui.rerender(<Harness existing scope="other:home" />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('Dishes')
  input(ui.container.querySelector('input[type=text]')!, 'Archived draft')
  ui.rerender(<Harness existing visible={false} chores={[{ ...chore, archivedOn: '2026-10-07' } as Chore]} scope="other:home" />)
  ui.rerender(<Harness existing scope="other:home" />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('Dishes')
})

it('keeps inline new drafts separate for each object and clears them after object removal', async () => {
  const { ChoreInlineEditor } = await import('./ChoreInlineEditor')
  type ObjectRow = import('../domain/types').PlacedObject
  const objects = [{ id: 'sink' }, { id: 'table' }] as ObjectRow[]
  function Inline({ id, present = objects }: { id: string; present?: ObjectRow[] }) {
    const drafts = useChoreDrafts('account:home', [], present)
    return <ChoreDraftContext value={drafts}><ChoreInlineEditor draftKey={`object:${id}`} onSave={() => {}} onCancel={() => {}} /></ChoreDraftContext>
  }
  const ui = render(<Inline id="sink" />); cleanups.push(ui.unmount)
  input(ui.container.querySelector('input[type=text]')!, 'Wash sink')
  ui.rerender(<Inline id="table" />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('')
  input(ui.container.querySelector('input[type=text]')!, 'Wipe table')
  ui.rerender(<Inline id="sink" />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('Wash sink')
  ui.rerender(<Inline id="table" present={[objects[1]]} />)
  ui.rerender(<Inline id="sink" />)
  expect(ui.container.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('')
})
