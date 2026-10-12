// Static production art and numeric appendage curves; no live animation clock.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const label = process.argv[2], out = 'docs/audits/2026-10-12-character-polish'
if (!['before', 'after'].includes(label)) throw new Error('Expected before or after')
const baseline = await readFile(`${out}/affection-follow-baseline.ts.txt`, 'utf8')
const server = await createServer({ plugins: [{ name: 'affection-baseline', enforce: 'pre', transform(code, id) {
  if (label === 'before' && id.split('?')[0] === `${process.cwd()}/src/character/motion.ts`) return { code: baseline, map: null }
} }], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
  const { sampleMotion, ACTION_MS } = await server.ssrLoadModule('/src/character/motion.ts')
  const { SPECIES_COLOUR, PALETTE } = await server.ssrLoadModule('/src/art/palette.ts')
  const { PET_STROKE_SCALE } = await server.ssrLoadModule('/src/room/shell/geometry.ts')
  const h = React.createElement, speciesList = ['mochi', 'bun', 'sprout'], actions = ['affection'], cells = [], samples = []
  const equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
  const at = (species, action, elapsedMs) => sampleMotion({ species, action, mood: 'happy', elapsedMs, blinkMs: elapsedMs, distance: 0, durationMs: ACTION_MS[action], reducedMotion: false })
  for (const species of speciesList) for (const action of actions) for (const facing of [1, -1]) for (const phase of [.25, .5, .85]) {
    const frame = at(species, action, ACTION_MS[action] * phase)
    const draw = size => h('g', { transform: facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined }, h(AnimatedCharacterArt,
      { species, mood: 'happy', frame, equipped, bodyColour: SPECIES_COLOUR[species], strokeScale: size === 25 ? PET_STROKE_SCALE : 1 }))
    const views = [200, 60, 25].map((size, i) => h('g', { key: size, transform: `translate(${[0, 205, 280][i]} ${100 - size / 2}) scale(${size / 200})` }, draw(size)))
    cells.push(h('g', { key: cells.length, transform: `translate(${cells.length % 4 * 330} ${Math.floor(cells.length / 4) * 230})` }, views,
      h('text', { x: 8, y: 220, fontSize: 11, fill: PALETTE.ink }, `${species} ${action} f${facing} ${phase * 100}%;200/60/25px`)))
    samples.push({ species, action, facing, phase, frame })
  }
  async function png(name, width, height, children) {
    const markup = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width, height }, h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }), children))
    await writeFile(`${out}/${name}`, new Resvg(markup).render().asPng())
  }
  const sizes = `affection-follow-${label}-sizes.png`, curvesFile = `affection-follow-${label}-curves.png`
  await png(sizes, 1320, 1150, cells)
  const colours = { mochi: '#ca6080', bun: '#397dbb', sprout: '#568747' }, curveSamples = []
  const charts = actions.map((action, i) => {
    const x0 = 54, y0 = 50, width = 430, height = 200, duration = ACTION_MS[action]
    const curves = speciesList.map(species => {
      const points = Array.from({ length: 351 }, (_, n) => { const ms = duration * n / 350; return { ms, angle: at(species, action, ms).leftAppendage } })
      curveSamples.push({ species, action, points })
      return h('path', { key: species, d: points.map((p, n) => `${n ? 'L' : 'M'}${(x0 + p.ms / duration * width).toFixed(3)} ${(y0 + (p.angle + 14) / 28 * height).toFixed(3)}`).join(' '), fill: 'none', stroke: colours[species], strokeWidth: 1.8 })
    })
    return h('g', { key: action, transform: `translate(${i * 520} 0)` },
      h('text', { x: x0, y: 20, fontSize: 14, fill: PALETTE.ink }, `${action}:left appendage angle over ${duration}ms`),
      speciesList.map((species, n) => h('text', { key: species, x: x0 + n * 130, y: 39, fontSize: 12, fill: colours[species] }, species)),
      [-12, -6, 0, 6, 12].map(angle => h('g', { key: angle }, h('path', { d: `M${x0} ${y0 + (angle + 14) / 28 * height} h${width}`, stroke: '#d8d0c4', fill: 'none' }),
        h('text', { x: 12, y: y0 + (angle + 14) / 28 * height + 4, fontSize: 11, fill: PALETTE.ink }, `${angle}°`))), curves,
      [0, duration / 2, duration].map(ms => h('text', { key: ms, x: x0 + ms / duration * width, y: 275, textAnchor: 'middle', fontSize: 11, fill: PALETTE.ink }, `${ms}ms`)))
  })
  await png(curvesFile, 520, 290, charts)
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  const sources = ['src/character/motion.ts', 'src/character/AnimatedCharacter.tsx', 'src/character/species/animatedBody.tsx', 'src/character/parts.tsx', `${out}/capture-affection-follow.mjs`]
  await writeFile(`${out}/affection-follow-${label}.json`, JSON.stringify({ method: '18dressed species/action/mirror/phase samples,54views at200/60/25px,and appendage-angle/time curves. Static/numeric comparison only;no human temporal playback. Baseline is exact8ec7aa7 sampler source.', samples, curveSamples,
    sourceSha256: Object.fromEntries(await Promise.all(sources.map(async path => [path, hash(label === 'before' && path === 'src/character/motion.ts' ? baseline : await readFile(path))]))),
    captureSha256: Object.fromEntries(await Promise.all([sizes, curvesFile].map(async file => [file, hash(await readFile(`${out}/${file}`))]))) }, null, 2) + '\n')
  console.log(`Wrote ${label}:54sizeviews and3appendage curves`)
} finally { await server.close() }
