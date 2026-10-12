import { expect, it } from 'vitest'
import { pointerAttention, sampleAttention } from './playerAttention'

it.each([
  { matrix: { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 }, client: [350, 132] },
  { matrix: { a: 0, b: 2, c: -2, d: 0, e: 410, f: 20 }, client: [298, 360] },
])('maps a screen pointer through the actual SVG transform', ({ matrix, client }) => {
  expect(pointerAttention(client[0], client[1], matrix)).toEqual({ x: 3, y: -2 })
})

it('centers the gaze under a sheared, translated scene', () => {
  expect(pointerAttention(336, 322, { a: 2, b: 0.5, c: 1, d: 2, e: 10, f: 20 })).toEqual({ x: 0, y: 0 })
})

it('rejects absent, singular and nonfinite geometry', () => {
  expect(pointerAttention(0, 0, null)).toBeNull()
  expect(pointerAttention(0, 0, { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 })).toBeNull()
  expect(pointerAttention(Infinity, 0, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toBeNull()
  expect(pointerAttention(0, 0, { a: 1, b: 0, c: 0, d: 1, e: NaN, f: 0 })).toBeNull()
})

it('eases to the bounded gaze in 120ms independently of sampling frequency', () => {
  const start = sampleAttention(null, { x: 3, y: -2 }, 100)
  expect(start.value).toEqual({ x: 0, y: 0 })
  const half = sampleAttention(start, { x: 3, y: -2 }, 160)
  expect(half.value).toEqual({ x: 1.5, y: -1 })
  const end = sampleAttention(half, { x: 3, y: -2 }, 220)
  expect(end.value).toEqual({ x: 3, y: -2 })
  expect(sampleAttention(start, { x: 3, y: -2 }, 220).value).toEqual(end.value)
})

it('retargets from the current value without a jump and leaves the previous snapshot intact', () => {
  const first = sampleAttention(null, { x: 3, y: -2 }, 100)
  const original = structuredClone(first)
  const changed = sampleAttention(first, { x: -3, y: 2 }, 160)
  expect(changed.value).toEqual({ x: 1.5, y: -1 })
  expect(sampleAttention(changed, { x: -3, y: 2 }, 220).value).toEqual({ x: -0.75, y: 0.5 })
  expect(sampleAttention(changed, { x: -3, y: 2 }, 280).value).toEqual({ x: -3, y: 2 })
  expect(first).toEqual(original)
})

it('returns exactly to neutral after release and immediately under suppression', () => {
  const start = sampleAttention(null, { x: 3, y: -2 }, 100)
  const released = sampleAttention(start, null, 220)
  expect(released.value).toEqual({ x: 3, y: -2 })
  expect(sampleAttention(released, null, 280).value).toEqual({ x: 1.5, y: -1 })
  expect(sampleAttention(released, null, 340).value).toEqual({ x: 0, y: 0 })
  expect(sampleAttention(start, { x: 3, y: -2 }, 160, true).value).toEqual({ x: 0, y: 0 })
})

it('keeps malformed targets and backwards time finite and bounded', () => {
  const start = sampleAttention(null, { x: 300, y: -200 }, 100)
  expect(sampleAttention(start, { x: 300, y: -200 }, 220).value).toEqual({ x: 3, y: -2 })
  expect(sampleAttention(start, { x: 300, y: -200 }, 90).value).toEqual({ x: 0, y: 0 })
  expect(sampleAttention(null, { x: NaN, y: Infinity }, NaN).value).toEqual({ x: 0, y: 0 })
})
