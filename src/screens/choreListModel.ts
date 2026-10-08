import { diffDays, isInVacation, weekdayOf } from '../domain/dates'
import { choreActiveOn, choreStatus, completionCounts, completionDays, skippedOn, type ChoreStatus } from '../domain/schedule'
import type { Chore, Completion, ISODate, VacationWindow } from '../domain/types'

export type SectionId = 'late' | 'today' | 'soon' | 'done'

export interface ChoreRow {
  chore: Chore
  status: ChoreStatus
  /** Short friendly status, e.g. "2 days late", "Today", "Thu", "12 Oct". */
  label: string
  /** Finished (or skipped) today, so it's waiting for its next round. */
  doneToday: boolean
  /** Skipped today ("Skip this time") rather than done. */
  skippedToday: boolean
  /** Not due yet and already covered: doing it again wouldn't count, so there's nothing to tap. */
  allSet: boolean
}

export interface ChoreSection {
  id: SectionId
  title: string
  rows: ChoreRow[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "12 Oct" from an ISO calendar date, with no Date/time-zone involved. */
export function shortDate(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

/** Friendly label for when a chore is due, based only on the domain's status. */
export function statusLabel(status: ChoreStatus, today: ISODate): string {
  if (status.state === 'overdue') {
    // Long stretches read kindly rather than as a growing number.
    if (status.overdueDays >= 14) return 'Over 2 weeks'
    if (status.overdueDays >= 7) return 'Over a week'
    return status.overdueDays === 1 ? '1 day late' : `${status.overdueDays} days late`
  }
  if (status.state === 'due') return 'Today'
  const away = diffDays(today, status.dueDate)
  if (away === 1) return 'Tomorrow'
  if (away <= 6) return WEEKDAYS[weekdayOf(status.dueDate)]
  return shortDate(status.dueDate)
}

/** "tomorrow" or "on Thu" from a status label, for a sentence like "Next: Dishes, tomorrow". */
export function whenPhrase(label: string): string {
  return label === 'Tomorrow' ? 'tomorrow' : `on ${label}`
}

/** Group chores into "Running late", "Today", "Done today" (or "Done or skipped today") and "Coming up". Empty sections are left out. */
export function buildSections(
  chores: Chore[],
  completions: Completion[],
  vacations: VacationWindow[],
  today: ISODate,
): ChoreSection[] {
  const rows: ChoreRow[] = chores.filter((c) => choreActiveOn(c, today)).map((chore) => {
    const status = choreStatus(chore, completions, today, vacations)
    const upcoming = status.state === 'upcoming'
    const done = upcoming && completionDays(chore, completions).includes(today)
    const skippedToday = upcoming && !done && skippedOn(chore, today)
    const allSet = upcoming && !completionCounts(chore, completions, today)
    return { chore, status, label: statusLabel(status, today), doneToday: done || skippedToday, skippedToday, allSet }
  })
  const byName = (a: ChoreRow, b: ChoreRow) => a.chore.name.localeCompare(b.chore.name)
  const pick = (state: ChoreStatus['state']) => rows.filter((r) => r.status.state === state)

  const late = pick('overdue').sort((a, b) => b.status.overdueDays - a.status.overdueDays || a.status.dueDate.localeCompare(b.status.dueDate) || byName(a, b))
  const due = pick('due').sort(byName)
  const byDue = (a: ChoreRow, b: ChoreRow) => a.status.dueDate.localeCompare(b.status.dueDate) || byName(a, b)
  const soon = pick('upcoming').filter((r) => !r.doneToday).sort(byDue)
  const doneToday = pick('upcoming').filter((r) => r.doneToday).sort(byName)

  const sections: ChoreSection[] = [
    { id: 'late', title: 'Running late', rows: late },
    { id: 'today', title: 'Today', rows: due },
    // What was just finished sits right under today's, not past a long list of later chores.
    { id: 'done', title: doneToday.some((r) => r.skippedToday) ? 'Done or skipped today' : 'Done today', rows: doneToday },
    { id: 'soon', title: 'Coming up', rows: soon },
  ]
  return sections.filter((s) => s.rows.length > 0)
}

export function onVacation(today: ISODate, vacations: VacationWindow[]): boolean {
  return isInVacation(today, vacations)
}

/** Nothing late and nothing due today, with chores still on the books: the home is all caught up. */
export function allCaughtUp(sections: ChoreSection[]): boolean {
  return sections.length > 0 && !sections.some((s) => s.id === 'late' || s.id === 'today')
}

/** The next chore coming up, for the "all done" card. Null when nothing is scheduled ahead. */
export function nextUpcoming(sections: ChoreSection[]): ChoreRow | null {
  return sections.flatMap((s) => s.rows)
    .filter((r) => r.status.state === 'upcoming')
    .sort((a, b) => a.status.dueDate.localeCompare(b.status.dueDate) || a.chore.name.localeCompare(b.chore.name))[0] ?? null
}

/**
 * The rows for the home screen's short list: late, then today, then what's coming up
 * that still counts (rows that are "all set" are left out). Empty when caught up.
 */
export function shortRows(sections: ChoreSection[]): ChoreRow[] {
  if (allCaughtUp(sections)) return []
  return sections.filter((s) => s.id !== 'done').flatMap((s) => s.rows).filter((r) => !r.allSet)
}
