import { diffDays, isInVacation, weekdayOf } from '../domain/dates'
import { choreStatus, type ChoreStatus } from '../domain/schedule'
import type { Chore, Completion, ISODate, VacationWindow } from '../domain/types'

export type SectionId = 'late' | 'today' | 'soon'

export interface ChoreRow {
  chore: Chore
  status: ChoreStatus
  /** Short friendly status, e.g. "2 days late", "Today", "Thu", "12 Oct". */
  label: string
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
    return status.overdueDays === 1 ? '1 day late' : `${status.overdueDays} days late`
  }
  if (status.state === 'due') return 'Today'
  const away = diffDays(today, status.dueDate)
  if (away === 1) return 'Tomorrow'
  if (away <= 6) return WEEKDAYS[weekdayOf(status.dueDate)]
  return shortDate(status.dueDate)
}

/** Group chores into "Running late", "Today" and "Coming up". Empty sections are left out. */
export function buildSections(
  chores: Chore[],
  completions: Completion[],
  vacations: VacationWindow[],
  today: ISODate,
): ChoreSection[] {
  const rows: ChoreRow[] = chores.map((chore) => {
    const status = choreStatus(chore, completions, today, vacations)
    return { chore, status, label: statusLabel(status, today) }
  })
  const byName = (a: ChoreRow, b: ChoreRow) => a.chore.name.localeCompare(b.chore.name)
  const pick = (state: ChoreStatus['state']) => rows.filter((r) => r.status.state === state)

  const late = pick('overdue').sort((a, b) => b.status.overdueDays - a.status.overdueDays || a.status.dueDate.localeCompare(b.status.dueDate) || byName(a, b))
  const due = pick('due').sort(byName)
  const soon = pick('upcoming').sort((a, b) => a.status.dueDate.localeCompare(b.status.dueDate) || byName(a, b))

  const sections: ChoreSection[] = [
    { id: 'late', title: 'Running late', rows: late },
    { id: 'today', title: 'Today', rows: due },
    { id: 'soon', title: 'Coming up', rows: soon },
  ]
  return sections.filter((s) => s.rows.length > 0)
}

export function onVacation(today: ISODate, vacations: VacationWindow[]): boolean {
  return isInVacation(today, vacations)
}
