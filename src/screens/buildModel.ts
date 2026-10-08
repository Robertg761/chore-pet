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

/** Room order for the tray's groups, after the room's own type. */
const ROOM_ORDER: RoomType[] = ['kitchen', 'bathroom', 'bedroom', 'living', 'other']

const ROOM_LABEL: Record<RoomType, string> = { kitchen: 'Kitchen', bathroom: 'Bathroom', bedroom: 'Bedroom', living: 'Living room', other: 'Other' }

export interface CatalogGroup {
  key: RoomType | 'decor'
  label: string
  entries: CatalogEntry[]
}

/**
 * The catalog in labelled groups for the build tray's scrolling row: the
 * room's own type first, then the other rooms, then decor (things that bring
 * no chores). Each thing shows once, under the first of its rooms in that
 * order. Catalog order is kept inside a group, and empty groups are left out.
 */
export function groupCatalog(catalog: readonly CatalogEntry[], roomType: RoomType): CatalogGroup[] {
  const order = [roomType, ...ROOM_ORDER.filter((r) => r !== roomType)]
  const decor = catalog.filter((e) => e.chores.length === 0)
  const choreful = catalog.filter((e) => e.chores.length > 0)
  const home = (e: CatalogEntry) => order.find((r) => e.rooms.includes(r)) ?? 'other'
  const groups: CatalogGroup[] = order.map((r) => ({ key: r, label: ROOM_LABEL[r], entries: choreful.filter((e) => home(e) === r) }))
  groups.push({ key: 'decor', label: 'Decor', entries: decor })
  return groups.filter((g) => g.entries.length > 0)
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
