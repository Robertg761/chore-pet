import { describe, expect, it } from 'vitest'
import { SPECIES_COLOUR } from '../art/palette'
import { catalogEntry } from '../catalog/objects'
import { change, emptySnapshot, selectHome, type HomeData } from '../data/state'
import { petCondition } from '../domain/health'
import { objectMessStages } from '../domain/mess'
import { SPECIES, type ISODate, type Species } from '../domain/types'
import { checkPlacement, footprintOf, freeTile, overlaps, ROOM_SIZE, tilesOf, type Footprint } from '../room/grid'
import { SAMPLE_HOME_NAME, SAMPLE_KITCHEN, SAMPLE_LATE_CHORES, SAMPLE_PET_NAMES, sampleHome } from './sampleHome'

const TODAYS: ISODate[] = ['2026-10-06', '2026-10-31', '2026-01-31', '2026-03-01', '2026-12-31', '2028-02-29', '2028-03-01']

function build(species: Species, today: ISODate, petName?: string) {
  const ops = sampleHome({ species, petName, userId: 'u1', today })
  const snapshot = ops.reduce(change, emptySnapshot('u1'))
  const data = selectHome(snapshot.tables)
  const condition = petCondition(data.chores, data.completions, today, data.home!.vacations)
  const stages = objectMessStages(data.chores, condition.statuses)
  return { ops, data, condition, stages }
}

function objectOf(data: HomeData, catalogId: string) {
  return data.objects.find((o) => o.catalogId === catalogId)!
}

describe('sampleHome', () => {
  it('is named so the UI can tell it is a sample', () => {
    const { data } = build('mochi', '2026-10-06')
    expect(SAMPLE_HOME_NAME).toBe('Sample home')
    expect(data.home?.name).toBe(SAMPLE_HOME_NAME)
  })

  it('has the chosen pet in its own colour, with a default name per species', () => {
    for (const species of SPECIES) {
      const { data } = build(species, '2026-10-06')
      expect(data.pet).toMatchObject({ species, name: SAMPLE_PET_NAMES[species], bodyColour: SPECIES_COLOUR[species] })
    }
    expect(SAMPLE_PET_NAMES).toEqual({ mochi: 'Mochi', bun: 'Bun', sprout: 'Sprout' })
    expect(build('bun', '2026-10-06', '  Biscuit ').data.pet?.name).toBe('Biscuit')
    expect(build('bun', '2026-10-06', '   ').data.pet?.name).toBe('Bun')
  })

  it('furnishes a single kitchen with every catalog object, all validly placed', () => {
    const { data } = build('mochi', '2026-10-06')
    expect(data.rooms).toHaveLength(1)
    expect(data.rooms[0].type).toBe('kitchen')
    expect(data.objects).toHaveLength(SAMPLE_KITCHEN.length)
    const lookup = (id: string) => catalogEntry(id)
    for (const object of data.objects) {
      const entry = catalogEntry(object.catalogId)!
      const placement = { tileX: object.tileX, tileY: object.tileY, rotation: object.rotation }
      const check = checkPlacement(entry, placement, data.objects, lookup, object.id)
      expect(check, `${object.catalogId} at ${object.tileX},${object.tileY}`).toEqual({ ok: true, problem: null, blockers: [] })
    }
  })

  it('leaves one connected open floor for the pet to walk on', () => {
    const { data } = build('mochi', '2026-10-06')
    const solids: Footprint[] = data.objects.flatMap((o) => {
      const entry = catalogEntry(o.catalogId)!
      return entry.layer === 'solid' ? [footprintOf(o, entry)] : []
    })
    const open = new Set<string>()
    for (let tx = 0; tx < ROOM_SIZE; tx++) {
      for (let ty = 0; ty < ROOM_SIZE; ty++) if (!solids.some((f) => overlaps(f, { tx, ty, w: 1, d: 1 }))) open.add(`${tx},${ty}`)
    }
    const covered = new Set(solids.flatMap((f) => tilesOf(f).map((t) => `${t.tx},${t.ty}`)))
    expect(open.size + covered.size).toBe(ROOM_SIZE * ROOM_SIZE)
    expect(open.size).toBeGreaterThanOrEqual(20)

    const first = freeTile(solids)!
    const seen = new Set([`${first.tx},${first.ty}`])
    const queue = [first]
    while (queue.length) {
      const { tx, ty } = queue.pop()!
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const key = `${tx + dx},${ty + dy}`
        if (open.has(key) && !seen.has(key)) {
          seen.add(key)
          queue.push({ tx: tx + dx, ty: ty + dy })
        }
      }
    }
    expect(seen.size).toBe(open.size)
  })

  it('brings each object with its default chores', () => {
    const { data } = build('mochi', '2026-10-06')
    const expected = SAMPLE_KITCHEN.flatMap((s) => catalogEntry(s.catalogId)!.chores.map((c) => c.name)).sort()
    expect(data.chores.map((c) => c.name).sort()).toEqual(expected)
    expect(data.chores.every((c) => c.objectId !== null && c.createdOn < '2026-10-06')).toBe(true)
  })

  it.each(TODAYS)('on %s exactly two chores are overdue: the dishes (messy2) and the trash (messy1)', (today) => {
    const { data, condition, stages } = build('mochi', today)
    const overdue = condition.statuses.filter((s) => s.state === 'overdue')
    const names = overdue.map((s) => data.chores.find((c) => c.id === s.choreId)!.name).sort()
    expect(names).toEqual(['Take out the trash', 'Wash the dishes'])
    expect(Object.fromEntries(overdue.map((s) => [data.chores.find((c) => c.id === s.choreId)!.name, s.overdueDays]))).toEqual({
      'Wash the dishes': 3,
      'Take out the trash': 1,
    })
    expect(SAMPLE_LATE_CHORES).toHaveLength(2)

    const sink = objectOf(data, 'sink')
    const trash = objectOf(data, 'trash')
    expect(stages).toEqual({ [sink.id]: 'messy2', [trash.id]: 'messy1' })
  })

  it.each(TODAYS)('on %s everything else is due today or upcoming, and the pet is not sick', (today) => {
    const { data, condition } = build('mochi', today)
    const others = condition.statuses.filter((s) => s.state !== 'overdue')
    expect(others).toHaveLength(data.chores.length - 2)
    expect(others.every((s) => s.dueDate >= today)).toBe(true)
    expect(['content', 'meh']).toContain(condition.mood)
    expect(condition.health).toBe(72)
  })

  it.each(TODAYS)('on %s only records completions in the past, within the last two weeks', (today) => {
    const { data } = build('mochi', today)
    expect(data.completions.length).toBeGreaterThan(10)
    expect(data.completions.every((c) => c.completedOn < today)).toBe(true)
    const oldest = data.chores[0].createdOn
    expect(data.completions.every((c) => c.completedOn >= oldest)).toBe(true)
    // At most one completion per chore per day.
    const keys = data.completions.map((c) => `${c.choreId}:${c.completedOn}`)
    expect(new Set(keys).size).toBe(keys.length)
    // Something got done on most of the days, so the home feels lived in.
    expect(new Set(data.completions.map((c) => c.completedOn)).size).toBeGreaterThanOrEqual(10)
  })

  it.each(TODAYS)('on %s progress counts exactly the completions', (today) => {
    const { data, ops } = build('bun', today)
    expect(data.progress?.choreCount).toBe(data.completions.length)
    expect(ops.filter((o) => o.table === 'completions')).toHaveLength(data.completions.length)
    expect(data.progress).toMatchObject({ homeId: data.home!.id, unlockedItems: [] })
  })

  it('has the same shape for every species', () => {
    const shapes = SPECIES.map((species) => {
      const { data, condition, stages } = build(species, '2026-10-06')
      return {
        objects: data.objects.map((o) => [o.catalogId, o.tileX, o.tileY, o.rotation]),
        chores: data.chores.map((c) => c.name).sort(),
        completions: data.completions.length,
        health: condition.health,
        stages: Object.values(stages).sort(),
      }
    })
    expect(shapes[1]).toEqual(shapes[0])
    expect(shapes[2]).toEqual(shapes[0])
  })

  it('links everything to one home and the given account', () => {
    const { data } = build('sprout', '2026-10-06')
    expect(data.home?.ownerId).toBe('u1')
    expect(data.chores.every((c) => c.homeId === data.home!.id)).toBe(true)
    expect(data.pet?.homeId).toBe(data.home!.id)
    expect(sampleHome({ species: 'mochi', userId: null, today: '2026-10-06' }).some((o) => o.table === 'homes')).toBe(true)
  })

  it('makes a fresh home each time (new ids)', () => {
    const a = build('mochi', '2026-10-06').data
    const b = build('mochi', '2026-10-06').data
    expect(a.home!.id).not.toBe(b.home!.id)
  })
})
