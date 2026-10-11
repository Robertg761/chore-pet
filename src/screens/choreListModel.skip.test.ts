import { describe, expect, it } from 'vitest'
import { skipChore } from '../data/actions'
import type { Chore, Completion, Schedule } from '../domain/types'
import { buildSections, shortRows, type ChoreRow } from './choreListModel'

// Fixed dates only. 2026-10-06 is a Tuesday.
const chore = (id: string, name: string, createdOn: string, schedule: Schedule = { kind: 'daily' }): Chore => ({
  id,
  homeId: 'h',
  objectId: null,
  name,
  schedule,
  createdOn,
  photoProof: false,
})
const done = (choreId: string, on: string): Completion => ({ id: `${choreId}-${on}`, choreId, completedAt: `${on}T10:00:00Z`, completedOn: on })
/** The chore as it is after "Skip this time" on `day`, via the real action. */
const skipped = (c: Chore, day: string): Chore => {
  const [op] = skipChore(c, day) as Extract<ReturnType<typeof skipChore>[number], { table: 'chores'; kind: 'upsert' }>[]
  return op.value
}

const today = '2026-10-06'
const rowOf = (sections: ReturnType<typeof buildSections>, id: string): ChoreRow => {
  const row = sections.flatMap((s) => s.rows).find((r) => r.chore.id === id)
  if (!row) throw new Error(`no row for ${id}`)
  return row
}

describe('buildSections with a skipped round', () => {
  it('a chore skipped today is upcoming, in Done today, marked doneToday, skippedToday and allSet', () => {
    const c = skipped(chore('a', 'Dishes', today), today)
    const sections = buildSections([c], [], [], today)
    expect(sections.map((s) => s.id)).toEqual(['done'])
    expect(sections[0].title).toBe('Done or skipped today')
    const row = sections[0].rows[0]
    expect(row.status).toMatchObject({ state: 'upcoming', dueDate: '2026-10-07' })
    expect(row).toMatchObject({ label: 'Tomorrow', doneToday: true, skippedToday: true, allSet: true })
  })

  it('a chore done today is not marked skippedToday', () => {
    const sections = buildSections([chore('a', 'Dishes', today)], [done('a', today)], [], today)
    expect(rowOf(sections, 'a')).toMatchObject({ doneToday: true, skippedToday: false, allSet: true })
  })

  it('a chore skipped on an earlier day is not marked done or skipped today', () => {
    // Created 1 Oct, skipped 5 Oct: the 6 Oct round is owed and due today.
    const c = skipped(chore('a', 'Dishes', '2026-10-01'), '2026-10-05')
    const sections = buildSections([c], [], [], today)
    expect(sections.map((s) => s.id)).toEqual(['today'])
    expect(rowOf(sections, 'a')).toMatchObject({ status: { state: 'due' }, doneToday: false, skippedToday: false })
  })

  it('skipping removes a late chore from Running late', () => {
    const late = chore('a', 'Dishes', '2026-10-01')
    expect(buildSections([late], [], [], today).map((s) => s.id)).toEqual(['late'])
    const sections = buildSections([skipped(late, today)], [], [], today)
    expect(sections.map((s) => s.id)).toEqual(['done'])
    expect(sections.flatMap((s) => s.rows).map((r) => r.chore.id)).toEqual(['a'])
    expect(rowOf(sections, 'a')).toMatchObject({ skippedToday: true, allSet: true })
  })

  it('skipping removes a chore due today from Today', () => {
    const due = chore('a', 'Dishes', today)
    expect(buildSections([due], [], [], today).map((s) => s.id)).toEqual(['today'])
    expect(buildSections([skipped(due, today)], [], [], today).map((s) => s.id)).toEqual(['done'])
  })

  it('a skipped chore leaves the short list, and an otherwise caught-up home reads as caught up', () => {
    const sections = buildSections([skipped(chore('a', 'Dishes', today), today)], [], [], today)
    expect(shortRows(sections)).toEqual([])
    expect(sections.some((s) => s.id === 'late' || s.id === 'today')).toBe(false)
  })

  it('a skipped chore sits alongside a still-due chore, which keeps its Today row', () => {
    const chores = [skipped(chore('a', 'Dishes', today), today), chore('b', 'Bins', '2026-10-01', { kind: 'weekly', weekday: 2 })]
    const sections = buildSections(chores, [], [], today)
    expect(sections.map((s) => s.id)).toEqual(['today', 'done'])
    expect(sections[0].rows.map((r) => r.chore.id)).toEqual(['b'])
    expect(sections[1].rows.map((r) => r.chore.id)).toEqual(['a'])
  })

  it('a weekly chore skipped on its own day moves to next week, labelled by weekday', () => {
    // Weekly on Tuesday, created that Tuesday, due today.
    const weekly = chore('w', 'Vacuum the rug', today, { kind: 'weekly', weekday: 2 })
    const row = rowOf(buildSections([skipped(weekly, today)], [], [], today), 'w')
    expect(row.status.dueDate).toBe('2026-10-13')
    expect(row.label).toBe('13 Oct')
  })

  it('a monthly chore skipped at a month end rolls over into the next month', () => {
    // Monthly on the 31st, created 31 Oct: skipping it on 31 Oct moves it to 30 Nov (November has 30 days).
    const monthly = chore('m', 'Vacuum under the couch', '2026-10-31', { kind: 'monthly', dayOfMonth: 31 })
    const sections = buildSections([skipped(monthly, '2026-10-31')], [], [], '2026-10-31')
    expect(sections.map((s) => s.id)).toEqual(['done'])
    expect(rowOf(sections, 'm')).toMatchObject({ label: '30 Nov', allSet: true, skippedToday: true })
    expect(rowOf(sections, 'm').status.dueDate).toBe('2026-11-30')
  })
})
