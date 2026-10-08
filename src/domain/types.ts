// Core domain types. Dates are ISO calendar dates ("YYYY-MM-DD") in the user's
// local time zone; timestamps are full ISO strings.

export type ISODate = string

/** 0 = Sunday ... 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** What a schedule asks for. */
export type ScheduleRule =
  | { kind: 'daily' }
  | { kind: 'everyNDays'; n: number }
  | { kind: 'weekdays'; days: Weekday[] }
  | { kind: 'weekly'; weekday: Weekday }
  | { kind: 'monthly'; dayOfMonth: number } // clamped to the month's length

/**
 * How often a chore comes round. `since` is the day the chore moved to this
 * schedule (set by updateChore when the schedule changes): nothing is owed
 * from before it, so a schedule change is never retroactive. `before` is the
 * schedule it replaced, with its own `since` and `before` (a short chain, see
 * SCHEDULE_HISTORY), so past days are judged by the rule that applied then.
 * Both are missing on a schedule that was never changed, and neither is part
 * of what the schedule asks for, so `sameSchedule` ignores them.
 *
 * `resume` is set on a removed chore added back mid-round: where the old one
 * stood (its next due date and the last day it was done), so the new one picks
 * up exactly there instead of starting a fresh round (see resumeFrom). Also
 * ignored by `sameSchedule`.
 *
 * `skips` are the days the player said a round wasn't needed ("Skip this
 * time"). A skip settles the round it was taken on like a completion does, so
 * nothing is late, but it is not a completion: it never counts toward rewards
 * or makes a streak day (see skipDays). Kept on the current schedule only
 * (updateChore carries them over), oldest first, at most SKIP_HISTORY.
 */
export type Schedule = ScheduleRule & {
  since?: ISODate
  before?: Schedule
  resume?: { due: ISODate; last: ISODate }
  skips?: ISODate[]
}

export interface VacationWindow {
  start: ISODate
  end: ISODate // inclusive
}

export interface Home {
  id: string
  ownerId: string
  name: string
  vacations: VacationWindow[]
}

export type RoomType = 'kitchen' | 'bedroom' | 'bathroom' | 'living' | 'other'

export interface Room {
  id: string
  homeId: string
  type: RoomType
  floorStyle: string
  wallStyle: string
}

export interface PlacedObject {
  id: string
  roomId: string
  catalogId: string
  tileX: number
  tileY: number
  rotation: 0 | 1 | 2 | 3
}

export interface Chore {
  id: string
  homeId: string
  objectId: string | null // null = not tied to a placed object (Phase 1 list UI)
  name: string
  schedule: Schedule
  createdOn: ISODate
  /** Exclusive end date: earlier history stays, obligations stop on this day. */
  archivedOn?: ISODate
  photoProof: boolean // reserved; photo proof is on hold
}

export interface Completion {
  id: string
  choreId: string
  completedAt: string // ISO timestamp
  completedOn: ISODate // local calendar date of completion
  /** Whether this completion counts toward rewards (false for a sample home's seeded history). Missing means true. */
  counts?: boolean
}

export type Mood = 'happy' | 'content' | 'meh' | 'scruffy' | 'sick'

/** The three pet characters. Each player picks one; every item works on all of them. */
export const SPECIES = ['mochi', 'bun', 'sprout'] as const
export type Species = (typeof SPECIES)[number]

/** How a placed object looks: clean, a little behind, very behind. */
export type MessStage = 'clean' | 'messy1' | 'messy2'

/** Every slot an item can occupy. See docs/ART.md. */
export const CHARACTER_SLOTS = ['body', 'outfit', 'neck', 'face', 'head', 'back'] as const
export type CharacterSlot = (typeof CHARACTER_SLOTS)[number]

/** Back-to-front draw order: back items (backpacks, wings) sit behind the body. */
export const SLOT_RENDER_ORDER: readonly CharacterSlot[] = ['back', 'body', 'outfit', 'neck', 'face', 'head']

export interface Pet {
  id: string
  homeId: string
  name: string
  species: Species
  bodyColour: string
  equipped: Partial<Record<CharacterSlot, string>> // slot -> item id
  /** Face options (src/character/look.ts). Missing on pets saved before Phase 6: use the defaults. */
  eyes?: EyeStyle
  cheeks?: CheekStyle
  /** Outfits the player saved in the wardrobe, newest last. */
  outfits?: SavedOutfit[]
}

export const EYE_STYLES = ['classic', 'sparkly', 'button', 'lashes'] as const
export type EyeStyle = (typeof EYE_STYLES)[number]

export const CHEEK_STYLES = ['round', 'hearts', 'freckles', 'none'] as const
export type CheekStyle = (typeof CHEEK_STYLES)[number]

export interface SavedOutfit {
  id: string
  name: string
  equipped: Partial<Record<CharacterSlot, string>>
}

export interface Progress {
  homeId: string
  /** Chores done that count toward rewards. Worked out by choreCountOf; the stored value is only a cache. */
  choreCount: number
  /** Legacy counts for chores deleted before history retention, by chore id. */
  retired?: Record<string, number>
  currentStreak: number
  bestStreak: number
  unlockedItems: string[]
}
