// Offline, bounded before/after comparison using the production SVG renderer.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { JSDOM } from 'jsdom'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const label = process.argv[2], out = 'docs/audits/2026-10-12-character-polish'
if (!['before', 'after'].includes(label)) throw new Error('Expected before or after')
const baseline = await readFile(`${out}/pointer-attention-baseline.ts.txt`, 'utf8')
const server = await createServer({ plugins: [{ name: 'pointer-baseline', enforce: 'pre', transform(code, id) {
  if (label === 'before' && id.split('?')[0] === `${process.cwd()}/src/pet/playerAttention.ts`) return { code: baseline, map: null }
} }], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
const dom = new JSDOM('<div></div>'), container = dom.window.document.querySelector('div')
function pointAt(node, x, y) {
  for (let el = node; el; el = el.parentElement) {
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
try {
  const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
  const { sampleMotion } = await server.ssrLoadModule('/src/character/motion.ts')
  const { pointerAttention, faceAttention } = await server.ssrLoadModule('/src/pet/playerAttention.ts')
  const { SPECIES_COLOUR, PALETTE } = await server.ssrLoadModule('/src/art/palette.ts')
  const { PET_STROKE_SCALE } = await server.ssrLoadModule('/src/room/shell/geometry.ts')
  const h = React.createElement, cells = [], samples = []
  const equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
  for (const species of ['mochi', 'bun', 'sprout']) for (const mood of ['happy', 'content', 'meh', 'scruffy']) for (const facing of [1, -1]) {
    const frame = { ...sampleMotion({ species, mood, action: 'idle', elapsedMs: 800, blinkMs: 800, distance: 0, durationMs: 4000, reducedMotion: false }), eyeOpen: 1 }
    const mirror = facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined
    const draw = (input, strokeScale = 1) => h('g', { transform: mirror }, h(AnimatedCharacterArt, { species, mood, frame: input, equipped, bodyColour: SPECIES_COLOUR[species], strokeScale }))
    container.innerHTML = renderToStaticMarkup(h('svg', null, draw({ ...frame, gazeX: 0, gazeY: 0 })))
    const points = [...container.querySelectorAll('[data-eye-gaze] ellipse')].map(node => pointAt(node, +node.getAttribute('cx'), +node.getAttribute('cy')))
    if (points.length !== 2) throw new Error('Expected two open drawn eyes')
    const origin = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
    const target = { x: origin.x + 30, y: origin.y }
    const old = label === 'before' ? pointerAttention(target.x, target.y, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : null
    const gaze = old ? { x: old.x * facing, y: old.y } : faceAttention(target, species, mood, frame, facing)
    const aimed = { ...frame, gazeX: frame.gazeX + gaze.x, gazeY: frame.gazeY + gaze.y }
    const views = [200, 60, 25].map((size, i) => h('g', { key: size, transform: `translate(${[0, 205, 280][i]} ${100 - size / 2}) scale(${size / 200})` },
      draw(aimed, size === 25 ? PET_STROKE_SCALE : 1),
      h('path', { d: `M${target.x - 3} ${target.y} h6 M${target.x} ${target.y - 3} v6`, stroke: PALETTE.accent, strokeWidth: 1.2, fill: 'none' })))
    cells.push(h('g', { key: cells.length, transform: `translate(${cells.length % 4 * 330} ${Math.floor(cells.length / 4) * 230})` }, views,
      h('text', { x: 8, y: 220, fontSize: 11, fill: PALETTE.ink }, `${species} ${mood} facing${facing};200/60/25px`)))
    samples.push({ species, mood, facing, origin, target, gaze })
  }
  const markup = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 1320, height: 1380 }, h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }), cells))
  const file = `${out}/pointer-attention-${label}.png`
  await writeFile(file, new Resvg(markup).render().asPng())
  const paths = ['src/pet/playerAttention.ts', 'src/character/AnimatedCharacter.tsx', 'src/character/motion.ts', 'src/character/species/animatedBody.tsx', 'src/character/parts.tsx', 'src/character/eyeGeometry.ts', `${out}/capture-pointer-attention.mjs`]
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  await writeFile(`${out}/pointer-attention-${label}.json`, JSON.stringify({ method: '24dressed species/mood/mirror samples,each200/60/25px. Pointer cross is30characterunits right of the actual drawn eye centre. Static settled attention only;no temporal playback. Baseline uses exact stored96df2f3pointer helper and the then-current facing multiplication.', samples,
    sourceSha256: Object.fromEntries(await Promise.all(paths.map(async path => [path, hash(label === 'before' && path === 'src/pet/playerAttention.ts' ? baseline : await readFile(path))]))),
    captureSha256: hash(await readFile(file)) }, null, 2) + '\n')
  console.log(`Wrote ${label}:24samples with72size views`)
} finally { dom.window.close(); await server.close() }
