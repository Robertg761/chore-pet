import type { CatalogEntry } from '../catalog/types'
import { choreStatus } from '../domain/schedule'
import type { Chore, Completion, ISODate, RoomType, VacationWindow } from '../domain/types'
import { statusLabel } from './choreListModel'

// Pure helpers for the build-mode catalog tray and object sheet. No React here.

/** "No chores", "1 chore", "2 chores". */
export function choreCountLabel(count: number): string {
  if (count <= 0) return 'No chores'
  return count === 1 ? '1 chore' : `${count} chores`
}

/** Entries that suit the room type come first; everything else follows. Catalog order is kept. */
export function splitCatalog(catalog: readonly CatalogEntry[], roomType: RoomType) {
  return {
    suited: catalog.filter((e) => e.rooms.includes(roomType)),
    others: catalog.filter((e) => !e.rooms.includes(roomType)),
  }
}

/** Plain-words status for a chore row, e.g. "Due today", "Due Thu", "2 days late". */
export function dueText(
  chore: Chore,
  completions: Completion[],
  today: ISODate,
  vacations: VacationWindow[],
): { text: string; late: boolean } {
  const status = choreStatus(chore, completions, today, vacations)
  const label = statusLabel(status, today)
  if (status.state === 'overdue') return { text: label, late: true }
  if (status.state === 'due') return { text: 'Due today', late: false }
  return { text: `Due ${label === 'Tomorrow' ? 'tomorrow' : label}`, late: false }
}
