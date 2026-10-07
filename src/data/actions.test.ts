import { describe, expect, it } from 'vitest'
import { catalogEntry } from '../catalog/objects'
import { SAMPLE_HOME_NAME, sampleHome } from '../content/sampleHome'
import { choreStatus } from '../domain/schedule'
import type { Chore, Progress, Schedule } from '../domain/types'
import { adoptSample, completeChore, completeChoreWithRewards, createHousehold, moveObject, placeObject, removeHome, removeObject, uncompleteChore, updateChore } from './actions'
import { change, emptySnapshot, selectHome, type NewOp, type Snapshot } from './state'

function apply(s: Snapshot, ops: ReturnType<typeof createHousehold>): Snapshot {
  return ops.reduce(change, s)
}

function household() {
  return apply(emptySnapshot('u1'), createHousehold({ species: 'mochi', petName: 'Pip', userId: 'u1' }))
}

describe('rooms and objects', () => {
  it('starts every home with an empty kitchen and the pet in its own colour', () => {
    const data = selectHome(household().tables)
    expect(data.rooms).toHaveLength(1)
    expect(data.rooms[0]).toMatchObject({ type: 'kitchen', floorStyle: 'wood', wallStyle: 'peach' })
    expect(data.pet?.bodyColour).toBe('#FFCFDA')
  })

  it('placing an object brings its default chores, tied to the object', () => {
    let s = household()
    const room = selectHome(s.tables).rooms[0]
    const sink = catalogEntry('sink')!
    s = apply(s, placeObject(room, sink, { tileX: 0, tileY: 2, rotation: 0 }, '2026-10-06'))
    const data = selectHome(s.tables)
    expect(data.objects).toHaveLength(1)
    expect(data.chores.map((c) => c.name).sort()).toEqual(sink.chores.map((c) => c.name).sort())
    expect(data.chores.every((c) => c.objectId === data.objects[0].id && c.createdOn === '2026-10-06')).toBe(true)
  })

  it('moving keeps the chores; removing takes the chores and their history with it', () => {
    let s = household()
    const room = selectHome(s.tables).rooms[0]
    s = apply(s, placeObject(room, catalogEntry('stove')!, { tileX: 0, tileY: 0, rotation: 0 }, '2026-10-06'))
    s = apply(s, placeObject(room, catalogEntry('sink')!, { tileX: 0, tileY: 1, rotation: 0 }, '2026-10-06'))
    let data = selectHome(s.tables)
    const stove = data.objects.find((o) => o.catalogId === 'stove')!
    s = apply(s, moveObject(stove, { tileX: 3, tileY: 0, rotation: 1 }))
    data = selectHome(s.tables)
    expect(data.objects.find((o) => o.id === stove.id)).toMatchObject({ tileX: 3, tileY: 0, rotation: 1 })

    const stoveChore = data.chores.find((c) => c.objectId === stove.id)!
    s = apply(s, completeChore(stoveChore, data.progress, new Date(2026, 9, 6)))
    s = apply(s, removeObject(stove.id))
    data = selectHome(s.tables)
    expect(data.objects.map((o) => o.catalogId)).toEqual(['sink'])
    expect(data.chores.every((c) => c.objectId !== stove.id)).toBe(true)
    expect(data.completions).toHaveLength(0)
  })
})

describe('sample homes', () => {
  const sample = () => apply(emptySnapshot('u1'), sampleHome({ species: 'mochi', userId: 'u1', today: '2026-10-06' }))

  it('making it mine keeps everything and drops the sample name', () => {
    let s = sample()
    const before = selectHome(s.tables)
    expect(before.home?.name).toBe(SAMPLE_HOME_NAME)
    s = apply(s, adoptSample(before.home!))
    const after = selectHome(s.tables)
    expect(after.home?.name).toBe('Home')
    expect(after.objects).toHaveLength(before.objects.length)
    expect(after.chores).toHaveLength(before.chores.length)
    expect(after.completions).toHaveLength(before.completions.length)
    expect(after.pet?.name).toBe('Mochi')
  })

  it('takes a custom name, and falls back when it is blank', () => {
    const home = selectHome(sample().tables).home!
    expect(adoptSample(home, '  Our flat ')[0]).toMatchObject({ value: { name: 'Our flat' } })
    expect(adoptSample(home, '   ')[0]).toMatchObject({ value: { name: 'Home' } })
  })

  it('starting fresh removes the home and everything in it', () => {
    let s = sample()
    const home = selectHome(s.tables).home!
    s = apply(s, removeHome(home.id))
    const data = selectHome(s.tables)
    expect(data.home).toBeNull()
    expect(data.pet).toBeNull()
    expect(data.rooms).toHaveLength(0)
    expect(data.objects).toHaveLength(0)
    expect(data.chores).toHaveLength(0)
    expect(data.completions).toHaveLength(0)
    // Nothing is left behind in the store itself, not just hidden by the selector.
    for (const table of Object.values(s.tables)) expect(Object.keys(table)).toHaveLength(0)
  })
})

describe('rewards', () => {
  it("unlocks the beanie on the player's first chore, and nothing twice", async () => {
    const { completeChoreWithRewards } = await import('./actions')
    let s = household()
    const room = selectHome(s.tables).rooms[0]
    s = apply(s, placeObject(room, catalogEntry('sink')!, { tileX: 0, tileY: 2, rotation: 0 }, '2026-10-06'))
    let data = selectHome(s.tables)
    const dishes = data.chores.find((c) => c.name === 'Wash the dishes')!

    const first = completeChoreWithRewards(dishes, data.progress, { chores: data.chores, completions: data.completions, vacations: [] }, new Date(2026, 9, 6, 9))
    expect(first.unlocked.map((u) => u.id)).toEqual(['item:beanie-red'])
    s = apply(s, first.ops)
    data = selectHome(s.tables)
    expect(data.progress).toMatchObject({ choreCount: 1, currentStreak: 1, unlockedItems: ['item:beanie-red'] })

    const scrub = data.chores.find((c) => c.name === 'Scrub the sink')!
    const second = completeChoreWithRewards(scrub, data.progress, { chores: data.chores, completions: data.completions, vacations: [] }, new Date(2026, 9, 6, 10))
    expect(second.unlocked).toEqual([])
    s = apply(s, second.ops)
    expect(selectHome(s.tables).progress?.choreCount).toBe(2)
  })
})

describe('editing a chore', () => {
  const base: Chore = { id: 'c', homeId: 'h', objectId: null, name: 'Bins', schedule: { kind: 'weekly', weekday: 5 }, createdOn: '2026-09-01', photoProof: false }
  const saved = (ops: NewOp[]) => (ops[0] as Extract<NewOp, { table: 'chores'; kind: 'upsert' }>).value

  it('a new schedule takes effect from today, so it is never late the moment it is edited', () => {
    const edited = saved(updateChore(base, { schedule: { kind: 'daily' } }, '2026-10-07'))
    expect(edited.schedule).toMatchObject({ kind: 'daily', since: '2026-10-07' })
    const lastDone = [{ id: 'x', choreId: 'c', completedAt: '', completedOn: '2026-10-02' }]
    expect(choreStatus(edited, lastDone, '2026-10-07')).toMatchObject({ state: 'due', overdueDays: 0 })
  })

  it('a change of detail counts as a new schedule too', () => {
    expect(saved(updateChore(base, { schedule: { kind: 'weekly', weekday: 1 } }, '2026-10-07')).schedule).toMatchObject({ kind: 'weekly', weekday: 1, since: '2026-10-07' })
  })

  it('a rename, or saving the same schedule again, keeps the schedule and its since', () => {
    const changed: Chore = { ...base, schedule: { kind: 'weekly', weekday: 5, since: '2026-09-20' } }
    expect(saved(updateChore(changed, { name: 'Take out the bins' }, '2026-10-07'))).toMatchObject({ name: 'Take out the bins', schedule: changed.schedule })
    const same: Schedule = { kind: 'weekly', weekday: 5 }
    expect(saved(updateChore(changed, { name: 'Bins', schedule: same, objectId: null }, '2026-10-07')).schedule).toEqual(changed.schedule)
    expect(saved(updateChore(base, { schedule: same }, '2026-10-07')).schedule).toEqual({ kind: 'weekly', weekday: 5 })
  })
})

describe('completions never land in the future', () => {
  const dishes: Chore = { id: 'd', homeId: 'h', objectId: null, name: 'Dishes', schedule: { kind: 'daily' }, createdOn: '2026-10-01', photoProof: false }
  const realNow = new Date(2026, 9, 6, 9, 0)
  const stamped = (ops: NewOp[]) => (ops.find((o) => o.table === 'completions') as Extract<NewOp, { table: 'completions'; kind: 'upsert' }>).value

  it('a clock set ahead (the dev clock) is pulled back to the real date and time', () => {
    const ahead = new Date(2026, 9, 9, 20, 0)
    expect(stamped(completeChore(dishes, null, ahead, { realNow }))).toMatchObject({ completedOn: '2026-10-06', completedAt: realNow.toISOString() })
    const { ops } = completeChoreWithRewards(dishes, null, { chores: [dishes], completions: [], vacations: [] }, ahead, realNow)
    expect(stamped(ops)).toMatchObject({ completedOn: '2026-10-06', completedAt: realNow.toISOString() })
  })

  it('a time in the past is kept as it is', () => {
    const earlier = new Date(2026, 9, 5, 21, 0)
    expect(stamped(completeChore(dishes, null, earlier, { realNow }))).toMatchObject({ completedOn: '2026-10-05', completedAt: earlier.toISOString() })
    const { ops } = completeChoreWithRewards(dishes, null, { chores: [dishes], completions: [], vacations: [] }, earlier, realNow)
    expect(stamped(ops).completedOn).toBe('2026-10-05')
  })

  it('seeded sample history can opt out with realNow: null', () => {
    const later = new Date(2028, 1, 29, 9, 0)
    expect(stamped(completeChore(dishes, null, later, { counts: false, realNow: null })).completedOn).toBe('2028-02-29')
  })
})

describe('uncompleteChore', () => {
  const done = (id: string, choreId: string, completedOn: string) => ({ id, choreId, completedAt: `${completedOn}T09:00:00.000Z`, completedOn, counts: true })

  it('deletes just that completion when there is no progress row', () => {
    expect(uncompleteChore('c-1', null, [])).toEqual([{ table: 'completions', kind: 'delete', key: 'c-1' }])
  })

  it('recounts the chores done without the undone one and keeps unlocks', () => {
    const completions = [done('c-1', 'a', '2026-10-06'), done('c-2', 'b', '2026-10-07')]
    const progress: Progress = { homeId: 'h', choreCount: 2, retired: {}, currentStreak: 2, bestStreak: 2, unlockedItems: ['beanie'] }
    const ops = uncompleteChore('c-2', progress, completions)
    expect(ops[0]).toEqual({ table: 'completions', kind: 'delete', key: 'c-2' })
    expect(ops[1]).toMatchObject({ table: 'progress', kind: 'upsert', value: { choreCount: 1, unlockedItems: ['beanie'] } })
  })
})

describe('updateChore schedule history', () => {
  const base: Chore = { id: 'c', homeId: 'h', objectId: null, name: 'Dishes', schedule: { kind: 'monthly', dayOfMonth: 1 }, createdOn: '2026-08-01', photoProof: false }
  const saved = (ops: NewOp[]) => (ops[0] as Extract<NewOp, { table: 'chores' }>).value

  it('keeps the schedule it replaced', () => {
    expect(saved(updateChore(base, { schedule: { kind: 'daily' } }, '2026-10-05')).schedule).toEqual({ kind: 'daily', since: '2026-10-05', before: { kind: 'monthly', dayOfMonth: 1 } })
  })

  it('keeps one step of history, and a same-day change replaces the first', () => {
    const once = saved(updateChore(base, { schedule: { kind: 'daily' } }, '2026-10-05'))
    const sameDay = saved(updateChore(once, { schedule: { kind: 'weekly', weekday: 1 } }, '2026-10-05'))
    expect(sameDay.schedule).toEqual({ kind: 'weekly', weekday: 1, since: '2026-10-05', before: { kind: 'monthly', dayOfMonth: 1 } })
    const later = saved(updateChore(once, { schedule: { kind: 'weekly', weekday: 1 } }, '2026-10-09'))
    expect(later.schedule).toEqual({ kind: 'weekly', weekday: 1, since: '2026-10-09', before: { kind: 'daily', since: '2026-10-05' } })
  })

  it('leaves the schedule alone when only the name changes', () => {
    const once = saved(updateChore(base, { schedule: { kind: 'daily' } }, '2026-10-05'))
    expect(saved(updateChore(once, { name: 'Wash up', schedule: { kind: 'daily' } }, '2026-10-07')).schedule).toBe(once.schedule)
  })
})

