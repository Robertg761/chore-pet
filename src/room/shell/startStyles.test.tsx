import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createRoom } from '../../data/actions'
import { FREE_STYLES, isUnlocked, UNLOCKS } from '../../domain/unlocks'
import type { Home, Room, RoomType } from '../../domain/types'
import RoomShell from './RoomShell'
import { FLOOR_STYLES, ROOM_START_STYLES, WALL_STYLES, floorStyleOf, wallStyleOf } from './styles'

const home: Home = { id: 'h1', ownerId: 'u1', name: 'Home', vacations: [] }
const TYPES: RoomType[] = ['kitchen', 'bedroom', 'bathroom', 'living', 'other']

const made = (type?: RoomType) => (createRoom(home, type)[0] as unknown as { value: Room }).value

describe('createRoom starting styles', () => {
  it('a kitchen (and the default) stays peach and wood', () => {
    expect(made()).toMatchObject({ type: 'kitchen', wallStyle: 'peach', floorStyle: 'wood' })
    expect(made('other')).toMatchObject({ wallStyle: 'peach', floorStyle: 'wood' })
  })

  it('each other kind starts with its own look', () => {
    expect(made('bathroom')).toMatchObject({ wallStyle: 'cloud', floorStyle: 'mosaic' })
    expect(made('bedroom')).toMatchObject({ wallStyle: 'butter', floorStyle: 'oat' })
    expect(made('living')).toMatchObject({ wallStyle: 'sage', floorStyle: 'birch' })
  })

  it('kitchen, bathroom, bedroom and living room all differ from each other', () => {
    const looks = (['kitchen', 'bathroom', 'bedroom', 'living'] as RoomType[]).map((t) => `${made(t).wallStyle}/${made(t).floorStyle}`)
    expect(new Set(looks).size).toBe(4)
  })

  it('every start style is a real style, free, and not a reward', () => {
    const earnable = new Set(UNLOCKS.map((u) => u.id))
    for (const type of TYPES) {
      const { wallStyle, floorStyle } = ROOM_START_STYLES[type]
      expect(WALL_STYLES.some((s) => s.id === wallStyle), type).toBe(true)
      expect(FLOOR_STYLES.some((s) => s.id === floorStyle), type).toBe(true)
      for (const id of [`wall:${wallStyle}`, `floor:${floorStyle}`]) {
        expect(isUnlocked(null, id), id).toBe(true)
        expect(earnable.has(id), id).toBe(false)
      }
    }
  })
})

describe('free styles', () => {
  it('are never reported as locked, with or without progress', () => {
    for (const id of FREE_STYLES) {
      expect(isUnlocked(null, id), id).toBe(true)
      expect(isUnlocked({ unlockedItems: [] }, id), id).toBe(true)
    }
  })

  it('every style is either free or a reward, never both', () => {
    const earnable = new Set(UNLOCKS.map((u) => u.id))
    for (const s of WALL_STYLES) expect(FREE_STYLES.includes(`wall:${s.id}`) !== earnable.has(`wall:${s.id}`), s.id).toBe(true)
    for (const s of FLOOR_STYLES) expect(FREE_STYLES.includes(`floor:${s.id}`) !== earnable.has(`floor:${s.id}`), s.id).toBe(true)
  })

  it('the reward styles are still locked on a fresh home', () => {
    for (const id of ['wall:mint', 'wall:lavender', 'wall:sky', 'floor:tile', 'floor:carpet', 'floor:seaside']) expect(isUnlocked(null, id), id).toBe(false)
  })

  it('style ids and labels are unique', () => {
    expect(new Set(WALL_STYLES.map((s) => s.id)).size).toBe(WALL_STYLES.length)
    expect(new Set(FLOOR_STYLES.map((s) => s.id)).size).toBe(FLOOR_STYLES.length)
    expect(new Set(WALL_STYLES.map((s) => s.label)).size).toBe(WALL_STYLES.length)
    expect(new Set(FLOOR_STYLES.map((s) => s.label)).size).toBe(FLOOR_STYLES.length)
  })

  it('unknown styles from a future version still render with the fallback', () => {
    expect(wallStyleOf('from-the-future').id).toBe('peach')
    expect(floorStyleOf('from-the-future').id).toBe('wood')
    expect(renderToStaticMarkup(<RoomShell floorStyle="from-the-future" wallStyle="from-the-future" />)).toContain('wood floor and peach walls')
  })

  it('every floor style renders', () => {
    for (const f of FLOOR_STYLES) expect(renderToStaticMarkup(<RoomShell floorStyle={f.id} />), f.id).toContain('<svg')
  })
})
