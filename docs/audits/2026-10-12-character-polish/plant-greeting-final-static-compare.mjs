import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const out = 'docs/audits/2026-10-12-character-polish', sha = value => createHash('sha256').update(value).digest('hex')
const original = JSON.parse(await readFile(`${out}/plant-greeting-static-differential.json`, 'utf8'))
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
const rows = []
try {
  const { Room } = await server.ssrLoadModule('/src/room/Room.tsx')
  for (const row of original.rows) {
    const { catalogId, stage, rotation, width } = row
    const svg = renderToStaticMarkup(React.createElement(Room, { room: { floorStyle: 'wood', wallStyle: 'cream' }, width,
      objects: [{ id: 'tank', roomId: 'room', catalogId, tileX: 2, tileY: 2, rotation }], stages: { tank: stage },
    })).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    const image = new Resvg(svg).render(), png = image.asPng()
    const baseline = await readFile(`${out}/plant-greeting-static-baseline/${catalogId}-${stage}-${rotation}-${width}.png`)
    assert.equal(sha(baseline), row.before.pngSha256)
    assert.equal(sha(image.pixels), row.before.pixelsSha256)
    assert.equal(sha(png), row.before.pngSha256)
    rows.push({ catalogId, stage, rotation, width, height: image.height, pixelsSha256: sha(image.pixels), pngSha256: sha(png), baselineSha256: sha(baseline), exactPixels: true, exactPng: true })
  }
} finally { await server.close() }
assert.equal(rows.length, 48)
await writeFile(`${out}/plant-greeting-final-static-differential.json`, JSON.stringify({ sources: Object.fromEntries(await Promise.all(['src/room/Room.tsx', 'src/room/objects/plant.tsx', 'src/room/objects/fishTank.tsx'].map(async p => [p, sha(await readFile(p))]))), rows,
  method: 'Current final production Room, plant and fish source, unanimated Vite SSR/Resvg, compared against immutable pre-edit baseline PNG/pixel hashes. No native CSS/animated pixel claim.' }, null, 2) + '\n')
console.log('48/48 final production static pixels and PNG bytes match pre-edit baseline')
