import { toISODate } from '../domain/dates'
import type { ChoreStatus } from '../domain/schedule'
import type { Chore } from '../domain/types'
import { pickLine } from '../content/petLines'

// Pure decisions for the daily nudge. No browser APIs here, so it is all testable.

/** What the player chose for this device. */
export interface ReminderPrefs {
  enabled: boolean
  /** Local time of day, 24-hour "HH:MM". */
  time: string
}

export const DEFAULT_TIME = '09:00'
export const DEFAULT_PREFS: ReminderPrefs = { enabled: false, time: DEFAULT_TIME }

/** Same tag every day, so a new nudge replaces the old one instead of piling up. */
export const REMINDER_TAG = 'chore-pet-daily'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

/** Minutes after midnight for "HH:MM", or null if it isn't a valid time. */
export function timeToMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** Reads saved preferences; anything missing or damaged falls back to the defaults. */
export function parsePrefs(raw: string | null | undefined): ReminderPrefs {
  if (!raw) return { ...DEFAULT_PREFS }
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return { ...DEFAULT_PREFS }
    const { enabled, time } = data as Record<string, unknown>
    return { enabled: enabled === true, time: isValidTime(time) ? time : DEFAULT_TIME }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

/**
 * Is it time to send today's nudge?
 * Yes when reminders are on, the home isn't on vacation, the chosen time has
 * come, nothing was sent today, and at least one chore is due or overdue.
 * (Whether the browser allows notifications is checked by the caller.)
 */
export function shouldNotify(
  now: Date,
  prefs: ReminderPrefs,
  lastSent: string | null,
  statuses: ChoreStatus[],
  away: boolean,
): boolean {
  if (!prefs.enabled || away) return false
  const target = timeToMinutes(prefs.time)
  if (target === null) return false
  if (now.getHours() * 60 + now.getMinutes() < target) return false
  if (lastSent === toISODate(now)) return false
  return statuses.some((s) => s.state === 'due' || s.state === 'overdue')
}

// The pet's voice, in line with src/content/petLines.ts. `{chore}` is filled
// with the chore name lowercased ("wash the dishes"), so every line puts it
// after a colon, where a verb phrase ("Up today: wash the dishes.") and a plain
// noun ("On my mind today: dishes.") both read well. None of them blames or hurries.
export const REMINDER_OVERDUE_LINES: string[] = [
  'No rush, just a nudge: {chore}.',
  'When you have a moment: {chore}.',
  'A friendly nudge: {chore}. I believe in us.',
  'One to tick off when you can: {chore}.',
  'On my mind today: {chore}. Shall we?',
]

export const REMINDER_DUE_LINES: string[] = [
  "Today's little job: {chore}.",
  "On today's list: {chore}. Easy peasy!",
  'A gentle hello! Up today: {chore}.',
  'Ready when you are: {chore}.',
]

/** Shown instead of a chore name when the player keeps reminders private. */
export const PRIVATE_REMINDER_BODY = 'A few little jobs are ready.'

export interface ReminderMessage {
  title: string
  body: string
}

/** A small number from a date, so the line changes day to day but never at random. */
function seedFromDate(date: string): number {
  let total = 0
  for (const ch of date) total = (total * 31 + ch.charCodeAt(0)) % 100_000
  return total
}

export interface ReminderOptions {
  /**
   * Keep chore names off the lock screen: the body is the generic
   * "A few little jobs are ready." with no chore name and no count.
   */
  private?: boolean
}

/**
 * The nudge text: the pet's name as the title, and a line about the most
 * overdue chore (or a gentle one about what is due today). Null when nothing
 * is due, so there is never an empty nudge. With `{ private: true }` the body
 * is generic (PRIVATE_REMINDER_BODY) and never names a chore.
 */
export function reminderMessage(
  petName: string,
  chores: Chore[],
  statuses: ChoreStatus[],
  today: string,
  options: ReminderOptions = {},
): ReminderMessage | null {
  const nameOf = new Map(chores.map((c) => [c.id, c.name]))
  const waiting = statuses.filter((s) => (s.state === 'due' || s.state === 'overdue') && nameOf.has(s.choreId))
  if (waiting.length === 0) return null

  const title = petName.trim() || 'Chore Pet'
  if (options.private) return { title, body: PRIVATE_REMINDER_BODY }

  const rank = (s: ChoreStatus) => (s.state === 'overdue' ? s.overdueDays : -1)
  const top = [...waiting].sort(
    (a, b) => rank(b) - rank(a) || a.dueDate.localeCompare(b.dueDate) || a.choreId.localeCompare(b.choreId),
  )[0]

  const chore = nameOf.get(top.choreId)?.trim() ?? ''
  const lines = top.state === 'overdue' ? REMINDER_OVERDUE_LINES : REMINDER_DUE_LINES
  let body = chore ? pickLine(lines, seedFromDate(today), { chore }) : ''
  if (!body) body = 'A few little jobs are ready when you are.'

  const more = waiting.length - 1
  if (more > 0) body += ` Plus ${more} more.`

  return { title, body }
}

/** The same as `reminderMessage`; the name the scheduler already uses. */
export const pickReminder = reminderMessage
