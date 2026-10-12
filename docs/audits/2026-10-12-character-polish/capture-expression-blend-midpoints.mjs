// Additional still review at the greatest overlap of the two existing faces.
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
  for (const species of ['mochi', 'bun', 'sprout']) for (const mood of ['happy', 'content', 'meh']) for (const dark of [false, true]) {
    const bodyColour = dark ? '#38243b' : SPECIES_COLOUR[species], look = { eyes: dark ? 'lashes' : 'classic' }
    const frame = sampleMotion({ species, mood, action: 'affection', elapsedMs: ACTION_MS.affection * .09,
      blinkMs: ACTION_MS.affection * .09, durationMs: ACTION_MS.affection, distance: 0, reducedMotion: false })
    if (Math.abs(frame.pleasedWeight - .5) > 1e-10) throw new Error('Expected halfway face')
    const views = [200, 60, 25].map((size, i) => h('g', { key: size,
      transform: `translate(${[0, 205, 280][i]} ${100 - size / 2}) scale(${size / 200})` },
      h(AnimatedCharacterArt, { species, mood, frame, bodyColour, look, strokeScale: size === 25 ? PET_STROKE_SCALE : 1,
        equipped: { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' } })))
    cells.push(h('g', { key: cells.length, transform: `translate(${cells.length % 3 * 330} ${Math.floor(cells.length / 3) * 230})` }, views,
      h('text', { x: 8, y: 220, fontSize: 11, fill: PALETTE.ink }, `${species} ${mood} ${dark ? 'dark/lashes' : 'light/classic'};50%face`)))
    samples.push({ species, mood, bodyColour, look, frame })
  }
  const png = `${out}/expression-blend-midpoints.png`
  const markup = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 990, height: 1380 },
    h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }), cells))
  await writeFile(png, new Resvg(markup).render().asPng())
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  const sources = ['src/character/motion.ts', 'src/character/parts.tsx', 'src/character/species/animatedBody.tsx',
    'src/character/AnimatedCharacter.tsx', 'src/character/Character.tsx', `${out}/capture-expression-blend-midpoints.mjs`]
  await writeFile(`${out}/expression-blend-midpoints.json`, JSON.stringify({ method:
    '18 dressed halfway facial blends,54views200/60/25px.3species/3healthy moods/2colour-and-look combinations. Static overlap review,not temporal acceptance.',
    samples, sourceSha256: Object.fromEntries(await Promise.all(sources.map(async path => [path, hash(await readFile(path))]))),
    captureSha256: { [png]: hash(await readFile(png)) } }, null, 2) + '\n')
  console.log('Wrote18halfway blends/54sizeviews')
} finally { await server.close() }
