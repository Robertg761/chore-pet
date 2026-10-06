import type { ChoreStatus } from '../domain/schedule'
import type { Chore, Pet } from '../domain/types'

// PLACEHOLDER (Phase 7 batch H: reminders). Keep this API; the app already calls it.

export interface ReminderContext {
  pet: Pet
  chores: Chore[]
  statuses: ChoreStatus[]
  today: string
  away: boolean
}

/** Runs while the app is open: sends the pet's daily nudge when it's time. */
export function useReminders(context: ReminderContext | null): void {
  void context
}
