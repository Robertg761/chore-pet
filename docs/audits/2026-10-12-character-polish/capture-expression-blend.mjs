// Bounded static comparison of production faces and their attached wardrobe.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const label = process.argv[2], out = 'docs/audits/2026-10-12-character-polish'
if (!['before', 'after'].includes(label)) throw new Error('Expected before or after')
const sourcePaths = ['src/character/motion.ts', 'src/character/parts.tsx', 'src/character/species/animatedBody.tsx', 'src/pet/activityMotion.ts']
const baselines = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [
  `${process.cwd()}/${path}`, await readFile(`${out}/expression-blend-baseline-${path.split('/').at(-1)}.txt`, 'utf8'),
])))
const server = await createServer({ plugins: [{ name: 'expression-baseline', enforce: 'pre', transform(code, id) {
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
  for (const species of ['mochi', 'bun', 'sprout']) for (const mood of ['content', 'meh']) {
    const bodyColour = mood === 'meh' ? '#38243b' : SPECIES_COLOUR[species]
    const look = { eyes: mood === 'meh' ? 'lashes' : 'classic' }
    for (const facing of [1, -1]) for (const phase of [.06, .5, .94]) {
      const frame = sampleMotion({ species, mood, action: 'affection', elapsedMs: ACTION_MS.affection * phase,
        blinkMs: ACTION_MS.affection * phase, durationMs: ACTION_MS.affection, distance: 0, facing, reducedMotion: false })
      const views = [200, 60, 25].map((size, i) => h('g', { key: size,
        transform: `translate(${[0, 205, 280][i]} ${100 - size / 2}) scale(${size / 200})` },
        h('g', { transform: facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined },
          h(AnimatedCharacterArt, { species, mood, frame, equipped, bodyColour, look, strokeScale: size === 25 ? PET_STROKE_SCALE : 1 }))))
      cells.push(h('g', { key: cells.length, transform: `translate(${cells.length % 4 * 330} ${Math.floor(cells.length / 4) * 230})` }, views,
        h('text', { x: 8, y: 220, fontSize: 11, fill: PALETTE.ink }, `${species} ${mood} f${facing} ${phase * 100}%;200/60/25px`)))
      samples.push({ species, mood, facing, phase, bodyColour, look, frame })
    }
  }
  const markup = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 1320, height: 2070 },
    h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }), cells))
  const png = `${out}/expression-blend-${label}-sizes.png`
  await writeFile(png, new Resvg(markup).render().asPng())
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  const sources = [...sourcePaths, 'src/character/AnimatedCharacter.tsx', 'src/character/Character.tsx', `${out}/capture-expression-blend.mjs`]
  await writeFile(`${out}/expression-blend-${label}.json`, JSON.stringify({ method:
    '36 dressed affection samples:3species/2moods-and-looks/2mirrors/3phases,108views200/60/25px. Content/light/classic and meh/dark/lashes. Baseline production sources are exact72552aa. Static comparison, not temporal acceptance.',
    samples, sourceSha256: Object.fromEntries(await Promise.all(sources.map(async path => [path,
      hash(label === 'before' && baselines[`${process.cwd()}/${path}`] !== undefined ? baselines[`${process.cwd()}/${path}`] : await readFile(path))]))),
    captureSha256: { [png]: hash(await readFile(png)) } }, null, 2) + '\n')
  console.log(`Wrote ${label}:36dressed samples/108size views`)
} finally { await server.close() }
