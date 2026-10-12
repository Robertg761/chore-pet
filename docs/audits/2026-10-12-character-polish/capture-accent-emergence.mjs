// Bounded static production-art comparison; no browser or animation clock.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const label = process.argv[2], out = 'docs/audits/2026-10-12-character-polish'
if (!['before', 'after'].includes(label)) throw new Error('Expected before or after')
const baselines = Object.fromEntries(await Promise.all(['accent.tsx', 'AnimatedCharacter.tsx'].map(async file =>
  [`${process.cwd()}/src/character/${file}`, await readFile(`${out}/accent-emergence-baseline-${file}.txt`, 'utf8')])))
const server = await createServer({ plugins: [{ name: 'accent-baseline', enforce: 'pre', transform(code, id) {
  const source = baselines[id.split('?')[0]]
  if (label === 'before' && source !== undefined) return { code: source, map: null }
} }], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
  const { sampleMotion, ACTION_MS } = await server.ssrLoadModule('/src/character/motion.ts')
  const { SPECIES_COLOUR, PALETTE } = await server.ssrLoadModule('/src/art/palette.ts')
  const { PET_STROKE_SCALE } = await server.ssrLoadModule('/src/room/shell/geometry.ts')
  const h = React.createElement, cells = [], samples = []
  const equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
  for (const species of ['mochi', 'bun', 'sprout']) for (const action of ['affection', 'celebrate']) {
    for (const facing of [1, -1]) for (const phase of [.24, .5, .8]) {
      const frame = sampleMotion({ species, mood: 'happy', action, elapsedMs: ACTION_MS[action] * phase,
        blinkMs: ACTION_MS[action] * phase, durationMs: ACTION_MS[action], distance: 0, facing, reducedMotion: false })
      const views = [200, 60, 25].map((size, i) => h('g', { key: size,
        transform: `translate(${[0, 205, 280][i]} ${100 - size / 2}) scale(${size / 200})` },
      h('g', { transform: facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined },
        h(AnimatedCharacterArt, { species, mood: 'happy', frame, equipped, bodyColour: SPECIES_COLOUR[species],
          strokeScale: size === 25 ? PET_STROKE_SCALE : 1 }))))
      cells.push(h('g', { key: cells.length, transform: `translate(${cells.length % 4 * 330} ${Math.floor(cells.length / 4) * 230})` },
        views, h('text', { x: 8, y: 220, fontSize: 11, fill: PALETTE.ink }, `${species} ${action} f${facing} ${phase * 100}%;200/60/25px`)))
      samples.push({ species, action, facing, phase, frame })
    }
  }
  const markup = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 1320, height: 2070 },
    h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }), cells))
  const png = `${out}/accent-emergence-${label}-sizes.png`
  await writeFile(png, new Resvg(markup).render().asPng())
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  const sources = ['src/character/accent.tsx', 'src/character/AnimatedCharacter.tsx', 'src/character/motion.ts',
    'src/character/species/animatedBody.tsx', 'src/character/parts.tsx', `${out}/capture-accent-emergence.mjs`]
  await writeFile(`${out}/accent-emergence-${label}.json`, JSON.stringify({ method:
    '36 dressed samples:3species/2actions/2mirrors/3phases,108views200/60/25px. Baseline renderer/accent copies originate at597890d. Static comparison, not human temporal acceptance.',
    samples, sourceSha256: Object.fromEntries(await Promise.all(sources.map(async path => [path,
      hash(label === 'before' && baselines[`${process.cwd()}/${path}`] !== undefined ? baselines[`${process.cwd()}/${path}`] : await readFile(path))]))),
    captureSha256: { [png]: hash(await readFile(png)) } }, null, 2) + '\n')
  console.log(`Wrote ${label}:36dressed samples/108size views`)
} finally { await server.close() }
