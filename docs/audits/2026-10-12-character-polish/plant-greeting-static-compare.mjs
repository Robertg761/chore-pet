import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const out = 'docs/audits/2026-10-12-character-polish'
const candidate = '/tmp/plant-greeting-candidate.tsx'
const sha = value => createHash('sha256').update(value).digest('hex')
const rows = [], baseline = []
await mkdir(`${out}/plant-greeting-static-baseline`, { recursive: true })
for (const pass of ['before', 'candidate']) {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
    plugins: pass === 'candidate' ? [{ name: 'plant-leaf-candidate', enforce: 'pre', load(id) {
      if (id.split('?')[0] === path.resolve('src/room/objects/plant.tsx')) return readFile(candidate, 'utf8')
    } }] : [] })
  try {
    const { Room } = await server.ssrLoadModule('/src/room/Room.tsx')
    for (const catalogId of ['plant', 'fish-tank']) for (const stage of ['clean', 'messy1', 'messy2']) for (const rotation of [0, 1, 2, 3]) for (const width of [390, 780]) {
      const svg = renderToStaticMarkup(React.createElement(Room, {
        room: { floorStyle: 'wood', wallStyle: 'cream' }, width,
        objects: [{ id: 'tank', roomId: 'room', catalogId, tileX: 2, tileY: 2, rotation }], stages: { tank: stage },
      })).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      const image = new Resvg(svg).render(), png = image.asPng()
      const row = { catalogId, stage, rotation, width, height: image.height, pixelsSha256: sha(image.pixels), pngSha256: sha(png), svgSha256: sha(svg) }
      if (pass === 'before') {
        baseline.push(row)
        await writeFile(`${out}/plant-greeting-static-baseline/${catalogId}-${stage}-${rotation}-${width}.png`, png)
      } else {
        const before = baseline[rows.length]
        rows.push({ ...row, before, exactPixels: row.pixelsSha256 === before.pixelsSha256, exactPng: row.pngSha256 === before.pngSha256 })
      }
    }
  } finally { await server.close() }
}
const result = { sources: { before: sha(await readFile('src/room/objects/plant.tsx')), candidate: sha(await readFile(candidate)), room: sha(await readFile('src/room/Room.tsx')), fish: sha(await readFile('src/room/objects/fishTank.tsx')) },
  rows, cases: rows.length, exactPixels: rows.filter(row => row.exactPixels).length, exactPng: rows.filter(row => row.exactPng).length,
  method: 'Sequential production Room/React SVG renders through Vite SSR; candidate substitutes only the shared leaf source, optional response enabled only for clean potted leaves. Unanimated Resvg pixels and PNG bytes compare exactly; baseline precedes production edits. Plant and fish tank, three stages, four actual outer rotations, two full-room raster widths. Fish source equals frozen B61. No animated/CSS/temporal-quality claim.' }
await writeFile(`${out}/plant-greeting-static-differential.json`, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ cases: result.cases, exactPixels: result.exactPixels, exactPng: result.exactPng }))
if (result.cases !== 48 || result.exactPixels !== 48 || result.exactPng !== 48) process.exitCode = 1
