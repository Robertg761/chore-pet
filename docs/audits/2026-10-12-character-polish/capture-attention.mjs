// Run from the repository root. Small production-helper/SVG samples, no browser.
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
  const { sampleMotion } = await server.ssrLoadModule('/src/character/motion.ts')
  const { sampleAttention } = await server.ssrLoadModule('/src/pet/playerAttention.ts')
  const { PALETTE, SPECIES_COLOUR } = await server.ssrLoadModule('/src/art/palette.ts')
  const h = React.createElement
  const species = ['mochi', 'bun', 'sprout'], moods = ['happy', 'content', 'meh', 'scruffy', 'sick']
  const targets = [{ label: 'Neutral', point: null }, { label: 'Pointer upper left', point: { x: -3, y: -2 } },
    { label: 'Pointer lower right', point: { x: 3, y: 2 } }, { label: 'Keyboard focus', point: { x: 0, y: -1.5 } }]
  const equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
  function art(s, mood, colour, point, facing = 1) {
    const attention = sampleAttention(sampleAttention(null, point, 0), point, 120, mood === 'sick').value
    const frame = sampleMotion({ species: s, mood, action: 'idle', elapsedMs: 120, blinkMs: 0, distance: 0, durationMs: 4000, reducedMotion: false })
    frame.gazeX += attention.x * facing
    frame.gazeY += attention.y
    return h('g', { transform: facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined },
      h(AnimatedCharacterArt, { species: s, mood, bodyColour: colour, frame, equipped, strokeScale: 1.6 }))
  }
  const cells = species.flatMap(s => [SPECIES_COLOUR[s], PALETTE.ink].flatMap((colour, colourIndex) => targets.map(({label, point}) => ({
    label: `${s}, ${colourIndex ? 'dark' : 'default'}, ${label}`, art: art(s, 'happy', colour, point),
  }))))
  const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 1000, height: 1500 },
    h('rect', { width: 1000, height: 1500, fill: PALETTE.cream }),
    cells.map((cell, i) => h('g', { key: i, transform: `translate(${i % 4 * 250 + 25} ${Math.floor(i / 4) * 250 + 5})` },
      cell.art, h('text', { x: -16, y: 224, fontSize: 10, fill: PALETTE.ink }, cell.label)))))
  await writeFile(`${out}/attention-poses.png`, new Resvg(svg).render().asPng())
  let renders = 0, outside = 0
  for (const s of species) for (const mood of moods) for (const colour of [SPECIES_COLOUR[s], PALETTE.ink]) {
    for (const facing of [1, -1]) for (const { point } of targets) {
      const padded = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 240, height: 240, viewBox: '-20 -20 240 240' }, art(s, mood, colour, point, facing)))
      const { pixels } = new Resvg(padded, { font: { loadSystemFonts: false } }).render()
      for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
        if ((x < 20 || x >= 220 || y < 20 || y >= 220) && pixels[(y * 240 + x) * 4 + 3] > 5) outside++
      }
      renders++
    }
  }
  const sources = ['src/pet/playerAttention.ts', 'src/pet/LivingRoom.tsx', 'src/room/Room.tsx', 'src/character/motion.ts', 'src/character/AnimatedCharacter.tsx', 'src/character/species/animatedBody.tsx', `${out}/capture-attention.mjs`]
  const sourceSha256 = Object.fromEntries(await Promise.all(sources.map(async p => [p, createHash('sha256').update(await readFile(p)).digest('hex')])))
  await writeFile(`${out}/attention-captures.json`, JSON.stringify({ method: 'Production attention helper plus production sampler/SVG. Static settled-target samples, not temporal playback or full Room integration.', sheetSamples: cells.length, rasterSamples: renders, outside, alphaThreshold: 5, strokeScale: 1.6, sourceSha256 }, null, 2) + '\n')
  console.log(`${cells.length} sheet samples; ${renders} padded rasters; ${outside} outside pixels`)
  if (outside) process.exitCode = 1
} finally { await server.close() }
