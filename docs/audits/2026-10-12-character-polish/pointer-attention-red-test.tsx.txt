// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AnimatedCharacterArt } from '../character/AnimatedCharacter'
import { sampleMotion, type MotionFrame } from '../character/motion'
import type { Mood, Species } from '../domain/types'
import { faceAttention, pointerPosition } from './playerAttention'

// Forward SVG evaluation is independent of the production inverse face helper.
function pointAt(node: Element, x: number, y: number) {
  for (let el: Element | null = node; el; el = el.parentElement) {
    for (const [, op, args] of [...(el.getAttribute('transform') ?? '').matchAll(/(translate|scale|rotate)\(([^)]+)\)/g)].reverse()) {
      const v = args.split(/[ ,]+/).map(Number)
      if (op === 'translate') { x += v[0]; y += v[1] ?? 0 }
      if (op === 'scale') { x *= v[0]; y *= v[1] ?? v[0] }
      if (op === 'rotate') {
        const a = v[0] * Math.PI / 180, cx = v[1] ?? 0, cy = v[2] ?? 0
        ;[x, y] = [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]
      }
    }
  }
  return { x, y }
}

function eyes(species: Species, mood: Mood, facing: 1 | -1, frame: MotionFrame) {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(<svg><g transform={facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined}>
    <AnimatedCharacterArt species={species} mood={mood} bodyColour="#FFB6C1" equipped={{ face: 'glasses' }} frame={frame} />
  </g></svg>)
  const points = [...container.querySelectorAll('[data-eye-gaze] ellipse')].map(node =>
    pointAt(node, +node.getAttribute('cx')!, +node.getAttribute('cy')!))
  expect(points).toHaveLength(2)
  return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
}

it('retains the exact input point through scale, rotation, shear and translation', () => {
  for (const matrix of [{ a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 },
    { a: 0, b: 2, c: -2, d: 0, e: 410, f: 20 }, { a: 2, b: .5, c: 1, d: 2, e: 10, f: 20 }]) {
    for (const p of [{ x: 100, y: 124 }, { x: 170, y: 56 }, { x: -1000, y: 3000 }]) {
      const at = pointerPosition(matrix.a * p.x + matrix.c * p.y + matrix.e, matrix.b * p.x + matrix.d * p.y + matrix.f, matrix)!
      expect(at.x).toBeCloseTo(p.x, 10)
      expect(at.y).toBeCloseTo(p.y, 10)
    }
  }
})

it('rejects nonfinite and singular input geometry', () => {
  expect(pointerPosition(0, 0, null)).toBeNull()
  expect(pointerPosition(0, 0, { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 })).toBeNull()
  expect(pointerPosition(Infinity, 0, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toBeNull()
  expect(pointerPosition(0, 0, { a: 1, b: 0, c: 0, d: 1, e: NaN, f: 0 })).toBeNull()
})

it.each(['mochi', 'bun', 'sprout'] as const)('%s aims from its actual drawn eyes through both mirrors and every upright mood', species => {
  for (const mood of ['happy', 'content', 'meh', 'scruffy'] as const) for (const facing of [1, -1] as const) {
    const frame = { ...sampleMotion({ species, mood, action: 'idle', elapsedMs: 800, distance: 0, durationMs: 4000, reducedMotion: false }),
      bodyX: 3, bodyY: -2, lean: 8, scaleX: 1.06, scaleY: .94, gazeX: 0, gazeY: 0, eyeOpen: 1 }
    const origin = eyes(species, mood, facing, frame)
    for (const [dx, dy] of [[20, 0], [0, 10], [-70, -40], [1000, 800], [-.1, 0], [0, 0]]) {
      const target = { x: origin.x + dx, y: origin.y + dy }
      const gaze = faceAttention(target, species, mood, frame, facing)
      expect(Math.hypot(gaze.x / 3, gaze.y / 2)).toBeLessThanOrEqual(1 + 1e-12)
      const actual = eyes(species, mood, facing, { ...frame, gazeX: gaze.x, gazeY: gaze.y })
      const shift = { x: actual.x - origin.x, y: actual.y - origin.y }
      if (!dx && !dy) {
        expect(shift.x).toBeCloseTo(0, 10)
        expect(shift.y).toBeCloseTo(0, 10)
      } else {
        expect(shift.x * dx + shift.y * dy).toBeGreaterThan(0)
        expect(Math.abs(shift.x * dy - shift.y * dx) / Math.hypot(dx, dy)).toBeLessThan(1e-9)
      }
    }
  }
})
