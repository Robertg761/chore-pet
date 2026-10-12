// Bounded dressed views of the new grounded stretch at early, held and recovery phases.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const out = 'docs/audits/2026-10-12-character-polish'
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { AnimatedCharacterArt } = await server.ssrLoadModule('/src/character/AnimatedCharacter.tsx')
  const { sampleMotion, ACTION_MS } = await server.ssrLoadModule('/src/character/motion.ts')
  const { SPECIES_COLOUR, PALETTE } = await server.ssrLoadModule('/src/art/palette.ts')
  const { PET_STROKE_SCALE } = await server.ssrLoadModule('/src/room/shell/geometry.ts')
  const h = React.createElement, cells = [], samples = []
  for (const species of ['mochi', 'bun', 'sprout']) for (const mood of ['happy', 'scruffy']) for (const facing of [1, -1]) for (const phase of [.1, .42, .85]) {
    const dark = mood === 'scruffy'
    const bodyColour = dark ? '#38243b' : SPECIES_COLOUR[species], look = { eyes: dark ? 'lashes' : 'classic' }
    const frame = sampleMotion({ species, mood, action: 'stretch', elapsedMs: ACTION_MS.stretch * phase,
      blinkMs: ACTION_MS.stretch * phase, durationMs: ACTION_MS.stretch, facing, distance: 0, reducedMotion: false })
    const views = [200, 60, 25].map((size, i) => h('g', { key: size,
      transform: `translate(${[0, 205, 280][i]} ${100 - size / 2}) scale(${size / 200})` },
      h('g', { transform: facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined }, h(AnimatedCharacterArt, { species, mood, frame, bodyColour, look, strokeScale: size === 25 ? PET_STROKE_SCALE : 1,
        equipped: { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' } }))))
    cells.push(h('g', { key: cells.length, transform: `translate(${cells.length % 4 * 330} ${Math.floor(cells.length / 4) * 230})` }, views,
      h('text', { x: 8, y: 220, fontSize: 11, fill: PALETTE.ink }, `${species} ${mood} f${facing} ${phase * 100}%;200/60/25px`)))
    samples.push({ species, mood, facing, phase, bodyColour, look, frame })
  }
  const png = `${out}/stretch-gesture.png`
  const markup = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 1320, height: 2070 },
    h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }), cells))
  await writeFile(png, new Resvg(markup).render().asPng())
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  const sources = ['src/character/motion.ts', 'src/character/parts.tsx', 'src/character/species/animatedBody.tsx',
    'src/character/AnimatedCharacter.tsx', 'src/character/Character.tsx', `${out}/capture-stretch-gesture.mjs`]
  await writeFile(`${out}/stretch-gesture.json`, JSON.stringify({ method:
    '36 dressed stretch samples,108views200/60/25px.3species/2moods-and-looks/2facings/3phases. Happy/light/classic,scruffy/dark/lashes. Static pose/wardrobe review,not temporal acceptance.',
    samples, sourceSha256: Object.fromEntries(await Promise.all(sources.map(async path => [path, hash(await readFile(path))]))),
    captureSha256: { [png]: hash(await readFile(png)) } }, null, 2) + '\n')
  console.log('Wrote36stretch samples/108sizeviews')
} finally { await server.close() }
