// Small production sampler/SVG stills and padded rasters; no browser or clock.
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
  const { PALETTE, SPECIES_COLOUR } = await server.ssrLoadModule('/src/art/palette.ts')
  const h = React.createElement
  const species = ['mochi', 'bun', 'sprout']
  const moods = ['happy', 'content', 'meh', 'scruffy', 'sick']
  const equipped = { head: 'beanie-red', face: 'glasses', neck: 'scarf', outfit: 'overalls', back: 'backpack' }
  const doubles = { mochi: 7300, bun: 9000, sprout: 5700 }
  const frame = (s, time, mood = 'happy', blinkMs = 0) => sampleMotion({ species: s, mood, action: 'idle', elapsedMs: time, blinkMs, distance: 0, durationMs: 4000, reducedMotion: false })
  function art(s, sampled, colour, dress, facing = 1, mood = 'happy') {
    return h('g', { transform: facing === -1 ? 'translate(200 0) scale(-1 1)' : undefined }, h(AnimatedCharacterArt, {
      species: s, mood, bodyColour: colour, frame: sampled, equipped: dress ? equipped : {}, strokeScale: 1.6,
    }))
  }
  function cell(s, time, dark, blinkMs, label) {
    const sampled = frame(s, time, 'happy', blinkMs)
    const drawing = art(s, sampled, dark ? PALETTE.ink : SPECIES_COLOUR[s], dark)
    return h('g', null, drawing,
      h('g', { transform: 'translate(210 110) scale(.3)' }, drawing),
      h('g', { transform: 'translate(280 145) scale(.125)' }, drawing),
      h('text', { x: 5, y: 224, fontSize: 12, fill: PALETTE.ink }, `${s}, ${dark ? 'dark outfit' : 'default'}, ${label}`))
  }
  async function sheet(path, cells, columns) {
    const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: columns * 320, height: Math.ceil(cells.length / columns) * 240 },
      h('rect', { width: '100%', height: '100%', fill: PALETTE.cream }),
      cells.map((drawing, i) => h('g', { key: i, transform: `translate(${i % columns * 320} ${Math.floor(i / columns) * 240})` }, drawing))))
    await writeFile(`${out}/${path}`, new Resvg(svg).render().asPng())
  }
  const sways = species.flatMap((s) => [false, true].flatMap((dark) => [0, 1000, 2000, 3000].map((t) => cell(s, t, dark, 0, `${t}ms`))))
  const blinks = species.flatMap((s) => [false, true].flatMap((dark) => [0, 70, 170, 270, 340].map((t) => cell(s, 2000, dark, doubles[s] + t, `blink +${t}ms`))))
  await sheet('idle-sway.png', sways, 4)
  await sheet('idle-blinks.png', blinks, 5)

  let renders = 0, outside = 0
  const extrema = {}
  for (const s of species) {
    const times = Array.from({ length: 251 }, (_, i) => i * 16)
    const min = times.reduce((a, b) => frame(s, a).leftAppendage < frame(s, b).leftAppendage ? a : b)
    const max = times.reduce((a, b) => frame(s, a).leftAppendage > frame(s, b).leftAppendage ? a : b)
    extrema[s] = { minimumAt: min, maximumAt: max, minimumDegrees: frame(s, min).leftAppendage, maximumDegrees: frame(s, max).leftAppendage }
    for (const mood of moods) for (const colour of [SPECIES_COLOUR[s], PALETTE.ink]) for (const facing of [1, -1]) {
      for (const time of [0, min, max, 2000]) {
        const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 240, height: 240, viewBox: '-20 -20 240 240' }, art(s, frame(s, time, mood), colour, true, facing, mood)))
        const { pixels } = new Resvg(svg, { font: { loadSystemFonts: false } }).render()
        for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
          if ((x < 20 || x >= 220 || y < 20 || y >= 220) && pixels[(y * 240 + x) * 4 + 3] > 5) outside++
        }
        renders++
      }
    }
  }
  const sources = ['src/character/motion.ts', 'src/character/idleMotion.test.ts', 'src/character/AnimatedCharacter.tsx', 'src/character/species/animatedBody.tsx', 'src/pet/activityMotion.ts', `${out}/capture-idle.mjs`]
  const sourceSha256 = Object.fromEntries(await Promise.all(sources.map(async (p) => [p, createHash('sha256').update(await readFile(p)).digest('hex')])))
  await writeFile(`${out}/idle-captures.json`, JSON.stringify({
    method: 'Production sampler/SVG static stills at 200/60/25px and padded raster containment. Not live room integration or temporal playback acceptance.',
    swayCells: sways.length, blinkCells: blinks.length, rasterSamples: renders, outside, alphaThreshold: 5, strokeScale: 1.6, extrema, sourceSha256,
  }, null, 2) + '\n')
  console.log(`${sways.length} sway cells; ${blinks.length} blink cells; ${renders} padded rasters; ${outside} outside pixels`)
  if (outside) process.exitCode = 1
} finally { await server.close() }
