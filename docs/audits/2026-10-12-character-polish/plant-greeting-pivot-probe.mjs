import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { chromium } from 'playwright-core'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
const out = 'docs/audits/2026-10-12-character-polish', candidate = '/tmp/plant-greeting-candidate.tsx', cssPath = '/tmp/plant-greeting.css'
const sha = value => createHash('sha256').update(value).digest('hex'), css = await readFile(cssPath, 'utf8')
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
  plugins: [{ name: 'candidate-plant-pivot-probe', enforce: 'pre', load(id) {
    if (id.split('?')[0] === path.resolve('src/room/objects/plant.tsx')) return readFile(candidate, 'utf8')
  } }] })
let browser
const rows = []
try {
  const { Room } = await server.ssrLoadModule('/src/room/Room.tsx')
  browser = await chromium.launch({ executablePath: process.env.CHROME })
  const context = await browser.newContext({ viewport: { width: 900, height: 720 }, serviceWorkers: 'block', reducedMotion: 'no-preference' })
  await context.route(/.*/, route => route.abort())
  const page = await context.newPage()
  for (const rotation of [0, 1, 2, 3]) {
    const svg = renderToStaticMarkup(React.createElement(Room, { room: { floorStyle: 'wood', wallStyle: 'cream' }, width: 780,
      objects: [{ id: 'plant', roomId: 'room', catalogId: 'plant', tileX: 2, tileY: 2, rotation }], stages: {},
    }))
    await page.setContent(`<style>${css}</style>${svg}`)
    await page.evaluate(() => document.querySelector('[data-object-id="plant"]').classList.add('room-plant-greeting'))
    const samples = await page.evaluate(() => {
      const effects = document.getAnimations().filter(a => a.animationName === 'plant-leaf-greeting')
      if (effects.length !== 8) throw new Error(`Expected8nativeeffects, got${effects.length}`)
      return [0, 140, 280, 560, 840, 1120, 1400].map(time => {
        for (const effect of effects) { effect.pause(); effect.currentTime = time }
        return { time, roots: [...document.querySelectorAll('.plant-leaf-response')].map(leaf => {
          const own = new DOMPoint(0, 0).matrixTransform(leaf.getScreenCTM()), parent = new DOMPoint(0, 0).matrixTransform(leaf.parentElement.getScreenCTM())
          return { error: Math.hypot(own.x - parent.x, own.y - parent.y), origin: getComputedStyle(leaf).transformOrigin, transform: getComputedStyle(leaf).transform }
        }) }
      })
    })
    rows.push({ rotation, samples })
  }
} finally { await browser?.close(); await server.close() }
const maximum = Math.max(...rows.flatMap(r => r.samples.flatMap(s => s.roots.map(r => r.error))))
await writeFile(`${out}/plant-greeting-pivot-probe.json`, JSON.stringify({ sourceSha256: sha(await readFile(candidate)), cssSha256: sha(css), browser: 'Native local Chromium', roots: 224, maximumAttachmentErrorCssPx: maximum, rows,
  method: 'Isolated candidate SSR SVG and proposed CSS in offline disposable Chromium. Probe injects the response class because frozen production Room does not yet support plants. Geometry experiment only, not integrated app verification.' }, null, 2) + '\n')
console.log(JSON.stringify({ roots: 224, maximumAttachmentErrorCssPx: maximum }))
assert.ok(maximum < .005)
