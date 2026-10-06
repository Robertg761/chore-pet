import { describe, expect, it, vi } from 'vitest'
import { DAY_OFFSET_KEY, createDevClock, parseOffset, shiftDays } from './devClock'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v
    },
  }
}

describe('shiftDays', () => {
  it('moves across month and year ends', () => {
    expect(shiftDays(new Date(2026, 0, 31, 9, 30), 1)).toEqual(new Date(2026, 1, 1, 9, 30))
    expect(shiftDays(new Date(2026, 11, 30, 9, 30), 3)).toEqual(new Date(2027, 0, 2, 9, 30))
    expect(shiftDays(new Date(2026, 2, 1, 9, 30), -1)).toEqual(new Date(2026, 1, 28, 9, 30))
    expect(shiftDays(new Date(2028, 2, 1, 9, 30), -1)).toEqual(new Date(2028, 1, 29, 9, 30))
  })

  it('keeps the local time of day across daylight saving changes', () => {
    // Spring and autumn changes in the northern and southern hemispheres.
    for (const [y, m, d] of [[2026, 2, 28], [2026, 9, 24], [2026, 3, 3], [2026, 8, 30]]) {
      const from = new Date(y, m, d, 12, 15, 30)
      for (const days of [1, 2, 3, 7, -1, -7]) {
        const to = shiftDays(from, days)
        expect([to.getHours(), to.getMinutes(), to.getSeconds()]).toEqual([12, 15, 30])
        const expected = new Date(y, m, d + days)
        expect([to.getFullYear(), to.getMonth(), to.getDate()]).toEqual([expected.getFullYear(), expected.getMonth(), expected.getDate()])
      }
    }
  })

  it('is a no-op for 0', () => {
    const from = new Date(2026, 5, 15, 23, 59)
    expect(shiftDays(from, 0)).toEqual(from)
  })
})

describe('parseOffset', () => {
  it('reads whole numbers, including negatives', () => {
    expect(parseOffset('3')).toBe(3)
    expect(parseOffset('-7')).toBe(-7)
    expect(parseOffset('0')).toBe(0)
  })
  it('falls back to 0 for anything else', () => {
    for (const raw of [null, undefined, '', '  ', 'abc', '1.5', 'NaN', 'Infinity']) expect(parseOffset(raw)).toBe(0)
  })
})

describe('createDevClock', () => {
  it('defaults to 0 and leaves the date alone', () => {
    const clock = createDevClock(() => memoryStorage())
    const base = new Date(2026, 9, 6, 8, 0)
    expect(clock.get()).toBe(0)
    expect(clock.today(base)).toBe('2026-10-06')
  })

  it('shifts today by the offset and persists it', () => {
    const storage = memoryStorage()
    const clock = createDevClock(() => storage)
    clock.set(3)
    expect(clock.today(new Date(2026, 9, 30, 8, 0))).toBe('2026-11-02')
    expect(storage.data[DAY_OFFSET_KEY]).toBe('3')
    expect(createDevClock(() => storage).get()).toBe(3)
  })

  it('supports negative offsets', () => {
    const clock = createDevClock(() => memoryStorage())
    clock.set(-1)
    expect(clock.today(new Date(2026, 2, 1, 8, 0))).toBe('2026-02-28')
  })

  it('notifies subscribers only on change, and stops after unsubscribe', () => {
    const clock = createDevClock(() => memoryStorage())
    const listener = vi.fn()
    const off = clock.subscribe(listener)
    clock.set(1)
    clock.set(1)
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    clock.set(2)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('ignores non-integer sets', () => {
    const clock = createDevClock(() => memoryStorage())
    clock.set(2)
    clock.set(Number.NaN)
    expect(clock.get()).toBe(0)
  })

  it('falls back to 0 when storage is missing or throws', () => {
    expect(createDevClock(() => null).get()).toBe(0)
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    const clock = createDevClock(() => broken)
    expect(clock.get()).toBe(0)
    const listener = vi.fn()
    clock.subscribe(listener)
    clock.set(2)
    expect(clock.get()).toBe(2)
    expect(listener).toHaveBeenCalledTimes(1)
    const throwingGetter = createDevClock(() => {
      throw new Error('no storage')
    })
    expect(throwingGetter.get()).toBe(0)
    expect(() => throwingGetter.set(1)).not.toThrow()
  })

  it('ignores junk already in storage', () => {
    expect(createDevClock(() => memoryStorage({ [DAY_OFFSET_KEY]: 'soon' })).get()).toBe(0)
  })
})
