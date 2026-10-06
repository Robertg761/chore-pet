// Core domain types. Dates are ISO calendar dates ("YYYY-MM-DD") in the user's
// local time zone; timestamps are full ISO strings.

export type ISODate = string

/** 0 = Sunday ... 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Schedule =
  | { kind: 'daily' }
  | { kind: 'everyNDays'; n: number }
  | { kind: 'weekdays'; days: Weekday[] }
  | { kind: 'weekly'; weekday: Weekday }
  | { kind: 'monthly'; dayOfMonth: number } // clamped to the month's length

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
  photoProof: boolean // reserved; photo proof is on hold
}

export interface Completion {
  id: string
  choreId: string
  completedAt: string // ISO timestamp
  completedOn: ISODate // local calendar date of completion
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
}

export interface Progress {
  homeId: string
  choreCount: number
  currentStreak: number
  bestStreak: number
  unlockedItems: string[]
}
