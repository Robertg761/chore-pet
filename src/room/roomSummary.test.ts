import { describe, expect, it } from 'vitest'
import type { PlacedObject } from '../domain/types'
import { neglectSummary, objectNames, objectsBackToFront } from './roomSummary'

const placed = (id: string, catalogId: string, tileX = 0, tileY = 0): PlacedObject => ({ id, roomId: 'r', catalogId, tileX, tileY, rotation: 0 }) as PlacedObject

describe('objectNames', () => {
  it('uses catalog names and numbers duplicates', () => {
    expect(objectNames([placed('1', 'sink'), placed('2', 'plant'), placed('3', 'plant')])).toEqual({ '1': 'Sink', '2': 'Potted plant 1', '3': 'Potted plant 2' })
  })
})

describe('neglectSummary', () => {
  const objects = [placed('t', 'trash'), placed('s', 'sink'), placed('f', 'fairy-lights'), placed('b', 'bed')]

  it('says what is messy, messiest first', () => {
    expect(neglectSummary(objects, { t: 1, s: 3 })).toBe('The sink is very messy, the trash can is a bit messy.')
    expect(neglectSummary(objects, { f: 2 })).toBe('The fairy lights are messy.')
  })

  it('is empty when nothing is late', () => {
    expect(neglectSummary(objects, {})).toBe('')
    expect(neglectSummary(objects, { t: 0 })).toBe('')
  })
})

describe('objectsBackToFront', () => {
  it('orders things from the back corner forward', () => {
    const order = objectsBackToFront([placed('front', 'trash', 5, 5), placed('back', 'trash', 0, 0), placed('mid', 'trash', 2, 2)])
    expect(order.map((o) => o.id)).toEqual(['back', 'mid', 'front'])
  })
})
