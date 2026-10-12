// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const cleanup: (() => void)[] = []
beforeEach(() => { vi.resetModules(); localStorage.clear() })
afterEach(() => { cleanup.splice(0).forEach(stop => stop()); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() })
const load = () => import('./motionPreference')

it.each([null, 'off', 'true', 'unexpected'])('defaults to normal pet motion for stored %s', async stored => {
  const m = await load()
  if (stored !== null) localStorage.setItem(m.PET_MOTION_PREFERENCE_KEY, stored)
  expect(m.petMotionReduced()).toBe(false)
})

it('reads the device preference before the first consumer subscribes', async () => {
  const m = await load()
  localStorage.setItem(m.PET_MOTION_PREFERENCE_KEY, 'on')
  expect(m.petMotionReduced()).toBe(true)
})

it('persists real changes and notifies each consumer only when the value changes', async () => {
  const m = await load(), first = vi.fn(), second = vi.fn()
  cleanup.push(m.subscribePetMotionPreference(first), m.subscribePetMotionPreference(second))
  const write = vi.spyOn(Storage.prototype, 'setItem')
  m.setPetMotionReduced(true)
  expect(m.petMotionReduced()).toBe(true)
  expect(localStorage.getItem(m.PET_MOTION_PREFERENCE_KEY)).toBe('on')
  expect(first).toHaveBeenCalledOnce(); expect(second).toHaveBeenCalledOnce()
  m.setPetMotionReduced(true)
  expect(first).toHaveBeenCalledOnce(); expect(write).toHaveBeenCalledOnce()
  m.setPetMotionReduced(false)
  expect(m.petMotionReduced()).toBe(false)
  expect(localStorage.getItem(m.PET_MOTION_PREFERENCE_KEY)).toBe('off')
  expect(first).toHaveBeenCalledTimes(2); expect(second).toHaveBeenCalledTimes(2)
})

it('keeps the selection in memory when storage reads and writes are blocked', async () => {
  const m = await load(), changed = vi.fn()
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  expect(m.petMotionReduced()).toBe(false)
  cleanup.push(m.subscribePetMotionPreference(changed))
  expect(() => m.setPetMotionReduced(true)).not.toThrow()
  expect(m.petMotionReduced()).toBe(true)
  expect(changed).toHaveBeenCalledOnce()
  m.setPetMotionReduced(false)
  expect(m.petMotionReduced()).toBe(false)
  expect(changed).toHaveBeenCalledTimes(2)
})

it('receives scoped local-storage changes and clearing without echo writes', async () => {
  const m = await load(), changed = vi.fn()
  cleanup.push(m.subscribePetMotionPreference(changed))
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const event = (key: string | null, newValue: string | null, storageArea: Storage = localStorage) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea }))
  event('unrelated', 'on')
  event(m.PET_MOTION_PREFERENCE_KEY, 'on', sessionStorage)
  expect(changed).not.toHaveBeenCalled()
  event(m.PET_MOTION_PREFERENCE_KEY, 'on')
  expect(m.petMotionReduced()).toBe(true)
  expect(changed).toHaveBeenCalledOnce()
  event(m.PET_MOTION_PREFERENCE_KEY, 'on')
  expect(changed).toHaveBeenCalledOnce()
  event(null, null)
  expect(m.petMotionReduced()).toBe(false)
  expect(changed).toHaveBeenCalledTimes(2)
  expect(write).not.toHaveBeenCalled()
})

it('shares one native storage listener and removes it with the final consumer', async () => {
  const m = await load(), first = vi.fn(), second = vi.fn()
  const add = vi.spyOn(window, 'addEventListener'), remove = vi.spyOn(window, 'removeEventListener')
  const stopFirst = m.subscribePetMotionPreference(first), stopSecond = m.subscribePetMotionPreference(second)
  cleanup.push(stopFirst, stopSecond)
  expect(add.mock.calls.filter(([name]) => name === 'storage')).toHaveLength(1)
  stopFirst(); stopFirst()
  expect(remove.mock.calls.filter(([name]) => name === 'storage')).toHaveLength(0)
  m.setPetMotionReduced(true)
  expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledOnce()
  stopSecond(); stopSecond()
  expect(remove.mock.calls.filter(([name]) => name === 'storage')).toHaveLength(1)
  window.dispatchEvent(new StorageEvent('storage', { key: m.PET_MOTION_PREFERENCE_KEY, newValue: 'off', storageArea: localStorage }))
  expect(second).toHaveBeenCalledOnce()
})

it('can be read without a browser or storage', async () => {
  const m = await load()
  vi.stubGlobal('window', undefined)
  expect(m.petMotionReduced()).toBe(false)
})

it('refreshes a device change made while there were no consumers', async () => {
  const m = await load()
  expect(m.petMotionReduced()).toBe(false)
  const stop = m.subscribePetMotionPreference(() => {})
  stop()
  // Another tab can change storage while this view has no native listener.
  localStorage.setItem(m.PET_MOTION_PREFERENCE_KEY, 'on')
  expect(m.petMotionReduced()).toBe(true)
  cleanup.push(m.subscribePetMotionPreference(() => {}))
  expect(m.petMotionReduced()).toBe(true)
})

it('does not replace an unsaved visit choice with the older readable storage value', async () => {
  const m = await load()
  localStorage.setItem(m.PET_MOTION_PREFERENCE_KEY, 'off')
  expect(m.petMotionReduced()).toBe(false)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('write blocked') })
  m.setPetMotionReduced(true)
  expect(localStorage.getItem(m.PET_MOTION_PREFERENCE_KEY)).toBe('off')
  expect(m.petMotionReduced()).toBe(true)
  const stop = m.subscribePetMotionPreference(() => {})
  stop()
  expect(m.petMotionReduced()).toBe(true)
})

it('does not notify a consumer removed by an earlier callback in the same change', async () => {
  const m = await load(), second = vi.fn()
  let stopSecond = () => {}
  cleanup.push(m.subscribePetMotionPreference(() => stopSecond()))
  stopSecond = m.subscribePetMotionPreference(second)
  cleanup.push(stopSecond)
  m.setPetMotionReduced(true)
  expect(second).not.toHaveBeenCalled()
})
